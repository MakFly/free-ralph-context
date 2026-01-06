"""
Pattern management plugin for Ralph MCP.

Provides tools for learning, storing, and retrieving code patterns.
"""

import json
from pathlib import Path
from typing import Any

from mcp.types import Tool, TextContent

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from core import log_debug, log_error, log_info, count_files, read_project_context
from plugins.base import RalphPlugin


class PatternPlugin(RalphPlugin):
    """Pattern learning and retrieval plugin.

    Manages code pattern detection, storage, and semantic search.
    """

    def __init__(self, get_db, get_current_session_id, get_llm_provider=None, has_llm=None):
        """Initialize pattern plugin.

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
        """Return pattern management tools."""
        return [
            Tool(
                name="ralph_scan_project",
                description="Scan the project to detect framework, patterns, and conventions. Stores results for later retrieval. ONE-TIME setup - run once per project.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "project_path": {
                            "type": "string",
                            "description": "Path to the project (default: current directory)"
                        }
                    },
                    "required": []
                }
            ),
            Tool(
                name="ralph_learn_pattern",
                description="""Learn and store a code pattern for later reuse.

TWO MODES:
1. LLM Mode (automatic): If ANTHROPIC_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY, or GOOGLE_API_KEY is set,
   the pattern is extracted intelligently via AI analysis. You can omit pattern_description/code_example.

2. Generic Mode (fallback): If no LLM is available or force_generic=true, uses static code analysis.
   Less detailed but works offline and free.

USAGE:
- Manual: Provide pattern_name + pattern_description to store custom patterns
- Auto: Provide only pattern_name (or nothing) to auto-extract from project_path
- Override: Set force_generic=true to skip LLM even if available

EXAMPLES:
  ralph_learn_pattern("Symfony BetterAuth")
  → Auto-extracts using LLM or generic fallback

  ralph_learn_pattern("My Pattern", pattern_description="Custom desc", code_example="...")
  → Stores manual pattern

  ralph_learn_pattern(force_generic=True, project_path="./my-project")
  → Forces generic extraction without LLM""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "pattern_name": {
                            "type": "string",
                            "description": "Name of the pattern (optional in auto-extract mode)"
                        },
                        "pattern_description": {
                            "type": "string",
                            "description": "Detailed description (optional, will be auto-extracted if omitted)"
                        },
                        "code_example": {
                            "type": "string",
                            "description": "Example code (optional, will be auto-extracted if omitted)"
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Tags for categorization (optional, auto-detected if omitted)",
                            "default": []
                        },
                        "project_path": {
                            "type": "string",
                            "description": "Path to analyze (default: current directory)"
                        },
                        "force_generic": {
                            "type": "boolean",
                            "description": "Force generic extraction instead of LLM (default: false)",
                            "default": False
                        }
                    },
                    "required": []
                }
            ),
            Tool(
                name="ralph_get_pattern",
                description="Get a learned pattern by name or description. Example: 'Get the NextJS Server Actions pattern'. Returns structure, validation, conventions.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Pattern name or description to search for"
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="ralph_list_patterns",
                description="List all learned patterns for this project. Shows what patterns have been stored for reuse.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "description": "Filter by category/tag (optional)"
                        }
                    },
                    "required": []
                }
            ),
        ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> list[TextContent]:
        """Execute a pattern tool."""
        session_id = self.get_current_session_id()
        if session_id is None:
            return [TextContent(
                type="text",
                text=json.dumps({"error": "No active session. Call ralph_malloc first."})
            )]

        if name == "ralph_scan_project":
            return await self._scan_project(arguments, session_id)
        elif name == "ralph_learn_pattern":
            return await self._learn_pattern(arguments, session_id)
        elif name == "ralph_get_pattern":
            return self._get_pattern(arguments, session_id)
        elif name == "ralph_list_patterns":
            return self._list_patterns(arguments, session_id)
        else:
            raise ValueError(f"Unknown tool: {name}")

    async def _scan_project(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Scan project and detect patterns."""
        project_path = arguments.get("project_path", ".")
        log_info(f"Scanning project: {project_path}")

        # Detect framework using pattern_extractor
        from src.pattern_extractor import detect_framework, extract_generic_pattern

        framework = detect_framework(project_path)
        extracted = extract_generic_pattern(project_path)

        # Save the detected pattern
        db = self.get_db()
        db.save_pattern(
            session_id=session_id,
            pattern_name=f"{framework} Framework",
            pattern_description=extracted.get("pattern_description", ""),
            code_example=extracted.get("code_example", ""),
            tags=extracted.get("tags", [framework]),
            source_mode="generic",
            source_files=extracted.get("source_files", [])
        )

        return [TextContent(
            type="text",
            text=json.dumps({
                "message": "Project scanned successfully!",
                "framework": framework,
                "patterns_detected": 1,
                "conventions": extracted.get("tags", []),
                "next_steps": "Use ralph_learn_pattern to teach specific patterns, or ralph_get_pattern to retrieve detected patterns."
            }, indent=2)
        )]

    async def _learn_pattern(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Learn a new pattern from the project."""
        pattern_name = arguments.get("pattern_name", "unknown")
        project_path = arguments.get("project_path", ".")
        force_generic = arguments.get("force_generic", False)
        log_info(f"Learning pattern: {pattern_name}")

        # Choose extraction mode
        if force_generic or not self.has_llm or not self.has_llm():
            log_info("Using generic pattern extraction (no LLM)")
            from src.pattern_extractor import extract_generic_pattern
            extracted = extract_generic_pattern(project_path)
            source_mode = "generic"
        else:
            log_info("Using LLM-based pattern extraction")
            provider = self.get_llm_provider()
            try:
                code_context = read_project_context(project_path)
                project_info = {
                    "name": Path(project_path).name,
                    "framework": "unknown",
                    "file_count": count_files(project_path)
                }
                extracted = await provider.analyze_pattern(code_context, project_info)
                source_mode = "llm"
            except Exception as e:
                log_error(f"LLM extraction failed: {e}, falling back to generic")
                from src.pattern_extractor import extract_generic_pattern
                extracted = extract_generic_pattern(project_path)
                source_mode = "generic"

        # Use provided values or extracted
        final_pattern_name = arguments.get("pattern_name") or extracted.get("pattern_name")
        final_description = arguments.get("pattern_description") or extracted.get("pattern_description")
        final_code_example = arguments.get("code_example") or extracted.get("code_example")
        final_tags = arguments.get("tags") or extracted.get("tags", [])
        final_source_files = extracted.get("source_files", [])

        # Save to database
        db = self.get_db()
        pattern_id = db.save_pattern(
            session_id=session_id,
            pattern_name=final_pattern_name,
            pattern_description=final_description,
            code_example=final_code_example,
            tags=final_tags,
            source_mode=source_mode,
            source_files=final_source_files
        )

        return [TextContent(
            type="text",
            text=json.dumps({
                "message": f"Pattern '{final_pattern_name}' learned successfully!",
                "pattern_id": pattern_id,
                "pattern_name": final_pattern_name,
                "source_mode": source_mode,
                "tags": final_tags,
                "usage": f"Use ralph_get_pattern or ralph_recall('{final_pattern_name}') to retrieve it."
            }, indent=2)
        )]

    def _get_pattern(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """Get a pattern by query."""
        query = arguments.get("query", "")
        log_info(f"Getting pattern: {query}")

        db = self.get_db()
        patterns = db.search_patterns(session_id, query, limit=1)

        if not patterns:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "error": f"No pattern found matching: {query}",
                    "suggestion": "Use ralph_learn_pattern to learn a pattern first"
                }, indent=2)
            )]

        pattern = patterns[0]
        return [TextContent(
            type="text",
            text=json.dumps({
                "pattern": pattern.get("pattern_name"),
                "description": pattern.get("pattern_description"),
                "code_example": pattern.get("code_example"),
                "tags": pattern.get("tags"),
                "source_mode": pattern.get("source_mode"),
                "detected_from": pattern.get("source_files"),
                "created_at": pattern.get("created_at")
            }, indent=2, default=str)
        )]

    def _list_patterns(self, arguments: dict[str, Any], session_id: str) -> list[TextContent]:
        """List all patterns for the session."""
        category = arguments.get('category', '')
        log_info(f"Listing patterns (category: {category or 'all'})")

        db = self.get_db()
        patterns = db.list_patterns(session_id, category or None)

        # Extract unique categories
        all_categories = set()
        for p in patterns:
            all_categories.update(p.get("tags", []))

        return [TextContent(
            type="text",
            text=json.dumps({
                "patterns": patterns,
                "total": len(patterns),
                "categories": sorted(all_categories)
            }, indent=2, default=str)
        )]
