"""
Killer features plugin for Ralph MCP.

Provides advanced tools: orchestrate, cross_search, inherit_memories, fast_apply.
"""

import json
from typing import Any

from mcp.types import Tool, TextContent

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from core import log_info
from plugins.base import RalphPlugin


class KillerFeaturesPlugin(RalphPlugin):
    """Advanced features plugin.

    Multi-agent orchestration, cross-session search, memory inheritance.
    """

    def __init__(self, get_db, get_current_session_id, get_llm_provider=None, has_llm=None):
        """Initialize killer features plugin.

        Args:
            get_db: Function to get database instance
            get_current_session_id: Function to get current session ID
            get_llm_provider: Optional function to get LLM provider
            has_llm: Optional function to check LLM availability
        """
        self.get_db = get_db
        self.get_current_session_id = get_current_session_id
        self.get_llm_provider = get_llm_provider
        self.has_llm = has_llm

    def get_tools(self) -> list[Tool]:
        """Return advanced feature tools."""
        return [
            Tool(
                name="ralph_fast_apply",
                description="""Semantic code editor - apply changes using natural language intent.

Modifies code based on description of the change you want. Creates backup before editing.
Falls back to pattern matching without LLM.

EXAMPLES:
  ralph_fast_apply(
    file_path="src/Button.tsx",
    intent="Add loading spinner when isLoading prop is true",
    context="Uses Tailwind CSS"
  )

  ralph_fast_apply(
    file_path="main.py",
    intent="Add import os at the top"
  )

  ralph_fast_apply(
    file_path="config.js",
    intent="Replace 'localhost' with 'api.example.com'"
  )""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file to modify"
                        },
                        "intent": {
                            "type": "string",
                            "description": "Natural language description of the change"
                        },
                        "context": {
                            "type": "string",
                            "description": "Additional context (framework, style, etc.)",
                            "default": ""
                        }
                    },
                    "required": ["file_path", "intent"]
                }
            ),
            Tool(
                name="ralph_orchestrate",
                description="""Task router - analyzes task and recommends optimal agent + tools.

Classifies your task and suggests:
- Which agent to use (swe-scout, snipper, plan, debug-agent, etc.)
- Which Ralph tools the agent should leverage
- Estimated context requirements

EXAMPLES:
  ralph_orchestrate("Find all API endpoints and understand auth flow")
  → Recommends: swe-scout + [ralph_warpgrep, ralph_recall]

  ralph_orchestrate("Fix the login button not working")
  → Recommends: debug-agent + [ralph_warpgrep, ralph_cross_search]

  ralph_orchestrate("Plan the migration from REST to GraphQL")
  → Recommends: plan + [ralph_warpgrep, ralph_checkpoint, ralph_add_memory]""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "task_description": {
                            "type": "string",
                            "description": "Natural language description of the task"
                        }
                    },
                    "required": ["task_description"]
                }
            ),
            Tool(
                name="ralph_cross_search",
                description="""Cross-session memory search - find knowledge from ALL past sessions.

Searches memories across ALL sessions, not just the current one.
Enables knowledge reuse and pattern recognition across projects.

EXAMPLES:
  ralph_cross_search("authentication middleware pattern")
  → Finds memories about auth patterns from any past session

  ralph_cross_search("React state management", categories=["decision"])
  → Finds state management decisions from past React projects""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Natural language search query"
                        },
                        "top_k": {
                            "type": "integer",
                            "description": "Number of results (default: 10)",
                            "default": 10
                        },
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Filter by categories (optional)"
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="ralph_inherit_memories",
                description="""Import relevant memories from past sessions into current session.

Bootstrap your session with knowledge from related past work.
Prevents re-learning patterns and decisions.

EXAMPLES:
  ralph_inherit_memories("Next.js App Router patterns")
  → Imports relevant patterns from past Next.js projects

  ralph_inherit_memories("API error handling", max_imports=10)
  → Imports up to 10 error handling memories""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "source_query": {
                            "type": "string",
                            "description": "Query to find relevant memories"
                        },
                        "max_imports": {
                            "type": "integer",
                            "description": "Maximum memories to import (default: 20)",
                            "default": 20
                        },
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Filter by categories (optional)"
                        }
                    },
                    "required": ["source_query"]
                }
            ),
        ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> list[TextContent]:
        """Execute a killer feature tool."""
        session_id = self.get_current_session_id()

        if name == "ralph_fast_apply":
            return await self._fast_apply(arguments)
        elif name == "ralph_orchestrate":
            return await self._orchestrate(arguments)
        elif name == "ralph_cross_search":
            return await self._cross_search(arguments)
        elif name == "ralph_inherit_memories":
            return await self._inherit_memories(arguments, session_id)
        else:
            raise ValueError(f"Unknown tool: {name}")

    async def _fast_apply(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Semantic code editing."""
        from src.tools.fast_apply import FastApplyTool

        file_path = arguments.get("file_path")
        intent = arguments.get("intent")
        context = arguments.get("context", "")
        log_info(f"FastApply: {file_path} - {intent[:50]}...")

        # Get LLM provider if available
        llm = None
        if self.has_llm and self.has_llm() and self.get_llm_provider:
            llm = self.get_llm_provider()

        tool = FastApplyTool(llm)
        result = await tool.execute(file_path, intent, context)

        return [TextContent(
            type="text",
            text=json.dumps(result.to_dict(), indent=2, default=str)
        )]

    async def _orchestrate(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Task orchestration and agent recommendation."""
        from src.tools.orchestrate import orchestrate

        task_description = arguments.get("task_description", "")
        log_info(f"Orchestrate: {task_description[:50]}...")

        result = await orchestrate(task_description)

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, default=str)
        )]

    async def _cross_search(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Cross-session memory search."""
        from src.tools.cross_search import CrossSearchTool

        query = arguments.get("query", "")
        top_k = arguments.get("top_k", 10)
        categories = arguments.get("categories")
        log_info(f"CrossSearch: {query[:50]}...")

        db = self.get_db()
        tool = CrossSearchTool(db)
        result = await tool.execute(query, top_k, categories)

        return [TextContent(
            type="text",
            text=json.dumps(result.to_dict(), indent=2, default=str)
        )]

    async def _inherit_memories(self, arguments: dict[str, Any], session_id: str | None) -> list[TextContent]:
        """Import memories from past sessions."""
        if session_id is None:
            return [TextContent(
                type="text",
                text=json.dumps({"error": "No active session. Call ralph_malloc first."})
            )]

        from src.tools.inherit_memories import InheritMemoriesTool
        from src.tools.cross_search import CrossSearchTool

        source_query = arguments.get("source_query", "")
        max_imports = arguments.get("max_imports", 20)
        categories = arguments.get("categories")
        log_info(f"InheritMemories: {source_query[:50]}...")

        db = self.get_db()
        cross_search = CrossSearchTool(db)
        tool = InheritMemoriesTool(db, cross_search)
        result = await tool.execute(session_id, source_query, max_imports, "normal", categories)

        return [TextContent(
            type="text",
            text=json.dumps(result.to_dict(), indent=2, default=str)
        )]
