"""
Plugin loader for Ralph MCP tools.

Auto-discovers and loads plugin modules from the plugins directory.
"""

import importlib
import importlib.util
import os
from pathlib import Path
from typing import Any, Optional

from .base import RalphPlugin
from mcp.types import Tool, TextContent


class PluginLoader:
    """Manages plugin lifecycle and tool routing.

    Usage:
        loader = PluginLoader()
        loader.load_from("plugins/")

        # Get all tools
        tools = loader.get_all_tools()

        # Execute a tool
        result = await loader.execute("ralph_malloc", {...})
    """

    def __init__(self):
        self.plugins: list[RalphPlugin] = []
        self._tool_to_plugin: dict[str, RalphPlugin] = {}

    def load_from(self, plugins_dir: str) -> None:
        """Load all plugins from a directory.

        Args:
            plugins_dir: Path to plugins directory
        """
        plugins_path = Path(plugins_dir)

        if not plugins_path.exists():
            raise FileNotFoundError(f"Plugins directory not found: {plugins_dir}")

        # Find all Python files in subdirectories
        for plugin_dir in plugins_path.iterdir():
            if not plugin_dir.is_dir() or plugin_dir.name.startswith("_"):
                continue

            # Look for plugin.py in each subdirectory
            plugin_file = plugin_dir / "plugin.py"
            if not plugin_file.exists():
                continue

            # Import the plugin module
            spec = importlib.util.spec_from_file_location(
                f"plugins.{plugin_dir.name}",
                plugin_file
            )
            if spec is None or spec.loader is None:
                continue

            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Find plugin class in module
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (
                    isinstance(attr, type)
                    and issubclass(attr, RalphPlugin)
                    and attr is not RalphPlugin
                ):
                    # Instantiate and register plugin
                    plugin_instance = attr()
                    self.register(plugin_instance)

    def register(self, plugin: RalphPlugin) -> None:
        """Register a plugin instance.

        Args:
            plugin: Plugin instance to register
        """
        self.plugins.append(plugin)

        # Map tool names to plugin
        for tool in plugin.get_tools():
            if tool.name in self._tool_to_plugin:
                raise ValueError(f"Duplicate tool name: {tool.name}")
            self._tool_to_plugin[tool.name] = plugin

    def get_all_tools(self) -> list[Tool]:
        """Get all tools from all registered plugins.

        Returns:
            List of all Tool definitions
        """
        tools: list[Tool] = []
        for plugin in self.plugins:
            tools.extend(plugin.get_tools())
        return tools

    async def execute(
        self,
        name: str,
        arguments: dict[str, Any]
    ) -> list[TextContent]:
        """Execute a tool by routing to the appropriate plugin.

        Args:
            name: Tool name to execute
            arguments: Tool arguments

        Returns:
            List of TextContent with result

        Raises:
            ValueError: If tool not found
        """
        plugin = self._tool_to_plugin.get(name)
        if plugin is None:
            raise ValueError(f"Unknown tool: {name}")

        return await plugin.execute_tool(name, arguments)

    def has_tool(self, name: str) -> bool:
        """Check if a tool is available.

        Args:
            name: Tool name to check

        Returns:
            True if tool exists
        """
        return name in self._tool_to_plugin
