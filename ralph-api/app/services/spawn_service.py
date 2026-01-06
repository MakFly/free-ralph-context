"""
Spawn Service - Subprocess spawning decisions
"""

from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Session, SessionLineage
from app.services.checkpoint_service import create_checkpoint, get_latest_checkpoint
from app.services.llm_provider import get_llm_provider


class ShouldSpawnResult(BaseModel):
    """Result of should_spawn evaluation."""
    should_spawn: bool
    reason: str
    handoff_prompt: Optional[str] = None
    preserve_context: List[str] = []
    estimated_progress: int = 0


class SpawnResult(BaseModel):
    """Result of spawn execution."""
    parent_session_id: str
    child_session_id: str
    handoff_prompt: str
    checkpoint_id: Optional[str] = None


# Spawn triggers from original ralph-mcp
SPAWN_TRIGGERS = {
    "context_critical": "Context > 90% AND task < 80% complete",
    "loop_detected": "Same output 3+ times",
    "error_cascade": "Consecutive errors > 5"
}


async def should_spawn(
    context_usage: float,
    task_progress: int = 50,
    recent_outputs: List[str] = None,
    error_count: int = 0
) -> ShouldSpawnResult:
    """
    Determine if should spawn a subprocess.

    Args:
        context_usage: Current context usage (0.0 to 1.0)
        task_progress: Estimated task completion percentage
        recent_outputs: Last few outputs for loop detection
        error_count: Count of consecutive errors

    Returns:
        ShouldSpawnResult with recommendation
    """
    # Don't spawn if almost done
    if task_progress >= 90:
        return ShouldSpawnResult(
            should_spawn=False,
            reason="Task nearly complete (>=90%), finish in current session",
            estimated_progress=task_progress
        )

    # Context critical - must spawn
    if context_usage >= 0.90 and task_progress < 80:
        return ShouldSpawnResult(
            should_spawn=True,
            reason="Context usage critical (>=90%), spawning subprocess",
            preserve_context=["decisions", "files", "errors"],
            estimated_progress=task_progress
        )

    # Loop detection
    if recent_outputs and len(recent_outputs) >= 3:
        last_three = recent_outputs[-3:]
        if len(set(last_three)) == 1:
            return ShouldSpawnResult(
                should_spawn=True,
                reason="Loop detected (same output 3+ times), fresh context needed",
                preserve_context=["decisions", "files"],
                estimated_progress=task_progress
            )

    # Error cascade
    if error_count > 5:
        return ShouldSpawnResult(
            should_spawn=True,
            reason="Too many consecutive errors (>5), resetting context",
            preserve_context=["errors", "decisions"],
            estimated_progress=task_progress
        )

    # Making progress - continue
    return ShouldSpawnResult(
        should_spawn=False,
        reason="Making steady progress, continue current session",
        estimated_progress=task_progress
    )


async def execute_spawn(
    db: AsyncSession,
    parent_session_id: UUID,
    handoff_reason: str,
    task_description: str = None
) -> SpawnResult:
    """
    Execute spawn: create child session linked to parent.

    Args:
        db: Database session
        parent_session_id: Parent session to spawn from
        handoff_reason: Why we're spawning
        task_description: Optional new task description

    Returns:
        SpawnResult with new session info
    """
    from app.services.session_service import create_session
    from app.models.session import SessionStatus

    # Get parent session
    parent = await db.get(Session, parent_session_id)
    if not parent:
        raise ValueError(f"Parent session {parent_session_id} not found")

    # Create checkpoint of parent state
    checkpoint = await create_checkpoint(
        db, parent_session_id,
        label=f"spawn-{handoff_reason[:20]}",
        metadata={"handoff_reason": handoff_reason}
    )

    # Generate handoff prompt
    handoff_prompt = await _generate_handoff_prompt(parent, handoff_reason)

    # Create child session
    child = await create_session(
        db,
        task_description or handoff_prompt,
        parent.max_tokens
    )

    # Create lineage record
    lineage = SessionLineage(
        parent_session_id=parent_session_id,
        child_session_id=child.id,
        handoff_reason=handoff_reason,
        handoff_prompt=handoff_prompt,
        checkpoint_id=checkpoint.id
    )
    db.add(lineage)

    # Mark parent as completed
    parent.status = SessionStatus.COMPLETED
    await db.commit()

    return SpawnResult(
        parent_session_id=str(parent_session_id),
        child_session_id=str(child.id),
        handoff_prompt=handoff_prompt,
        checkpoint_id=str(checkpoint.id)
    )


async def _generate_handoff_prompt(session: Session, reason: str) -> str:
    """Generate a concise handoff prompt for the new session."""
    llm = get_llm_provider()

    prompt = f"""Generate a concise handoff prompt for a new AI coding session.

Original task: {session.task_description}
Reason for handoff: {reason}
Progress: ~{session.context_usage_percent}% context used

Create a 2-3 sentence prompt that:
1. Summarizes what was being worked on
2. States what needs to be continued
3. Is actionable for the new session

Output ONLY the handoff prompt, nothing else."""

    return await llm.complete(prompt, max_tokens=200)
