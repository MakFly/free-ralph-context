"""
Pytest fixtures for Ralph API tests
"""

import pytest
import asyncio
from typing import AsyncGenerator
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient, ASGITransport

from app.core.database import Base
from app.main import app
from app.models import Session, Memory, Checkpoint
from app.models.session import SessionStatus
from app.models.memory import MemoryCategory, MemoryPriority


# Test database URL (SQLite for speed)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# === Factory Fixtures ===

@pytest.fixture
def session_factory(db_session):
    """Factory to create test sessions."""
    async def _create(
        task: str = "Test task",
        max_tokens: int = 200000,
        current_tokens: int = 0,
        status: SessionStatus = SessionStatus.ACTIVE
    ) -> Session:
        session = Session(
            id=uuid4(),
            task_description=task,
            max_tokens=max_tokens,
            current_tokens=current_tokens,
            status=status
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        return session
    return _create


@pytest.fixture
def memory_factory(db_session):
    """Factory to create test memories."""
    async def _create(
        session_id,
        content: str = "Test memory",
        category: MemoryCategory = MemoryCategory.OTHER,
        priority: MemoryPriority = MemoryPriority.NORMAL
    ) -> Memory:
        memory = Memory(
            id=uuid4(),
            session_id=session_id,
            content=content,
            category=category,
            priority=priority
        )
        db_session.add(memory)
        await db_session.commit()
        await db_session.refresh(memory)
        return memory
    return _create


@pytest.fixture
def checkpoint_factory(db_session):
    """Factory to create test checkpoints."""
    async def _create(
        session_id,
        label: str = "test-checkpoint",
        context_usage: int = 50
    ) -> Checkpoint:
        checkpoint = Checkpoint(
            id=uuid4(),
            session_id=session_id,
            label=label,
            state={},
            context_usage=context_usage,
            memories_snapshot=[]
        )
        db_session.add(checkpoint)
        await db_session.commit()
        await db_session.refresh(checkpoint)
        return checkpoint
    return _create


# === Mock Fixtures ===

@pytest.fixture
def mock_llm():
    """Mock LLM provider."""
    mock = AsyncMock()
    mock.complete.return_value = """SUMMARY:
Test compression completed.

DECISIONS:
- Decision 1
- Decision 2

FILES:
- file.py:10

ERRORS:
- None"""
    mock.name = "mock"
    mock.model = "mock-model"
    return mock


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    mock = MagicMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    mock.ping = AsyncMock(return_value=True)
    return mock
