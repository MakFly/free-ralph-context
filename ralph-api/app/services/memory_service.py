"""
Memory Service - Memory management with progressive disclosure

Implements 3-layer retrieval pattern (inspired by claude-mem):
1. search_index() - Lightweight index (~50 tokens/result)
2. get_timeline() - Context with neighbors (~150 tokens)
3. get_full() - Complete memories (~500 tokens)

This provides ~10x token savings by loading only what's needed.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.models import Memory
from app.models.memory import MemoryCategory, MemoryPriority


# === Progressive Disclosure Response Models ===

class MemoryIndexItem(BaseModel):
    """Lightweight memory reference (~50 tokens)."""
    id: str
    summary: str  # First 50 chars
    category: str
    priority: str
    score: float = 1.0

    class Config:
        from_attributes = True


class MemoryTimelineItem(BaseModel):
    """Memory with temporal context (~150 tokens)."""
    id: str
    summary: str  # First 150 chars
    category: str
    created_at: datetime
    context_before: Optional[str] = None  # Previous memory summary
    context_after: Optional[str] = None   # Next memory summary


class MemoryFullItem(BaseModel):
    """Complete memory content (~500 tokens max)."""
    id: str
    content: str
    category: str
    priority: str
    created_at: datetime
    metadata: Dict[str, Any] = {}


async def add_memory(
    db: AsyncSession,
    session_id: UUID,
    content: str,
    category: str = "other",
    priority: str = "normal",
    metadata: dict = None
) -> Memory:
    """
    Add a memory (no embeddings, just keyword search).

    Args:
        db: Database session
        session_id: Session this memory belongs to
        content: Memory content
        category: Memory category (decision, action, error, progress, context, other)
        priority: Priority level (high, normal, low)
        metadata: Optional metadata

    Returns:
        Created Memory object
    """
    memory = Memory(
        session_id=session_id,
        content=content,
        category=MemoryCategory(category),
        priority=MemoryPriority(priority),
        extra_data=metadata or {}
    )

    db.add(memory)
    await db.commit()
    await db.refresh(memory)

    return memory


async def get_session_memories(
    db: AsyncSession,
    session_id: UUID,
    category: str = None
) -> List[Memory]:
    """Get all memories for a session, optionally filtered by category."""
    query = select(Memory).where(Memory.session_id == session_id)

    if category:
        query = query.where(Memory.category == MemoryCategory(category))

    query = query.order_by(Memory.created_at.desc())
    result = await db.execute(query)

    return list(result.scalars().all())


async def search_memories(
    db: AsyncSession,
    session_id: UUID,
    query: str,
    top_k: int = 5,
    min_score: float = 0.5
) -> List[dict]:
    """
    Keyword search across session memories.

    Args:
        db: Database session
        session_id: Session to search in
        query: Search query (keywords)
        top_k: Number of results to return
        min_score: Not used for keyword search (kept for API compatibility)

    Returns:
        List of matching memories
    """
    # Split query into keywords
    keywords = query.lower().split()

    # Build ILIKE queries for each keyword
    conditions = []
    for keyword in keywords:
        conditions.append(Memory.content.ilike(f"%{keyword}%"))

    # Use OR to match any keyword
    result = await db.execute(
        select(Memory)
        .where(Memory.session_id == session_id)
        .where(or_(*conditions))
        .order_by(Memory.created_at.desc())
        .limit(top_k)
    )

    memories = result.scalars().all()

    return [
        {
            "id": str(m.id),
            "content": m.content,
            "category": m.category.value,
            "priority": m.priority.value,
            "created_at": m.created_at.isoformat()
        }
        for m in memories
    ]


async def delete_memory(db: AsyncSession, memory_id: UUID) -> bool:
    """Delete a memory."""
    memory = await db.get(Memory, memory_id)
    if not memory:
        return False

    await db.delete(memory)
    await db.commit()
    return True


# === Progressive Disclosure Functions (3-Layer Pattern) ===

async def search_index(
    db: AsyncSession,
    session_id: UUID,
    query: str,
    top_k: int = 20
) -> List[MemoryIndexItem]:
    """
    Layer 1: Lightweight index search (~50 tokens/result).

    Returns minimal memory references for initial filtering.
    Use this first, then get_timeline() or get_full() for details.

    Args:
        db: Database session
        session_id: Session to search in
        query: Search query (keywords)
        top_k: Number of results to return

    Returns:
        List of MemoryIndexItem with id, summary (50 chars), category, score
    """
    keywords = query.lower().split()

    if not keywords:
        return []

    # Build ILIKE queries for each keyword
    conditions = [Memory.content.ilike(f"%{kw}%") for kw in keywords]

    result = await db.execute(
        select(Memory)
        .where(Memory.session_id == session_id)
        .where(or_(*conditions))
        .order_by(Memory.priority.desc(), Memory.created_at.desc())
        .limit(top_k)
    )

    memories = result.scalars().all()

    # Calculate simple relevance score based on keyword matches
    def calc_score(memory: Memory) -> float:
        content_lower = memory.content.lower()
        matches = sum(1 for kw in keywords if kw in content_lower)
        return matches / len(keywords) if keywords else 0

    return [
        MemoryIndexItem(
            id=str(m.id),
            summary=m.content[:50] + ("..." if len(m.content) > 50 else ""),
            category=m.category.value,
            priority=m.priority.value,
            score=calc_score(m)
        )
        for m in memories
    ]


async def get_timeline(
    db: AsyncSession,
    session_id: UUID,
    memory_ids: List[str]
) -> List[MemoryTimelineItem]:
    """
    Layer 2: Memories with temporal context (~150 tokens/result).

    Returns memories with before/after context for understanding flow.

    Args:
        db: Database session
        session_id: Session to search in
        memory_ids: List of memory IDs to retrieve

    Returns:
        List of MemoryTimelineItem with context
    """
    if not memory_ids:
        return []

    # Convert string IDs to UUIDs
    uuids = [UUID(mid) for mid in memory_ids]

    # Get requested memories
    result = await db.execute(
        select(Memory)
        .where(Memory.session_id == session_id)
        .where(Memory.id.in_(uuids))
        .order_by(Memory.created_at)
    )
    memories = list(result.scalars().all())

    if not memories:
        return []

    # Get all session memories for context lookup
    all_result = await db.execute(
        select(Memory)
        .where(Memory.session_id == session_id)
        .order_by(Memory.created_at)
    )
    all_memories = list(all_result.scalars().all())

    # Build timeline items with context
    timeline_items = []
    for memory in memories:
        # Find position in timeline
        idx = next((i for i, m in enumerate(all_memories) if m.id == memory.id), -1)

        context_before = None
        context_after = None

        if idx > 0:
            prev_mem = all_memories[idx - 1]
            context_before = prev_mem.content[:50] + "..."

        if idx < len(all_memories) - 1:
            next_mem = all_memories[idx + 1]
            context_after = next_mem.content[:50] + "..."

        timeline_items.append(MemoryTimelineItem(
            id=str(memory.id),
            summary=memory.content[:150] + ("..." if len(memory.content) > 150 else ""),
            category=memory.category.value,
            created_at=memory.created_at,
            context_before=context_before,
            context_after=context_after
        ))

    return timeline_items


async def get_full(
    db: AsyncSession,
    session_id: UUID,
    memory_ids: List[str]
) -> List[MemoryFullItem]:
    """
    Layer 3: Complete memory content (~500 tokens/result max).

    Returns full memory content for detailed analysis.
    Only use after filtering with search_index() and get_timeline().

    Args:
        db: Database session
        session_id: Session to search in
        memory_ids: List of memory IDs to retrieve

    Returns:
        List of MemoryFullItem with complete content
    """
    if not memory_ids:
        return []

    uuids = [UUID(mid) for mid in memory_ids]

    result = await db.execute(
        select(Memory)
        .where(Memory.session_id == session_id)
        .where(Memory.id.in_(uuids))
        .order_by(Memory.created_at.desc())
    )

    memories = result.scalars().all()

    return [
        MemoryFullItem(
            id=str(m.id),
            content=m.content[:2000],  # Cap at ~500 tokens
            category=m.category.value,
            priority=m.priority.value,
            created_at=m.created_at,
            metadata=m.extra_data or {}
        )
        for m in memories
    ]


async def progressive_search(
    db: AsyncSession,
    session_id: UUID,
    query: str,
    depth: int = 1,
    top_k: int = 10
) -> Dict[str, Any]:
    """
    Convenience function for progressive search with automatic depth.

    Args:
        db: Database session
        session_id: Session to search in
        query: Search query
        depth: Retrieval depth (1=index, 2=timeline, 3=full)
        top_k: Number of results

    Returns:
        Dict with results at requested depth and token estimate
    """
    # Layer 1: Always get index
    index_results = await search_index(db, session_id, query, top_k)

    if depth == 1:
        return {
            "layer": "index",
            "count": len(index_results),
            "estimated_tokens": len(index_results) * 50,
            "results": [r.model_dump() for r in index_results],
            "hint": "Use depth=2 for timeline or depth=3 for full content"
        }

    # Get IDs for deeper retrieval
    memory_ids = [r.id for r in index_results]

    if depth == 2:
        timeline_results = await get_timeline(db, session_id, memory_ids)
        return {
            "layer": "timeline",
            "count": len(timeline_results),
            "estimated_tokens": len(timeline_results) * 150,
            "results": [r.model_dump() for r in timeline_results],
            "hint": "Use depth=3 for full content"
        }

    # Depth 3: Full content
    full_results = await get_full(db, session_id, memory_ids)
    return {
        "layer": "full",
        "count": len(full_results),
        "estimated_tokens": len(full_results) * 500,
        "results": [r.model_dump() for r in full_results]
    }


# === Hybrid Search (BM25 + Vector) ===

async def vector_search(
    db: AsyncSession,
    session_id: UUID,
    query_embedding: List[float],
    top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Vector similarity search using pgvector.

    Args:
        db: Database session
        session_id: Session to search in
        query_embedding: Query vector (1536 dimensions)
        top_k: Number of results

    Returns:
        List of memories with similarity scores
    """
    # Use raw SQL for pgvector cosine similarity
    # Note: Requires embedding column to be populated
    result = await db.execute(
        sa.text("""
            SELECT
                id,
                content,
                category,
                priority,
                1 - (embedding <=> :query_embedding::vector) as similarity
            FROM memories
            WHERE session_id = :session_id
            AND embedding IS NOT NULL
            ORDER BY embedding <=> :query_embedding::vector
            LIMIT :top_k
        """),
        {
            "session_id": str(session_id),
            "query_embedding": str(query_embedding),
            "top_k": top_k
        }
    )

    rows = result.fetchall()
    return [
        {
            "id": str(row.id),
            "content": row.content[:50] + "...",
            "category": row.category,
            "priority": row.priority,
            "score": float(row.similarity)
        }
        for row in rows
    ]


async def hybrid_search(
    db: AsyncSession,
    session_id: UUID,
    query: str,
    top_k: int = 10,
    keyword_weight: float = 0.3,
    vector_weight: float = 0.7
) -> List[MemoryIndexItem]:
    """
    Hybrid search combining keyword (BM25) and vector similarity.

    Uses Reciprocal Rank Fusion (RRF) to combine results:
    - RRF score = 1 / (k + rank_keyword) + 1 / (k + rank_vector)
    - k=60 is standard constant for RRF

    Args:
        db: Database session
        session_id: Session to search in
        query: Search query
        top_k: Number of results
        keyword_weight: Weight for keyword results (0-1)
        vector_weight: Weight for vector results (0-1)

    Returns:
        List of MemoryIndexItem sorted by hybrid score
    """
    from app.services.embedding_service import get_embedding, has_embedding_provider

    # Get keyword results
    keyword_results = await search_index(db, session_id, query, top_k * 2)
    keyword_scores = {r.id: (i + 1, r.score) for i, r in enumerate(keyword_results)}

    # Get vector results if embedding provider available
    vector_scores = {}
    if has_embedding_provider():
        try:
            query_embedding = await get_embedding(query)
            vector_results = await vector_search(db, session_id, query_embedding, top_k * 2)
            vector_scores = {r["id"]: (i + 1, r["score"]) for i, r in enumerate(vector_results)}
        except Exception:
            # Fall back to keyword-only if vector search fails
            pass

    # Combine using Reciprocal Rank Fusion
    k = 60  # RRF constant
    all_ids = set(keyword_scores.keys()) | set(vector_scores.keys())

    combined_scores = {}
    for memory_id in all_ids:
        rrf_score = 0

        # Keyword contribution
        if memory_id in keyword_scores:
            rank, score = keyword_scores[memory_id]
            rrf_score += keyword_weight * (1 / (k + rank))

        # Vector contribution
        if memory_id in vector_scores:
            rank, score = vector_scores[memory_id]
            rrf_score += vector_weight * (1 / (k + rank))

        combined_scores[memory_id] = rrf_score

    # Sort by combined score and get top_k
    sorted_ids = sorted(combined_scores.keys(), key=lambda x: combined_scores[x], reverse=True)[:top_k]

    # Build result items
    # Use keyword results as base (they have all fields)
    keyword_lookup = {r.id: r for r in keyword_results}

    results = []
    for memory_id in sorted_ids:
        if memory_id in keyword_lookup:
            item = keyword_lookup[memory_id]
            item.score = combined_scores[memory_id]
            results.append(item)
        else:
            # Memory only in vector results, need to fetch
            uuids = [UUID(memory_id)]
            fetch_result = await db.execute(
                select(Memory)
                .where(Memory.id.in_(uuids))
            )
            memory = fetch_result.scalar_one_or_none()
            if memory:
                results.append(MemoryIndexItem(
                    id=str(memory.id),
                    summary=memory.content[:50] + ("..." if len(memory.content) > 50 else ""),
                    category=memory.category.value,
                    priority=memory.priority.value,
                    score=combined_scores[memory_id]
                ))

    return results


async def embed_memory(
    db: AsyncSession,
    memory_id: UUID
) -> bool:
    """
    Generate and store embedding for a memory.

    Args:
        db: Database session
        memory_id: Memory to embed

    Returns:
        True if successful, False otherwise
    """
    from app.services.embedding_service import get_embedding, has_embedding_provider

    if not has_embedding_provider():
        return False

    memory = await db.get(Memory, memory_id)
    if not memory:
        return False

    try:
        embedding = await get_embedding(memory.content)

        # Update memory with embedding using raw SQL (avoids ORM issues with vector type)
        await db.execute(
            sa.text("""
                UPDATE memories
                SET embedding = :embedding::vector
                WHERE id = :memory_id
            """),
            {
                "embedding": str(embedding),
                "memory_id": str(memory_id)
            }
        )
        await db.commit()
        return True

    except Exception:
        return False


async def embed_session_memories(
    db: AsyncSession,
    session_id: UUID,
    batch_size: int = 10
) -> Dict[str, Any]:
    """
    Generate embeddings for all memories in a session that don't have them.

    Args:
        db: Database session
        session_id: Session to process
        batch_size: Number of memories to embed per batch

    Returns:
        Dict with embedded count and any errors
    """
    from app.services.embedding_service import get_embeddings, has_embedding_provider

    if not has_embedding_provider():
        return {"embedded": 0, "error": "No embedding provider available"}

    # Get memories without embeddings
    result = await db.execute(
        sa.text("""
            SELECT id, content
            FROM memories
            WHERE session_id = :session_id
            AND embedding IS NULL
        """),
        {"session_id": str(session_id)}
    )
    memories = result.fetchall()

    embedded_count = 0
    errors = []

    # Process in batches
    for i in range(0, len(memories), batch_size):
        batch = memories[i:i + batch_size]
        texts = [m.content for m in batch]

        try:
            embeddings = await get_embeddings(texts)

            for memory, embedding in zip(batch, embeddings):
                await db.execute(
                    sa.text("""
                        UPDATE memories
                        SET embedding = :embedding::vector
                        WHERE id = :memory_id
                    """),
                    {
                        "embedding": str(embedding),
                        "memory_id": str(memory.id)
                    }
                )
                embedded_count += 1

            await db.commit()

        except Exception as e:
            errors.append(f"Batch {i // batch_size}: {str(e)}")

    return {
        "embedded": embedded_count,
        "total": len(memories),
        "errors": errors if errors else None
    }


# Import for vector_search raw SQL
import sqlalchemy as sa
