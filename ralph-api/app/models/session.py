"""
Session model - Represents a Ralph context management session
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SessionStatus(str, PyEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"


class Session(Base):
    """A context management session."""

    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_description = Column(Text, nullable=False)
    max_tokens = Column(Integer, default=200000)
    current_tokens = Column(Integer, default=0)
    status = Column(
        Enum(SessionStatus, name="session_status"),
        default=SessionStatus.ACTIVE,
        nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    memories = relationship("Memory", back_populates="session", cascade="all, delete-orphan")
    checkpoints = relationship("Checkpoint", back_populates="session", cascade="all, delete-orphan")
    metrics = relationship("MetricsHistory", back_populates="session", cascade="all, delete-orphan")

    @property
    def context_usage(self) -> float:
        """Calculate context usage as a ratio (0.0 to 1.0)."""
        if self.max_tokens == 0:
            return 0.0
        return self.current_tokens / self.max_tokens

    @property
    def context_usage_percent(self) -> int:
        """Calculate context usage as a percentage (0 to 100)."""
        return int(self.context_usage * 100)

    def __repr__(self):
        return f"<Session {self.id} - {self.status.value} - {self.context_usage_percent}%>"
