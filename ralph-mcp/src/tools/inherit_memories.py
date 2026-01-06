"""
InheritMemories - Knowledge Transfer Tool

Imports relevant memories from past sessions into the current session.
Enables knowledge reuse and prevents re-learning patterns.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class InheritResult:
    """Result of memory inheritance."""
    imported_count: int = 0
    skipped_count: int = 0
    source_sessions: list[str] = field(default_factory=list)
    imported_categories: dict[str, int] = field(default_factory=dict)
    message: str = ""

    def to_dict(self) -> dict:
        return {
            "importedCount": self.imported_count,
            "skippedCount": self.skipped_count,
            "sourceSessions": self.source_sessions,
            "importedCategories": self.imported_categories,
            "message": self.message,
        }


class InheritMemoriesTool:
    """
    Import memories from related past sessions.

    Features:
    - Finds sessions with similar project/task
    - Filters for high-value memories
    - Prevents duplicate imports
    - Preserves source session context
    """

    def __init__(self, db, cross_search_tool=None):
        self.db = db
        self.cross_search = cross_search_tool

    async def execute(
        self,
        session_id: str,
        source_query: str,
        max_imports: int = 20,
        min_priority: str = "normal",
        categories: Optional[list[str]] = None,
    ) -> InheritResult:
        """
        Import relevant memories from past sessions.

        Args:
            session_id: Current session to import into
            source_query: Query to find relevant memories
            max_imports: Maximum memories to import
            min_priority: Minimum priority level to import
            categories: Categories to include (None = all)

        Returns:
            InheritResult with import statistics
        """
        # Find relevant memories using cross search
        if self.cross_search:
            search_result = await self.cross_search.execute(
                query=source_query,
                top_k=max_imports * 2,  # Get extra for filtering
                categories=categories,
                min_priority=min_priority,
            )
            candidate_memories = search_result.memories
        else:
            # Fallback: direct database query
            candidate_memories = self._find_memories_direct(
                source_query, max_imports * 2
            )

        # Filter out memories from current session
        external_memories = [
            m for m in candidate_memories
            if getattr(m, "session_id", "") != session_id
        ]

        # Get existing memories in target session to avoid duplicates
        existing = self.db.get_session_memories(session_id)
        existing_contents = set(m.get("content", "")[:100] for m in existing)

        # Import memories
        imported = []
        skipped = 0
        source_sessions = set()
        category_counts = {}

        for memory in external_memories[:max_imports]:
            content = getattr(memory, "content", "")

            # Skip if similar content exists
            if content[:100] in existing_contents:
                skipped += 1
                continue

            # Import the memory
            category = getattr(memory, "category", "inherited")
            priority = getattr(memory, "priority", "normal")

            self.db.save_memory(
                session_id=session_id,
                content=f"[INHERITED] {content}",
                category=category,
                priority=priority,
                metadata={
                    "inherited_from": getattr(memory, "session_id", "unknown"),
                    "original_id": getattr(memory, "id", "unknown"),
                    "source_project": getattr(memory, "project_path", ""),
                },
            )

            imported.append(memory)
            source_sessions.add(getattr(memory, "session_id", "unknown"))
            category_counts[category] = category_counts.get(category, 0) + 1

        # Generate message
        if imported:
            message = (
                f"Successfully imported {len(imported)} memories from "
                f"{len(source_sessions)} past session(s). "
                f"Skipped {skipped} duplicates."
            )
        else:
            message = "No relevant memories found to import."

        return InheritResult(
            imported_count=len(imported),
            skipped_count=skipped,
            source_sessions=list(source_sessions),
            imported_categories=category_counts,
            message=message,
        )

    def _find_memories_direct(self, query: str, limit: int) -> list:
        """Direct database query fallback."""
        return self.db.search_all_memories(query=query, limit=limit)


# Convenience function
async def inherit_memories(
    session_id: str,
    source_query: str,
    db,
    cross_search_tool=None,
    max_imports: int = 20,
) -> dict:
    """
    Import relevant memories from past sessions.

    Example:
        result = await inherit_memories(
            session_id="abc123",
            source_query="Next.js App Router patterns",
            db=get_db(),
        )
    """
    tool = InheritMemoriesTool(db, cross_search_tool)
    result = await tool.execute(session_id, source_query, max_imports)
    return result.to_dict()
