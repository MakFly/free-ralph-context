"""
Checkpoint model - Session state snapshots
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Checkpoint(Base):
    """A snapshot of session state at a point in time."""

    __tablename__ = "checkpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    label = Column(String(255), nullable=False)
    state = Column(JSONB, default=dict)  # Full session state
    context_usage = Column(Integer, default=0)  # Percentage 0-100
    memories_snapshot = Column(JSONB, default=list)  # List of memory IDs at checkpoint
    extra_data = Column(JSONB, default=dict)  # Renamed from metadata (SQLAlchemy reserved)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("Session", back_populates="checkpoints")

    def __repr__(self):
        return f"<Checkpoint {self.label} - {self.context_usage}% - {self.created_at}>"
