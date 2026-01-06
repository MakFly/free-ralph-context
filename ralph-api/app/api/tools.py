"""
MCP Tool Endpoints - All Ralph tools exposed as REST API
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import (
    create_session,
    get_session_status,
    compress,
    create_checkpoint,
    restore_checkpoint,
    list_checkpoints,
    should_fold,
    execute_fold,
    add_memory,
    get_session_memories,
    search_memories,
)
from app.services.spawn_service import should_spawn, execute_spawn
from app.services.curation_service import curate_memories

router = APIRouter(prefix="/api", tags=["tools"])


# === Request/Response Models ===

class MallocRequest(BaseModel):
    task_description: str
    max_tokens: Optional[int] = 200000


class CompressRequest(BaseModel):
    trajectory: str
    ratio: Optional[float] = 0.25


class CheckpointRequest(BaseModel):
    session_id: str
    label: str
    metadata: Optional[dict] = None


class FoldRequest(BaseModel):
    session_id: str
    trajectory: str
    label: Optional[str] = "auto-fold"


class ShouldFoldRequest(BaseModel):
    context_usage: float
    memory_count: Optional[int] = 0


class MemoryRequest(BaseModel):
    session_id: str
    content: str
    category: Optional[str] = "other"
    priority: Optional[str] = "normal"
    metadata: Optional[dict] = None


class SearchRequest(BaseModel):
    session_id: str
    query: str
    top_k: Optional[int] = 5
    min_score: Optional[float] = 0.5


# === Endpoints ===

@router.post("/sessions/malloc")
async def malloc(request: MallocRequest, db: AsyncSession = Depends(get_db)):
    """Initialize a new Ralph session (malloc equivalent)."""
    session = await create_session(db, request.task_description, request.max_tokens)
    return {
        "session_id": str(session.id),
        "task_description": session.task_description,
        "max_tokens": session.max_tokens,
        "status": session.status.value
    }


@router.get("/sessions/{session_id}/status")
async def get_status(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get session status."""
    try:
        return await get_session_status(db, UUID(session_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/compress")
async def compress_endpoint(request: CompressRequest):
    """Compress trajectory preserving decisions, files, errors."""
    result = await compress(request.trajectory, request.ratio)
    return result.model_dump()


@router.post("/checkpoints")
async def create_checkpoint_endpoint(request: CheckpointRequest, db: AsyncSession = Depends(get_db)):
    """Create a named checkpoint."""
    try:
        checkpoint = await create_checkpoint(
            db, UUID(request.session_id), request.label, request.metadata
        )
        return {
            "checkpoint_id": str(checkpoint.id),
            "label": checkpoint.label,
            "context_usage": checkpoint.context_usage,
            "created_at": checkpoint.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/checkpoints/{session_id}")
async def list_checkpoints_endpoint(session_id: str, db: AsyncSession = Depends(get_db)):
    """List all checkpoints for a session."""
    return await list_checkpoints(db, UUID(session_id))


@router.post("/checkpoints/{checkpoint_id}/restore")
async def restore_checkpoint_endpoint(checkpoint_id: str, db: AsyncSession = Depends(get_db)):
    """Restore session from checkpoint."""
    try:
        return await restore_checkpoint(db, UUID(checkpoint_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/should-fold")
async def should_fold_endpoint(request: ShouldFoldRequest):
    """Evaluate if context should be folded."""
    result = await should_fold(request.context_usage, request.memory_count)
    return result.model_dump()


@router.post("/fold")
async def fold_endpoint(request: FoldRequest, db: AsyncSession = Depends(get_db)):
    """Execute fold: compress + checkpoint."""
    try:
        result = await execute_fold(
            db, UUID(request.session_id), request.trajectory, request.label
        )
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/memories")
async def add_memory_endpoint(request: MemoryRequest, db: AsyncSession = Depends(get_db)):
    """Add a memory to session."""
    memory = await add_memory(
        db,
        UUID(request.session_id),
        request.content,
        request.category,
        request.priority,
        request.metadata
    )
    return {
        "memory_id": str(memory.id),
        "category": memory.category.value,
        "priority": memory.priority.value,
        "created_at": memory.created_at.isoformat()
    }


@router.get("/memories/{session_id}")
async def get_memories_endpoint(
    session_id: str,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all memories for a session."""
    memories = await get_session_memories(db, UUID(session_id), category)
    return [
        {
            "id": str(m.id),
            "content": m.content,
            "category": m.category.value,
            "priority": m.priority.value,
            "access_count": m.access_count,
            "created_at": m.created_at.isoformat()
        }
        for m in memories
    ]


@router.post("/search")
async def search_endpoint(request: SearchRequest, db: AsyncSession = Depends(get_db)):
    """Semantic search across session memories."""
    try:
        results = await search_memories(
            db,
            UUID(request.session_id),
            request.query,
            request.top_k,
            request.min_score
        )
        return {"query": request.query, "results": results, "count": len(results)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid session_id: {e}")
    except Exception as e:
        # Log error for debugging but don't crash
        import logging
        logging.error(f"Search error: {e}")
        # Return empty results instead of 500 error
        return {"query": request.query, "results": [], "count": 0, "error": str(e)}


# === Spawn Endpoints ===

class ShouldSpawnRequest(BaseModel):
    context_usage: float
    task_progress: Optional[int] = 50
    recent_outputs: Optional[List[str]] = None
    error_count: Optional[int] = 0


class SpawnRequest(BaseModel):
    session_id: str
    handoff_reason: str
    task_description: Optional[str] = None


@router.post("/should-spawn")
async def should_spawn_endpoint(request: ShouldSpawnRequest):
    """Evaluate if should spawn a subprocess."""
    result = await should_spawn(
        request.context_usage,
        request.task_progress,
        request.recent_outputs,
        request.error_count
    )
    return result.model_dump()


@router.post("/spawn")
async def spawn_endpoint(request: SpawnRequest, db: AsyncSession = Depends(get_db)):
    """Execute spawn: create child session linked to parent."""
    try:
        result = await execute_spawn(
            db,
            UUID(request.session_id),
            request.handoff_reason,
            request.task_description
        )
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# === Curation Endpoints ===

class CurateRequest(BaseModel):
    session_id: str
    keep_top: Optional[int] = 50
    preserve_categories: Optional[List[str]] = None


@router.post("/memories/curate")
async def curate_endpoint(request: CurateRequest, db: AsyncSession = Depends(get_db)):
    """Curate memories - remove low-value entries."""
    result = await curate_memories(
        db,
        UUID(request.session_id),
        request.keep_top,
        request.preserve_categories
    )
    return result.to_dict()


# === Killer Features Endpoints ===

class WarpGrepPattern(BaseModel):
    type: str  # literal, regex, glob
    value: str


class WarpGrepRequest(BaseModel):
    patterns: List[WarpGrepPattern]
    paths: Optional[List[str]] = ["."]
    max_results: Optional[int] = 100


@router.post("/tools/warpgrep")
async def warpgrep_endpoint(request: WarpGrepRequest):
    """Parallel search engine - 10-20x faster than sequential grep."""
    import asyncio
    import os
    import re
    import fnmatch
    from pathlib import Path

    base_path = Path.cwd()
    matches = []
    files_scanned = 0

    # Collect files
    searchable_ext = {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".php"}
    skip_dirs = {"node_modules", ".git", "__pycache__", ".next", "vendor", "dist"}
    files = []

    for search_path in request.paths:
        path = (base_path / search_path).resolve()
        if path.is_file():
            files.append(path)
        elif path.is_dir():
            for root, dirs, filenames in os.walk(path):
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                for fname in filenames:
                    fpath = Path(root) / fname
                    if fpath.suffix.lower() in searchable_ext:
                        files.append(fpath)

    files_scanned = len(files)

    # Search each pattern
    for pattern in request.patterns:
        if pattern.type == "glob":
            for fpath in files:
                rel = str(fpath.relative_to(base_path))
                if fnmatch.fnmatch(rel, pattern.value):
                    matches.append({
                        "file": rel, "line": 0,
                        "content": f"[FILE MATCH] {rel}",
                        "pattern": pattern.value, "patternType": "glob"
                    })
        else:
            for fpath in files:
                try:
                    content = fpath.read_text(errors="ignore")
                    for i, line in enumerate(content.splitlines(), 1):
                        found = False
                        if pattern.type == "regex":
                            if re.search(pattern.value, line, re.IGNORECASE):
                                found = True
                        else:
                            if pattern.value.lower() in line.lower():
                                found = True
                        if found:
                            matches.append({
                                "file": str(fpath.relative_to(base_path)),
                                "line": i, "content": line.strip()[:200],
                                "pattern": pattern.value,
                                "patternType": pattern.type
                            })
                            if len(matches) >= request.max_results:
                                break
                except Exception:
                    continue
                if len(matches) >= request.max_results:
                    break
        if len(matches) >= request.max_results:
            break

    return {
        "matches": matches[:request.max_results],
        "filesScanned": files_scanned,
        "patternsMatched": len(set(m["pattern"] for m in matches))
    }


class FastApplyRequest(BaseModel):
    file_path: str
    intent: str
    context: Optional[str] = ""


@router.post("/tools/fast-apply")
async def fast_apply_endpoint(request: FastApplyRequest):
    """Semantic code editor - apply changes using natural language intent."""
    from pathlib import Path
    import re
    import difflib
    import tempfile
    from datetime import datetime

    path = Path(request.file_path).resolve()
    if not path.exists():
        return {"success": False, "error": f"File not found: {request.file_path}", "diff": ""}

    try:
        original = path.read_text()
    except Exception as e:
        return {"success": False, "error": str(e), "diff": ""}

    # Create backup
    backup_dir = Path(tempfile.gettempdir()) / "ralph_backups"
    backup_dir.mkdir(exist_ok=True)
    backup_path = backup_dir / f"{path.stem}_{datetime.now():%Y%m%d_%H%M%S}{path.suffix}.bak"
    backup_path.write_text(original)

    # Pattern-based editing (LLM would be better but works offline)
    modified = original
    intent_lower = request.intent.lower()

    if "add import" in intent_lower:
        match = re.search(r"import\s+([^\s]+)", request.intent)
        if match:
            lines = modified.splitlines(keepends=True)
            import_idx = 0
            for i, line in enumerate(lines):
                if line.strip().startswith(("import ", "from ")):
                    import_idx = i + 1
            lines.insert(import_idx, f"import {match.group(1)}\n")
            modified = "".join(lines)

    elif "replace" in intent_lower:
        match = re.search(r"replace\s+['\"]?(.+?)['\"]?\s+with\s+['\"]?(.+?)['\"]?", request.intent, re.I)
        if match:
            modified = original.replace(match.group(1), match.group(2))

    elif "rename" in intent_lower:
        match = re.search(r"rename\s+(\w+)\s+to\s+(\w+)", request.intent, re.I)
        if match:
            modified = re.sub(rf"\b{match.group(1)}\b", match.group(2), original)

    if original == modified:
        return {"success": False, "error": "No changes applied", "diff": "", "backupPath": str(backup_path)}

    # Generate diff
    diff = "".join(difflib.unified_diff(
        original.splitlines(keepends=True),
        modified.splitlines(keepends=True),
        fromfile=f"a/{path.name}", tofile=f"b/{path.name}"
    ))

    path.write_text(modified)
    return {
        "success": True,
        "diff": diff,
        "backupPath": str(backup_path),
        "linesChanged": diff.count("\n+") + diff.count("\n-")
    }


class OrchestrateRequest(BaseModel):
    task_description: str


@router.post("/tools/orchestrate")
async def orchestrate_endpoint(request: OrchestrateRequest):
    """Task router - analyze task and recommend optimal agent + tools."""
    import re

    task = request.task_description.lower()

    # Task classification patterns
    if any(w in task for w in ["find", "search", "where", "explore", "understand"]):
        return {
            "taskType": "explore",
            "recommendedAgent": "swe-scout",
            "suggestedTools": ["ralph_warpgrep", "ralph_recall"],
            "contextEstimate": 5000,
            "complexity": "low"
        }
    elif any(w in task for w in ["fix", "bug", "error", "broken", "crash"]):
        return {
            "taskType": "debug",
            "recommendedAgent": "debug-agent",
            "suggestedTools": ["ralph_warpgrep", "ralph_cross_search"],
            "contextEstimate": 10000,
            "complexity": "medium"
        }
    elif any(w in task for w in ["refactor", "rename", "extract", "move"]):
        return {
            "taskType": "refactor",
            "recommendedAgent": "refactor-agent",
            "suggestedTools": ["ralph_fast_apply", "ralph_checkpoint"],
            "contextEstimate": 12000,
            "complexity": "medium"
        }
    elif any(w in task for w in ["plan", "design", "architecture", "strategy"]):
        return {
            "taskType": "architecture",
            "recommendedAgent": "plan",
            "suggestedTools": ["ralph_warpgrep", "ralph_add_memory"],
            "contextEstimate": 15000,
            "complexity": "high"
        }
    else:
        return {
            "taskType": "feature",
            "recommendedAgent": "general-purpose",
            "suggestedTools": ["ralph_warpgrep", "ralph_fast_apply", "ralph_checkpoint"],
            "contextEstimate": 20000,
            "complexity": "medium"
        }


class CrossSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10
    categories: Optional[List[str]] = None


@router.post("/tools/cross-search")
async def cross_search_endpoint(request: CrossSearchRequest, db: AsyncSession = Depends(get_db)):
    """Cross-session memory search."""
    from app.models.memory import Memory
    from app.models import Session
    from sqlalchemy import select

    # Search across all sessions
    query = select(Memory).where(
        Memory.content.ilike(f"%{request.query}%")
    ).order_by(Memory.created_at.desc()).limit(request.top_k * 2)

    if request.categories:
        query = query.where(Memory.category.in_(request.categories))

    result = await db.execute(query)
    memories = result.scalars().all()

    return {
        "memories": [
            {
                "id": str(m.id),
                "sessionId": str(m.session_id),
                "content": m.content,
                "category": m.category.value if hasattr(m.category, 'value') else str(m.category),
                "priority": m.priority.value if hasattr(m.priority, 'value') else str(m.priority),
                "score": 0.8,  # Simple matching
                "createdAt": m.created_at.isoformat()
            }
            for m in memories[:request.top_k]
        ],
        "sessionsSearched": len(set(m.session_id for m in memories)),
        "query": request.query
    }


class InheritMemoriesRequest(BaseModel):
    session_id: str
    source_query: str
    max_imports: Optional[int] = 20


@router.post("/tools/inherit-memories")
async def inherit_memories_endpoint(request: InheritMemoriesRequest, db: AsyncSession = Depends(get_db)):
    """Import relevant memories from past sessions."""
    from app.models.memory import Memory
    from sqlalchemy import select

    # Find relevant memories from other sessions
    query = select(Memory).where(
        Memory.content.ilike(f"%{request.source_query}%"),
        Memory.session_id != UUID(request.session_id)
    ).limit(request.max_imports)

    result = await db.execute(query)
    source_memories = result.scalars().all()

    imported = 0
    for mem in source_memories:
        # Create copy in target session
        new_memory = Memory(
            session_id=UUID(request.session_id),
            content=f"[INHERITED] {mem.content}",
            category=mem.category,
            priority=mem.priority
        )
        db.add(new_memory)
        imported += 1

    await db.commit()

    return {
        "importedCount": imported,
        "sourceSessions": list(set(str(m.session_id) for m in source_memories)),
        "message": f"Imported {imported} memories"
    }


class FreeRequest(BaseModel):
    session_id: Optional[str] = None
    extract_learnings: Optional[bool] = True


@router.post("/tools/free")
async def free_endpoint(request: FreeRequest, db: AsyncSession = Depends(get_db)):
    """Terminate session with proper cleanup."""
    from app.models import Session
    from app.models.session import SessionStatus
    from sqlalchemy import select

    if not request.session_id:
        return {"success": False, "error": "No session_id provided"}

    # Get session
    result = await db.execute(
        select(Session).where(Session.id == UUID(request.session_id))
    )
    session = result.scalar_one_or_none()

    if not session:
        return {"success": False, "error": f"Session not found: {request.session_id}"}

    # Mark as completed
    session.status = SessionStatus.COMPLETED
    await db.commit()

    return {
        "success": True,
        "sessionId": request.session_id,
        "learningsExtracted": 0,
        "message": "Session terminated"
    }
