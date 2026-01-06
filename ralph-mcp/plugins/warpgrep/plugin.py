"""
WarpGrep plugin for Ralph MCP.

Provides ultra-fast parallel search capabilities with cross-project support.
"""

import json
import os
from typing import Any

from mcp.types import Tool, TextContent

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from core import log_info, log_debug
from plugins.base import RalphPlugin


class WarpGrepPlugin(RalphPlugin):
    """Parallel search plugin using ripgrep.

    Provides 10-20x faster search through parallel pattern matching.
    Now supports 4 cross-project options:
    1. Project Alias Registry (use 'project' param)
    2. Smart CWD Switcher (use 'cwd' param)
    3. Global FTS5 Index (use 'scope' param)
    4. Fuzzy Project Finder (use 'find' param)
    """

    def get_tools(self) -> list[Tool]:
        """Return warpgrep tool."""
        return [
            Tool(
                name="ralph_warpgrep",
                description="""Parallel search engine - 10-20x faster than sequential grep.

Search codebases with multiple patterns simultaneously. Supports:
- literal: Exact string match (case-insensitive)
- regex: Regular expression patterns
- glob: File path patterns (e.g., **/*.py)

⚠️ CRITICAL: NEVER use paths=["."] - specify source directories!

CROSS-PROJECT OPTIONS (choose one):
1. project="name" - Search in registered project by name (from ~/.ralph/projects.json)
2. cwd="/path/to/project" - Search in any directory (Smart CWD Switcher)
3. find="project-name" - Fuzzy find project by name (Fuzzy Finder)
4. scope="project-name" - Search global FTS5 index (instant)

EXAMPLES:
  # ✅ Search in current project
  ralph_warpgrep([
    {"type": "literal", "value": "TODO"}
  ], paths=["src/", "app/"])

  # ✅ Search in registered project by name (Option 1)
  ralph_warpgrep([
    {"type": "literal", "value": "auth"}
  ], project="iautos")

  # ✅ Search in any directory (Option 2)
  ralph_warpgrep([
    {"type": "literal", "value": "middleware"}
  ], cwd="/home/user/projects/my-app")

  # ✅ Fuzzy find project (Option 4)
  ralph_warpgrep([
    {"type": "literal", "value": "pattern"}
  ], find="web-analytics")

  # ✅ Search global index (Option 3)
  ralph_warpgrep([
    {"type": "literal", "value": "query"}
  ], scope="ralph")

EXCLUSIONS: node_modules, vendor, .git, dist, build, coverage, etc.
TIMEOUT: 30s default. Narrow paths if timeout occurs.

Returns matches with file:line, deduplicated across patterns.""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "patterns": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "type": {"type": "string", "enum": ["literal", "regex", "glob"]},
                                    "value": {"type": "string"}
                                },
                                "required": ["type", "value"]
                            },
                            "description": "List of patterns to search"
                        },
                        "paths": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Source directories to search. RECOMMENDED: ['src/', 'app/']. Omit for auto-detection. NEVER use ['.']!",
                            "default": []
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum results to return (default: 100)",
                            "default": 100
                        },
                        "project": {
                            "type": "string",
                            "description": "Search in registered project by name (Option 1: Project Alias Registry)"
                        },
                        "cwd": {
                            "type": "string",
                            "description": "Search in specific directory (Option 2: Smart CWD Switcher)"
                        },
                        "find": {
                            "type": "string",
                            "description": "Fuzzy find project by name (Option 4: Fuzzy Project Finder)"
                        },
                        "scope": {
                            "type": "string",
                            "description": "Search global FTS5 index (Option 3: Indexed Navigator)"
                        }
                    },
                    "required": ["patterns"]
                }
            ),
        ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> list[TextContent]:
        """Execute warpgrep search with cross-project support."""
        if name != "ralph_warpgrep":
            raise ValueError(f"Unknown tool: {name}")

        from src.tools.warpgrep import warpgrep
        from src.project_registry import get_registry

        patterns = arguments.get("patterns", [])
        paths = arguments.get("paths", [])
        max_results = arguments.get("max_results", 100)

        # Cross-project options
        project_name = arguments.get("project")
        target_cwd = arguments.get("cwd")
        find_query = arguments.get("find")
        scope_project = arguments.get("scope")

        # Determine the working directory
        original_cwd = os.getcwd()
        search_cwd = original_cwd

        # Handle cross-project options
        if project_name:
            # Option 1: Project Alias Registry
            registry = get_registry()
            project_path = registry.get_project_path(project_name)
            if project_path:
                search_cwd = project_path
                paths = paths or registry.get_source_dirs(project_path)
                log_info(f"WarpGrep: Using project '{project_name}' at {project_path}")
            else:
                return [TextContent(
                    type="text",
                    text=json.dumps({"error": f"Project not found: {project_name}"}, indent=2)
                )]

        elif find_query:
            # Option 4: Fuzzy Project Finder
            registry = get_registry()
            found = registry.find_project_fuzzy(find_query)
            if found:
                for name, proj in found.items():
                    search_cwd = proj["path"]
                    paths = paths or registry.get_source_dirs(proj["path"])
                    log_info(f"WarpGrep: Fuzzy found '{name}' at {proj['path']}")
                    break
            else:
                return [TextContent(
                    type="text",
                    text=json.dumps({"error": f"No project found matching: {find_query}"}, indent=2)
                )]

        elif scope_project:
            # Option 3: Global FTS5 Index
            registry = get_registry()
            fts_results = registry.search_fts(scope_project, limit=1)
            if fts_results:
                project_path = fts_results[0]["path"]
                search_cwd = project_path
                paths = paths or registry.get_source_dirs(project_path)
                log_info(f"WarpGrep: FTS5 scope '{scope_project}' at {project_path}")
            else:
                return [TextContent(
                    type="text",
                    text=json.dumps({"error": f"No project found in index: {scope_project}"}, indent=2)
                )]

        elif target_cwd:
            # Option 2: Smart CWD Switcher
            search_cwd = target_cwd
            log_info(f"WarpGrep: Using CWD {target_cwd}")

        # Auto-detect paths if not provided
        if not paths:
            paths = ["."]

        # Change to target directory (Smart CWD Switcher)
        if search_cwd != original_cwd:
            os.chdir(search_cwd)
            log_debug(f"Changed CWD: {original_cwd} -> {search_cwd}")

        try:
            log_info(f"WarpGrep: {len(patterns)} patterns, paths={paths}, cwd={search_cwd}")
            result = await warpgrep(patterns, paths, max_results, search_cwd)
        finally:
            # Always restore original CWD
            if search_cwd != original_cwd:
                os.chdir(original_cwd)
                log_debug(f"Restored CWD: {search_cwd} -> {original_cwd}")

        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2, default=str)
        )]
