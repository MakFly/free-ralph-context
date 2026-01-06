"""
Free - Session Termination Tool

Properly terminates a Ralph session with cleanup and archival.
The counterpart to malloc - completes the memory management cycle.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class FreeResult:
    """Result of session termination."""
    success: bool = True
    session_id: str = ""
    learnings_extracted: int = 0
    final_checkpoint_id: Optional[str] = None
    token_savings: int = 0
    total_memories: int = 0
    duration_minutes: float = 0
    message: str = ""
    archive_path: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "sessionId": self.session_id,
            "learningsExtracted": self.learnings_extracted,
            "finalCheckpointId": self.final_checkpoint_id,
            "tokenSavings": self.token_savings,
            "totalMemories": self.total_memories,
            "durationMinutes": round(self.duration_minutes, 2),
            "message": self.message,
            "archivePath": self.archive_path,
        }


class FreeTool:
    """
    Session termination with proper cleanup.

    Features:
    - Creates final checkpoint before closing
    - Extracts key learnings for long-term storage
    - Calculates token savings
    - Archives session data
    - Marks session as completed
    """

    def __init__(self, db, api_client=None):
        self.db = db
        self.api = api_client

    async def execute(
        self,
        session_id: str,
        extract_learnings: bool = True,
        create_checkpoint: bool = True,
        archive: bool = True,
    ) -> FreeResult:
        """
        Terminate session with proper cleanup.

        Args:
            session_id: Session to terminate
            extract_learnings: Extract key decisions/patterns
            create_checkpoint: Create final checkpoint
            archive: Archive session data

        Returns:
            FreeResult with cleanup statistics
        """
        # Get session info
        session = self.db.get_session(session_id)
        if not session:
            return FreeResult(
                success=False,
                session_id=session_id,
                message=f"Session not found: {session_id}",
            )

        # Calculate session duration
        created_at = session.get("created_at", datetime.now().isoformat())
        duration = self._calculate_duration(created_at)

        # Get memories for extraction
        memories = self.db.get_session_memories(session_id)
        total_memories = len(memories)

        # Create final checkpoint if requested
        checkpoint_id = None
        if create_checkpoint and self.api:
            try:
                result = await self.api("POST", "/api/checkpoints", {
                    "session_id": session_id,
                    "label": "session-end",
                    "metadata": {"auto_generated": True, "type": "termination"},
                })
                checkpoint_id = result.get("checkpoint_id")
            except Exception:
                pass  # Checkpoint is optional

        # Extract learnings if requested
        learnings_count = 0
        if extract_learnings:
            learnings_count = self._extract_learnings(session_id, memories)

        # Calculate token savings
        token_savings = self._calculate_savings(session)

        # Archive session
        archive_path = None
        if archive:
            archive_path = self._archive_session(session_id, session, memories)

        # Mark session as completed
        self.db.update_session_status(session_id, "completed")

        # Generate summary message
        message = self._generate_summary(
            duration, total_memories, learnings_count, token_savings
        )

        return FreeResult(
            success=True,
            session_id=session_id,
            learnings_extracted=learnings_count,
            final_checkpoint_id=checkpoint_id,
            token_savings=token_savings,
            total_memories=total_memories,
            duration_minutes=duration,
            message=message,
            archive_path=archive_path,
        )

    def _calculate_duration(self, created_at: str) -> float:
        """Calculate session duration in minutes."""
        try:
            if "T" in created_at:
                start = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            else:
                start = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")
            duration = datetime.now(start.tzinfo if start.tzinfo else None) - start
            return duration.total_seconds() / 60
        except Exception:
            return 0.0

    def _extract_learnings(self, session_id: str, memories: list) -> int:
        """Extract key learnings from session memories."""
        # Filter for high-value memories
        valuable = [
            m for m in memories
            if m.get("priority") in ["critical", "high"]
            or m.get("category") in ["decision", "error"]
        ]

        # Store as long-term learnings
        for memory in valuable:
            self.db.save_pattern(
                name=f"learning_{session_id[:8]}_{memory.get('id', '')[:8]}",
                description=memory.get("content", ""),
                tags=["learning", memory.get("category", "general")],
                project_path="",  # Cross-project learning
                metadata={
                    "source_session": session_id,
                    "source_category": memory.get("category"),
                    "extracted_at": datetime.now().isoformat(),
                },
            )

        return len(valuable)

    def _calculate_savings(self, session: dict) -> int:
        """Calculate token savings from compression."""
        max_tokens = session.get("max_tokens", 200000)
        current_tokens = session.get("current_tokens", 0)

        # Savings = tokens not used (compressed away)
        return max(0, max_tokens - current_tokens)

    def _archive_session(
        self, session_id: str, session: dict, memories: list
    ) -> Optional[str]:
        """Archive session data to file."""
        import json
        from pathlib import Path
        import tempfile

        archive_dir = Path(tempfile.gettempdir()) / "ralph_archives"
        archive_dir.mkdir(exist_ok=True)

        archive_data = {
            "session_id": session_id,
            "archived_at": datetime.now().isoformat(),
            "session": session,
            "memories": memories,
            "memory_count": len(memories),
        }

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_path = archive_dir / f"session_{session_id[:8]}_{timestamp}.json"

        archive_path.write_text(json.dumps(archive_data, indent=2, default=str))
        return str(archive_path)

    def _generate_summary(
        self,
        duration: float,
        memories: int,
        learnings: int,
        savings: int,
    ) -> str:
        """Generate human-readable summary."""
        parts = [
            f"Session completed after {duration:.1f} minutes.",
            f"Processed {memories} memories.",
        ]

        if learnings > 0:
            parts.append(f"Extracted {learnings} key learnings for future sessions.")

        if savings > 0:
            parts.append(f"Token savings: {savings:,} tokens.")

        return " ".join(parts)


# Convenience function
async def free(
    session_id: str,
    db,
    api_client=None,
    extract_learnings: bool = True,
) -> dict:
    """
    Terminate session with proper cleanup.

    Example:
        result = await free(
            session_id="abc123",
            db=get_db(),
        )
    """
    tool = FreeTool(db, api_client)
    result = await tool.execute(session_id, extract_learnings)
    return result.to_dict()
