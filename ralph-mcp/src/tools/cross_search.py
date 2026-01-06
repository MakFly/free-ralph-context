"""
CrossSearch - Cross-Session Memory Search

Searches across ALL sessions for relevant memories.
Enables knowledge transfer and pattern reuse across projects.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CrossSearchMemory:
    """A memory from cross-session search."""
    id: str
    session_id: str
    project_path: str
    content: str
    category: str
    priority: str
    score: float
    created_at: str


@dataclass
class CrossSearchResult:
    """Result of cross-session search."""
    memories: list[CrossSearchMemory] = field(default_factory=list)
    sessions_searched: int = 0
    projects_searched: int = 0
    query: str = ""

    def to_dict(self) -> dict:
        return {
            "memories": [
                {
                    "id": m.id,
                    "sessionId": m.session_id,
                    "projectPath": m.project_path,
                    "content": m.content,
                    "category": m.category,
                    "priority": m.priority,
                    "score": m.score,
                    "createdAt": m.created_at,
                }
                for m in self.memories
            ],
            "sessionsSearched": self.sessions_searched,
            "projectsSearched": self.projects_searched,
            "query": self.query,
        }


class CrossSearchTool:
    """
    Cross-session semantic search.

    Features:
    - Searches memories across ALL sessions
    - Uses keyword matching (embeddings optional)
    - Returns memories with session context
    - Prioritizes high-value memories
    """

    def __init__(self, db):
        self.db = db

    async def execute(
        self,
        query: str,
        top_k: int = 10,
        categories: Optional[list[str]] = None,
        min_priority: Optional[str] = None,
    ) -> CrossSearchResult:
        """
        Search across all sessions for relevant memories.

        Args:
            query: Natural language search query
            top_k: Maximum number of results
            categories: Filter by categories (optional)
            min_priority: Minimum priority level (optional)

        Returns:
            CrossSearchResult with matching memories
        """
        # Get all memories from database
        all_memories = self.db.search_all_memories(
            query=query,
            limit=top_k * 3,  # Get extra for filtering
        )

        # Filter by category if specified
        if categories:
            all_memories = [
                m for m in all_memories
                if m.get("category") in categories
            ]

        # Filter by priority if specified
        priority_order = {"critical": 4, "high": 3, "normal": 2, "low": 1}
        if min_priority:
            min_level = priority_order.get(min_priority, 0)
            all_memories = [
                m for m in all_memories
                if priority_order.get(m.get("priority", "normal"), 2) >= min_level
            ]

        # Score and rank memories
        scored_memories = self._score_memories(all_memories, query)

        # Take top_k
        top_memories = sorted(
            scored_memories,
            key=lambda x: x["score"],
            reverse=True,
        )[:top_k]

        # Convert to result objects
        memories = [
            CrossSearchMemory(
                id=m["id"],
                session_id=m.get("session_id", ""),
                project_path=m.get("project_path", ""),
                content=m["content"],
                category=m.get("category", "other"),
                priority=m.get("priority", "normal"),
                score=m["score"],
                created_at=m.get("created_at", ""),
            )
            for m in top_memories
        ]

        # Count unique sessions and projects
        session_ids = set(m.session_id for m in memories)
        project_paths = set(m.project_path for m in memories if m.project_path)

        return CrossSearchResult(
            memories=memories,
            sessions_searched=len(session_ids),
            projects_searched=len(project_paths),
            query=query,
        )

    def _score_memories(self, memories: list[dict], query: str) -> list[dict]:
        """Score memories based on query relevance."""
        query_words = set(query.lower().split())
        scored = []

        for m in memories:
            content = m.get("content", "").lower()
            content_words = set(content.split())

            # Calculate keyword overlap score
            overlap = len(query_words & content_words)
            base_score = overlap / len(query_words) if query_words else 0

            # Boost for exact phrase match
            if query.lower() in content:
                base_score += 0.5

            # Boost for priority
            priority_boost = {
                "critical": 0.3,
                "high": 0.2,
                "normal": 0.1,
                "low": 0.0,
            }
            base_score += priority_boost.get(m.get("priority", "normal"), 0)

            # Boost for category relevance
            category = m.get("category", "other")
            if category in ["decision", "error"]:
                base_score += 0.1

            m["score"] = min(base_score, 1.0)
            scored.append(m)

        return scored


# Convenience function
async def cross_search(
    query: str,
    db,
    top_k: int = 10,
    categories: Optional[list[str]] = None,
) -> dict:
    """
    Search across all sessions for relevant memories.

    Example:
        result = await cross_search(
            "authentication middleware pattern",
            db=get_db(),
            top_k=5
        )
    """
    tool = CrossSearchTool(db)
    result = await tool.execute(query, top_k, categories)
    return result.to_dict()
