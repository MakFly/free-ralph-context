"""
Ralph Plugins - Modular tool system.

Each subdirectory contains a plugin.py that defines tools for a specific domain:
- session/: Session management tools
- memory/: Memory operations
- pattern/: Pattern learning and retrieval
- context/: Context optimization
"""

from .base import RalphPlugin
from .loader import PluginLoader

__all__ = [
    "RalphPlugin",
    "PluginLoader",
]
