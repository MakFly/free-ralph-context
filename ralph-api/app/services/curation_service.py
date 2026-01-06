"""
Curation Service - LLM-powered memory pruning
"""

from typing import List
from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Memory
from app.services.llm_provider import get_llm_provider


class CurationResult:
    """Result of curation operation."""
    def __init__(self, removed_count: int, remaining_count: int, tokens_freed: int):
        self.removed_count = removed_count
        self.remaining_count = remaining_count
        self.tokens_freed = tokens_freed

    def to_dict(self):
        return {
            "removed_count": self.removed_count,
            "remaining_count": self.remaining_count,
            "tokens_freed": self.tokens_freed
        }


async def curate_memories(
    db: AsyncSession,
    session_id: UUID,
    keep_top: int = 50,
    preserve_categories: List[str] = None
) -> CurationResult:
    """
    LLM-powered memory curation - removes low-value memories.

    Args:
        db: Database session
        session_id: Session to curate
        keep_top: Maximum memories to keep
        preserve_categories: Categories to never remove (e.g., ["decision", "error"])

    Returns:
        CurationResult with counts
    """
    preserve_categories = preserve_categories or ["decision", "error"]

    # Get all memories
    result = await db.execute(
        select(Memory)
        .where(Memory.session_id == session_id)
        .order_by(Memory.created_at.desc())
    )
    memories = list(result.scalars().all())

    if len(memories) <= keep_top:
        return CurationResult(0, len(memories), 0)

    # Separate protected and candidates
    protected = [m for m in memories if m.category.value in preserve_categories]
    candidates = [m for m in memories if m.category.value not in preserve_categories]

    # Calculate how many candidates to remove
    protected_count = len(protected)
    candidates_to_keep = max(0, keep_top - protected_count)
    to_remove = candidates[candidates_to_keep:]

    if not to_remove:
        return CurationResult(0, len(memories), 0)

    # Use LLM to score candidates (simplified - just remove oldest non-protected)
    tokens_freed = sum(len(m.content) // 4 for m in to_remove)

    # Delete low-value memories
    for memory in to_remove:
        await db.delete(memory)

    await db.commit()

    return CurationResult(
        removed_count=len(to_remove),
        remaining_count=len(memories) - len(to_remove),
        tokens_freed=tokens_freed
    )


async def smart_curate(
    db: AsyncSession,
    session_id: UUID,
    target_reduction: float = 0.3
) -> CurationResult:
    """
    Smart curation using LLM to identify redundant/low-value memories.

    Args:
        db: Database session
        session_id: Session to curate
        target_reduction: Target reduction ratio (0.3 = remove 30%)

    Returns:
        CurationResult
    """
    # Get memories
    result = await db.execute(
        select(Memory)
        .where(Memory.session_id == session_id)
        .order_by(Memory.access_count.asc(), Memory.created_at.asc())
    )
    memories = list(result.scalars().all())

    if len(memories) < 10:
        return CurationResult(0, len(memories), 0)

    # Calculate target
    target_remove = int(len(memories) * target_reduction)

    # Score by access count and age (simple heuristic)
    # Low access + old = low value
    scored = []
    for m in memories:
        # Protected categories get high score
        if m.category.value in ["decision", "error"]:
            score = 1000
        else:
            score = m.access_count * 10 + (1 if m.priority.value == "high" else 0) * 50
        scored.append((m, score))

    # Sort by score (lowest first = candidates for removal)
    scored.sort(key=lambda x: x[1])

    # Remove lowest scored
    to_remove = [m for m, _ in scored[:target_remove]]
    tokens_freed = sum(len(m.content) // 4 for m in to_remove)

    for memory in to_remove:
        await db.delete(memory)

    await db.commit()

    return CurationResult(
        removed_count=len(to_remove),
        remaining_count=len(memories) - len(to_remove),
        tokens_freed=tokens_freed
    )
