"""
Search API endpoints
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


class SearchRequest(BaseModel):
    """Request model for semantic search."""
    query: str = Field(..., description="Search query text")
    session_id: Optional[str] = Field(None, description="Session ID to search within (null = all sessions)")
    top_k: int = Field(default=5, ge=1, le=50, description="Number of results")
    min_score: float = Field(default=0.5, ge=0, le=1, description="Minimum similarity score")


class AddMemoryRequest(BaseModel):
    """Request model for adding a memory."""
    session_id: str = Field(..., description="Session identifier")
    memory_id: str = Field(..., description="Unique memory identifier")
    content: str = Field(..., description="Memory content")
    metadata: Optional[dict] = Field(default=None, description="Optional metadata")


@router.post("/")
async def search_memories(request: SearchRequest):
    """
    Semantic search within memories.

    - Uses cosine similarity on embeddings
    - Searches within session or across all sessions
    - Returns ranked results with similarity scores
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    try:
        if request.session_id:
            results = await svc.search(
                session_id=request.session_id,
                query=request.query,
                top_k=request.top_k,
                min_score=request.min_score,
            )
        else:
            results = await svc.search_all_sessions(
                query=request.query,
                top_k=request.top_k,
                min_score=request.min_score,
            )

        return {
            "query": request.query,
            "session_id": request.session_id,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}")
async def search_session(
    session_id: str,
    query: str = Query(..., description="Search query"),
    top_k: int = Query(5, ge=1, le=50, description="Number of results"),
):
    """
    Search within a specific session using GET request.
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    try:
        results = await svc.search(
            session_id=session_id,
            query=query,
            top_k=top_k,
        )

        return {
            "session_id": session_id,
            "query": query,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        logger.error(f"Session search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
