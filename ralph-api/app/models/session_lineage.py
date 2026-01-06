"""
SessionLineage model - Parent-child session relationships for continuity
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SessionLineage(Base):
    """Links parent and child sessions for continuity across boundaries."""

    __tablename__ = "session_lineage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    child_session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    handoff_reason = Column(Text, nullable=True)  # Why spawn occurred
    handoff_prompt = Column(Text, nullable=True)  # Context passed to child
    checkpoint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("checkpoints.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships (using string references to avoid circular imports)
    parent_session = relationship(
        "Session",
        foreign_keys=[parent_session_id],
        backref="children_links"
    )
    child_session = relationship(
        "Session",
        foreign_keys=[child_session_id],
        backref="parent_link"
    )
    checkpoint = relationship("Checkpoint")

    def __repr__(self):
        return f"<SessionLineage {self.parent_session_id} -> {self.child_session_id}>"
