#!/usr/bin/env python3
"""
Ralph MCP Server - Refactored with Plugin Architecture

This server exposes Ralph tools as MCP tools using a modular plugin system.
Each domain (session, memory, pattern, etc.) is implemented as a separate plugin.

Usage:
    python mcp_server.py
    (via stdio - Claude handles this automatically)

Configuration:
    Requires RALPH_API_URL environment variable (default: http://localhost:8000)
"""

import asyncio
import json
import os
import sys
from typing import Any, Optional

import httpx

# MCP imports
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# SQLite database import
from src.db import get_db, migrate_json_to_sqlite

# Core imports (pure business logic)
from core import log_debug, log_error, log_info, count_files, read_project_context

# Plugin system
from plugins import PluginLoader

# Configuration
RALPH_API_URL = os.getenv("RALPH_API_URL", "http://localhost:8000")
RALPH_API_TIMEOUT = int(os.getenv("RALPH_API_TIMEOUT", "60"))
RALPH_DEBUG = os.getenv("RALPH_DEBUG", "false").lower() in ("1", "true", "yes")

# Create MCP server instance
server = Server("ralph-mcp")

# Global state
_current_session_id: Optional[str] = None
_session_db = None
_plugin_loader: Optional[PluginLoader] = None


# === DATABASE LAYER ===

def get_session_db():
    """Get or create the session database instance."""
    global _session_db
    if _session_db is None:
        _session_db = get_db()
    return _session_db


def save_session(session_id: str, task_description: str = "", max_tokens: int = 200000) -> None:
    """Save session to SQLite with current project path."""
    db = get_session_db()
    project_path = os.getcwd()
    db.save_session(session_id, project_path, task_description, max_tokens)
    log_debug(f"Session saved: {session_id} for project: {project_path}")


def load_session() -> Optional[dict]:
    """Load most recent session for current project."""
    db = get_session_db()
    project_path = os.getcwd()
    session = db.get_most_recent_for_project(project_path)
    if session:
        log_debug(f"Session loaded: {session['id']} for project: {project_path}")
    else:
        log_debug(f"No session found for project: {project_path}")
    return session


def clear_session() -> None:
    """Clear current session from memory only."""
    global _current_session_id
    _current_session_id = None
    log_debug("Current session cleared from memory")


def get_current_session_id() -> Optional[str]:
    """Get the current session ID."""
    return _current_session_id


# === HTTP CLIENT ===

async def api_call(method: str, endpoint: str, data: dict | None = None) -> dict:
    """Make HTTP call to Ralph API with robust error handling."""
    url = f"{RALPH_API_URL}{endpoint}"

    log_debug(f"API Call: {method} {url}")
    if data:
        log_debug(f"  Data: {json.dumps(data, default=str)[:200]}...")

    try:
        async with httpx.AsyncClient(timeout=RALPH_API_TIMEOUT) as client:
            if method == "GET":
                response = await client.get(url)
            elif method == "POST":
                response = await client.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            log_debug(f"  Status: {response.status_code}")

            try:
                result = response.json()
                log_debug(f"  Response: {json.dumps(result, default=str)[:200]}...")
                return result
            except json.JSONDecodeError as json_err:
                response_text = response.text[:500]
                log_error(f"JSON decode error: {json_err}")
                log_error(f"Response: {response_text}")
                raise ValueError(
                    f"Invalid JSON response: {json_err}. Status: {response.status_code}"
                ) from json_err

    except httpx.TimeoutException as timeout_err:
        log_error(f"Timeout after {RALPH_API_TIMEOUT}s")
        raise ValueError(f"API request timed out: {timeout_err}") from timeout_err
    except httpx.ConnectError as conn_err:
        log_error(f"Connection error: {conn_err}")
        raise ValueError(f"Cannot connect to Ralph API at {RALPH_API_URL}") from conn_err
    except httpx.HTTPStatusError as http_err:
        log_error(f"HTTP error {http_err.response.status_code}")
        raise


# === PLUGIN INITIALIZATION ===

def get_llm_provider_func():
    """Get LLM provider if available."""
    try:
        from src.llm import get_llm_provider
        return get_llm_provider()
    except Exception:
        return None


def has_llm_func():
    """Check if LLM is available."""
    try:
        from src.llm import has_llm
        return has_llm()
    except Exception:
        return False


def initialize_plugins() -> PluginLoader:
    """Initialize and load all plugins."""
    loader = PluginLoader()

    # Import plugin classes
    from plugins.session.plugin import SessionPlugin
    from plugins.memory.plugin import MemoryPlugin
    from plugins.pattern.plugin import PatternPlugin
    from plugins.context.plugin import ContextPlugin
    from plugins.warpgrep.plugin import WarpGrepPlugin
    from plugins.killer.plugin import KillerFeaturesPlugin
    from plugins.cortex.plugin import CortexPlugin

    # Register session plugin
    session_plugin = SessionPlugin(
        get_db=get_session_db,
        save_session=save_session,
        load_session=load_session,
        clear_session=clear_session
    )
    loader.register(session_plugin)

    # Register memory plugin
    memory_plugin = MemoryPlugin(
        get_db=get_session_db,
        get_current_session_id=get_current_session_id
    )
    loader.register(memory_plugin)

    # Register pattern plugin
    pattern_plugin = PatternPlugin(
        get_db=get_session_db,
        get_current_session_id=get_current_session_id,
        get_llm_provider=get_llm_provider_func,
        has_llm=has_llm_func
    )
    loader.register(pattern_plugin)

    # Register context plugin
    context_plugin = ContextPlugin(
        get_db=get_session_db,
        get_current_session_id=get_current_session_id,
        api_call=api_call
    )
    loader.register(context_plugin)

    # Register warpgrep plugin
    warpgrep_plugin = WarpGrepPlugin()
    loader.register(warpgrep_plugin)

    # Register killer features plugin
    killer_plugin = KillerFeaturesPlugin(
        get_db=get_session_db,
        get_current_session_id=get_current_session_id,
        get_llm_provider=get_llm_provider_func,
        has_llm=has_llm_func
    )
    loader.register(killer_plugin)

    # Register cortex plugin (must be last to access other plugins)
    cortex_plugin = CortexPlugin()
    loader.register(cortex_plugin)

    log_info(f"Loaded {len(loader.plugins)} plugins: {', '.join([p.__class__.__name__ for p in loader.plugins])}")

    return loader


# === MCP SERVER HANDLERS ===

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List all available MCP tools from all plugins."""
    global _plugin_loader
    if _plugin_loader is None:
        _plugin_loader = initialize_plugins()
    return _plugin_loader.get_all_tools()


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls by routing to the appropriate plugin."""
    global _plugin_loader, _current_session_id

    log_info(f"Tool called: {name}")

    try:
        if _plugin_loader is None:
            _plugin_loader = initialize_plugins()

        # Special handling for ralph_malloc (needs session tracking)
        if name == "ralph_malloc":
            result = await api_call("POST", "/api/sessions/malloc", {
                "task_description": arguments["task_description"],
                "max_tokens": arguments.get("max_tokens", 200000)
            })
            _current_session_id = result.get("session_id")
            task_desc = arguments.get("task_description", "")
            save_session(_current_session_id, task_desc)
            log_info(f"Session created: {_current_session_id} (persisted)")
            return [TextContent(
                type="text",
                text=json.dumps({
                    "session_id": result.get("session_id"),
                    "task_description": result.get("task_description"),
                    "max_tokens": result.get("max_tokens"),
                    "status": result.get("status"),
                    "persisted": True,
                    "message": "Session initialized and persisted."
                }, indent=2)
            )]

        # Special handling for ralph_restore_session (updates current session)
        if name == "ralph_restore_session":
            session_id = arguments["session_id"]
            db = get_session_db()
            session = db.get_session(session_id)
            if not session:
                return [TextContent(
                    type="text",
                    text=json.dumps({"error": f"Session not found: {session_id}"})
                )]
            _current_session_id = session['id']
            db.update_last_accessed(session_id)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "message": "Session restored",
                    "session_id": session['id'],
                    "project_path": session['project_path'],
                    "task_description": session['task_description'],
                }, indent=2, default=str)
            )]

        # Route to plugin
        return await _plugin_loader.execute(name, arguments)

    except ValueError as e:
        log_error(f"ValueError in {name}: {e}")
        return [TextContent(
            type="text",
            text=json.dumps({
                "error": str(e),
                "tool": name
            }, indent=2)
        )]
    except Exception as e:
        log_error(f"Unexpected error in {name}: {type(e).__name__}: {e}")
        import traceback
        log_error(f"Traceback: {traceback.format_exc()}")
        return [TextContent(
            type="text",
            text=json.dumps({
                "error": f"{type(e).__name__}: {str(e)}",
                "tool": name
            }, indent=2)
        )]


# === MAIN SERVER ===

async def main():
    """Run the MCP server."""
    sys.stderr.write("=" * 50 + "\n")
    sys.stderr.write("Ralph MCP Server v2 (Plugin Architecture)\n")
    sys.stderr.write(f"API URL: {RALPH_API_URL}\n")
    sys.stderr.write(f"Debug mode: {RALPH_DEBUG}\n")
    sys.stderr.write("=" * 50 + "\n")

    # Migrate JSON to SQLite on first run
    if migrate_json_to_sqlite():
        sys.stderr.write("[OK] Migrated existing session from JSON to SQLite\n")

    # Initialize ProjectRegistry (auto-creates ~/.ralph/projects.json)
    # NOTE: Skip during MCP stdio mode to avoid slow project scanning
    # Registry will be initialized on first tool call instead
    try:
        from src.project_registry import get_registry
        # Only init if NOT in stdio mode (background service)
        if os.isatty(2):  # stderr is a TTY = not Claude
            registry = get_registry(get_session_db())
            registry.update_on_mcp_call()
            projects = registry.list_projects()
            sys.stderr.write(f"[OK] Project Registry initialized: {len(projects)} projects\n")
            if projects:
                for name, proj in list(projects.items())[:5]:
                    sys.stderr.write(f"     - {name}: {proj.get('path', 'unknown')[:60]}...\n")
                if len(projects) > 5:
                    sys.stderr.write(f"     ... and {len(projects) - 5} more\n")
        else:
            sys.stderr.write("[SKIP] Project Registry (will init on first use)\n")
    except Exception as e:
        log_error(f"Project Registry init failed: {e}")

    # Auto-initialization
    global _current_session_id
    project_path = os.getcwd()
    db = get_session_db()

    # Try to restore existing session
    persisted = load_session()
    if persisted:
        _current_session_id = persisted.get("id")
        task_desc = persisted.get("task_description", "")
        sys.stderr.write(f"[OK] Restored session: {_current_session_id[:8]}...\n")
        sys.stderr.write(f"     Project: {project_path}\n")
        sys.stderr.write(f"     Task: {task_desc[:50]}...\n")
    else:
        # Auto-create session
        import uuid
        from pathlib import Path
        from src.pattern_extractor import detect_framework

        project_name = Path(project_path).name
        _current_session_id = str(uuid.uuid4())
        framework = detect_framework(project_path)
        auto_task = f"Auto-initialized session for {project_name} ({framework} framework)"

        save_session(_current_session_id, auto_task, 200000)
        sys.stderr.write(f"[AUTO] Created new session: {_current_session_id[:8]}...\n")
        sys.stderr.write(f"       Project: {project_name}\n")
        sys.stderr.write(f"       Framework: {framework}\n")

    sys.stderr.write("=" * 50 + "\n")
    sys.stderr.write("MCP server ready, waiting for connections...\n")
    sys.stderr.write("=" * 50 + "\n")

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
