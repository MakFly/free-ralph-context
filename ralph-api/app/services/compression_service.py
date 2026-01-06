"""
Compression Service - LLM-powered semantic trajectory compression
"""

from pydantic import BaseModel
from typing import List, Optional
import re

from app.services.llm_provider import get_llm_provider, estimate_tokens, LLMProvider


class CompressResult(BaseModel):
    """Result of compression operation."""
    summary: str
    decisions: List[str]
    files: List[str]
    errors: List[str]
    original_tokens: int
    compressed_tokens: int
    tokens_saved: int
    compression_ratio: float


COMPRESSION_SYSTEM_PROMPT = """You are a context compression expert for AI coding agents.
Your task is to compress agent conversation trajectories while preserving critical information.

PRESERVE with exact details:
1. All architectural decisions and their reasoning
2. All file paths with line numbers (format: path/to/file.py:123)
3. All errors encountered and their solutions
4. Key progress milestones and completions

OUTPUT FORMAT (use exactly this structure):
SUMMARY:
<2-3 sentence overview of what was accomplished>

DECISIONS:
- <decision 1 with reasoning>
- <decision 2 with reasoning>

FILES:
- <file:line - what was done>
- <file:line - what was done>

ERRORS:
- <error description> → <fix applied>

PROGRESS:
- <milestone 1>
- <milestone 2>

Be extremely concise but preserve ALL technical details."""


async def compress(
    trajectory: str,
    ratio: float = 0.25,
    llm: LLMProvider = None
) -> CompressResult:
    """
    Compress a conversation trajectory while preserving semantic meaning.

    Args:
        trajectory: The full conversation/trajectory to compress
        ratio: Target compression ratio (0.25 = compress to 25% of original)
        llm: Optional LLM provider, uses default if not provided

    Returns:
        CompressResult with summary, decisions, files, errors, and metrics
    """
    llm = llm or get_llm_provider()
    original_tokens = estimate_tokens(trajectory)
    target_tokens = int(original_tokens * ratio)

    prompt = f"""Compress this agent trajectory to approximately {target_tokens} tokens.

TRAJECTORY TO COMPRESS:
{trajectory}

Remember:
- Preserve ALL decisions, file paths with line numbers, and error fixes
- Be extremely concise but complete
- Use the exact output format specified"""

    compressed = await llm.complete(prompt, COMPRESSION_SYSTEM_PROMPT, max_tokens=target_tokens + 500)

    # Parse structured output
    summary = _extract_section(compressed, "SUMMARY")
    decisions = _extract_list_section(compressed, "DECISIONS")
    files = _extract_list_section(compressed, "FILES")
    errors = _extract_list_section(compressed, "ERRORS")

    compressed_tokens = estimate_tokens(compressed)

    return CompressResult(
        summary=summary,
        decisions=decisions,
        files=files,
        errors=errors,
        original_tokens=original_tokens,
        compressed_tokens=compressed_tokens,
        tokens_saved=original_tokens - compressed_tokens,
        compression_ratio=compressed_tokens / original_tokens if original_tokens > 0 else 0
    )


def _extract_section(text: str, section_name: str) -> str:
    """Extract a section's content from structured text."""
    pattern = rf"{section_name}:\s*\n(.*?)(?=\n[A-Z]+:|$)"
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""


def _extract_list_section(text: str, section_name: str) -> List[str]:
    """Extract a list section from structured text."""
    content = _extract_section(text, section_name)
    if not content:
        return []

    items = []
    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("- "):
            items.append(line[2:].strip())
        elif line.startswith("* "):
            items.append(line[2:].strip())
        elif line and not line.startswith("#"):
            items.append(line)

    return items
