"""
Session Lineage Service - Parent-child session tracking for continuity
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Session, SessionLineage, Checkpoint
from app.models.session import SessionStatus
from app.services.checkpoint_service import get_latest_checkpoint


async def get_session_lineage(
    db: AsyncSession,
    session_id: UUID
) -> List[dict]:
    """
    Get full session lineage (ancestors and descendants).

    Returns list from root to current session.
    """
    history = []
    current_id = session_id

    # Walk up to root (find all ancestors)
    while current_id:
        session = await db.get(Session, current_id)
        if not session:
            break

        history.append({
            "session_id": str(session.id),
            "task": session.task_description[:100] if session.task_description else "",
            "status": session.status.value,
            "tokens_used": session.current_tokens,
            "context_usage": session.context_usage_percent,
            "created_at": session.created_at.isoformat()
        })

        # Find parent
        result = await db.execute(
            select(SessionLineage)
            .where(SessionLineage.child_session_id == current_id)
        )
        parent_link = result.scalar_one_or_none()
        current_id = parent_link.parent_session_id if parent_link else None

    return list(reversed(history))  # Root first


async def get_children(
    db: AsyncSession,
    session_id: UUID
) -> List[dict]:
    """Get all child sessions spawned from this session."""
    result = await db.execute(
        select(SessionLineage)
        .where(SessionLineage.parent_session_id == session_id)
    )
    lineages = result.scalars().all()

    children = []
    for lineage in lineages:
        child = await db.get(Session, lineage.child_session_id)
        if child:
            children.append({
                "session_id": str(child.id),
                "task": child.task_description[:100] if child.task_description else "",
                "status": child.status.value,
                "handoff_reason": lineage.handoff_reason,
                "created_at": child.created_at.isoformat()
            })

    return children


async def restore_from_parent(
    db: AsyncSession,
    parent_session_id: UUID,
    new_task: str = None
) -> dict:
    """
    Create new session restoring context from parent's last checkpoint.

    Used when resuming after 5-hour boundary reset.
    """
    from app.services.session_service import create_session
    from app.services.checkpoint_service import restore_checkpoint

    parent = await db.get(Session, parent_session_id)
    if not parent:
        raise ValueError(f"Parent session {parent_session_id} not found")

    # Get parent's last checkpoint
    checkpoint = await get_latest_checkpoint(db, parent_session_id)

    # Create child session
    task = new_task or f"Continue: {parent.task_description[:80]}"
    child = await create_session(db, task, parent.max_tokens)

    # Create lineage link
    lineage = SessionLineage(
        parent_session_id=parent_session_id,
        child_session_id=child.id,
        handoff_reason="5-hour boundary reset",
        handoff_prompt=task,
        checkpoint_id=checkpoint.id if checkpoint else None
    )
    db.add(lineage)
    await db.commit()

    # Restore checkpoint data
    restored_data = None
    if checkpoint:
        restored_data = await restore_checkpoint(db, checkpoint.id)

    return {
        "new_session_id": str(child.id),
        "parent_session_id": str(parent_session_id),
        "checkpoint_restored": checkpoint is not None,
        "checkpoint_id": str(checkpoint.id) if checkpoint else None,
        "memories_count": len(restored_data["memories"]) if restored_data else 0,
        "task": task
    }
