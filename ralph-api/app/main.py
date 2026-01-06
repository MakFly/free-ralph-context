"""
Ralph API - FastAPI backend for Ralph MCP

Provides:
- AI suggestions via LLM APIs (Anthropic, OpenAI, Mistral, Google)
- Pattern learning and retrieval
- Dashboard SSE streaming
- MCP health monitoring
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import asyncio

from app.api import search, memories, health, tools, sse, dashboard, patterns, ai
from app.core.config import settings
from app.core.redis_client import get_redis
from app.core.database import init_db, close_db
from app.services.transcript_watcher import get_transcript_watcher
from app.services.search_service import SearchService

# MCP health polling task
_mcp_health_task: asyncio.Task | None = None
_last_mcp_status: str | None = None
search_service: SearchService | None = None


async def poll_mcp_health():
    """Background task to poll MCP server health and emit SSE events on status change."""
    global _last_mcp_status

    while True:
        try:
            mcp_status = await health.check_mcp_health()
            current_status = mcp_status.status

            # Emit SSE only when status changes
            if current_status != _last_mcp_status:
                logger.info(f"MCP status changed: {_last_mcp_status} -> {current_status}")
                await sse.emit_mcp_status(
                    status=mcp_status.status,
                    connected=mcp_status.connected,
                    tools_count=mcp_status.tools_count,
                    error=mcp_status.error,
                )
                _last_mcp_status = current_status

            # Poll every 30 seconds
            await asyncio.sleep(30)

        except asyncio.CancelledError:
            logger.info("MCP health polling cancelled")
            break
        except Exception as e:
            logger.error(f"Error polling MCP health: {e}")
            await asyncio.sleep(30)


# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    global search_service

    # Startup
    logger.info("🚀 Starting Ralph API...")
    logger.info(f"🔴 Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
    logger.info(f"🐘 PostgreSQL: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'configured'}")

    try:
        # Initialize Redis connection
        redis_client = get_redis()
        await redis_client.ping()
        logger.info("✅ Redis connection established")

        # Initialize search service (keyword-based, no embeddings)
        search_service = SearchService(redis_client=redis_client)
        logger.info("✅ Search service initialized")

        # Initialize database
        await init_db()
        logger.info("✅ PostgreSQL database initialized")

        # Start event-driven transcript watcher (inotify, no polling!)
        transcript_watcher = get_transcript_watcher()
        transcript_watcher.sse_manager = sse.sse_manager
        await transcript_watcher.start()
        logger.info(f"✅ Transcript watcher started ({len(transcript_watcher.sources)} sources - event-driven)")

        # Start MCP health polling (background task)
        global _mcp_health_task
        _mcp_health_task = asyncio.create_task(poll_mcp_health())
        logger.info("✅ MCP health polling started (every 30s)")

        yield

    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise

    finally:
        # Shutdown
        logger.info("🛑 Shutting down Ralph API...")

        # Stop MCP health polling
        if _mcp_health_task:
            _mcp_health_task.cancel()
            try:
                await _mcp_health_task
            except asyncio.CancelledError:
                pass
            logger.info("✅ MCP health polling stopped")

        # Stop transcript watcher
        transcript_watcher = get_transcript_watcher()
        await transcript_watcher.stop()
        logger.info("✅ Transcript watcher stopped")

        if search_service:
            await search_service.close()
        await close_db()
        logger.info("✅ All services stopped")


# Create FastAPI app
app = FastAPI(
    title="Ralph API",
    description="AI-powered context management API for Ralph MCP",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(search.router, prefix="/search", tags=["Search"])
app.include_router(memories.router, prefix="/memories", tags=["Memories"])
app.include_router(dashboard.router)  # Dashboard endpoints at /api/* (must be before tools.router for route priority)
app.include_router(tools.router)  # MCP tool endpoints at /api/*
app.include_router(sse.router)  # SSE streaming at /events
app.include_router(patterns.router)  # Pattern management at /api/patterns/*
app.include_router(ai.router)  # AI suggestions at /api/ai/*


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Ralph API",
        "version": "2.0.0",
        "description": "Context management API for Claude Code",
        "features": [
            "AI suggestions via LLM APIs",
            "Pattern learning",
            "Real-time dashboard",
            "MCP health monitoring"
        ],
        "endpoints": {
            "status": "/status",
            "events": "/events (SSE)",
            "tools": "/api/*",
            "docs": "/docs",
        },
    }


# Alias /status for dashboard compatibility
@app.get("/status")
async def status_alias():
    """Dashboard status endpoint - uses transcript watcher for real-time data."""
    transcript_watcher = get_transcript_watcher()
    return await transcript_watcher.get_status()


@app.get("/stats")
async def stats():
    """Get API statistics."""
    redis_client = get_redis()
    info = await redis_client.info()

    return {
        "redis": {
            "connected": True,
            "memory_used": info.get("used_memory_human", "unknown"),
            "total_keys": info.get("db0", ""),
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
