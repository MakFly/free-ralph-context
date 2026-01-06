"""
LlmConfig model - Stores encrypted LLM API keys for AI suggestions
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class LlmProvider(str, PyEnum):
    """Supported LLM providers for AI suggestions."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    MISTRAL = "mistral"
    GOOGLE = "google"


class LlmConfig(Base):
    """Stores encrypted API keys for LLM providers."""

    __tablename__ = "llm_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String, unique=True, nullable=False, index=True)
    encrypted_api_key = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<LlmConfig {self.provider} active={self.is_active}>"
