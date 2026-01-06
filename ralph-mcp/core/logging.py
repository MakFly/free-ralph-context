"""
Logging utilities for Ralph MCP.

Provides simple logging functions that write to stderr to avoid
interfering with stdio-based MCP communication.
"""

import sys
import os

# Debug mode flag
RALPH_DEBUG = os.getenv("RALPH_DEBUG", "false").lower() in ("1", "true", "yes")


def log_debug(message: str) -> None:
    """Log debug message to stderr if debug mode is enabled."""
    if RALPH_DEBUG:
        sys.stderr.write(f"[DEBUG] {message}\n")


def log_error(message: str) -> None:
    """Log error message to stderr."""
    sys.stderr.write(f"[ERROR] {message}\n")


def log_info(message: str) -> None:
    """Log info message to stderr."""
    sys.stderr.write(f"[INFO] {message}\n")
