"""
Unit tests for Session Service
"""

import pytest
from uuid import uuid4

from app.services.session_service import (
    create_session,
    get_session,
    update_tokens,
    complete_session,
    terminate_session,
    list_active_sessions,
    get_session_status,
)
from app.models.session import SessionStatus


@pytest.mark.asyncio
class TestSessionService:
    """Tests for session lifecycle management."""

    async def test_create_session(self, db_session):
        """Should create session with correct defaults."""
        session = await create_session(db_session, "Test task", 100000)

        assert session.id is not None
        assert session.task_description == "Test task"
        assert session.max_tokens == 100000
        assert session.current_tokens == 0
        assert session.status == SessionStatus.ACTIVE

    async def test_create_session_default_tokens(self, db_session):
        """Should use default max tokens from config."""
        session = await create_session(db_session, "Test")

        assert session.max_tokens == 200000  # Default

    async def test_get_session(self, db_session, session_factory):
        """Should retrieve session by ID."""
        created = await session_factory(task="Get test")

        retrieved = await get_session(db_session, created.id)

        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.task_description == "Get test"

    async def test_get_session_not_found(self, db_session):
        """Should return None for non-existent session."""
        result = await get_session(db_session, uuid4())

        assert result is None

    async def test_update_tokens(self, db_session, session_factory):
        """Should update token count."""
        session = await session_factory()

        updated = await update_tokens(db_session, session.id, 50000)

        assert updated.current_tokens == 50000

    async def test_complete_session(self, db_session, session_factory):
        """Should mark session as completed."""
        session = await session_factory()

        completed = await complete_session(db_session, session.id)

        assert completed.status == SessionStatus.COMPLETED

    async def test_terminate_session(self, db_session, session_factory):
        """Should mark session as terminated."""
        session = await session_factory()

        terminated = await terminate_session(db_session, session.id)

        assert terminated.status == SessionStatus.TERMINATED

    async def test_list_active_sessions(self, db_session, session_factory):
        """Should list only active sessions."""
        await session_factory(task="Active 1")
        await session_factory(task="Active 2")
        await session_factory(task="Completed", status=SessionStatus.COMPLETED)

        active = await list_active_sessions(db_session)

        assert len(active) == 2
        assert all(s.status == SessionStatus.ACTIVE for s in active)

    async def test_get_session_status(self, db_session, session_factory):
        """Should return detailed status dict."""
        session = await session_factory(task="Status test", current_tokens=50000)

        status = await get_session_status(db_session, session.id)

        assert status["session_id"] == str(session.id)
        assert status["task_description"] == "Status test"
        assert status["current_tokens"] == 50000
        assert status["context_usage"] == 0.25  # 50000/200000
        assert status["context_usage_percent"] == 25

    async def test_context_usage_calculation(self, db_session, session_factory):
        """Should calculate context usage correctly."""
        session = await session_factory(max_tokens=100000, current_tokens=75000)

        assert session.context_usage == 0.75
        assert session.context_usage_percent == 75
