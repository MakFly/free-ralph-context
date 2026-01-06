"""
Ralph MCP SQLite Database Wrapper

Provides session persistence with multi-project support.
Sessions are tracked by project_path and can be listed/restored/deleted.
Also stores patterns and memories for context-aware AI assistance.
"""

import sqlite3
import os
import json
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any

# Database path: ~/.ralph/ralph-mcp.db
DB_PATH = Path.home() / ".ralph" / "ralph-mcp.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


class SessionDB:
    """SQLite database for Ralph MCP session management."""

    def __init__(self, db_path: Path = DB_PATH):
        """Initialize database connection and create schema if needed."""
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        """Initialize database with schema and run migrations."""
        if not SCHEMA_PATH.exists():
            raise FileNotFoundError(f"Schema file not found: {SCHEMA_PATH}")

        with open(SCHEMA_PATH) as f:
            schema = f.read()

        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(schema)
            # Run migrations to add missing columns
            self._run_migrations(conn)

    def _run_migrations(self, conn: sqlite3.Connection) -> None:
        """Run database migrations to add missing columns."""
        # Get existing columns
        cursor = conn.execute("PRAGMA table_info(mcp_sessions)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        # Add missing columns
        if 'current_tokens' not in existing_columns:
            conn.execute("ALTER TABLE mcp_sessions ADD COLUMN current_tokens INTEGER DEFAULT 0")

        if 'status' not in existing_columns:
            conn.execute("ALTER TABLE mcp_sessions ADD COLUMN status TEXT DEFAULT 'active'")

    def save_session(
        self,
        session_id: str,
        project_path: str,
        task_description: str = "",
        max_tokens: int = 200000
    ) -> None:
        """Save or update a session."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO mcp_sessions
                (id, project_path, task_description, max_tokens, last_accessed)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (session_id, project_path, task_description, max_tokens))

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a session by ID."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute("SELECT * FROM mcp_sessions WHERE id = ?", (session_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_most_recent_for_project(self, project_path: str) -> Optional[Dict[str, Any]]:
        """Get the most recent session for a project."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute("""
                SELECT * FROM mcp_sessions
                WHERE project_path = ?
                ORDER BY last_accessed DESC
                LIMIT 1
            """, (project_path,))
            row = cur.fetchone()
            return dict(row) if row else None

    def list_sessions(
        self,
        project_path: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """List sessions, optionally filtered by project."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if project_path:
                cur = conn.execute("""
                    SELECT * FROM mcp_sessions
                    WHERE project_path = ?
                    ORDER BY last_accessed DESC
                    LIMIT ?
                """, (project_path, limit))
            else:
                cur = conn.execute("""
                    SELECT * FROM mcp_sessions
                    ORDER BY last_accessed DESC
                    LIMIT ?
                """, (limit,))
            return [dict(row) for row in cur.fetchall()]

    def delete_session(self, session_id: str) -> bool:
        """Delete a session. Returns True if deleted."""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("DELETE FROM mcp_sessions WHERE id = ?", (session_id,))
            return cur.rowcount > 0

    def update_last_accessed(self, session_id: str) -> None:
        """Update the last_accessed timestamp."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE mcp_sessions SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,)
            )

    def get_all_projects(self) -> List[str]:
        """Get list of all unique project paths."""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("SELECT DISTINCT project_path FROM mcp_sessions ORDER BY project_path")
            return [row[0] for row in cur.fetchall()]

    # === PATTERNS ===

    def save_pattern(
        self,
        session_id: str,
        pattern_name: str,
        pattern_description: str,
        code_example: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source_mode: str = "manual",
        source_files: Optional[List[str]] = None
    ) -> str:
        """Save a pattern and return its ID."""
        pattern_id = str(uuid.uuid4())
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO patterns
                (id, session_id, pattern_name, pattern_description, code_example, tags, source_mode, source_files)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                pattern_id,
                session_id,
                pattern_name,
                pattern_description,
                code_example or "",
                json.dumps(tags or []),
                source_mode,
                json.dumps(source_files or [])
            ))
        return pattern_id

    def get_pattern(self, pattern_id: str) -> Optional[Dict[str, Any]]:
        """Get a pattern by ID."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute("SELECT * FROM patterns WHERE id = ?", (pattern_id,))
            row = cur.fetchone()
            if row:
                result = dict(row)
                result['tags'] = json.loads(result['tags'])
                result['source_files'] = json.loads(result['source_files'] or '[]')
                return result
            return None

    def search_patterns(
        self,
        session_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search patterns by name/description (simple LIKE query)."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute("""
                SELECT * FROM patterns
                WHERE session_id = ?
                AND (pattern_name LIKE ? OR pattern_description LIKE ?)
                ORDER BY created_at DESC
                LIMIT ?
            """, (session_id, f"%{query}%", f"%{query}%", limit))
            results = []
            for row in cur.fetchall():
                result = dict(row)
                result['tags'] = json.loads(result['tags'])
                result['source_files'] = json.loads(result['source_files'] or '[]')
                results.append(result)
            return results

    def list_patterns(
        self,
        session_id: str,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List all patterns for a session."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if category:
                cur = conn.execute("""
                    SELECT * FROM patterns
                    WHERE session_id = ? AND tags LIKE ?
                    ORDER BY created_at DESC
                """, (session_id, f"%{category}%"))
            else:
                cur = conn.execute("""
                    SELECT * FROM patterns
                    WHERE session_id = ?
                    ORDER BY created_at DESC
                """, (session_id,))
            results = []
            for row in cur.fetchall():
                result = dict(row)
                result['tags'] = json.loads(result['tags'])
                result['source_files'] = json.loads(result['source_files'] or '[]')
                results.append(result)
            return results

    def delete_pattern(self, pattern_id: str) -> bool:
        """Delete a pattern. Returns True if deleted."""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("DELETE FROM patterns WHERE id = ?", (pattern_id,))
            return cur.rowcount > 0

    # === MEMORIES ===

    def save_memory(
        self,
        session_id: str,
        content: str,
        category: str = "other",
        priority: str = "normal"
    ) -> str:
        """Save a memory and return its ID."""
        memory_id = str(uuid.uuid4())
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO memories (id, session_id, content, category, priority)
                VALUES (?, ?, ?, ?, ?)
            """, (memory_id, session_id, content, category, priority))
        return memory_id

    def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get a memory by ID."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def search_memories(
        self,
        session_id: str,
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search memories by content (simple LIKE query)."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute("""
                SELECT * FROM memories
                WHERE session_id = ? AND content LIKE ?
                ORDER BY
                    CASE priority
                        WHEN 'high' THEN 1
                        WHEN 'normal' THEN 2
                        WHEN 'low' THEN 3
                    END,
                    created_at DESC
                LIMIT ?
            """, (session_id, f"%{query}%", top_k))
            return [dict(row) for row in cur.fetchall()]

    def list_memories(
        self,
        session_id: str,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List all memories for a session."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if category:
                cur = conn.execute("""
                    SELECT * FROM memories
                    WHERE session_id = ? AND category = ?
                    ORDER BY created_at DESC
                """, (session_id, category))
            else:
                cur = conn.execute("""
                    SELECT * FROM memories
                    WHERE session_id = ?
                    ORDER BY created_at DESC
                """, (session_id,))
            return [dict(row) for row in cur.fetchall()]

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory. Returns True if deleted."""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
            return cur.rowcount > 0

    def get_memory_count(self, session_id: str) -> int:
        """Get total memory count for a session."""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute(
                "SELECT COUNT(*) FROM memories WHERE session_id = ?",
                (session_id,)
            )
            return cur.fetchone()[0]

    # === CROSS-SESSION METHODS (for killer features) ===

    def search_all_memories(
        self,
        query: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search memories across ALL sessions (for cross_search tool)."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            # Join with sessions to get project_path
            cur = conn.execute("""
                SELECT
                    m.*,
                    s.project_path
                FROM memories m
                LEFT JOIN mcp_sessions s ON m.session_id = s.id
                WHERE m.content LIKE ?
                ORDER BY
                    CASE m.priority
                        WHEN 'critical' THEN 0
                        WHEN 'high' THEN 1
                        WHEN 'normal' THEN 2
                        WHEN 'low' THEN 3
                    END,
                    m.created_at DESC
                LIMIT ?
            """, (f"%{query}%", limit))
            return [dict(row) for row in cur.fetchall()]

    def get_session_memories(
        self,
        session_id: str
    ) -> List[Dict[str, Any]]:
        """Get all memories for a session (for inherit_memories and free tools)."""
        return self.list_memories(session_id)

    def update_session_status(
        self,
        session_id: str,
        status: str
    ) -> None:
        """Update session status (for free tool)."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE mcp_sessions
                SET status = ?, last_accessed = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (status, session_id))


def migrate_json_to_sqlite() -> bool:
    """
    Migrate existing JSON session to SQLite.

    Reads ~/.ralph/session.json and imports it into SQLite.
    The JSON file is renamed to .json.bak after successful migration.
    """
    json_session_file = Path.home() / ".ralph" / "session.json"

    if not json_session_file.exists():
        return False

    try:
        import json

        with open(json_session_file) as f:
            data = json.load(f)

        session_id = data.get("session_id")
        task_desc = data.get("task_description", "")

        if not session_id:
            return False

        # Use current directory as project_path (historical data)
        project_path = os.getcwd()

        db = SessionDB()
        db.save_session(session_id, project_path, task_desc)

        # Backup old JSON file
        backup_file = json_session_file.with_suffix(".json.bak")
        json_session_file.rename(backup_file)

        return True

    except Exception:
        return False


# Singleton instance for the MCP server
_instance: Optional[SessionDB] = None


def get_db() -> SessionDB:
    """Get or create the singleton SessionDB instance."""
    global _instance
    if _instance is None:
        _instance = SessionDB()
    return _instance
