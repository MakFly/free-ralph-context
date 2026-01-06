"""
Memories API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def get_search_service():
    """Lazy import to avoid circular dependency."""
    from app.main import search_service
    return search_service

router = APIRouter()


class AddMemoryRequest(BaseModel):
    """Request model for adding a memory."""
    session_id: str = Field(..., description="Session identifier")
    memory_id: str = Field(..., description="Unique memory identifier")
    content: str = Field(..., description="Memory content")
    metadata: Optional[dict] = Field(default=None, description="Optional metadata")


@router.post("/")
async def add_memory(request: AddMemoryRequest):
    """
    Add a memory with automatic embedding generation.

    - Embedding generated and cached automatically
    - Stored in Redis for fast retrieval
    - Indexed for semantic search
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    try:
        result = await svc.add_memory(
            session_id=request.session_id,
            memory_id=request.memory_id,
            content=request.content,
            metadata=request.metadata,
        )

        return {
            "success": True,
            "memory": result,
        }
    except Exception as e:
        logger.error(f"Failed to add memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}")
async def get_session_memories(
    session_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
):
    """
    Get all memories in a session.
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    try:
        memories = await svc.get_session_memories(session_id)

        return {
            "session_id": session_id,
            "count": len(memories),
            "memories": memories[:limit],
        }
    except Exception as e:
        logger.error(f"Failed to get memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}/{memory_id}")
async def delete_memory(session_id: str, memory_id: str):
    """
    Delete a specific memory.
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    try:
        deleted = await svc.delete_memory(session_id, memory_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="Memory not found")

        return {
            "success": True,
            "message": f"Memory {memory_id} deleted from session {session_id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))
