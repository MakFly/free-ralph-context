"""
Context optimization plugin for Ralph MCP.

Provides tools for compressing, folding, and checkpointing context.
"""

import json
from typing import Any

from mcp.types import Tool, TextContent

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from core import log_debug, log_error, log_info
from plugins.base import RalphPlugin


class ContextPlugin(RalphPlugin):
    """Context optimization plugin.

    Manages context compression, folding, and checkpointing.
    """

    def __init__(self, get_db, get_current_session_id, api_call):
        """Initialize context plugin.

        Args:
            get_db: Function to get database instance
            get_current_session_id: Function to get current session ID
            api_call: Function to make HTTP calls to Ralph API
        """
        self.get_db = get_db
        self.get_current_session_id = get_current_session_id
        self.api_call = api_call

    def get_tools(self) -> list[Tool]:
        """Return context optimization tools."""
        return [
            Tool(
                name="ralph_get_status",
                description="Get current session status including token usage, memory count, and context percentage.",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            ),
            Tool(
                name="ralph_compress",
                description="Compress trajectory/tokens while preserving critical information (decisions, files, errors). Reduces token usage by 3-5x.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "trajectory": {
                            "type": "string",
                            "description": "The conversation/agent trajectory to compress"
                        },
                        "ratio": {
                            "type": "number",
                            "description": "Target compression ratio (0.1-0.5, default: 0.25)",
                            "default": 0.25
                        }
                    },
                    "required": ["trajectory"]
                }
            ),
            Tool(
                name="ralph_checkpoint",
                description="Create a named checkpoint of the current session state for later restoration.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "label": {
                            "type": "string",
                            "description": "Descriptive label for this checkpoint"
                        }
                    },
                    "required": ["label"]
                }
            ),
            Tool(
                name="ralph_should_fold",
                description="Evaluate if context should be folded based on current usage and memory count.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "context_usage": {
                            "type": "number",
                            "description": "Current context usage as percentage (0-1)"
                        },
                        "memory_count": {
                            "type": "integer",
                            "description": "Number of memories in session",
                            "default": 0
                        }
                    },
                    "required": ["context_usage"]
                }
            ),
            Tool(
                name="ralph_fold",
                description="Execute context folding: compress trajectory + create checkpoint. Use when context > 70%.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "trajectory": {
                            "type": "string",
                            "description": "The trajectory to compress"
                        },
                        "label": {
                            "type": "string",
                            "description": "Checkpoint label",
                            "default": "auto-fold"
                        }
                    },
                    "required": ["trajectory"]
                }
            ),
            Tool(
                name="ralph_free",
                description="""Terminate session with proper cleanup - the counterpart to malloc.

Properly closes a session:
1. Creates final checkpoint
2. Extracts key learnings for future sessions
3. Archives session data
4. Marks session as completed

EXAMPLES:
  ralph_free()
  → Terminates current session with full cleanup

  ralph_free(extract_learnings=False)
  → Quick termination without learning extraction""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "extract_learnings": {
                            "type": "boolean",
                            "description": "Extract key decisions/patterns (default: true)",
                            "default": True
                        },
                        "create_checkpoint": {
                            "type": "boolean",
                            "description": "Create final checkpoint (default: true)",
                            "default": True
                        }
                    },
                    "required": []
                }
            ),
        ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> list[TextContent]:
        """Execute a context tool."""
        session_id = self.get_current_session_id()

        if name == "ralph_get_status":
            return self._get_status(session_id)
        elif name == "ralph_compress":
            return await self._compress(arguments)
        elif name == "ralph_checkpoint":
            return await self._checkpoint(arguments, session_id)
        elif name == "ralph_should_fold":
            return await self._should_fold(arguments)
        elif name == "ralph_fold":
            return await self._fold(arguments, session_id)
        elif name == "ralph_free":
            return await self._free(arguments, session_id)
        else:
            raise ValueError(f"Unknown tool: {name}")

    def _get_status(self, session_id: str | None) -> list[TextContent]:
        """Get current session status."""
        if session_id is None:
            return [TextContent(
                type="text",
                text=json.dumps({"error": "No active session. Call ralph_malloc first."})
            )]

        db = self.get_db()
        session = db.get_session(session_id)

        if not session:
            return [TextContent(
                type="text",
                text=json.dumps({"error": f"Session not found: {session_id}"})
            )]

        memory_count = db.get_memory_count(session_id)
        pattern_count = len(db.list_patterns(session_id))

        return [TextContent(
            type="text",
            text=json.dumps({
                "session_id": session_id,
                "project_path": session["project_path"],
                "task_description": session["task_description"],
                "max_tokens": session["max_tokens"],
                "memory_count": memory_count,
                "pattern_count": pattern_count,
                "created_at": session["created_at"],
                "last_accessed": session["last_accessed"]
            }, indent=2, default=str)
        )]

    async def _compress(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Compress trajectory."""
        log_info(f"Compressing trajectory (ratio: {arguments.get('ratio', 0.25)})")
        result = await self.api_call("POST", "/api/compress", {
            "trajectory": arguments["trajectory"],
            "ratio": arguments.get("ratio", 0.25)
        })
        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    async def _checkpoint(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Create a checkpoint."""
        if session_id is None:
            return [TextContent(
                type="text",
                text=json.dumps({"error": "No active session. Call ralph_malloc first."})
            )]

        label = arguments.get("label", "unnamed")
        log_info(f"Creating checkpoint: {label}")
        result = await self.api_call("POST", "/api/checkpoints", {
            "session_id": session_id,
            "label": label
        })
        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    async def _should_fold(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Check if context should be folded."""
        context_usage = arguments.get("context_usage", 0)
        log_info(f"Checking should_fold (context: {context_usage})")
        result = await self.api_call("POST", "/api/should-fold", {
            "context_usage": context_usage,
            "memory_count": arguments.get("memory_count", 0)
        })
        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    async def _fold(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Fold context."""
        if session_id is None:
            return [TextContent(
                type="text",
                text=json.dumps({"error": "No active session. Call ralph_malloc first."})
            )]

        label = arguments.get("label", "auto-fold")
        log_info(f"Folding context: {label}")
        result = await self.api_call("POST", "/api/fold", {
            "session_id": session_id,
            "trajectory": arguments["trajectory"],
            "label": label
        })
        return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

    async def _free(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Free session."""
        if session_id is None:
            return [TextContent(
                type="text",
                text=json.dumps({"error": "No active session. Nothing to free."})
            )]

        from src.tools.free import FreeTool

        extract_learnings = arguments.get("extract_learnings", True)
        create_checkpoint = arguments.get("create_checkpoint", True)
        log_info(f"Free: session={session_id}")

        db = self.get_db()
        tool = FreeTool(db, self.api_call)
        result = await tool.execute(session_id, extract_learnings, create_checkpoint)

        return [TextContent(type="text", text=json.dumps(result.to_dict(), indent=2, default=str))]
