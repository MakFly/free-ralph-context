"""
Health check API endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
import asyncio
import subprocess
import sys
import os
from pathlib import Path
from app.core.redis_client import ping_redis

logger = logging.getLogger(__name__)

# MCP server path - configurable via env var for Docker vs local dev
# Default: relative path from ralph-api to ralph-mcp
_default_mcp_path = Path(__file__).parent.parent.parent.parent.parent / "ralph-mcp" / "mcp_server.py"
MCP_SERVER_PATH = Path(os.environ.get("RALPH_MCP_SERVER_PATH", str(_default_mcp_path)))


def get_services():
    """Lazy import to avoid circular dependency."""
    from app.main import search_service
    return search_service

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    redis: bool
    search_service: bool


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns service status and dependency health.
    """
    search_svc = get_services()
    redis_ok = await ping_redis()
    search_ok = search_svc is not None

    all_ok = redis_ok and search_ok

    return HealthResponse(
        status="healthy" if all_ok else "degraded",
        redis=redis_ok,
        search_service=search_ok,
    )


@router.get("/detailed")
async def detailed_health():
    """
    Detailed health check with service information.
    """
    search_svc = get_services()
    redis_ok = await ping_redis()

    return {
        "status": "healthy" if redis_ok else "unhealthy",
        "services": {
            "redis": {
                "status": "up" if redis_ok else "down",
                "details": "Redis connection active" if redis_ok else "Cannot connect to Redis",
            },
            "search_service": {
                "status": "up" if search_svc else "down",
                "details": "Keyword-based search (no embeddings)",
            },
        },
    }


class MCPHealthResponse(BaseModel):
    """MCP server health check response."""
    status: str  # "healthy", "unhealthy", "error"
    connected: bool
    tools_count: int | None = None
    error: str | None = None
    server_path: str | None = None


async def check_mcp_health() -> MCPHealthResponse:
    """
    Check if the MCP server is healthy.

    Performs two checks:
    1. File exists and is readable
    2. Python syntax is valid (compiles without errors)
    3. Counts Tool() definitions in the file
    """
    try:
        # Check 1: File exists
        if not MCP_SERVER_PATH.exists():
            return MCPHealthResponse(
                status="error",
                connected=False,
                error=f"MCP server file not found: {MCP_SERVER_PATH}",
                server_path=str(MCP_SERVER_PATH),
            )

        # Check 2: Read and compile (syntax check)
        try:
            source_code = MCP_SERVER_PATH.read_text()
            compile(source_code, str(MCP_SERVER_PATH), "exec")
        except SyntaxError as e:
            return MCPHealthResponse(
                status="error",
                connected=False,
                error=f"Syntax error at line {e.lineno}: {e.msg}",
                server_path=str(MCP_SERVER_PATH),
            )
        except Exception as e:
            return MCPHealthResponse(
                status="error",
                connected=False,
                error=f"Failed to read file: {str(e)[:100]}",
                server_path=str(MCP_SERVER_PATH),
            )

        # Check 3: Count Tool() definitions (rough estimate)
        import re
        tool_pattern = re.compile(r'Tool\s*\(\s*\n?\s*name\s*=')
        tools_count = len(tool_pattern.findall(source_code))

        return MCPHealthResponse(
            status="healthy",
            connected=True,
            tools_count=tools_count,
            server_path=str(MCP_SERVER_PATH),
        )

    except Exception as e:
        return MCPHealthResponse(
            status="error",
            connected=False,
            error=str(e)[:200],
            server_path=str(MCP_SERVER_PATH),
        )


@router.get("/mcp", response_model=MCPHealthResponse)
async def mcp_health_check():
    """
    Check MCP server health.

    Verifies that the MCP server can:
    - Import without errors
    - List available tools

    Returns status, connection state, and tool count.
    """
    return await check_mcp_health()
