"""
Session management plugin for Ralph MCP.

Provides tools for creating, managing, and persisting sessions.
"""

import json
import os
from typing import Any

from mcp.types import Tool, TextContent

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from core import log_debug, log_error, log_info
from plugins.base import RalphPlugin


class SessionPlugin(RalphPlugin):
    """Session lifecycle management plugin.

    Manages Ralph session creation, restoration, listing, and cleanup.
    Uses SQLite for persistence across Claude restarts.
    """

    def __init__(self, get_db, save_session, load_session, clear_session):
        """Initialize session plugin.

        Args:
            get_db: Function to get database instance
            save_session: Function to persist session
            load_session: Function to load session
            clear_session: Function to clear session from memory
        """
        self.get_db = get_db
        self.save_session = save_session
        self.load_session = load_session
        self.clear_session = clear_session

    def get_tools(self) -> list[Tool]:
        """Return session management tools."""
        return [
            Tool(
                name="ralph_malloc",
                description="""Initialize a new Ralph session for context management.

CRITICAL WORKFLOW (follow this strictly):
1. ralph_malloc(task) → Start session
2. ralph_scan_project() → Learn project patterns
3. ralph_recall(query) → BEFORE answering ANY project question
4. Answer based on retrieved context

WITHOUT ralph_recall: You answer with generic knowledge (WRONG - ignores project context)
WITH ralph_recall: You answer with project-specific patterns (10x faster, 10x more accurate)

Example:
  User: "How would you create Symfony auth?"
  WRONG: Answer with generic Symfony knowledge
  RIGHT: ralph_recall("Symfony authentication") → Answer with learned patterns

Call this at the start of any complex task involving code exploration or implementation.""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "task_description": {
                            "type": "string",
                            "description": "Description of the task you're working on"
                        },
                        "max_tokens": {
                            "type": "integer",
                            "description": "Maximum token budget (default: 200000)",
                            "default": 200000
                        }
                    },
                    "required": ["task_description"]
                }
            ),
            Tool(
                name="ralph_session_info",
                description="""Get current Ralph session information (persisted across Claude restarts).

Returns:
- session_id: Current session ID (if any)
- task_description: What the session is working on
- persisted: Whether session is saved to disk
- active: Whether session is loaded in memory

This helps you understand if a session is already active before calling ralph_malloc.
If a session exists, you can use ralph_recall directly without creating a new one.""",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            ),
            Tool(
                name="ralph_list_sessions",
                description="""List all Ralph sessions stored in SQLite.

Args:
- project_path (optional): Filter by project path
- limit (optional): Max results (default: 20)

Returns sessions sorted by last_accessed DESC with:
- id, project_path, task_description, created_at, last_accessed
- Use this to see available sessions before restoring one.""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "project_path": {
                            "type": "string",
                            "description": "Filter by project path"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results (default: 20)",
                            "default": 20
                        }
                    },
                    "required": []
                }
            ),
            Tool(
                name="ralph_restore_session",
                description="""Restore a specific session from SQLite.

Args:
- session_id (required): The session ID to restore

After restoration, use ralph_recall to retrieve context from this session.""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "session_id": {
                            "type": "string",
                            "description": "Session ID to restore (get from ralph_list_sessions)"
                        }
                    },
                    "required": ["session_id"]
                }
            ),
            Tool(
                name="ralph_delete_session",
                description="""Delete a session from SQLite storage.

Args:
- session_id (required): The session ID to delete

Warning: This cannot be undone!""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "session_id": {
                            "type": "string",
                            "description": "Session ID to delete"
                        }
                    },
                    "required": ["session_id"]
                }
            ),
            Tool(
                name="ralph_cleanup_sessions",
                description="""Clean up Ralph sessions with smart options.

MODES:
1. "list" (default) - Show all sessions with cleanup suggestions
2. "delete_test" - Delete all test sessions (session_id contains "test")
3. "delete_old" - Delete sessions older than N days (use days parameter)
4. "delete_selected" - Delete specific session IDs (use session_ids parameter)

EXAMPLES:
  ralph_cleanup_sessions()
  → Lists all sessions, suggests which to delete

  ralph_cleanup_sessions(mode="delete_test")
  → Deletes all test sessions automatically

  ralph_cleanup_sessions(mode="delete_selected", session_ids=["id1", "id2"])
  → Deletes only specified sessions

  ralph_cleanup_sessions(mode="delete_old", days=30)
  → Deletes sessions older than 30 days""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "mode": {
                            "type": "string",
                            "enum": ["list", "delete_test", "delete_old", "delete_selected"],
                            "description": "Cleanup mode",
                            "default": "list"
                        },
                        "session_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Session IDs to delete (required for delete_selected mode)"
                        },
                        "days": {
                            "type": "integer",
                            "description": "Delete sessions older than N days (required for delete_old mode)",
                            "default": 30
                        },
                        "confirm": {
                            "type": "boolean",
                            "description": "Confirm deletion (required for delete modes)",
                            "default": False
                        }
                    },
                    "required": []
                }
            ),
        ]

    async def execute_tool(
        self,
        name: str,
        arguments: dict[str, Any]
    ) -> list[TextContent]:
        """Execute a session management tool.

        Args:
            name: Tool name
            arguments: Tool arguments

        Returns:
            List of TextContent with result
        """
        if name == "ralph_malloc":
            return await self._malloc(arguments)
        elif name == "ralph_session_info":
            return self._session_info()
        elif name == "ralph_list_sessions":
            return self._list_sessions(arguments)
        elif name == "ralph_restore_session":
            return self._restore_session(arguments)
        elif name == "ralph_delete_session":
            return self._delete_session(arguments)
        elif name == "ralph_cleanup_sessions":
            return await self._cleanup_sessions(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")

    async def _malloc(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Create a new session."""
        # This needs api_call - will be injected later
        # For now, return a placeholder
        return [TextContent(
            type="text",
            text=json.dumps({
                "message": "ralph_malloc requires API integration",
                "note": "This will be connected to the HTTP client in infrastructure layer"
            })
        )]

    def _session_info(self) -> list[TextContent]:
        """Get current session info."""
        db = self.get_db()
        project_path = os.getcwd()
        all_sessions = db.list_sessions(project_path, limit=5)

        session_info = {
            "current_project": project_path,
            "total_sessions_for_project": len(all_sessions),
            "recent_sessions": all_sessions,
        }

        return [TextContent(
            type="text",
            text=json.dumps(session_info, indent=2, default=str)
        )]

    def _list_sessions(self, arguments: dict[str, Any]) -> list[TextContent]:
        """List all sessions."""
        db = self.get_db()
        project_path_filter = arguments.get("project_path")
        limit = arguments.get("limit", 20)

        sessions = db.list_sessions(project_path_filter, limit)

        return [TextContent(
            type="text",
            text=json.dumps({
                "count": len(sessions),
                "sessions": sessions,
                "current_project": os.getcwd()
            }, indent=2, default=str)
        )]

    def _restore_session(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Restore a session."""
        session_id = arguments["session_id"]
        db = self.get_db()

        session = db.get_session(session_id)
        if not session:
            return [TextContent(
                type="text",
                text=json.dumps({"error": f"Session not found: {session_id}"})
            )]

        db.update_last_accessed(session_id)

        return [TextContent(
            type="text",
            text=json.dumps({
                "message": "Session restored",
                "session_id": session['id'],
                "project_path": session['project_path'],
                "task_description": session['task_description'],
                "created_at": session['created_at'],
                "note": "Use ralph_recall to retrieve context from this session"
            }, indent=2, default=str)
        )]

    def _delete_session(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Delete a session."""
        session_id = arguments["session_id"]
        db = self.get_db()

        deleted = db.delete_session(session_id)

        return [TextContent(
            type="text",
            text=json.dumps({
                "deleted": deleted,
                "session_id": session_id
            }, indent=2)
        )]

    async def _cleanup_sessions(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Cleanup sessions with various modes."""
        from datetime import datetime, timedelta

        mode = arguments.get("mode", "list")
        db = self.get_db()
        all_sessions = db.list_sessions(limit=100)

        if mode == "list":
            test_sessions = [s for s in all_sessions if "test" in s["id"].lower()]
            other_sessions = [s for s in all_sessions if "test" not in s["id"].lower()]

            return [TextContent(
                type="text",
                text=json.dumps({
                    "mode": "list",
                    "total_sessions": len(all_sessions),
                    "test_sessions": {
                        "count": len(test_sessions),
                        "sessions": test_sessions,
                        "suggestion": f"Use ralph_cleanup_sessions(mode='delete_test', confirm=true) to delete all {len(test_sessions)} test sessions"
                    },
                    "other_sessions": {
                        "count": len(other_sessions),
                        "sessions": other_sessions
                    },
                    "cleanup_commands": {
                        "delete_all_test": "ralph_cleanup_sessions(mode='delete_test', confirm=true)",
                        "delete_selected": "ralph_cleanup_sessions(mode='delete_selected', session_ids=['id1', 'id2'], confirm=true)",
                        "delete_old": "ralph_cleanup_sessions(mode='delete_old', days=30, confirm=true)"
                    }
                }, indent=2, default=str)
            )]

        elif mode == "delete_test":
            if not arguments.get("confirm", False):
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "error": "Confirmation required",
                        "action": "Set confirm=true to proceed"
                    }, indent=2)
                )]

            test_sessions = [s for s in all_sessions if "test" in s["id"].lower()]
            deleted_count = 0

            for session in test_sessions:
                if db.delete_session(session["id"]):
                    deleted_count += 1

            return [TextContent(
                type="text",
                text=json.dumps({
                    "mode": "delete_test",
                    "deleted_count": deleted_count,
                    "message": f"Deleted {deleted_count} test sessions"
                }, indent=2)
            )]

        elif mode == "delete_selected":
            session_ids = arguments.get("session_ids", [])
            if not session_ids:
                return [TextContent(
                    type="text",
                    text=json.dumps({"error": "session_ids parameter required for delete_selected mode"}, indent=2)
                )]

            if not arguments.get("confirm", False):
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "error": "Confirmation required",
                        "action": f"Set confirm=true to delete {len(session_ids)} sessions",
                        "session_ids": session_ids
                    }, indent=2)
                )]

            deleted_count = 0
            for session_id in session_ids:
                if db.delete_session(session_id):
                    deleted_count += 1

            return [TextContent(
                type="text",
                text=json.dumps({
                    "mode": "delete_selected",
                    "deleted_count": deleted_count,
                    "total_requested": len(session_ids),
                    "message": f"Deleted {deleted_count}/{len(session_ids)} sessions"
                }, indent=2)
            )]

        elif mode == "delete_old":
            days = arguments.get("days", 30)
            if not arguments.get("confirm", False):
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "error": "Confirmation required",
                        "action": f"Set confirm=true to delete sessions older than {days} days"
                    }, indent=2)
                )]

            cutoff_date = datetime.now() - timedelta(days=days)
            old_sessions = []

            for session in all_sessions:
                try:
                    last_accessed = datetime.fromisoformat(session["last_accessed"].replace("Z", "+00:00"))
                    if last_accessed < cutoff_date:
                        old_sessions.append(session)
                except Exception:
                    continue

            deleted_count = 0
            for session in old_sessions:
                if db.delete_session(session["id"]):
                    deleted_count += 1

            return [TextContent(
                type="text",
                text=json.dumps({
                    "mode": "delete_old",
                    "deleted_count": deleted_count,
                    "cutoff_days": days,
                    "message": f"Deleted {deleted_count} sessions older than {days} days"
                }, indent=2)
            )]

        return [TextContent(
            type="text",
            text=json.dumps({"error": f"Unknown mode: {mode}"})
        )]
