"""
Configuration settings for Ralph API
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # API Settings
    API_TITLE: str = "Ralph API"
    API_VERSION: str = "2.0.0"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Database Settings (PostgreSQL + pgvector)
    DATABASE_URL: str = "postgresql+asyncpg://ralph:ralph_secret@localhost:5432/ralph"
    DATABASE_ECHO: bool = False  # Set True for SQL logging

    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None
    REDIS_DECODE_RESPONSES: bool = False

    # Search Settings
    SEARCH_TOP_K: int = 5
    SEARCH_MIN_SCORE: float = 0.5

    # Compression Settings
    COMPRESSION_THRESHOLD: float = 0.70  # 70% context usage
    COMPRESSION_RATIO: float = 0.25  # Target compression ratio

    # Session Settings
    DEFAULT_MAX_TOKENS: int = 200000
    SESSION_BOUNDARY_HOURS: float = 4.0  # Checkpoint at 4h (before 5h reset)
    CONTEXT_CRITICAL_THRESHOLD: float = 0.90
    DAILY_QUOTA_WARNING_THRESHOLD: float = 0.80

    # LLM Provider Settings
    RALPH_LLM: str = "claude-3-5-sonnet"  # Default LLM provider
    ANTHROPIC_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    GOOGLE_API_KEY: str | None = None
    MISTRAL_API_KEY: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
