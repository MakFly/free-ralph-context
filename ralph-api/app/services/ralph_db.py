"""
Ralph SQLite Database Bridge

Reads data from ralph-mcp's SQLite database (~/.ralph/ralph-mcp.db)
and provides it to the FastAPI dashboard endpoints.
"""

import sqlite3
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Ralph MCP SQLite database path
RALPH_DB_PATH = Path.home() / ".ralph" / "ralph-mcp.db"


class RalphDB:
    """Bridge to Ralph MCP SQLite database."""

    def __init__(self, db_path: Path = RALPH_DB_PATH):
        """Initialize connection to Ralph SQLite database."""
        self.db_path = db_path
        self._available = None

    @property
    def available(self) -> bool:
        """Check if Ralph database is available."""
        if self._available is None:
            self._available = self.db_path.exists()
        return self._available

    def _connect(self) -> sqlite3.Connection:
        """Get a connection to the database."""
        if not self.available:
            raise FileNotFoundError(f"Ralph database not found: {self.db_path}")

        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    # === MEMORIES ===

    def get_all_memories(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all memories across all sessions."""
        if not self.available:
            return []

        try:
            with self._connect() as conn:
                cur = conn.execute("""
                    SELECT
                        m.id,
                        m.session_id,
                        m.content,
                        m.category,
                        m.priority,
                        m.created_at,
                        s.task_description,
                        s.project_path
                    FROM memories m
                    LEFT JOIN mcp_sessions s ON m.session_id = s.id
                    ORDER BY m.created_at DESC
                    LIMIT ?
                """, (limit,))
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get memories: {e}")
            return []

    def get_memories_by_session(
        self, session_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get memories for a specific session."""
        if not self.available:
            return []

        try:
            with self._connect() as conn:
                cur = conn.execute("""
                    SELECT
                        m.id,
                        m.session_id,
                        m.content,
                        m.category,
                        m.priority,
                        m.created_at
                    FROM memories m
                    WHERE m.session_id = ?
                    ORDER BY m.created_at DESC
                    LIMIT ?
                """, (session_id, limit))
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get session memories: {e}")
            return []

    # === CHECKPOINTS (using sessions) ===

    def get_all_checkpoints(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all sessions as checkpoints."""
        if not self.available:
            return []

        try:
            with self._connect() as conn:
                cur = conn.execute("""
                    SELECT
                        id,
                        project_path,
                        task_description,
                        created_at,
                        max_tokens,
                        current_tokens,
                        status
                    FROM mcp_sessions
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,))

                checkpoints = []
                for row in cur.fetchall():
                    row_dict = dict(row)
                    # Calculate context usage
                    max_tok = row_dict.get('max_tokens', 200000)
                    cur_tok = row_dict.get('current_tokens', 0)
                    row_dict['context_usage'] = cur_tok / max_tok if max_tok > 0 else 0

                    # Count memories for this session
                    memory_count = conn.execute(
                        "SELECT COUNT(*) FROM memories WHERE session_id = ?",
                        (row_dict['id'],)
                    ).fetchone()[0]
                    row_dict['memories_count'] = memory_count

                    checkpoints.append(row_dict)

                return checkpoints
        except Exception as e:
            logger.error(f"Failed to get checkpoints: {e}")
            return []

    def get_checkpoint_by_id(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific checkpoint (session)."""
        if not self.available:
            return None

        try:
            with self._connect() as conn:
                cur = conn.execute("""
                    SELECT
                        id,
                        project_path,
                        task_description,
                        created_at,
                        max_tokens,
                        current_tokens,
                        status
                    FROM mcp_sessions
                    WHERE id = ?
                """, (checkpoint_id,))
                row = cur.fetchone()

                if not row:
                    return None

                row_dict = dict(row)
                # Calculate context usage
                max_tok = row_dict.get('max_tokens', 200000)
                cur_tok = row_dict.get('current_tokens', 0)
                row_dict['context_usage'] = cur_tok / max_tok if max_tok > 0 else 0

                # Count memories
                memory_count = conn.execute(
                    "SELECT COUNT(*) FROM memories WHERE session_id = ?",
                    (checkpoint_id,)
                ).fetchone()[0]
                row_dict['memories_count'] = memory_count

                return row_dict
        except Exception as e:
            logger.error(f"Failed to get checkpoint: {e}")
            return None

    # === SESSIONS ===

    def get_all_sessions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all sessions for the sessions list."""
        if not self.available:
            return []

        try:
            with self._connect() as conn:
                cur = conn.execute("""
                    SELECT
                        id,
                        project_path,
                        task_description,
                        created_at,
                        last_accessed,
                        max_tokens,
                        current_tokens,
                        status
                    FROM mcp_sessions
                    ORDER BY last_accessed DESC
                    LIMIT ?
                """, (limit,))
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get sessions: {e}")
            return []

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific session."""
        if not self.available:
            return None

        try:
            with self._connect() as conn:
                cur = conn.execute("""
                    SELECT * FROM mcp_sessions WHERE id = ?
                """, (session_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Failed to get session: {e}")
            return None

    # === STATS ===

    def get_stats(self) -> Dict[str, Any]:
        """Get overall statistics from Ralph database."""
        if not self.available:
            return {
                "total_sessions": 0,
                "total_memories": 0,
                "total_patterns": 0,
                "active_sessions": 0,
            }

        try:
            with self._connect() as conn:
                # Count sessions
                total_sessions = conn.execute(
                    "SELECT COUNT(*) FROM mcp_sessions"
                ).fetchone()[0]

                # Count memories
                total_memories = conn.execute(
                    "SELECT COUNT(*) FROM memories"
                ).fetchone()[0]

                # Count patterns
                total_patterns = conn.execute(
                    "SELECT COUNT(*) FROM patterns"
                ).fetchone()[0]

                # Count active sessions
                active_sessions = conn.execute(
                    "SELECT COUNT(*) FROM mcp_sessions WHERE status = 'active'"
                ).fetchone()[0]

                return {
                    "total_sessions": total_sessions,
                    "total_memories": total_memories,
                    "total_patterns": total_patterns,
                    "active_sessions": active_sessions,
                    "db_available": True,
                }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                "total_sessions": 0,
                "total_memories": 0,
                "total_patterns": 0,
                "active_sessions": 0,
                "db_available": False,
            }

    def update_memory(
        self, memory_id: str, content: Optional[str] = None,
        category: Optional[str] = None, priority: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update a memory's content, category, or priority."""
        if not self.available:
            return None

        try:
            with self._connect() as conn:
                # Build update query dynamically
                updates = {}
                if content is not None:
                    updates['content'] = content
                if category is not None:
                    updates['category'] = category
                if priority is not None:
                    updates['priority'] = priority

                if not updates:
                    return None

                set_clause = ', '.join(f"{k} = ?" for k in updates.keys())
                values = list(updates.values())
                values.append(memory_id)

                conn.execute(
                    f"UPDATE memories SET {set_clause} WHERE id = ?",
                    values
                )
                conn.commit()

                # Fetch and return updated memory
                cur = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
                row = cur.fetchone()
                if row:
                    return dict(row)
                return None
        except Exception as e:
            logger.error(f"Failed to update memory: {e}")
            return None

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory by ID."""
        if not self.available:
            return False

        try:
            with self._connect() as conn:
                conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to delete memory: {e}")
            return False


# Singleton instance
_ralph_db: Optional[RalphDB] = None


def get_ralph_db() -> RalphDB:
    """Get or create the RalphDB singleton."""
    global _ralph_db
    if _ralph_db is None:
        _ralph_db = RalphDB()
        logger.info(f"RalphDB initialized: {RALPH_DB_PATH} (available: {_ralph_db.available})")
    return _ralph_db
