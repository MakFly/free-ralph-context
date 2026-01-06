"""
SSE Streaming - Server-Sent Events for dashboard real-time updates

Events:
- init: Initial status on connection
- update: Status changes (projects, tokens)
- metrics:update: Metrics history update
- sync:progress: Sync progress notification
- ping: Keepalive every 30s
"""

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from typing import List
import asyncio
import json
from datetime import datetime

router = APIRouter(tags=["sse"])

# Connected clients
_clients: List[asyncio.Queue] = []


class SSEManager:
    """Manager for SSE broadcasting."""

    @staticmethod
    async def broadcast(event: str, data: dict):
        """Broadcast event to all connected clients."""
        message = {"event": event, "data": data}
        disconnected = []

        for queue in _clients:
            try:
                await queue.put(message)
            except Exception:
                disconnected.append(queue)

        # Cleanup disconnected
        for q in disconnected:
            if q in _clients:
                _clients.remove(q)

    @staticmethod
    def client_count() -> int:
        """Get number of connected clients."""
        return len(_clients)


# Global manager instance
sse_manager = SSEManager()


async def broadcast(event: str, data: dict):
    """Broadcast event to all connected clients."""
    await sse_manager.broadcast(event, data)


@router.get("/events")
async def sse_events():
    """SSE endpoint for dashboard real-time updates."""

    queue = asyncio.Queue()
    _clients.append(queue)

    async def event_generator():
        try:
            # Send initial status from transcript watcher (event-driven)
            from app.services.transcript_watcher import get_transcript_watcher

            transcript_watcher = get_transcript_watcher()
            transcript_watcher.sse_manager = sse_manager  # Connect SSE manager

            init_data = await transcript_watcher.get_status()
            yield {"event": "init", "data": json.dumps(init_data)}

            # Stream updates
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30)
                    yield {
                        "event": message["event"],
                        "data": json.dumps(message["data"])
                    }
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield {"event": "ping", "data": json.dumps({"ts": datetime.utcnow().isoformat()})}

        except asyncio.CancelledError:
            pass
        finally:
            if queue in _clients:
                _clients.remove(queue)

    return EventSourceResponse(event_generator())


# Helper to broadcast from anywhere
async def emit_update(sessions: list):
    """Emit update event with current sessions."""
    await broadcast("update", {
        "projectCount": len(sessions),
        "projects": sessions,
        "timestamp": datetime.utcnow().isoformat()
    })


async def emit_metrics(session_id: str, metric_type: str, value: float):
    """Emit metrics update."""
    await broadcast("metrics:update", {
        "session_id": session_id,
        "metric_type": metric_type,
        "value": value,
        "timestamp": datetime.utcnow().isoformat()
    })


async def emit_sync_progress(project: str, status: str, progress: int):
    """Emit sync progress."""
    await broadcast("sync:progress", {
        "project": project,
        "status": status,
        "progress": progress,
        "timestamp": datetime.utcnow().isoformat()
    })


async def emit_mcp_status(status: str, connected: bool, tools_count: int | None = None, error: str | None = None):
    """Emit MCP server status update."""
    await broadcast("mcp:status", {
        "status": status,
        "connected": connected,
        "tools_count": tools_count,
        "error": error,
        "timestamp": datetime.utcnow().isoformat()
    })
