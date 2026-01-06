"""
Memory model - Stores memories with hybrid search (keyword + vector)

Supports:
- Keyword search via ILIKE (fast, existing)
- Vector search via pgvector (semantic similarity)
- Hybrid search combining both (best results)
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, DateTime, Text, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base

# pgvector column type - will be registered by migration
try:
    from pgvector.sqlalchemy import Vector
    VECTOR_AVAILABLE = True
except ImportError:
    Vector = None
    VECTOR_AVAILABLE = False


class MemoryCategory(str, PyEnum):
    DECISION = "decision"
    ACTION = "action"
    ERROR = "error"
    PROGRESS = "progress"
    CONTEXT = "context"
    OTHER = "other"


class MemoryPriority(str, PyEnum):
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class Memory(Base):
    """A memory entry with hybrid search (keyword + vector)."""

    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    content = Column(Text, nullable=False)
    category = Column(
        Enum(MemoryCategory, name="memory_category"),
        default=MemoryCategory.OTHER,
        nullable=False
    )
    priority = Column(
        Enum(MemoryPriority, name="memory_priority"),
        default=MemoryPriority.NORMAL,
        nullable=False
    )

    # Vector embedding for semantic search (1536 dimensions for OpenAI/Anthropic embeddings)
    # Note: Column added via migration, nullable to support existing records
    # embedding = Column(Vector(1536), nullable=True)  # Uncomment after migration

    extra_data = Column(JSONB, default=dict)  # Renamed from metadata (SQLAlchemy reserved)
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("Session", back_populates="memories")

    # Indexes for hybrid search - defined in migration
    # __table_args__ = (
    #     Index('ix_memories_embedding', 'embedding', postgresql_using='ivfflat'),
    # )

    def touch(self):
        """Update access tracking."""
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()

    def __repr__(self):
        return f"<Memory {self.id} - {self.category.value} - {self.priority.value}>"
