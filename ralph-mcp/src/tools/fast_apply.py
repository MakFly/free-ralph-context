"""
FastApply - Semantic Code Editor

Applies code changes using natural language intent.
Falls back to pattern matching when LLM is unavailable.
"""

import os
import re
import tempfile
import difflib
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class FastApplyResult:
    """Result of a fast_apply operation."""
    success: bool
    diff: str
    backup_path: Optional[str] = None
    lines_changed: int = 0
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "diff": self.diff,
            "backupPath": self.backup_path,
            "linesChanged": self.lines_changed,
            "error": self.error,
        }


class FastApplyTool:
    """
    Semantic code editor with LLM support.

    Features:
    - Natural language intent-based editing
    - Creates backups before modifications
    - Generates unified diffs
    - Falls back to pattern matching without LLM
    """

    def __init__(self, llm_provider=None):
        self.llm = llm_provider

    async def execute(
        self,
        file_path: str,
        intent: str,
        context: str = "",
        create_backup: bool = True,
    ) -> FastApplyResult:
        """
        Apply code changes based on natural language intent.

        Args:
            file_path: Path to the file to modify
            intent: Natural language description of the change
            context: Additional context (framework, style guidelines, etc.)
            create_backup: Whether to create a backup before modifying

        Returns:
            FastApplyResult with diff, backup path, and status
        """
        path = Path(file_path).resolve()

        # Validate file exists
        if not path.exists():
            return FastApplyResult(
                success=False,
                diff="",
                error=f"File not found: {file_path}",
            )

        # Read original content
        try:
            original = path.read_text()
        except Exception as e:
            return FastApplyResult(
                success=False,
                diff="",
                error=f"Failed to read file: {e}",
            )

        # Create backup if requested
        backup_path = None
        if create_backup:
            backup_path = self._create_backup(path, original)

        # Apply edit
        try:
            if self.llm:
                modified = await self._apply_with_llm(original, intent, context, path)
            else:
                modified = self._apply_with_patterns(original, intent, context)
        except Exception as e:
            return FastApplyResult(
                success=False,
                diff="",
                backup_path=backup_path,
                error=f"Failed to apply edit: {e}",
            )

        # Check if anything changed
        if original == modified:
            return FastApplyResult(
                success=False,
                diff="",
                backup_path=backup_path,
                error="No changes were made. Intent may be unclear or already applied.",
            )

        # Generate diff
        diff = self._generate_diff(original, modified, str(path))

        # Count lines changed
        lines_changed = sum(
            1 for line in diff.splitlines()
            if line.startswith("+") or line.startswith("-")
        )

        # Write modified content
        try:
            path.write_text(modified)
        except Exception as e:
            return FastApplyResult(
                success=False,
                diff=diff,
                backup_path=backup_path,
                error=f"Failed to write file: {e}",
            )

        return FastApplyResult(
            success=True,
            diff=diff,
            backup_path=backup_path,
            lines_changed=lines_changed,
        )

    def _create_backup(self, path: Path, content: str) -> str:
        """Create a backup of the original file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = Path(tempfile.gettempdir()) / "ralph_backups"
        backup_dir.mkdir(exist_ok=True)

        backup_name = f"{path.stem}_{timestamp}{path.suffix}.bak"
        backup_path = backup_dir / backup_name

        backup_path.write_text(content)
        return str(backup_path)

    def _generate_diff(self, original: str, modified: str, filename: str) -> str:
        """Generate unified diff between original and modified."""
        original_lines = original.splitlines(keepends=True)
        modified_lines = modified.splitlines(keepends=True)

        diff = difflib.unified_diff(
            original_lines,
            modified_lines,
            fromfile=f"a/{filename}",
            tofile=f"b/{filename}",
        )

        return "".join(diff)

    async def _apply_with_llm(
        self,
        content: str,
        intent: str,
        context: str,
        path: Path,
    ) -> str:
        """Use LLM to understand intent and generate modified code."""
        prompt = f"""You are a code editor. Apply the following change to the code.

FILE: {path.name}
LANGUAGE: {self._detect_language(path)}

INTENT: {intent}

CONTEXT: {context or 'No additional context'}

ORIGINAL CODE:
```
{content}
```

OUTPUT ONLY THE MODIFIED CODE. No explanations, no markdown code blocks.
Just the raw modified code that should replace the original file content.
"""

        # Call LLM
        response = await self.llm.complete(prompt)
        return response.strip()

    def _apply_with_patterns(
        self,
        content: str,
        intent: str,
        context: str,
    ) -> str:
        """
        Pattern-based editing fallback when no LLM is available.

        Supports common operations:
        - Add import
        - Add function/method
        - Add comment
        - Replace/rename
        """
        intent_lower = intent.lower()

        # Add import statement
        if "add import" in intent_lower or "import" in intent_lower:
            match = re.search(r"import\s+([^\s]+)", intent)
            if match:
                import_line = f"import {match.group(1)}\n"
                return self._add_import(content, import_line)

        # Add console.log / print for debugging
        if "add log" in intent_lower or "add print" in intent_lower:
            match = re.search(r"(?:log|print)\s+(.+)", intent, re.IGNORECASE)
            if match:
                var_name = match.group(1).strip()
                return self._add_debug_log(content, var_name)

        # Add comment
        if "add comment" in intent_lower:
            match = re.search(r"comment[:\s]+(.+)", intent, re.IGNORECASE)
            if match:
                comment = match.group(1).strip()
                return self._add_top_comment(content, comment)

        # Replace text
        if "replace" in intent_lower:
            match = re.search(r"replace\s+['\"]?(.+?)['\"]?\s+with\s+['\"]?(.+?)['\"]?", intent, re.IGNORECASE)
            if match:
                old_text = match.group(1)
                new_text = match.group(2)
                return content.replace(old_text, new_text)

        # Rename
        if "rename" in intent_lower:
            match = re.search(r"rename\s+(\w+)\s+to\s+(\w+)", intent, re.IGNORECASE)
            if match:
                old_name = match.group(1)
                new_name = match.group(2)
                return re.sub(rf"\b{old_name}\b", new_name, content)

        # No pattern matched
        return content

    def _add_import(self, content: str, import_line: str) -> str:
        """Add import at the top of the file."""
        lines = content.splitlines(keepends=True)

        # Find last import line
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith(("import ", "from ")):
                last_import_idx = i + 1

        # Insert after last import
        lines.insert(last_import_idx, import_line)
        return "".join(lines)

    def _add_debug_log(self, content: str, var_name: str) -> str:
        """Add debug log statement."""
        lines = content.splitlines(keepends=True)

        # Detect language and create appropriate log
        if any(line.strip().startswith("def ") for line in lines):
            log_line = f'    print(f"DEBUG {var_name}: {{{var_name}}}")\n'
        else:
            log_line = f'console.log("DEBUG {var_name}:", {var_name});\n'

        # Add at end of file
        lines.append("\n" + log_line)
        return "".join(lines)

    def _add_top_comment(self, content: str, comment: str) -> str:
        """Add comment at top of file."""
        lines = content.splitlines(keepends=True)

        # Detect comment style
        if any(line.strip().startswith(("def ", "import ")) for line in lines[:10]):
            comment_line = f"# {comment}\n"
        else:
            comment_line = f"// {comment}\n"

        lines.insert(0, comment_line)
        return "".join(lines)

    def _detect_language(self, path: Path) -> str:
        """Detect programming language from file extension."""
        ext_map = {
            ".py": "Python",
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".tsx": "TypeScript/React",
            ".jsx": "JavaScript/React",
            ".go": "Go",
            ".rs": "Rust",
            ".java": "Java",
            ".php": "PHP",
            ".rb": "Ruby",
            ".swift": "Swift",
            ".kt": "Kotlin",
            ".cs": "C#",
            ".cpp": "C++",
            ".c": "C",
            ".vue": "Vue",
            ".svelte": "Svelte",
        }
        return ext_map.get(path.suffix.lower(), "Unknown")


# Convenience function
async def fast_apply(
    file_path: str,
    intent: str,
    context: str = "",
    llm_provider=None,
) -> dict:
    """
    Apply code changes based on natural language intent.

    Example:
        result = await fast_apply(
            "src/Button.tsx",
            "Add loading spinner when isLoading prop is true",
            context="Uses Tailwind CSS"
        )
    """
    tool = FastApplyTool(llm_provider)
    result = await tool.execute(file_path, intent, context)
    return result.to_dict()
