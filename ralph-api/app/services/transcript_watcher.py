"""
Event-Driven Transcript Service using inotify

Replaces polling with file system events for instant, efficient updates.

Events:
- CREATE: New conversation → create session
- MODIFY: Active conversation → update tokens
- DELETE: Conversation removed → mark session inactive
"""

import os
import json
import logging
import asyncio
import threading
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import Optional
from queue import Queue

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent, FileCreatedEvent, FileModifiedEvent

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import async_session_maker
from app.models.session import Session, SessionStatus
from app.services.transcript_service import (
    ClaudeSource,
    TranscriptInfo,
    ProjectData,
    POLLING_INTERVAL,
    TRANSCRIPT_TAIL_SIZE,
    MAX_CONTEXT_TOKENS,
    BYTES_PER_TOKEN,
    SYSTEM_OVERHEAD_TOKENS,
)

logger = logging.getLogger(__name__)


@dataclass
class FileChangeEvent:
    """A file system change event."""
    event_type: str  # "created", "modified", "deleted"
    path: str
    timestamp: float


class TranscriptWatcherHandler(FileSystemEventHandler):
    """Handler for transcript file events."""

    def __init__(self, event_queue: 'Queue[FileChangeEvent]'):
        self.event_queue = event_queue

    def on_created(self, event: FileCreatedEvent):
        """New transcript created."""
        if not event.is_directory and event.src_path.endswith('.jsonl'):
            if not event.src_path.split('/')[-1].startswith('agent-'):
                self.event_queue.put(FileChangeEvent(
                    event_type="created",
                    path=event.src_path,
                    timestamp=datetime.now().timestamp()
                ))

    def on_modified(self, event: FileModifiedEvent):
        """Transcript modified."""
        if not event.is_directory and event.src_path.endswith('.jsonl'):
            if not event.src_path.split('/')[-1].startswith('agent-'):
                self.event_queue.put(FileChangeEvent(
                    event_type="modified",
                    path=event.src_path,
                    timestamp=datetime.now().timestamp()
                ))

    def on_deleted(self, event: FileSystemEvent):
        """Transcript deleted."""
        if not event.is_directory and event.src_path.endswith('.jsonl'):
            self.event_queue.put(FileChangeEvent(
                event_type="deleted",
                path=event.src_path,
                timestamp=datetime.now().timestamp()
            ))


class TranscriptWatcher:
    """
    Event-driven transcript watcher using inotify.

    No more polling! Reacts instantly to file changes.
    """

    def __init__(self, sse_manager=None):
        self.sse_manager = sse_manager
        self.sources: list[ClaudeSource] = []
        self.cached_projects: dict[str, ProjectData] = {}
        self.last_data_hash = ""
        self._running = False
        self._observer: Optional[Observer] = None
        self._event_queue: 'Queue[FileChangeEvent]' = Queue()
        self._processing_task: Optional[asyncio.Task] = None
        self._sync_task: Optional[asyncio.Task] = None

        # Throttle updates to avoid spam (avoid rapid successive updates)
        self._pending_updates: dict[str, float] = {}
        self._throttle_delay = 0.5  # seconds

    def auto_detect_sources(self) -> list[ClaudeSource]:
        """Auto-detect all Claude installations."""
        home = os.environ.get("HOME", os.path.expanduser("~"))
        sources = []

        known_sources = {
            ".claude": "#3B82F6",
            ".claude-glm": "#10B981",
            ".claude-gml": "#F59E0B",
            ".opencode": "#8B5CF6",
        }

        try:
            for entry in os.listdir(home):
                if not entry.startswith(".claude") and entry != ".opencode":
                    continue

                projects_dir = os.path.join(home, entry, "projects")
                if not os.path.exists(projects_dir):
                    continue

                color = known_sources.get(entry, "#6B7280")
                sources.append(ClaudeSource(
                    name=entry.lstrip("."),
                    projects_dir=projects_dir,
                    color=color,
                ))
        except Exception as e:
            logger.warning(f"Error detecting Claude sources: {e}")

        self.sources = sources
        return sources

    def decode_project_name(self, project_dir: str) -> str:
        """Decode project name from directory name."""
        import re
        name = project_dir

        patterns = [
            r"^-home-[^-]+-Documents-lab-[^-]+-",
            r"^-home-[^-]+-Documents-lab-",
            r"^-home-[^-]+-Documents-",
            r"^-home-[^-]+-",
            r"^-home",
            r"^-",
        ]
        for pattern in patterns:
            name = re.sub(pattern, "", name)

        if len(name) > 40:
            parts = name.split("-")
            name = "-".join(parts[-3:])

        return name

    def get_last_assistant_usage(self, transcript_path: str) -> Optional[int]:
        """Extract token usage from the last assistant message."""
        try:
            file_size = os.path.getsize(transcript_path)

            if file_size <= TRANSCRIPT_TAIL_SIZE:
                with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            else:
                with open(transcript_path, "rb") as f:
                    f.seek(max(0, file_size - TRANSCRIPT_TAIL_SIZE))
                    content = f.read().decode("utf-8", errors="ignore")

            return self._extract_usage_from_content(content)
        except Exception:
            return None

    def _extract_usage_from_content(self, content: str) -> Optional[int]:
        """Parse JSONL content for token usage."""
        lines = content.strip().split("\n")

        for line in reversed(lines):
            try:
                if '"type":"assistant"' not in line:
                    continue

                msg = json.loads(line)
                if msg.get("type") == "assistant" and msg.get("message", {}).get("usage"):
                    usage = msg["message"]["usage"]
                    total_context = (
                        usage.get("input_tokens", 0) +
                        usage.get("cache_creation_input_tokens", 0)
                    )
                    return total_context
            except (json.JSONDecodeError, KeyError):
                continue

        return None

    def _get_project_transcripts(self, project_dir: str) -> list[tuple[str, float]]:
        """Get all transcripts for a project with their mtimes."""
        transcripts = []

        try:
            for file in os.listdir(project_dir):
                if not file.endswith('.jsonl') or file.startswith('agent-'):
                    continue

                path = os.path.join(project_dir, file)
                stat = os.stat(path)
                transcripts.append((path, stat.st_mtime))
        except Exception as e:
            logger.debug(f"Error listing transcripts in {project_dir}: {e}")

        return transcripts

    def _is_active_transcript(self, transcript_path: str, project_dir: str) -> bool:
        """Check if this is the most recently modified transcript."""
        transcripts = self._get_project_transcripts(project_dir)

        if not transcripts:
            return True

        # Sort by mtime descending (most recent first)
        transcripts.sort(key=lambda x: x[1], reverse=True)

        # Active transcript is the most recently modified one
        return transcripts[0][0] == transcript_path

    async def _handle_file_event(self, event: FileChangeEvent):
        """Handle a file change event."""
        if event.event_type == "deleted":
            # Handle deleted transcript
            await self._handle_deleted_transcript(event.path)
            return

        # For created/modified, only process if it's the active transcript
        try:
            # Extract project info
            parts = event.path.split("/projects/")
            if len(parts) < 2:
                return

            project_dir = os.path.dirname(event.path)

            # Check if this is the active transcript
            if not self._is_active_transcript(event.path, project_dir):
                logger.debug(f"Skipping inactive transcript: {event.path}")
                return

            # Process the active transcript
            source_name, project_name = self._extract_project_info(event.path)

            if source_name and project_name:
                await self._update_project_tokens(source_name, project_name, event.path)
        except Exception as e:
            logger.error(f"Error handling file event {event.path}: {e}")

    def _extract_project_info(self, transcript_path: str) -> tuple[Optional[str], Optional[str]]:
        """Extract source and project name from transcript path."""
        try:
            parts = transcript_path.split("/projects/")
            if len(parts) < 2:
                return None, None

            # Find source name
            for source in self.sources:
                if source.projects_dir in transcript_path:
                    source_name = source.name
                    break
            else:
                # Fallback: extract from path
                for part in transcript_path.split("/"):
                    if part.startswith(".claude") or part == ".opencode":
                        source_name = part.lstrip(".")
                        break
                else:
                    return None, None

            # Extract project name
            project_dir = parts[1].split("/")[0]
            project_name = self.decode_project_name(project_dir)

            return source_name, project_name
        except Exception as e:
            logger.debug(f"Error extracting project info from {transcript_path}: {e}")
            return None, None

    async def _update_project_tokens(self, source_name: str, project_name: str, transcript_path: str):
        """Update session tokens for a project."""
        try:
            # Get token count
            real_tokens = self.get_last_assistant_usage(transcript_path)
            if real_tokens is None:
                # Fallback to file size estimation
                file_size = os.path.getsize(transcript_path)
                estimated = min(
                    (file_size // BYTES_PER_TOKEN) + SYSTEM_OVERHEAD_TOKENS,
                    MAX_CONTEXT_TOKENS
                )
                tokens = estimated
            else:
                tokens = min(real_tokens, MAX_CONTEXT_TOKENS)

            # Update session in DB
            session_key = f"{source_name}:{project_name}"

            async with async_session_maker() as db:
                result = await db.execute(
                    select(Session)
                    .where(Session.task_description == f"Auto-detected: {session_key}")
                    .order_by(Session.created_at.desc())
                    .limit(1)
                )
                session = result.scalar_one_or_none()

                if session:
                    if session.current_tokens != tokens:
                        session.current_tokens = tokens
                        await db.commit()
                        logger.info(f"✅ Updated active conversation: {source_name}—{project_name} → {tokens} tokens")
                else:
                    # Create new session
                    new_session = Session(
                        task_description=f"Auto-detected: {session_key}",
                        max_tokens=MAX_CONTEXT_TOKENS,
                        current_tokens=tokens,
                        status=SessionStatus.ACTIVE,
                    )
                    db.add(new_session)
                    await db.commit()
                    logger.info(f"🆕 Created session for new conversation: {source_name}—{project_name}")

            # Update cache
            key = f"{source_name}:{project_name}"
            self.cached_projects[key] = ProjectData(
                name=project_name,
                project_path=project_name,  # Simplified
                current_tokens=tokens,
                max_tokens=MAX_CONTEXT_TOKENS,
                context_usage=min(0.99, tokens / MAX_CONTEXT_TOKENS),
                last_updated=datetime.utcnow().isoformat(),
                transcript_path=transcript_path,
                is_real_data=real_tokens is not None,
                source_name=source_name,
                source_color="",  # Will be filled if needed
            )

            # Broadcast update via SSE
            if self.sse_manager:
                status = await self.get_status()
                await self.sse_manager.broadcast("update", status)

        except Exception as e:
            logger.error(f"Error updating project tokens: {e}")

    async def _handle_deleted_transcript(self, path: str):
        """Handle a deleted transcript."""
        source_name, project_name = self._extract_project_info(path)

        if source_name and project_name:
            session_key = f"{source_name}:{project_name}"

            async with async_session_maker() as db:
                result = await db.execute(
                    select(Session)
                    .where(Session.task_description == f"Auto-detected: {session_key}")
                    .order_by(Session.created_at.desc())
                    .limit(1)
                )
                session = result.scalar_one_or_none()

                if session:
                    session.status = SessionStatus.INACTIVE
                    await db.commit()
                    logger.info(f"🗑️  Marked session inactive: {source_name}—{project_name}")

            # Remove from cache
            key = f"{source_name}:{project_name}"
            self.cached_projects.pop(key, None)

    async def _process_events_loop(self):
        """Process file system events from the queue."""
        while self._running:
            try:
                # Non-blocking get with timeout
                try:
                    event = self._event_queue.get(timeout=0.1)
                except:
                    await asyncio.sleep(0.1)
                    continue

                # Throttle: avoid processing the same file too quickly
                now = datetime.now().timestamp()
                last_update = self._pending_updates.get(event.path, 0)

                if now - last_update < self._throttle_delay:
                    # Re-queue for later processing
                    asyncio.create_task(asyncio.sleep(self._throttle_delay))
                    self._event_queue.put(event)
                    continue

                self._pending_updates[event.path] = now

                # Process the event
                await self._handle_file_event(event)

                # Clean old pending updates
                self._pending_updates = {
                    p: t for p, t in self._pending_updates.items()
                    if now - t < 10  # Keep only recent updates
                }

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error processing event: {e}")

    async def _initial_sync(self):
        """Initial sync on startup - create sessions for existing conversations."""
        logger.info("🔄 Performing initial sync...")

        for source in self.sources:
            if not os.path.exists(source.projects_dir):
                continue

            try:
                for project_dir in os.listdir(source.projects_dir):
                    project_path = os.path.join(source.projects_dir, project_dir)

                    if not os.path.isdir(project_path):
                        continue

                    # Get all transcripts and find the active one
                    transcripts = self._get_project_transcripts(project_path)
                    if not transcripts:
                        continue

                    # Most recent = active
                    transcripts.sort(key=lambda x: x[1], reverse=True)
                    active_path, _ = transcripts[0]

                    project_name = self.decode_project_name(project_dir)
                    await self._update_project_tokens(source.name, project_name, active_path)

            except Exception as e:
                logger.debug(f"Error syncing source {source.projects_dir}: {e}")

        logger.info("✅ Initial sync complete")

    async def get_status(self) -> dict:
        """Get current status for dashboard."""
        projects_list = [
            {
                "name": f"{p.source_name}—{p.name}",
                "projectPath": p.project_path,
                "currentTokens": p.current_tokens,
                "maxTokens": p.max_tokens,
                "contextUsage": p.context_usage,
                "pct": round(p.context_usage * 100),
                "lastUpdated": p.last_updated,
                "isRealData": p.is_real_data,
                "source": {
                    "name": p.source_name,
                    "color": p.source_color,
                },
                "transcriptPath": p.transcript_path,
            }
            for p in self.cached_projects.values()
        ]

        projects_list.sort(key=lambda x: x["currentTokens"], reverse=True)
        total_tokens = sum(p["currentTokens"] for p in projects_list)

        return {
            "connected": True,
            "projectCount": len(projects_list),
            "projects": projects_list,
            "sources": [{"name": s.name, "color": s.color} for s in self.sources],
            "totalTokens": total_tokens,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def start(self):
        """Start the inotify watcher."""
        if self._running:
            return

        self._running = True
        self.auto_detect_sources()

        logger.info(f"🚀 TranscriptWatcher starting with {len(self.sources)} sources")
        for source in self.sources:
            logger.info(f"  - {source.name}: {source.projects_dir}")

        # Start watchdog observer
        self._observer = Observer()
        handler = TranscriptWatcherHandler(self._event_queue)

        for source in self.sources:
            if os.path.exists(source.projects_dir):
                self._observer.schedule(handler, source.projects_dir, recursive=True)
                logger.info(f"👀 Watching: {source.projects_dir}")

        self._observer.start()

        # Initial sync
        await self._initial_sync()

        # Start event processing loop
        self._processing_task = asyncio.create_task(self._process_events_loop())

        logger.info("✅ TranscriptWatcher started (event-driven mode)")

    async def stop(self):
        """Stop the watcher."""
        self._running = False

        if self._processing_task:
            self._processing_task.cancel()
            try:
                await self._processing_task
            except asyncio.CancelledError:
                pass

        if self._observer:
            self._observer.stop()
            self._observer.join()

        logger.info("🛑 TranscriptWatcher stopped")


# Global instance
transcript_watcher: Optional[TranscriptWatcher] = None


def get_transcript_watcher() -> TranscriptWatcher:
    """Get or create the transcript watcher instance."""
    global transcript_watcher
    if transcript_watcher is None:
        transcript_watcher = TranscriptWatcher()
    return transcript_watcher
