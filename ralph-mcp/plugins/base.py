"""
Base plugin class for Ralph MCP tools.

All plugins should inherit from RalphPlugin and implement
the required methods for tool registration and execution.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional
from mcp.types import Tool, TextContent


class RalphPlugin(ABC):
    """Abstract base class for Ralph MCP tools plugins.

    Each plugin represents one or more related MCP tools.
    Plugins are responsible for:
    - Defining tool schemas
    - Handling tool execution
    - Managing their own state (if needed)
    """

    @abstractmethod
    def get_tools(self) -> list[Tool]:
        """Return list of tools provided by this plugin.

        Each tool should have:
        - name: Unique tool identifier
        - description: What the tool does
        - inputSchema: JSON Schema for arguments

        Returns:
            List of Tool definitions
        """
        pass

    @abstractmethod
    async def execute_tool(
        self,
        name: str,
        arguments: dict[str, Any]
    ) -> list[TextContent]:
        """Execute a tool and return the result.

        Args:
            name: Name of the tool to execute
            arguments: Tool arguments from the MCP call

        Returns:
            List of TextContent objects with the result

        Raises:
            ValueError: If arguments are invalid
            Exception: If execution fails
        """
        pass

    def get_tool_names(self) -> list[str]:
        """Get list of tool names provided by this plugin.

        Returns:
            List of tool name strings
        """
        return [tool.name for tool in self.get_tools()]

    def has_tool(self, name: str) -> bool:
        """Check if this plugin provides a specific tool.

        Args:
            name: Tool name to check

        Returns:
            True if plugin provides this tool
        """
        return name in self.get_tool_names()
