"""
MetricsHistory model - Time-series metrics tracking
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class MetricsHistory(Base):
    """Historical metrics for analytics and monitoring."""

    __tablename__ = "metrics_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    metric_type = Column(String(50), nullable=False, index=True)  # context_usage, memory_count, etc.
    metric_value = Column(Float, nullable=False)
    extra_data = Column(JSONB, default=dict)  # Renamed from metadata (SQLAlchemy reserved)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    session = relationship("Session", back_populates="metrics")

    def __repr__(self):
        return f"<Metrics {self.metric_type}={self.metric_value} @ {self.timestamp}>"
