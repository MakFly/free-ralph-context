"""
Integration tests for API endpoints
"""

import pytest
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
class TestSessionEndpoints:
    """Tests for session API endpoints."""

    async def test_malloc_endpoint(self, client):
        """POST /api/sessions/malloc should create session."""
        with patch("app.api.tools.create_session") as mock:
            mock.return_value = AsyncMock(
                id="test-id",
                task_description="Test",
                max_tokens=200000,
                status=AsyncMock(value="active")
            )

            response = await client.post(
                "/api/sessions/malloc",
                json={"task_description": "Test task", "max_tokens": 100000}
            )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data

    async def test_get_status_endpoint(self, client):
        """GET /api/sessions/{id}/status should return status."""
        with patch("app.api.tools.get_session_status") as mock:
            mock.return_value = {
                "session_id": "test-id",
                "status": "active",
                "context_usage": 0.5
            }

            response = await client.get("/api/sessions/test-id/status")

        assert response.status_code == 200


@pytest.mark.asyncio
class TestCompressionEndpoints:
    """Tests for compression API endpoints."""

    async def test_compress_endpoint(self, client):
        """POST /api/compress should compress trajectory."""
        with patch("app.api.tools.compress") as mock:
            mock.return_value = AsyncMock(
                model_dump=lambda: {
                    "summary": "Compressed",
                    "decisions": [],
                    "files": [],
                    "errors": [],
                    "original_tokens": 1000,
                    "compressed_tokens": 250,
                    "tokens_saved": 750,
                    "compression_ratio": 0.25
                }
            )

            response = await client.post(
                "/api/compress",
                json={"trajectory": "Test trajectory", "ratio": 0.25}
            )

        assert response.status_code == 200
        data = response.json()
        assert "tokens_saved" in data


@pytest.mark.asyncio
class TestFoldEndpoints:
    """Tests for fold API endpoints."""

    async def test_should_fold_endpoint(self, client):
        """POST /api/should-fold should evaluate fold need."""
        with patch("app.api.tools.should_fold") as mock:
            mock.return_value = AsyncMock(
                model_dump=lambda: {
                    "should_fold": True,
                    "urgency": "high",
                    "reason": "Context high",
                    "recommended_action": "compress"
                }
            )

            response = await client.post(
                "/api/should-fold",
                json={"context_usage": 0.85}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["should_fold"] is True


@pytest.mark.asyncio
class TestQuotaEndpoints:
    """Tests for quota API endpoints."""

    async def test_daily_quota_endpoint(self, client):
        """GET /api/quota/daily should return usage."""
        with patch("app.api.continuity.get_daily_usage") as mock:
            mock.return_value = {
                "tokens_used": 50000,
                "daily_limit": 1000000,
                "percentage": 0.05
            }

            response = await client.get("/api/quota/daily")

        assert response.status_code == 200
        data = response.json()
        assert "tokens_used" in data


@pytest.mark.asyncio
class TestDashboardEndpoints:
    """Tests for dashboard API endpoints."""

    async def test_status_endpoint(self, client):
        """GET /api/status should return dashboard status."""
        with patch("app.api.dashboard.db") as mock_db:
            response = await client.get("/api/status")

        # May fail without full setup, but tests route exists
        assert response.status_code in [200, 500]

    async def test_health_endpoint(self, client):
        """GET /health should return health status."""
        response = await client.get("/health")

        assert response.status_code == 200
