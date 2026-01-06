"""
Project context analysis utilities.

Pure functions for analyzing project structure and extracting context.
"""

from pathlib import Path
from typing import List


def should_include_file(file: Path) -> bool:
    """Check if a file should be included in context.

    Args:
        file: Path to the file

    Returns:
        True if file should be included, False otherwise
    """
    path_str = str(file)

    # Exclude common directories
    exclusions = [
        "node_modules", ".next", "dist", "build",
        "vendor", "__pycache__", ".git",
        "coverage", ".venv", "venv", "env",
        ".vscode", ".idea", "target", "out"
    ]

    for excl in exclusions:
        if excl in path_str:
            return False

    # Exclude hidden files
    if file.name.startswith("."):
        return False

    return True


def count_files(project_path: str) -> int:
    """Count total files in project (excluding common directories).

    Args:
        project_path: Path to the project root

    Returns:
        Number of files found
    """
    path = Path(project_path)
    count = 0
    for item in path.rglob("*"):
        if item.is_file() and should_include_file(item):
            count += 1
    return count


def read_project_context(
    project_path: str,
    max_size: int = 50000
) -> str:
    """Read project files as a single context string for LLM analysis.

    Prioritizes key configuration files (package.json, tsconfig.json, etc.)
    then fills remaining space with source code files.

    Args:
        project_path: Path to the project root
        max_size: Maximum size in bytes

    Returns:
        Single string with concatenated file contents
    """
    path = Path(project_path)
    context_parts: List[str] = []
    current_size = 0

    # Key files to prioritize
    priority_files = [
        "package.json", "composer.json", "requirements.txt", "go.mod",
        "next.config", "nuxt.config", "tsconfig.json",
        "README.md", "README"
    ]

    # Read priority files first
    for fname in priority_files:
        for file in path.rglob(fname):
            if file.is_file() and should_include_file(file):
                try:
                    content = file.read_text()
                    header = f"# {file.relative_to(path)}\n"
                    if current_size + len(header) + len(content) < max_size:
                        context_parts.append(header + content)
                        current_size += len(header) + len(content)
                except Exception:
                    pass

    # Read more files if space remains
    if current_size < max_size:
        for ext in [".ts", ".tsx", ".js", ".jsx", ".py", ".php", ".go", ".rs"]:
            for file in path.rglob(f"*{ext}"):
                if file.is_file() and should_include_file(file):
                    try:
                        content = file.read_text()[:1000]  # Limit per file
                        header = f"\n# {file.relative_to(path)}\n"
                        if current_size + len(header) + len(content) < max_size:
                            context_parts.append(header + content)
                            current_size += len(header) + len(content)
                            if current_size >= max_size:
                                break
                    except Exception:
                        pass
            if current_size >= max_size:
                break

    return "\n".join(context_parts)
