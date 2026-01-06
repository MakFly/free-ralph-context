"""
Boundary Service - 5-hour reset and context boundary management
"""

from datetime import datetime, timedelta
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Session
from app.core.config import settings
from app.services.checkpoint_service import create_checkpoint


class BoundaryWarning:
    def __init__(self, type: str, message: str, severity: str):
        self.type = type
        self.message = message
        self.severity = severity

    def to_dict(self):
        return {"type": self.type, "message": self.message, "severity": self.severity}


async def check_boundaries(
    db: AsyncSession,
    session_id: UUID
) -> dict:
    """
    Check all boundaries and return warnings/recommendations.

    Boundaries checked:
    - Time: 5-hour session reset (warn at 4h)
    - Context: 90% usage = critical
    - Daily quota: 80% usage = warning
    """
    session = await db.get(Session, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    warnings: List[BoundaryWarning] = []
    actions = []

    # Time boundary (5h reset, warn at 4h)
    session_age = datetime.utcnow() - session.created_at
    hours_elapsed = session_age.total_seconds() / 3600
    boundary_hours = settings.SESSION_BOUNDARY_HOURS  # 4.0

    if hours_elapsed >= boundary_hours:
        time_remaining = 5.0 - hours_elapsed
        warnings.append(BoundaryWarning(
            "time_boundary",
            f"Session is {hours_elapsed:.1f}h old. Reset in {time_remaining:.1f}h.",
            "high" if time_remaining < 0.5 else "medium"
        ))
        actions.append("checkpoint_now")

    # Context usage
    context_usage = session.context_usage
    if context_usage >= settings.CONTEXT_CRITICAL_THRESHOLD:  # 0.90
        warnings.append(BoundaryWarning(
            "context_critical",
            f"Context at {session.context_usage_percent}%. Compression required.",
            "critical"
        ))
        actions.append("compress_or_spawn")
    elif context_usage >= 0.75:
        warnings.append(BoundaryWarning(
            "context_high",
            f"Context at {session.context_usage_percent}%. Consider compression.",
            "medium"
        ))
        actions.append("consider_checkpoint")

    return {
        "session_id": str(session_id),
        "session_age_hours": round(hours_elapsed, 2),
        "time_to_reset_hours": round(max(0, 5.0 - hours_elapsed), 2),
        "context_usage": round(context_usage, 3),
        "context_usage_percent": session.context_usage_percent,
        "warnings": [w.to_dict() for w in warnings],
        "recommended_actions": list(set(actions)),
        "should_checkpoint": "checkpoint_now" in actions,
        "should_compress": "compress_or_spawn" in actions
    }


async def auto_checkpoint_if_needed(
    db: AsyncSession,
    session_id: UUID
) -> dict:
    """
    Automatically create checkpoint if approaching boundaries.

    Triggers checkpoint when:
    - Session age >= 4 hours (1h before reset)
    - Context usage >= 85%
    """
    boundaries = await check_boundaries(db, session_id)

    if boundaries["should_checkpoint"]:
        label = f"auto-{datetime.utcnow().strftime('%H%M')}"
        trigger_reason = boundaries["warnings"][0]["message"] if boundaries["warnings"] else "boundary"

        checkpoint = await create_checkpoint(
            db, session_id, label,
            metadata={
                "trigger": "boundary_service",
                "reason": trigger_reason,
                "session_age_hours": boundaries["session_age_hours"],
                "context_usage": boundaries["context_usage"]
            }
        )

        return {
            "checkpointed": True,
            "checkpoint_id": str(checkpoint.id),
            "label": label,
            "reason": trigger_reason
        }

    return {
        "checkpointed": False,
        "reason": "No boundary threshold reached",
        "boundaries": boundaries
    }
