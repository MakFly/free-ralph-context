"""
Conversation Service - Scan ~/.claude-glm for historical context and patterns
"""

import json
import os
import re
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import glob

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for scanning and analyzing Claude conversations."""

    # Claude conversation paths
    CLAUDE_GLM_PATH = Path.home() / ".claude-glm"
    CLAUDE_PATH = Path.home() / ".claude"

    def __init__(self, days_back: int = 7):
        """
        Initialize conversation scanner.

        Args:
            days_back: Number of days to look back for conversations
        """
        self.days_back = days_back
        self.cutoff_date = datetime.now() - timedelta(days=days_back)

    def get_recent_context(self, project_name: Optional[str] = None) -> dict:
        """
        Get context from recent conversations for AI suggestions.

        Args:
            project_name: Optional project name to filter conversations

        Returns:
            Dictionary with conversation insights and patterns
        """
        logger.info(f"Scanning conversations from {self.CLAUDE_GLM_PATH} and {self.CLAUDE_PATH}")
        conversations = self._scan_conversations(project_name)
        logger.info(f"Found {len(conversations)} recent conversations")

        context = {
            "total_conversations": len(conversations),
            "recent_decisions": self._extract_decisions(conversations),
            "recurring_patterns": self._extract_patterns(conversations),
            "problems_solved": self._extract_problems(conversations),
            "technologies_used": self._extract_technologies(conversations),
            "recent_activity": self._build_activity_summary(conversations),
        }

        logger.info(f"Extracted {len(context['recent_decisions'])} decisions, "
                   f"{len(context['technologies_used'])} technologies, "
                   f"{len(context['problems_solved'])} problems")

        return context

    def _scan_conversations(self, project_filter: Optional[str] = None) -> list[dict]:
        """Scan conversation files and return parsed data."""
        conversations = []

        # Scan both .claude-glm and .claude directories
        for base_path in [self.CLAUDE_GLM_PATH, self.CLAUDE_PATH]:
            if not base_path.exists():
                continue

            # Find all .jsonl files
            jsonl_files = list(base_path.glob("**/*.jsonl"))

            for jsonl_file in jsonl_files:
                try:
                    conv = self._parse_conversation_file(jsonl_file, project_filter)
                    if conv:
                        conversations.append(conv)
                except Exception as e:
                    # Skip corrupted files
                    continue

        # Sort by date (most recent first)
        # Handle both int (Unix timestamp ms) and string (ISO format) timestamps
        def get_sort_key(conv: dict) -> float:
            ts = conv.get("last_message_date", "")
            if isinstance(ts, int):
                return float(ts)
            elif isinstance(ts, str) and ts:
                try:
                    # Try parsing as ISO timestamp
                    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    return float(dt.timestamp() * 1000)  # Convert to ms for comparison
                except:
                    return 0.0
            return 0.0  # Empty or invalid timestamps go last

        conversations.sort(key=get_sort_key, reverse=True)

        # Limit to most recent conversations
        return conversations[:50]

    def _parse_conversation_file(self, file_path: Path, project_filter: Optional[str] = None) -> Optional[dict]:
        """Parse a single conversation JSONL file.

        Expected format (Claude GLM):
        {
            "type": "user" | "assistant",
            "message": {
                "role": "user" | "assistant",
                "content": "text" | [...]  # string for user, list for assistant
            },
            "timestamp": "2026-01-06T11:34:05.878Z",
            "cwd": "/path/to/project",
            ...
        }
        """
        messages = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        raw = json.loads(line)

                        # Extract role from type field or message.role
                        role = raw.get("type") or raw.get("message", {}).get("role", "unknown")

                        # Extract content from message dict
                        msg_data = raw.get("message", {})
                        content = msg_data.get("content", "")

                        # Handle list content (assistant messages with structured output)
                        if isinstance(content, list):
                            # Join text blocks
                            text_parts = []
                            for block in content:
                                if isinstance(block, dict):
                                    if block.get("type") == "text":
                                        text_parts.append(block.get("text", ""))
                                    elif "text" in block:
                                        text_parts.append(block["text"])
                                elif isinstance(block, str):
                                    text_parts.append(block)
                            content = " ".join(text_parts)

                        # Build normalized message
                        normalized_msg = {
                            "role": role,
                            "content": str(content) if content else "",
                            "timestamp": raw.get("timestamp", ""),
                        }
                        messages.append(normalized_msg)

                    except (json.JSONDecodeError, KeyError, TypeError):
                        continue

            if not messages:
                return None

            # Extract metadata
            last_msg = messages[-1]

            # Get timestamp from last message
            timestamp = last_msg.get("timestamp", "")
            if timestamp:
                try:
                    # Parse ISO timestamp
                    msg_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    if msg_date < self.cutoff_date:
                        return None  # Too old
                except:
                    pass

            # Extract project from path
            path_parts = str(file_path).split('/')
            project_name = self._extract_project_name(path_parts)

            # Apply project filter if specified
            if project_filter and project_filter.lower() not in project_name.lower():
                return None

            return {
                "file_path": str(file_path),
                "project_name": project_name,
                "message_count": len(messages),
                "first_message": messages[0].get("content", "")[:200] if messages else "",
                "last_message_date": timestamp,
                "messages": messages[-20:],  # Keep last 20 messages for analysis
            }

        except Exception:
            return None

    def _extract_project_name(self, path_parts: list[str]) -> str:
        """Extract project name from file path."""
        # Path pattern: .../projects/{project_hash}/{project_name}/...
        if "projects" in path_parts:
            idx = path_parts.index("projects")
            if idx + 2 < len(path_parts):
                return path_parts[idx + 2]

        # Fallback: use folder name
        if len(path_parts) > 1:
            return path_parts[-2]

        return "unknown"

    def _extract_decisions(self, conversations: list[dict]) -> list[str]:
        """Extract key decisions from conversations."""
        decisions = []

        # Pattern matching for decision indicators
        decision_patterns = [
            r"décision\s*:\s*(.{5,100})",
            r"on va\s*(.{5,100})",
            r"je\s*(vais|choisis|décide)\s*(.{5,100})",
            r"keep\s+(.{5,100})",
            r"use\s+(.{5,100})",
            r"plan\s*:\s*(.{5,100})",
        ]

        for conv in conversations:
            messages = conv.get("messages", [])
            for msg in messages:
                content = msg.get("content", "")
                if not content or msg.get("role") != "assistant":
                    continue

                for pattern in decision_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    for match in matches:
                        if len(match) > 10:  # Filter out short matches
                            decisions.append(match.strip()[:100])

        # Return unique decisions, most recent first
        seen = set()
        unique_decisions = []
        for d in decisions[:10]:
            if d not in seen:
                seen.add(d)
                unique_decisions.append(d)

        return unique_decisions

    def _extract_patterns(self, conversations: list[dict]) -> dict:
        """Extract recurring patterns and practices."""
        patterns = {
            "technologies": {},
            "frameworks": {},
            "practices": [],
        }

        tech_keywords = {
            "nextjs": "Next.js",
            "react": "React",
            "vue": "Vue",
            "laravel": "Laravel",
            "symfony": "Symfony",
            "fastapi": "FastAPI",
            "django": "Django",
            "tailwind": "Tailwind CSS",
            "typescript": "TypeScript",
            "python": "Python",
            "docker": "Docker",
            "postgresql": "PostgreSQL",
            "redis": "Redis",
        }

        for conv in conversations:
            messages = conv.get("messages", [])
            all_content = " ".join(m.get("content", "") for m in messages)

            # Count technology mentions
            for keyword, name in tech_keywords.items():
                if keyword.lower() in all_content.lower():
                    patterns["technologies"][name] = patterns["technologies"].get(name, 0) + 1

            # Extract practices (TODO comments, patterns)
            practices = re.findall(r"(TODO|FIXME|NOTE):\s*([^\n]{10,80})", all_content)
            patterns["practices"].extend(practices[:5])

        return patterns

    def _extract_problems(self, conversations: list[dict]) -> list[str]:
        """Extract problems that were solved."""
        problems = []

        problem_patterns = [
            r"(problème|bug|error|erreur)\s*(?:est|était)\s*(.{10,80})",
            r"(fix|corrigé|résolu)\s*(.{10,80})",
            r"issue\s*(?:was|is)\s*(.{10,80})",
        ]

        for conv in conversations[:20]:  # Check last 20 convs
            messages = conv.get("messages", [])
            for msg in messages:
                content = msg.get("content", "")
                if not content:
                    continue

                for pattern in problem_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    for match in matches:
                        if len(match) > 15:
                            problems.append(match.strip()[:100])

        # Unique problems, most recent first
        seen = set()
        unique_problems = []
        for p in problems[:10]:
            if p not in seen:
                seen.add(p)
                unique_problems.append(p)

        return unique_problems

    def _extract_technologies(self, conversations: list[dict]) -> list[str]:
        """Extract technologies used across conversations."""
        techs = set()

        tech_keywords = [
            "nextjs", "react", "vue", "angular", "svelte",
            "laravel", "symfony", "django", "fastapi", "express",
            "typescript", "javascript", "python", "php", "go",
            "docker", "kubernetes", "redis", "postgresql", "mysql",
            "tailwind", "shadcn", "vitest", "jest", "playwright",
            "tanstack", "prisma", "drizzle", "sequelize",
        ]

        for conv in conversations:
            messages = conv.get("messages", [])
            all_content = " ".join(m.get("content", "").lower() for m in messages)

            for tech in tech_keywords:
                if tech in all_content:
                    techs.add(tech)

        return sorted(list(techs))

    def _build_activity_summary(self, conversations: list[dict]) -> dict:
        """Build a summary of recent activity."""
        if not conversations:
            return {"total_messages": 0, "projects": {}}

        total_messages = sum(c.get("message_count", 0) for c in conversations)

        # Count by project
        project_counts = {}
        for conv in conversations:
            project = conv.get("project_name", "unknown")
            project_counts[project] = project_counts.get(project, 0) + 1

        return {
            "total_messages": total_messages,
            "total_conversations": len(conversations),
            "projects": dict(sorted(project_counts.items(), key=lambda x: -x[1])[:5]),
        }
