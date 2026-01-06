"""
Suggestion Service - AI-powered feature suggestions in French
"""

import json
from typing import Optional
from abc import ABC, abstractmethod
import os

from app.core.config import settings


# ═══════════════════════════════════════════════════════
# LLM Providers with API Key injection
# ═══════════════════════════════════════════════════════

class DynamicLLMProvider(ABC):
    """LLM Provider that accepts API key at initialization."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        pass

    @abstractmethod
    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        """Generate completion from prompt."""
        pass


class AnthropicDynamic(DynamicLLMProvider):
    """Anthropic Claude provider with dynamic API key."""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        from anthropic import Anthropic
        self._model = model
        self.client = Anthropic(api_key=api_key)

    @property
    def name(self) -> str:
        return "anthropic"

    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        response = self.client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system or "",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text


class OpenAIDynamic(DynamicLLMProvider):
    """OpenAI GPT provider with dynamic API key."""

    def __init__(self, api_key: str, model: str = "gpt-4-turbo"):
        from openai import OpenAI
        self._model = model
        self.client = OpenAI(api_key=api_key)

    @property
    def name(self) -> str:
        return "openai"

    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self._model,
            max_tokens=max_tokens,
            messages=messages
        )
        return response.choices[0].message.content


class GoogleDynamic(DynamicLLMProvider):
    """Google Gemini provider with dynamic API key."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        import google.generativeai as genai
        self._model = model
        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel(model)

    @property
    def name(self) -> str:
        return "google"

    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = self.client.generate_content(
            full_prompt,
            generation_config={"max_output_tokens": max_tokens}
        )
        return response.text


class MistralDynamic(DynamicLLMProvider):
    """Mistral AI provider with dynamic API key."""

    def __init__(self, api_key: str, model: str = "codestral-latest"):
        from mistralai import Mistral
        self._model = model
        self.client = Mistral(api_key=api_key)

    @property
    def name(self) -> str:
        return "mistral"

    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.complete(
            model=self._model,
            max_tokens=max_tokens,
            messages=messages
        )
        return response.choices[0].message.content


def get_dynamic_llm_provider(provider: str, api_key: str) -> DynamicLLMProvider:
    """Factory function to get LLM provider with injected API key."""
    provider_lower = provider.lower()

    if provider_lower == "anthropic":
        return AnthropicDynamic(api_key)
    elif provider_lower == "openai":
        return OpenAIDynamic(api_key)
    elif provider_lower == "google":
        return GoogleDynamic(api_key)
    elif provider_lower == "mistral":
        return MistralDynamic(api_key)
    else:
        raise ValueError(f"Unsupported provider: {provider}")


# ═══════════════════════════════════════════════════════
# System and User Prompts (French)
# ═══════════════════════════════════════════════════════

# Optimized prompts for speed and quality
SYSTEM_PROMPT = """Expert code review. Propose 3-5 specific, actionable improvements.

JSON output:
[{"title":"5-10 words","description":"what+how","category":"feature|optimization|bug-fix|refactor|architecture","priority":"high|medium|low"}]

Be specific. No generic advice. French only."""


def build_user_prompt(project_context: dict) -> str:
    """Build the user prompt with project context and conversation history."""
    projects = project_context.get("projects", [])
    stats = project_context.get("stats", {})
    conversation_ctx = project_context.get("conversation_context", {})

    # Build projects list (compact)
    projects_list = "\n".join(
        f"- {p.get('name', 'Unknown')}: {p.get('currentTokens', 0)} tokens ({p.get('pct', 0)}%) "
        f"{'⚠️' if p.get('pct', 0) >= 70 else '✓'}"
        for p in projects[:5]
    )

    # Build context summary
    total_projects = len(projects)
    critical_count = sum(1 for p in projects if p.get("pct", 0) >= 85)
    warning_count = sum(1 for p in projects if 70 <= p.get("pct", 0) < 85)

    # Conversation context (compact)
    conv_context_parts = []
    if conversation_ctx.get("total_conversations", 0) > 0:
        if conversation_ctx.get("recent_decisions"):
            conv_context_parts.append("Décisions: " + "; ".join(conversation_ctx["recent_decisions"][:3]))
        if conversation_ctx.get("technologies_used"):
            conv_context_parts.append("Tech: " + ", ".join(conversation_ctx["technologies_used"][:5]))

    prompt = f"""PROJECT: Ralph (AI context management)
{projects_list}

Stats: {total_projects} projects, {critical_count} critical, {warning_count} warning, {stats.get('totalTokens', 0)} total tokens
Tech: FastAPI + TanStack Start + PostgreSQL/pgvector + Redis + SSE
{chr(10).join(conv_context_parts)}

Suggest 3-5 specific improvements. JSON only. French."""

    return prompt


# ═══════════════════════════════════════════════════════
# Suggestion Service
# ═══════════════════════════════════════════════════════

class SuggestionService:
    """Service for generating AI-powered project suggestions."""

    def __init__(self, provider: str, api_key: str):
        """Initialize with LLM provider and API key."""
        self.llm = get_dynamic_llm_provider(provider, api_key)

    async def generate_suggestions(self, project_context: dict) -> list[dict]:
        """Generate AI suggestions based on project context.

        Args:
            project_context: Dictionary with project status and stats

        Returns:
            List of suggestion dicts with keys: id, title, description, category, priority
        """
        import uuid

        # Build prompts
        system = SYSTEM_PROMPT
        user_prompt = build_user_prompt(project_context)

        # Call LLM
        try:
            response = await self.llm.complete(
                prompt=user_prompt,
                system=system,
                max_tokens=800  # Reduced for faster response (3-5 short suggestions)
            )

            # Parse JSON response
            suggestions = self._parse_llm_response(response)

            # Add unique IDs
            for s in suggestions:
                s["id"] = str(uuid.uuid4())

            return suggestions

        except Exception as e:
            # Fallback suggestions if LLM fails
            return self._get_fallback_suggestions(project_context)

    def _parse_llm_response(self, response: str) -> list[dict]:
        """Parse LLM JSON response."""
        try:
            # Try to extract JSON from response
            response = response.strip()

            # Remove markdown code blocks if present
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
                response = response.split("```")[0].strip()

            # Parse JSON
            data = json.loads(response)

            # Validate structure
            if not isinstance(data, list):
                return []

            # Validate each suggestion
            validated = []
            valid_categories = {"feature", "optimization", "bug-fix", "refactor", "architecture"}
            valid_priorities = {"high", "medium", "low"}

            for item in data:
                if isinstance(item, dict) and all(k in item for k in ["title", "description", "category", "priority"]):
                    if item["category"] in valid_categories and item["priority"] in valid_priorities:
                        validated.append(item)

            return validated

        except json.JSONDecodeError:
            # Failed to parse JSON
            return []

    async def generate_memory_suggestions(self, memory: dict, related_memories: list = None) -> list[dict]:
        """Generate AI suggestions for a specific memory.

        Args:
            memory: Memory dict with id, content, category, priority, sessionId
            related_memories: Optional list of related memories from same session

        Returns:
            List of suggestion dicts
        """
        import uuid

        # Build memory-specific prompt (optimized)
        system = """Analyze this dev memory. Propose 3-5 specific, actionable insights.

JSON: [{"title":"5-10 words","description":"what+how","category":"feature|optimization|bug-fix|refactor|architecture","priority":"high|medium|low"}]

Be specific to this memory. Connect to related context. French only."""

        # Build user prompt with memory context
        related = (
            "\nRelated: " + "; ".join(f"[{m.get('category')}] {m.get('content')[:60]}" for m in related_memories[:3])
            if related_memories
            else ""
        )

        user_prompt = f"""Memory: {memory.get('content', '')}
Category: {memory.get('category', 'unknown')} | Priority: {memory.get('priority', 'normal')}
{related}

Suggest improvements, connections, actions, or risks. JSON only. French."""

        try:
            response = await self.llm.complete(
                prompt=user_prompt,
                system=system,
                max_tokens=600  # Reduced for speed
            )
            suggestions = self._parse_llm_response(response)
            for s in suggestions:
                s["id"] = str(uuid.uuid4())
            return suggestions if suggestions else self._get_memory_fallback_suggestions(memory)
        except Exception:
            return self._get_memory_fallback_suggestions(memory)

    async def generate_project_suggestions(self, project: dict, sessions: list = None) -> list[dict]:
        """Generate AI suggestions for a specific project.

        Args:
            project: Project dict with name, projectPath, stats
            sessions: Optional list of sessions in this project

        Returns:
            List of suggestion dicts
        """
        import uuid

        # Build project-specific prompt (optimized)
        system = """Analyze this project. Propose 3-5 specific improvements.

JSON: [{"title":"5-10 words","description":"what+how","category":"feature|optimization|bug-fix|refactor|architecture","priority":"high|medium|low"}]

Focus on actionable items: pending decisions, refactoring, performance, architecture. French only."""

        # Build project context
        sessions_ctx = (
            "\nSessions: " + "; ".join(s.get('taskDescription', 'Unknown')[:40] for s in sessions[:3])
            if sessions
            else ""
        )

        user_prompt = f"""Project: {project.get('name', 'Unknown')}
Path: {project.get('projectPath', 'Unknown')}
Tokens: {project.get('currentTokens', 0)} / {project.get('maxTokens', 200000)} ({project.get('pct', 0):.1f}%)
{sessions_ctx}

Suggest improvements for THIS project. JSON only. French."""

        try:
            response = await self.llm.complete(
                prompt=user_prompt,
                system=system,
                max_tokens=600  # Reduced for speed
            )
            suggestions = self._parse_llm_response(response)
            for s in suggestions:
                s["id"] = str(uuid.uuid4())
            return suggestions if suggestions else self._get_project_fallback_suggestions(project)
        except Exception:
            return self._get_project_fallback_suggestions(project)

    def _get_fallback_suggestions(self, context: dict) -> list[dict]:
        """Return fallback suggestions if LLM fails."""
        import uuid
        return [
            {
                "id": str(uuid.uuid4()),
                "title": "Optimiser les requêtes SSE",
                "description": "Le polling des transcripts pourrait être optimisé avec des changements différentiels au lieu de renvoyer tout le statut à chaque fois.",
                "category": "optimization",
                "priority": "medium"
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Ajouter des tests E2E pour le dashboard",
                "description": "Implémenter des tests Playwright ou Vitest pour valider le flux complet: détection transcript → SSE → dashboard.",
                "category": "feature",
                "priority": "medium"
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Mettre en cache les calculs de tokens",
                "description": "Les transcripts sont relus à chaque polling. Ajouter un cache basé sur le hash du fichier pour éviter les relectures inutiles.",
                "category": "optimization",
                "priority": "high"
            }
        ]

    def _get_memory_fallback_suggestions(self, memory: dict) -> list[dict]:
        """Return fallback suggestions for a memory."""
        import uuid
        category = memory.get('category', 'unknown')
        return [
            {
                "id": str(uuid.uuid4()),
                "title": f"Documenter cette {category}",
                "description": f"Ajouter plus de contexte et d'exemples pour rendre cette mémoire plus exploitable dans le futur.",
                "category": "feature",
                "priority": "medium"
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Lier avec des mémoires connexes",
                "description": "Cette mémoire pourrait être connectée à d'autres décisions ou actions connexes pour une meilleure traçabilité.",
                "category": "refactor",
                "priority": "low"
            }
        ]

    def _get_project_fallback_suggestions(self, project: dict) -> list[dict]:
        """Return fallback suggestions for a project."""
        import uuid
        context_pct = project.get('contextUsage', project.get('pct', 0))
        return [
            {
                "id": str(uuid.uuid4()),
                "title": "Réduire l'utilisation du contexte",
                "description": f"Ce projet utilise {context_pct:.1f}% de contexte. Envisagez de compresser les anciennes mémoires.",
                "category": "optimization",
                "priority": "high" if context_pct > 70 else "low"
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Créer un checkpoint",
                "description": "Sauvegarder l'état actuel du projet comme checkpoint avant de continuer le développement.",
                "category": "feature",
                "priority": "medium"
            }
        ]
