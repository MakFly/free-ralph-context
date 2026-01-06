"""
Transcript Polling Service - Auto-detect Claude sessions and track context usage

Features:
- Multi-source detection (~/.claude, ~/.claude-glm, ~/.opencode, etc.)
- Hash-based change detection for efficiency
- Auto-create sessions when new transcripts detected
- Real token extraction from API usage data
- Periodic verification and sanity checks
"""

import os
import json
import hashlib
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import async_session_maker
from app.models.session import Session, SessionStatus
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════

POLLING_INTERVAL = 5  # seconds
SANITY_CHECK_INTERVAL = 35  # seconds
TRANSCRIPT_TAIL_SIZE = 10240  # 10KB - read only file tail
HASH_TAIL_SIZE = 10240
MAX_CONTEXT_TOKENS = 200000
BYTES_PER_TOKEN = 6  # Fallback estimation
SYSTEM_OVERHEAD_TOKENS = 2000


# ═══════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════

@dataclass
class ClaudeSource:
    """A Claude installation source."""
    name: str
    projects_dir: str
    color: str


@dataclass
class TranscriptInfo:
    """Information about a transcript file."""
    path: str
    project_path: str
    project_name: str
    bytes: int
    tokens: int
    context_usage: float
    last_modified: datetime
    real_tokens: Optional[int] = None
    source: Optional[ClaudeSource] = None


@dataclass
class ProjectData:
    """Processed project data for dashboard."""
    name: str
    project_path: str
    current_tokens: int
    max_tokens: int = MAX_CONTEXT_TOKENS
    context_usage: float = 0.0
    last_updated: str = ""
    transcript_path: str = ""
    is_real_data: bool = False
    source_name: str = ""
    source_color: str = ""


@dataclass
class SyncState:
    """Cached sync state for a transcript."""
    transcript_path: str
    last_synced_at: str
    last_modified_at: str
    file_size: int
    hash: str
    cached_project_data: str
    sync_status: str = "synced"


# ═══════════════════════════════════════════════════════
# TRANSCRIPT SERVICE
# ═══════════════════════════════════════════════════════

class TranscriptService:
    """Service for polling Claude transcripts and tracking sessions."""

    def __init__(self, sse_manager=None):
        self.sse_manager = sse_manager
        self.sources: list[ClaudeSource] = []
        self.cached_projects: list[ProjectData] = []
        self.last_data_hash = ""
        self.sync_cache: dict[str, SyncState] = {}
        self._running = False
        self._poll_task: Optional[asyncio.Task] = None
        self._sanity_task: Optional[asyncio.Task] = None

    def clear_cache(self) -> None:
        """Clear the sync cache to force fresh token calculation."""
        self.sync_cache.clear()
        logger.info("Sync cache cleared - will recalculate all tokens")

    def auto_detect_sources(self) -> list[ClaudeSource]:
        """Auto-detect all Claude installations."""
        home = os.environ.get("HOME", os.path.expanduser("~"))
        sources = []

        # Known installations with their badge colors
        known_sources = {
            ".claude": "#3B82F6",      # blue
            ".claude-glm": "#10B981",  # green
            ".claude-gml": "#F59E0B",  # yellow
            ".opencode": "#8B5CF6",    # purple
        }

        try:
            for entry in os.listdir(home):
                # Match .claude, .claude-glm, .claude-gml, .opencode
                if not entry.startswith(".claude") and entry != ".opencode":
                    continue

                projects_dir = os.path.join(home, entry, "projects")
                if not os.path.exists(projects_dir):
                    continue

                color = known_sources.get(entry, "#6B7280")  # gray default
                sources.append(ClaudeSource(
                    name=entry.lstrip("."),
                    projects_dir=projects_dir,
                    color=color,
                ))
        except Exception as e:
            logger.warning(f"Error detecting Claude sources: {e}")

        self.sources = sources
        return sources

    def hash_file_tail(self, file_path: str, tail_size: int = HASH_TAIL_SIZE) -> str:
        """Hash the tail of a file for change detection."""
        try:
            file_size = os.path.getsize(file_path)

            if file_size <= tail_size:
                with open(file_path, "rb") as f:
                    content = f.read()
            else:
                with open(file_path, "rb") as f:
                    f.seek(max(0, file_size - tail_size))
                    content = f.read()

            return hashlib.md5(content).hexdigest()
        except Exception:
            return ""

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
        """Parse JSONL content for token usage.

        Cache read tokens are NOT included in context usage because they are
        retrieved from cache and don't count against the context window.
        Only input_tokens and cache_creation_input_tokens count.
        """
        lines = content.strip().split("\n")

        # Read from end to find last assistant message with usage
        for line in reversed(lines):
            try:
                if '"type":"assistant"' not in line:
                    continue

                msg = json.loads(line)
                if msg.get("type") == "assistant" and msg.get("message", {}).get("usage"):
                    usage = msg["message"]["usage"]
                    # Only count actual context usage, NOT cache reads
                    # cache_read_input_tokens are cached and don't consume context
                    total_context = (
                        usage.get("input_tokens", 0) +
                        usage.get("cache_creation_input_tokens", 0)
                    )
                    return total_context
            except (json.JSONDecodeError, KeyError):
                continue

        return None

    def decode_project_name(self, project_dir: str) -> str:
        """Decode project name from directory name."""
        name = project_dir

        # Remove common prefixes
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

        # Truncate long names
        if len(name) > 40:
            parts = name.split("-")
            name = "-".join(parts[-3:])

        return name

    def extract_real_path(self, transcript_path: str, projects_dir: str) -> str:
        """Extract the real project path from transcript path.

        Since we cannot reliably distinguish between dashes that are path separators
        and dashes that are part of folder names (e.g., sf-inertia), we use the
        decoded project name as the project path.

        This ensures consistency and avoids misinterpreting folder names with dashes.
        """
        # Extract the encoded directory from transcript path
        parts = transcript_path.split("/projects/")
        if len(parts) < 2:
            return "unknown"

        encoded_dir = parts[1].split("/")[0]
        # Use decode_project_name to get the clean project name
        # This correctly handles path prefixes and preserves the project name
        return self.decode_project_name(encoded_dir)

    def find_all_transcripts(self) -> list[TranscriptInfo]:
        """Scan all sources for transcript files."""
        transcripts = []

        if not self.sources:
            self.auto_detect_sources()

        for source in self.sources:
            if not os.path.exists(source.projects_dir):
                continue

            try:
                for project_dir in os.listdir(source.projects_dir):
                    project_path = os.path.join(source.projects_dir, project_dir)

                    if not os.path.isdir(project_path):
                        continue

                    try:
                        for file in os.listdir(project_path):
                            if not file.endswith(".jsonl"):
                                continue
                            if file.startswith("agent-"):
                                continue

                            transcript_path = os.path.join(project_path, file)
                            stat = os.stat(transcript_path)

                            bytes_size = stat.st_size
                            real_tokens = self.get_last_assistant_usage(transcript_path)
                            estimated_tokens = (bytes_size // BYTES_PER_TOKEN) + SYSTEM_OVERHEAD_TOKENS
                            # Cap estimation to max context - never exceed the limit
                            estimated_tokens = min(estimated_tokens, MAX_CONTEXT_TOKENS)
                            tokens = real_tokens or estimated_tokens
                            context_usage = min(0.99, tokens / MAX_CONTEXT_TOKENS)

                            project_name = self.decode_project_name(project_dir)
                            # Extract real project path from transcript_path
                            # transcript_path format: .../projects/<encoded-dir>/file.jsonl
                            # We decode the encoded-dir back to real filesystem path
                            real_project_path = self.extract_real_path(transcript_path, source.projects_dir)

                            transcripts.append(TranscriptInfo(
                                path=transcript_path,
                                project_path=real_project_path,
                                project_name=project_name,
                                bytes=bytes_size,
                                tokens=tokens,
                                context_usage=context_usage,
                                last_modified=datetime.fromtimestamp(stat.st_mtime),
                                real_tokens=real_tokens,
                                source=source,
                            ))
                    except Exception as e:
                        logger.debug(f"Error scanning project {project_path}: {e}")
            except Exception as e:
                logger.debug(f"Error scanning source {source.projects_dir}: {e}")

        transcripts.sort(key=lambda t: t.last_modified, reverse=True)
        return transcripts

    def fast_resync(self) -> list[ProjectData]:
        """Fast resync using hash-based cache."""
        results = []

        if not self.sources:
            self.auto_detect_sources()

        for source in self.sources:
            if not os.path.exists(source.projects_dir):
                continue

            try:
                for project_dir in os.listdir(source.projects_dir):
                    project_path = os.path.join(source.projects_dir, project_dir)

                    if not os.path.isdir(project_path):
                        continue

                    try:
                        for file in os.listdir(project_path):
                            if not file.endswith(".jsonl") or file.startswith("agent-"):
                                continue

                            transcript_path = os.path.join(project_path, file)
                            stat = os.stat(transcript_path)
                            current_hash = self.hash_file_tail(transcript_path)
                            mtime_str = datetime.fromtimestamp(stat.st_mtime).isoformat()

                            # Check cache
                            cached = self.sync_cache.get(transcript_path)
                            if cached and cached.hash == current_hash and cached.last_modified_at == mtime_str:
                                try:
                                    cached_data = json.loads(cached.cached_project_data)
                                    results.append(ProjectData(**cached_data))
                                    continue
                                except Exception:
                                    pass

                            # Resync this file
                            bytes_size = stat.st_size
                            real_tokens = self.get_last_assistant_usage(transcript_path)
                            estimated_tokens = (bytes_size // BYTES_PER_TOKEN) + SYSTEM_OVERHEAD_TOKENS
                            # Cap estimation to max context - never exceed the limit
                            estimated_tokens = min(estimated_tokens, MAX_CONTEXT_TOKENS)
                            tokens = real_tokens or estimated_tokens

                            # Log when using estimation (potential inaccuracy)
                            if real_tokens is None:
                                logger.debug(f"Using estimated tokens for {project_name}: {tokens} (file: {bytes_size} bytes)")

                            context_usage = min(0.99, tokens / MAX_CONTEXT_TOKENS)

                            project_name = self.decode_project_name(project_dir)
                            real_project_path = self.extract_real_path(transcript_path, source.projects_dir)

                            project_data = ProjectData(
                                name=project_name,
                                project_path=real_project_path,
                                current_tokens=tokens,
                                max_tokens=MAX_CONTEXT_TOKENS,
                                context_usage=context_usage,
                                last_updated=mtime_str,
                                transcript_path=transcript_path,
                                is_real_data=real_tokens is not None,
                                source_name=source.name,
                                source_color=source.color,
                            )
                            results.append(project_data)

                            # Update cache
                            self.sync_cache[transcript_path] = SyncState(
                                transcript_path=transcript_path,
                                last_synced_at=datetime.utcnow().isoformat(),
                                last_modified_at=mtime_str,
                                file_size=bytes_size,
                                hash=current_hash,
                                cached_project_data=json.dumps(project_data.__dict__),
                            )
                    except Exception as e:
                        logger.debug(f"Error processing {project_path}: {e}")
            except Exception as e:
                logger.debug(f"Error scanning {source.projects_dir}: {e}")

        results.sort(key=lambda p: p.last_updated, reverse=True)
        self.cached_projects = results
        return results

    async def get_status(self) -> dict:
        """Get current status for dashboard.

        Merges multiple transcripts of the SAME project within the SAME source.
        Different sources (claude, claude-glm, opencode) are kept separate.
        """
        raw_projects = self.fast_resync()

        # Deduplicate by (source_name, project_name) - NOT just project_name
        # This merges multiple transcripts of the same project within a source,
        # but keeps different sources separate
        merged: dict[str, dict] = {}

        for p in raw_projects:
            # Safety cap: never send more than max_tokens
            safe_tokens = min(p.current_tokens, p.max_tokens)

            # Key = source:project to keep sources separate
            key = f"{p.source_name}:{p.name}"

            if key not in merged:
                # First transcript for this (source, project) pair
                # Use URL-friendly format: source—project (em dash separator)
                merged[key] = {
                    "name": f"{p.source_name}—{p.name}",  # URL-friendly format with em dash
                    "projectPath": p.project_path,
                    "currentTokens": safe_tokens,  # Use capped value
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
            else:
                # Merge: keep the transcript with higher token count (most active)
                existing = merged[key]
                if safe_tokens > existing["currentTokens"]:
                    existing["currentTokens"] = safe_tokens  # Use capped value
                    existing["contextUsage"] = p.context_usage
                    existing["pct"] = round(p.context_usage * 100)
                    existing["lastUpdated"] = p.last_updated
                    existing["transcriptPath"] = p.transcript_path
                    existing["isRealData"] = p.is_real_data

        # Convert to list and sort by tokens
        projects_list = sorted(
            merged.values(),
            key=lambda x: x["currentTokens"],
            reverse=True
        )

        total_tokens = sum(p["currentTokens"] for p in projects_list)

        return {
            "connected": True,
            "projectCount": len(projects_list),
            "projects": projects_list,
            "sources": [{"name": s.name, "color": s.color} for s in self.sources],
            "totalTokens": total_tokens,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def check_for_changes(self) -> bool:
        """Check if projects have changed and broadcast update."""
        status = await self.get_status()
        data_hash = json.dumps(
            [(p["name"], p["currentTokens"]) for p in status["projects"]],
            sort_keys=True
        )
        hash_val = hashlib.md5(data_hash.encode()).hexdigest()

        if hash_val != self.last_data_hash:
            self.last_data_hash = hash_val

            # Broadcast via SSE if manager available
            if self.sse_manager:
                await self.sse_manager.broadcast("update", status)

            return True
        return False

    async def auto_create_sessions(self):
        """Auto-create sessions for new transcripts."""
        projects = self.fast_resync()

        async with async_session_maker() as db:
            for project in projects:
                # Include source in task_description to avoid collisions across sources
                # e.g., "Auto-detected: claude:free-ralph-context" vs "Auto-detected: claude-glm:free-ralph-context"
                session_key = f"{project.source_name}:{project.name}"
                result = await db.execute(
                    select(Session)
                    .where(Session.task_description == f"Auto-detected: {session_key}")
                    .order_by(Session.created_at.desc())
                    .limit(1)
                )
                existing = result.scalar_one_or_none()

                if not existing:
                    # Create new session with source-prefixed key
                    session = Session(
                        task_description=f"Auto-detected: {session_key}",
                        max_tokens=MAX_CONTEXT_TOKENS,
                        current_tokens=project.current_tokens,
                        status=SessionStatus.ACTIVE,
                    )
                    db.add(session)
                    logger.info(f"Auto-created session for {project.source_name}—{project.name}")
                else:
                    # Update existing session tokens if changed
                    if existing.current_tokens != project.current_tokens:
                        existing.current_tokens = project.current_tokens
                        logger.info(f"Updated session tokens for {project.source_name}—{project.name}: {project.current_tokens}")

            await db.commit()

    async def start(self):
        """Start the polling loops."""
        if self._running:
            return

        self._running = True
        self.clear_cache()  # Force fresh token calculation on startup
        self.auto_detect_sources()

        logger.info(f"TranscriptService started with {len(self.sources)} sources")
        for source in self.sources:
            logger.info(f"  - {source.name}: {source.projects_dir}")

        # Initial sync
        await self.auto_create_sessions()
        await self.check_for_changes()

        # Start polling loops
        self._poll_task = asyncio.create_task(self._polling_loop())
        self._sanity_task = asyncio.create_task(self._sanity_check_loop())

    async def stop(self):
        """Stop the polling loops."""
        self._running = False

        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass

        if self._sanity_task:
            self._sanity_task.cancel()
            try:
                await self._sanity_task
            except asyncio.CancelledError:
                pass

        logger.info("TranscriptService stopped")

    async def _polling_loop(self):
        """Main polling loop - check for changes every 5 seconds."""
        while self._running:
            try:
                await asyncio.sleep(POLLING_INTERVAL)
                changed = await self.check_for_changes()
                if changed:
                    await self.auto_create_sessions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Polling error: {e}")

    async def _sanity_check_loop(self):
        """Sanity check loop - verify mtimes every 35 seconds."""
        while self._running:
            try:
                await asyncio.sleep(SANITY_CHECK_INTERVAL)

                for project in self.cached_projects:
                    try:
                        stat = os.stat(project.transcript_path)
                        mtime_str = datetime.fromtimestamp(stat.st_mtime).isoformat()
                        cached = self.sync_cache.get(project.transcript_path)

                        if cached and cached.last_modified_at != mtime_str:
                            logger.info(f"Sanity check: change detected for {project.name}")
                            await self.check_for_changes()
                            break
                    except Exception:
                        continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Sanity check error: {e}")


# Global instance
transcript_service: Optional[TranscriptService] = None


def get_transcript_service() -> TranscriptService:
    """Get or create the transcript service instance."""
    global transcript_service
    if transcript_service is None:
        transcript_service = TranscriptService()
    return transcript_service
