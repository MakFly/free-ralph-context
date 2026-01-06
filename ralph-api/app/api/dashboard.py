"""
Dashboard REST Endpoints - Status, metrics, memories, checkpoints
"""

from fastapi import APIRouter, Depends, Query, Body, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.models import Session, MetricsHistory
from app.models.session import SessionStatus


# Pydantic model for memory updates
class MemoryUpdateRequest(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/status")
async def get_status(db: AsyncSession = Depends(get_db)):
    """Get current Ralph status for dashboard."""
    # Get active sessions
    result = await db.execute(
        select(Session).where(Session.status == SessionStatus.ACTIVE)
    )
    sessions = result.scalars().all()

    # Calculate totals
    total_tokens = sum(s.current_tokens for s in sessions)

    return {
        "connected": True,
        "projectCount": len(sessions),
        "projects": [
            {
                "id": str(s.id),
                "name": s.task_description[:50] if s.task_description else "Untitled",
                "projectPath": "",
                "currentTokens": s.current_tokens,
                "maxTokens": s.max_tokens,
                "contextUsage": s.context_usage,
                "pct": s.context_usage_percent,
                "lastUpdated": s.updated_at.isoformat() if s.updated_at else s.created_at.isoformat(),
                "status": s.status.value,
                "isRealData": True
            }
            for s in sessions
        ],
        "sources": [{"name": "ralph-api", "color": "#3B82F6"}],
        "totalTokens": total_tokens,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/metrics/history")
async def get_metrics_history(
    session_id: Optional[str] = None,
    metric_type: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get historical metrics data."""
    query = select(MetricsHistory).order_by(MetricsHistory.timestamp.desc())

    if session_id:
        query = query.where(MetricsHistory.session_id == session_id)
    if metric_type:
        query = query.where(MetricsHistory.metric_type == metric_type)
    if start_time:
        query = query.where(MetricsHistory.timestamp >= start_time)
    if end_time:
        query = query.where(MetricsHistory.timestamp <= end_time)

    query = query.limit(limit)
    result = await db.execute(query)
    metrics = result.scalars().all()

    return {
        "count": len(metrics),
        "metrics": [
            {
                "id": str(m.id),
                "session_id": str(m.session_id),
                "metric_type": m.metric_type,
                "value": m.metric_value,
                "timestamp": m.timestamp.isoformat()
            }
            for m in metrics
        ]
    }


@router.get("/sync/status")
async def get_sync_status(db: AsyncSession = Depends(get_db)):
    """Get sync status (for compatibility with dashboard)."""
    result = await db.execute(
        select(func.count(Session.id)).where(Session.status == SessionStatus.ACTIVE)
    )
    active_count = result.scalar() or 0

    return {
        "total": active_count,
        "synced": active_count,
        "pending": 0,
        "failed": 0,
        "lastSync": datetime.utcnow().isoformat()
    }


@router.get("/llm/status")
async def get_llm_status(db: AsyncSession = Depends(get_db)):
    """Get LLM provider connection status from database."""
    from fastapi import HTTPException
    from app.models.llm_config import LlmConfig

    # Get all active LLM configs from database
    result = await db.execute(
        select(LlmConfig).where(LlmConfig.is_active == True)
    )
    active_configs = result.scalars().all()

    # If no active configs, return 404
    if not active_configs:
        raise HTTPException(
            status_code=404,
            detail="No LLM providers configured. Please configure at least one LLM provider."
        )

    # Build response with all active providers
    providers = []
    for config in active_configs:
        # Mask API key for display
        key = config.encrypted_api_key
        if len(key) > 8:
            masked = f"{key[:4]}...{key[-4:]}"
        else:
            masked = "(set)"

        providers.append({
            "provider": config.provider,
            "model": config.provider,  # Use provider name as model for now
            "apiKeySet": True,
            "apiKeyMasked": masked,
        })

    return {
        "connected": True,
        "providers": providers,
        "count": len(providers),
        "lastChecked": datetime.utcnow().isoformat(),
        "latencyMs": None
    }


@router.get("/memories/{memory_id}")
async def get_memory_detail(memory_id: str):
    """Get a single memory with session details and related memories."""
    from app.services.ralph_db import get_ralph_db

    ralph_db = get_ralph_db()

    # Get the memory
    memories_data = ralph_db.get_all_memories(limit=1000)
    memory = next((m for m in memories_data if m['id'] == memory_id), None)

    if not memory:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Memory not found")

    # Get session details
    session_data = ralph_db.get_session(memory['session_id'])
    session_memories = ralph_db.get_memories_by_session(memory['session_id'], limit=50)

    # Get related memories (same session, excluding current)
    related_memories = [
        m for m in session_memories
        if m['id'] != memory_id
    ][:5]  # Limit to 5 related memories

    return {
        "memory": {
            "id": memory['id'],
            "sessionId": memory['session_id'],
            "content": memory['content'],
            "category": memory.get('category', 'other'),
            "priority": memory.get('priority', 'normal'),
            "createdAt": memory.get('created_at', datetime.utcnow().isoformat()),
            "metadata": {
                "taskDescription": memory.get('task_description'),
                "projectPath": memory.get('project_path'),
            }
        },
        "session": {
            "id": session_data['id'] if session_data else memory['session_id'],
            "taskDescription": session_data.get('task_description', '') if session_data else '',
            "projectPath": session_data.get('project_path', '') if session_data else '',
            "status": session_data.get('status', 'unknown') if session_data else 'unknown',
            "createdAt": session_data.get('created_at', datetime.utcnow().isoformat()) if session_data else '',
            "memoriesCount": len(session_memories),
        },
        "relatedMemories": [
            {
                "id": m['id'],
                "content": m['content'][:200] + '...' if len(m['content']) > 200 else m['content'],
                "category": m.get('category', 'other'),
                "priority": m.get('priority', 'normal'),
                "createdAt": m.get('created_at', datetime.utcnow().isoformat()),
            }
            for m in related_memories
        ]
    }


@router.patch("/memories/{memory_id}")
async def update_memory(memory_id: str, request: MemoryUpdateRequest):
    """Update a memory's content, category, or priority."""
    from app.services.ralph_db import get_ralph_db

    ralph_db = get_ralph_db()

    # Check if memory exists
    memories_data = ralph_db.get_all_memories(limit=1000)
    memory = next((m for m in memories_data if m['id'] == memory_id), None)

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    # Update the memory
    updated_memory = ralph_db.update_memory(
        memory_id=memory_id,
        content=request.content,
        category=request.category,
        priority=request.priority
    )

    if not updated_memory:
        raise HTTPException(status_code=500, detail="Failed to update memory")

    return {
        "id": updated_memory['id'],
        "sessionId": updated_memory['session_id'],
        "content": updated_memory['content'],
        "category": updated_memory.get('category', 'other'),
        "priority": updated_memory.get('priority', 'normal'),
        "createdAt": updated_memory.get('created_at', datetime.utcnow().isoformat()),
    }


@router.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a memory by ID."""
    from app.services.ralph_db import get_ralph_db

    ralph_db = get_ralph_db()

    # Check if memory exists
    memories_data = ralph_db.get_all_memories(limit=1000)
    memory = next((m for m in memories_data if m['id'] == memory_id), None)

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    # Delete the memory
    success = ralph_db.delete_memory(memory_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete memory")

    return {"id": memory_id, "deleted": True}


@router.get("/memories")
async def get_all_memories(
    session_id: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
):
    """Get all memories across sessions from Ralph SQLite database."""
    from app.services.ralph_db import get_ralph_db

    ralph_db = get_ralph_db()

    if session_id:
        memories_data = ralph_db.get_memories_by_session(session_id, limit)
    else:
        memories_data = ralph_db.get_all_memories(limit)

    # Transform to the format expected by the dashboard
    memories = []
    sessions_set = set()

    for mem in memories_data:
        sessions_set.add(mem.get('session_id'))

        memories.append({
            "id": mem['id'],
            "sessionId": mem['session_id'],
            "content": mem['content'],
            "category": mem.get('category', 'other'),
            "priority": mem.get('priority', 'normal'),
            "createdAt": mem.get('created_at', datetime.utcnow().isoformat()),
            "metadata": {
                "taskDescription": mem.get('task_description'),
                "projectPath": mem.get('project_path'),
            }
        })

    # Build sessions list for the dashboard
    sessions = []
    for sid in sessions_set:
        session_data = ralph_db.get_session(sid)
        if session_data:
            sessions.append({
                "id": session_data['id'],
                "taskDescription": session_data.get('task_description', ''),
                "status": session_data.get('status', 'unknown'),
                "createdAt": session_data.get('created_at', datetime.utcnow().isoformat()),
            })

    return {
        "memories": memories,
        "sessions": sessions,
        "total": len(memories)
    }


@router.get("/checkpoints")
async def get_checkpoints(
    session_id: Optional[str] = None,
):
    """Get session checkpoints from Ralph SQLite database."""
    from app.services.ralph_db import get_ralph_db

    ralph_db = get_ralph_db()

    if session_id:
        checkpoint_data = ralph_db.get_checkpoint_by_id(session_id)
        checkpoints = [checkpoint_data] if checkpoint_data else []
    else:
        checkpoints = ralph_db.get_all_checkpoints()

    # Transform to the format expected by the dashboard
    return {
        "checkpoints": [
            {
                "id": cp['id'],
                "label": cp.get('task_description', 'Untitled')[:50],
                "sessionId": cp['id'],
                "project": cp.get('project_path', '').split('/')[-1] or 'unknown',
                "contextUsage": cp.get('context_usage', 0),
                "tokens": cp.get('current_tokens', 0),
                "memoriesCount": cp.get('memories_count', 0),
                "createdAt": cp.get('created_at', datetime.utcnow().isoformat()),
                "state": {
                    "currentTokens": cp.get('current_tokens', 0),
                    "maxTokens": cp.get('max_tokens', 200000),
                    "status": cp.get('status', 'active'),
                }
            }
            for cp in checkpoints
        ],
        "totalCount": len(checkpoints)
    }


@router.get("/monitor/status")
async def get_monitor_status(db: AsyncSession = Depends(get_db)):
    """Get context health monitor status."""
    result = await db.execute(
        select(func.count(Session.id)).where(Session.status == SessionStatus.ACTIVE)
    )
    active_count = result.scalar() or 0

    # Calculate average context usage
    result = await db.execute(
        select(func.avg(Session.context_usage_percent)).where(Session.status == SessionStatus.ACTIVE)
    )
    avg_usage = result.scalar() or 0

    return {
        "active": active_count > 0,
        "activeSessions": active_count,
        "avgContextUsage": float(avg_usage),
        "health": "healthy" if avg_usage < 80 else "warning" if avg_usage < 95 else "critical",
        "lastChecked": datetime.utcnow().isoformat()
    }


@router.get("/token-savings")
async def get_token_savings(db: AsyncSession = Depends(get_db)):
    """Get token compression statistics across all sessions.

    Returns aggregated metrics on context compression efficiency.
    """
    # Get all sessions with compression data
    result = await db.execute(
        select(Session).where(Session.current_tokens > 0)
    )
    sessions = result.scalars().all()

    if not sessions:
        return {
            "totalSaved": 0,
            "compressionRatio": 0.0,
            "sessionsOptimized": 0,
            "avgSavingsPerSession": 0,
            "topSessions": [],
            "timestamp": datetime.utcnow().isoformat()
        }

    # Calculate totals
    total_max = sum(s.max_tokens for s in sessions)
    total_current = sum(s.current_tokens for s in sessions)
    total_saved = total_max - total_current

    # Compression ratio (how much we're using vs max capacity)
    compression_ratio = 1 - (total_current / total_max) if total_max > 0 else 0

    # Sessions that have been optimized (used less than 80% of max)
    optimized = [s for s in sessions if s.context_usage_percent < 80]

    # Top sessions by savings
    top_sessions = sorted(
        sessions,
        key=lambda s: s.max_tokens - s.current_tokens,
        reverse=True
    )[:5]

    return {
        "totalSaved": total_saved,
        "compressionRatio": round(compression_ratio, 4),
        "sessionsOptimized": len(optimized),
        "totalSessions": len(sessions),
        "avgSavingsPerSession": total_saved // len(sessions) if sessions else 0,
        "topSessions": [
            {
                "id": str(s.id),
                "name": s.task_description[:30] if s.task_description else "Untitled",
                "saved": s.max_tokens - s.current_tokens,
                "usagePercent": s.context_usage_percent
            }
            for s in top_sessions
        ],
        "timestamp": datetime.utcnow().isoformat()
    }
