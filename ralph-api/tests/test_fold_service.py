"""
Unit tests for Fold Service
"""

import pytest
from unittest.mock import patch, AsyncMock

from app.services.fold_service import (
    should_fold,
    execute_fold,
    Urgency,
    ShouldFoldResult,
    THRESHOLDS,
)


@pytest.mark.asyncio
class TestShouldFold:
    """Tests for fold decision logic."""

    async def test_should_fold_low_usage(self):
        """Should not fold when usage is low."""
        result = await should_fold(0.50)

        assert result.should_fold is False
        assert result.urgency == Urgency.LOW
        assert result.recommended_action == "continue"

    async def test_should_fold_medium_usage(self):
        """Should recommend checkpoint at 60%."""
        result = await should_fold(0.65)

        assert result.should_fold is True
        assert result.urgency == Urgency.MEDIUM
        assert "checkpoint" in result.recommended_action

    async def test_should_fold_high_usage(self):
        """Should require fold at 85%."""
        result = await should_fold(0.87)

        assert result.should_fold is True
        assert result.urgency == Urgency.HIGH
        assert "compress" in result.recommended_action

    async def test_should_fold_critical_usage(self):
        """Should require spawn at 95%."""
        result = await should_fold(0.96)

        assert result.should_fold is True
        assert result.urgency == Urgency.CRITICAL
        assert result.recommended_action == "spawn"

    async def test_threshold_boundaries(self):
        """Should respect exact threshold boundaries."""
        # Just below 60%
        result_59 = await should_fold(0.59)
        assert result_59.should_fold is False

        # Exactly 60%
        result_60 = await should_fold(0.60)
        assert result_60.should_fold is True

        # Just below 95%
        result_94 = await should_fold(0.94)
        assert result_94.urgency == Urgency.HIGH

        # Exactly 95%
        result_95 = await should_fold(0.95)
        assert result_95.urgency == Urgency.CRITICAL


@pytest.mark.asyncio
class TestExecuteFold:
    """Tests for fold execution."""

    async def test_execute_fold(self, db_session, session_factory, mock_llm):
        """Should compress and create checkpoint."""
        session = await session_factory(current_tokens=80000)

        with patch("app.services.fold_service.compress") as mock_compress:
            mock_compress.return_value = AsyncMock(
                summary="Compressed",
                decisions=["d1"],
                files=["f.py:1"],
                errors=[],
                tokens_saved=60000,
                compressed_tokens=20000,
                compression_ratio=0.25
            )

            with patch("app.services.fold_service.create_checkpoint") as mock_cp:
                mock_cp.return_value = AsyncMock(id="cp-123")

                result = await execute_fold(
                    db_session,
                    session.id,
                    "Test trajectory",
                    "test-fold"
                )

        assert result.tokens_freed == 60000
        assert result.compression_ratio == 0.25

    async def test_execute_fold_session_not_found(self, db_session):
        """Should raise error for missing session."""
        from uuid import uuid4

        with pytest.raises(ValueError, match="not found"):
            await execute_fold(db_session, uuid4(), "trajectory", "label")
