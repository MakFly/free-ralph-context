"""
Unit tests for Compression Service
"""

import pytest
from unittest.mock import patch, AsyncMock

from app.services.compression_service import (
    compress,
    _extract_section,
    _extract_list_section,
    CompressResult,
)


@pytest.mark.asyncio
class TestCompressionService:
    """Tests for trajectory compression."""

    async def test_compress_basic(self, mock_llm):
        """Should compress trajectory and return structured result."""
        trajectory = "User asked to create a function. I created foo.py with the function."

        with patch("app.services.compression_service.get_llm_provider", return_value=mock_llm):
            result = await compress(trajectory, ratio=0.25)

        assert isinstance(result, CompressResult)
        assert result.summary is not None
        assert result.original_tokens > 0
        assert result.compressed_tokens > 0
        assert result.tokens_saved >= 0

    async def test_compress_preserves_decisions(self, mock_llm):
        """Should extract decisions from compressed output."""
        mock_llm.complete.return_value = """SUMMARY:
Created authentication system.

DECISIONS:
- Use JWT for tokens
- Store in Redis

FILES:
- auth.py:15

ERRORS:
- None"""

        with patch("app.services.compression_service.get_llm_provider", return_value=mock_llm):
            result = await compress("test trajectory")

        assert len(result.decisions) == 2
        assert "JWT" in result.decisions[0]

    async def test_compress_preserves_files(self, mock_llm):
        """Should extract file paths from compressed output."""
        mock_llm.complete.return_value = """SUMMARY:
Modified files.

DECISIONS:
- None

FILES:
- src/main.py:100
- tests/test_main.py:50

ERRORS:
- None"""

        with patch("app.services.compression_service.get_llm_provider", return_value=mock_llm):
            result = await compress("test")

        assert len(result.files) == 2
        assert "src/main.py:100" in result.files

    async def test_compression_ratio(self, mock_llm):
        """Should calculate compression ratio correctly."""
        # Mock returns shorter text than input
        mock_llm.complete.return_value = "Short summary."

        with patch("app.services.compression_service.get_llm_provider", return_value=mock_llm):
            result = await compress("A" * 1000, ratio=0.25)

        assert result.compression_ratio < 1.0
        assert result.tokens_saved > 0


class TestExtractionHelpers:
    """Tests for section extraction functions."""

    def test_extract_section(self):
        """Should extract named section."""
        text = """SUMMARY:
This is the summary.

DECISIONS:
- Decision 1"""

        result = _extract_section(text, "SUMMARY")

        assert result == "This is the summary."

    def test_extract_section_not_found(self):
        """Should return empty string if section missing."""
        result = _extract_section("No sections here", "SUMMARY")

        assert result == ""

    def test_extract_list_section(self):
        """Should extract list items from section."""
        text = """DECISIONS:
- First decision
- Second decision
- Third decision

FILES:
- file.py"""

        result = _extract_list_section(text, "DECISIONS")

        assert len(result) == 3
        assert result[0] == "First decision"
        assert result[2] == "Third decision"

    def test_extract_list_section_empty(self):
        """Should return empty list if no items."""
        result = _extract_list_section("DECISIONS:\n\nFILES:", "DECISIONS")

        assert result == []
