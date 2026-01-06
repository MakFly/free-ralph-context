"""
Session Service - Session lifecycle management
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Session
from app.models.session import SessionStatus
from app.core.config import settings


async def create_session(
    db: AsyncSession,
    task_description: str,
    max_tokens: int = None
) -> Session:
    """
    Create a new Ralph session (malloc equivalent).

    Args:
        db: Database session
        task_description: Description of the task
        max_tokens: Maximum tokens for session (default from config)

    Returns:
        Created Session object
    """
    session = Session(
        task_description=task_description,
        max_tokens=max_tokens or settings.DEFAULT_MAX_TOKENS,
        current_tokens=0,
        status=SessionStatus.ACTIVE
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return session


async def get_session(db: AsyncSession, session_id: UUID) -> Optional[Session]:
    """Get session by ID."""
    return await db.get(Session, session_id)


async def update_tokens(
    db: AsyncSession,
    session_id: UUID,
    tokens: int
) -> Session:
    """Update current token count for session."""
    session = await db.get(Session, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    session.current_tokens = tokens
    await db.commit()
    await db.refresh(session)

    return session


async def complete_session(db: AsyncSession, session_id: UUID) -> Session:
    """Mark session as completed."""
    session = await db.get(Session, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    session.status = SessionStatus.COMPLETED
    await db.commit()
    await db.refresh(session)

    return session


async def terminate_session(db: AsyncSession, session_id: UUID) -> Session:
    """Terminate session (force stop)."""
    session = await db.get(Session, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    session.status = SessionStatus.TERMINATED
    await db.commit()
    await db.refresh(session)

    return session


async def list_active_sessions(db: AsyncSession) -> List[Session]:
    """List all active sessions."""
    result = await db.execute(
        select(Session)
        .where(Session.status == SessionStatus.ACTIVE)
        .order_by(Session.created_at.desc())
    )
    return list(result.scalars().all())


async def get_session_status(db: AsyncSession, session_id: UUID) -> dict:
    """Get detailed session status."""
    session = await db.get(Session, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    return {
        "session_id": str(session.id),
        "task_description": session.task_description,
        "status": session.status.value,
        "current_tokens": session.current_tokens,
        "max_tokens": session.max_tokens,
        "context_usage": session.context_usage,
        "context_usage_percent": session.context_usage_percent,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat() if session.updated_at else None
    }
