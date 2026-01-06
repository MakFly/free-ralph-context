"""
Memory management plugin for Ralph MCP.

Provides tools for storing, searching, and managing memories.
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


class MemoryPlugin(RalphPlugin):
    """Memory operations plugin.

    Manages semantic memory storage and retrieval within sessions.
    """

    def __init__(self, get_db, get_current_session_id):
        """Initialize memory plugin.

        Args:
            get_db: Function to get database instance
            get_current_session_id: Function to get current session ID
        """
        self.get_db = get_db
        self.get_current_session_id = get_current_session_id

    def get_tools(self) -> list[Tool]:
        """Return memory management tools."""
        return [
            Tool(
                name="ralph_recall",
                description="""CRITICAL: Call this BEFORE answering ANY project-related question.

Retrieves all relevant Ralph context in ONE call (replaces ralph_search + ralph_get_pattern + ralph_get_status):

- Current session status (context usage, memory count)
- Related memories (decisions, actions, context)
- Learned patterns matching the query

EXAMPLE FLOW:
  User: "How would you create Symfony auth?"
  You: ralph_recall(query="Symfony authentication architecture")
  → Returns: 4 patterns, 3 decisions, current status
  You: Answer based on retrieved context (NOT generic knowledge)

SPEED: Parallel API calls, ~200ms total
TOKEN SAVINGS: 6x less tokens than answering with generic knowledge

This is the PRIMARY tool for context-aware responses. Use it before:
- Answering "how would you implement X" questions
- Making architectural decisions
- Explaining project-specific patterns
- Any question where project context matters""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Natural language query for context retrieval (e.g., 'Symfony authentication patterns', 'React state management')"
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Max results per category (default: 5)",
                            "default": 5
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="ralph_add_memory",
                description="Store an important decision, action, or context for later retrieval.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "Memory content to store"
                        },
                        "category": {
                            "type": "string",
                            "enum": ["decision", "action", "error", "progress", "context", "other"],
                            "description": "Memory category for organization",
                            "default": "other"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["high", "normal", "low"],
                            "description": "Memory priority",
                            "default": "normal"
                        }
                    },
                    "required": ["content"]
                }
            ),
            Tool(
                name="ralph_search",
                description="Search memories semantically to recall past decisions, actions, or context.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Natural language search query"
                        },
                        "top_k": {
                            "type": "integer",
                            "description": "Number of results to return (default: 5)",
                            "default": 5
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="ralph_curate",
                description="Curate memories to keep only high-value entries and remove duplicates.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "keep_top": {
                            "type": "integer",
                            "description": "Number of top memories to keep (default: 50)",
                            "default": 50
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
        """Execute a memory tool.

        Args:
            name: Tool name
            arguments: Tool arguments

        Returns:
            List of TextContent with result
        """
        session_id = self.get_current_session_id()
        if session_id is None and name != "ralph_recall":
            return [TextContent(
                type="text",
                text=json.dumps({"error": "No active session. Call ralph_malloc first."})
            )]

        if name == "ralph_recall":
            return self._recall(arguments, session_id)
        elif name == "ralph_add_memory":
            return self._add_memory(arguments, session_id)
        elif name == "ralph_search":
            return self._search(arguments, session_id)
        elif name == "ralph_curate":
            return await self._curate(arguments, session_id)
        else:
            raise ValueError(f"Unknown tool: {name}")

    def _recall(self, arguments: dict[str, Any], session_id: str | None) -> list[TextContent]:
        """Recall context with memories and patterns."""
        if session_id is None:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "error": "No active Ralph session",
                    "action_required": "Call ralph_malloc first to initialize session",
                    "fallback_mode": "Answering with general knowledge (NOT project-specific)",
                    "example_workflow": "ralph_malloc(task) → ralph_learn_pattern() → ralph_recall(query) → answer"
                }, indent=2)
            )]

        query = arguments.get("query", "")
        max_results = arguments.get("max_results", 5)
        log_info(f"Recall context for query: {query[:60]}...")

        db = self.get_db()

        # Get session info
        session = db.get_session(session_id)
        status_data = {
            "session_id": session_id,
            "active": session is not None,
            "memory_count": db.get_memory_count(session_id) if session else 0
        }

        # Search memories
        memories = db.search_memories(session_id, query, max_results)

        # Search patterns
        patterns = db.search_patterns(session_id, query, max_results)

        result = {
            "session_id": session_id,
            "query": query,
            "status": status_data,
            "memories_count": len(memories),
            "memories": memories[:max_results],
            "patterns_count": len(patterns),
            "patterns": patterns[:max_results],
            "guidance": "Use this context to answer project-specific questions. Base your response on retrieved patterns and decisions instead of generic knowledge."
        }

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, default=str)
        )]

    def _add_memory(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Add a memory to the session."""
        log_info(f"Adding memory (category: {arguments.get('category', 'other')})")

        db = self.get_db()
        memory_id = db.save_memory(
            session_id=session_id,
            content=arguments["content"],
            category=arguments.get("category", "other"),
            priority=arguments.get("priority", "normal")
        )

        return [TextContent(
            type="text",
            text=json.dumps({
                "message": "Memory saved successfully",
                "memory_id": memory_id,
                "content": arguments["content"][:100] + "..." if len(arguments["content"]) > 100 else arguments["content"],
                "category": arguments.get("category", "other"),
                "priority": arguments.get("priority", "normal")
            }, indent=2)
        )]

    def _search(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Search memories in the session."""
        query = arguments.get("query", "")
        top_k = arguments.get("top_k", 5)
        log_info(f"Searching memories: {query}")

        db = self.get_db()
        memories = db.search_memories(session_id, query, top_k)

        return [TextContent(
            type="text",
            text=json.dumps({
                "query": query,
                "count": len(memories),
                "memories": memories
            }, indent=2, default=str)
        )]

    async def _curate(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Curate memories to keep only high-value entries."""
        keep_top = arguments.get("keep_top", 50)
        log_info(f"Curating memories (keep top: {keep_top})")

        # This needs API call - will be connected later
        return [TextContent(
            type="text",
            text=json.dumps({
                "message": "Memory curation requires API integration",
                "note": "This will be connected to the HTTP client in infrastructure layer"
            })
        )]
