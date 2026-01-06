"""
Checkpoint Service - Session state snapshots
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Session, Memory, Checkpoint


async def create_checkpoint(
    db: AsyncSession,
    session_id: UUID,
    label: str,
    metadata: dict = None
) -> Checkpoint:
    """
    Create a named snapshot of the current session state.

    Args:
        db: Database session
        session_id: Session to checkpoint
        label: Human-readable label for this checkpoint
        metadata: Optional additional metadata

    Returns:
        Created Checkpoint object
    """
    # Get current session
    session = await db.get(Session, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Get all current memories
    result = await db.execute(
        select(Memory).where(Memory.session_id == session_id)
    )
    memories = result.scalars().all()
    memory_ids = [str(m.id) for m in memories]

    # Calculate context usage percentage
    context_usage = session.context_usage_percent

    # Create checkpoint
    checkpoint = Checkpoint(
        session_id=session_id,
        label=label,
        state={
            "task_description": session.task_description,
            "current_tokens": session.current_tokens,
            "max_tokens": session.max_tokens,
            "status": session.status.value,
        },
        context_usage=context_usage,
        memories_snapshot=memory_ids,
        metadata=metadata or {}
    )

    db.add(checkpoint)
    await db.commit()
    await db.refresh(checkpoint)

    return checkpoint


async def restore_checkpoint(
    db: AsyncSession,
    checkpoint_id: UUID
) -> dict:
    """
    Restore session state from a checkpoint.

    Args:
        db: Database session
        checkpoint_id: Checkpoint to restore from

    Returns:
        Dict with checkpoint data and memories
    """
    checkpoint = await db.get(Checkpoint, checkpoint_id)
    if not checkpoint:
        raise ValueError(f"Checkpoint {checkpoint_id} not found")

    # Get memories from snapshot
    memory_ids = [UUID(mid) for mid in checkpoint.memories_snapshot]
    result = await db.execute(
        select(Memory).where(Memory.id.in_(memory_ids))
    )
    memories = result.scalars().all()

    return {
        "checkpoint_id": str(checkpoint.id),
        "label": checkpoint.label,
        "state": checkpoint.state,
        "context_usage": checkpoint.context_usage,
        "memories": [
            {
                "id": str(m.id),
                "content": m.content,
                "category": m.category.value,
                "priority": m.priority.value
            }
            for m in memories
        ],
        "created_at": checkpoint.created_at.isoformat()
    }


async def list_checkpoints(
    db: AsyncSession,
    session_id: UUID
) -> List[dict]:
    """List all checkpoints for a session."""
    result = await db.execute(
        select(Checkpoint)
        .where(Checkpoint.session_id == session_id)
        .order_by(Checkpoint.created_at.desc())
    )
    checkpoints = result.scalars().all()

    return [
        {
            "id": str(c.id),
            "label": c.label,
            "context_usage": c.context_usage,
            "memory_count": len(c.memories_snapshot),
            "created_at": c.created_at.isoformat()
        }
        for c in checkpoints
    ]


async def get_latest_checkpoint(
    db: AsyncSession,
    session_id: UUID
) -> Optional[Checkpoint]:
    """Get the most recent checkpoint for a session."""
    result = await db.execute(
        select(Checkpoint)
        .where(Checkpoint.session_id == session_id)
        .order_by(Checkpoint.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
