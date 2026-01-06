"""
LLM Provider Abstraction for Ralph MCP

Supports multiple LLM providers with automatic fallback:
- Anthropic Claude
- OpenAI GPT
- Mistral AI
- Google Gemini

Usage:
    provider = get_llm_provider()
    if provider:
        result = await provider.analyze_pattern(code_context)
    else:
        result = generic_pattern_extraction(code_context)
"""

import os
import json
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from pathlib import Path
from dataclasses import dataclass
import httpx


# === LLM Provider Configuration ===

DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_TOKENS = 4096


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def analyze_pattern(self, code_context: str, project_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze code and extract patterns.

        Returns:
            {
                "pattern_name": "...",
                "pattern_description": "...",
                "tags": ["tag1", "tag2"],
                "code_example": "...",
                "conventions": ["..."]
            }
        """
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is accessible."""
        pass


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider."""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        super().__init__(api_key, model)
        self.base_url = "https://api.anthropic.com/v1/messages"
        self.timeout = DEFAULT_TIMEOUT

    async def analyze_pattern(self, code_context: str, project_info: Dict[str, Any]) -> Dict[str, Any]:
        prompt = self._build_prompt(code_context, project_info)

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        payload = {
            "model": self.model,
            "max_tokens": DEFAULT_MAX_TOKENS,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

        # Extract JSON response from Claude
        content = result.get("content", [{}])[0].get("text", "{}")
        return self._parse_response(content)

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01"}
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json={"model": self.model, "max_tokens": 10, "messages": [{"role": "user", "content": "hi"}]}
                )
                return response.status_code == 200
        except Exception:
            return False

    def _build_prompt(self, code_context: str, project_info: Dict[str, Any]) -> str:
        return f"""Analyze this codebase and extract the key architectural patterns.

Project: {project_info.get('name', 'Unknown')}
Framework: {project_info.get('framework', 'Unknown')}
Files detected: {project_info.get('file_count', 0)}

Code Context:
{code_context[:10000]}

Extract the patterns and return ONLY a JSON object with this structure:
{{
  "pattern_name": "Clear name (e.g., 'Symfony BetterAuth Paseto')",
  "pattern_description": "Detailed description of the architecture",
  "tags": ["framework", "domain", "concepts"],
  "code_example": "Short representative code snippet",
  "conventions": ["convention1", "convention2"]
}}

Return ONLY the JSON, no other text."""

    def _parse_response(self, content: str) -> Dict[str, Any]:
        # Extract JSON from response (handle markdown code blocks)
        content = content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Fallback if parsing fails
            return {
                "pattern_name": "Unknown Pattern",
                "pattern_description": content[:500],
                "tags": [],
                "code_example": "",
                "conventions": []
            }


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider."""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        super().__init__(api_key, model)
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.timeout = DEFAULT_TIMEOUT

    async def analyze_pattern(self, code_context: str, project_info: Dict[str, Any]) -> Dict[str, Any]:
        prompt = AnthropicProvider._build_prompt(self, code_context, project_info)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "content-type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": DEFAULT_MAX_TOKENS,
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        return AnthropicProvider._parse_response(self, content)

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json={"model": self.model, "messages": [{"role": "user", "content": "hi"}], "max_tokens": 10}
                )
                return response.status_code == 200
        except Exception:
            return False


class MistralProvider(LLMProvider):
    """Mistral AI provider."""

    def __init__(self, api_key: str, model: str = "mistral-large-latest"):
        super().__init__(api_key, model)
        self.base_url = "https://api.mistral.ai/v1/chat/completions"
        self.timeout = DEFAULT_TIMEOUT

    async def analyze_pattern(self, code_context: str, project_info: Dict[str, Any]) -> Dict[str, Any]:
        prompt = AnthropicProvider._build_prompt(self, code_context, project_info)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "content-type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": DEFAULT_MAX_TOKENS,
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        return AnthropicProvider._parse_response(self, content)

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json={"model": self.model, "messages": [{"role": "user", "content": "hi"}], "max_tokens": 10}
                )
                return response.status_code == 200
        except Exception:
            return False


class GoogleProvider(LLMProvider):
    """Google Gemini provider."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash-exp"):
        super().__init__(api_key, model)
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        self.timeout = DEFAULT_TIMEOUT

    async def analyze_pattern(self, code_context: str, project_info: Dict[str, Any]) -> Dict[str, Any]:
        prompt = AnthropicProvider._build_prompt(self, code_context, project_info)

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "maxOutputTokens": DEFAULT_MAX_TOKENS,
                "responseMimeType": "application/json"
            }
        }

        params = {"key": self.api_key}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.base_url, params=params, json=payload)
            response.raise_for_status()
            result = response.json()

        content = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
        return AnthropicProvider._parse_response(self, content)

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                params = {"key": self.api_key}
                payload = {"contents": [{"parts": [{"text": "hi"}]}]}
                response = await client.post(self.base_url, params=params, json=payload)
                return response.status_code == 200
        except Exception:
            return False


# === Provider Factory ===

def get_llm_provider() -> Optional[LLMProvider]:
    """
    Get the first available LLM provider based on environment variables.

    Priority order:
    1. ANTHROPIC_API_KEY (Claude)
    2. OPENAI_API_KEY (GPT)
    3. MISTRAL_API_KEY (Mistral)
    4. GOOGLE_API_KEY (Gemini)

    Returns:
        LLMProvider instance or None if no API key is configured
    """
    # Check Anthropic
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        model = os.getenv("RALPH_LLM_MODEL", "claude-3-5-sonnet-20241022")
        return AnthropicProvider(anthropic_key, model)

    # Check OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        model = os.getenv("RALPH_LLM_MODEL", "gpt-4o")
        return OpenAIProvider(openai_key, model)

    # Check Mistral
    mistral_key = os.getenv("MISTRAL_API_KEY")
    if mistral_key:
        model = os.getenv("RALPH_LLM_MODEL", "mistral-large-latest")
        return MistralProvider(mistral_key, model)

    # Check Google
    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        model = os.getenv("RALPH_LLM_MODEL", "gemini-2.0-flash-exp")
        return GoogleProvider(google_key, model)

    return None


def has_llm() -> bool:
    """Check if any LLM provider is configured."""
    return get_llm_provider() is not None


# === CCS (Claude Config Switcher) Integration ===

@dataclass
class ProviderConfig:
    """Configuration for active provider."""
    name: str
    model: str
    base_url: Optional[str]
    context_window: int
    token_ratio: float  # chars per token
    fold_thresholds: Dict[float, str]


# Provider-specific configurations
PROVIDER_CONFIGS = {
    "anthropic": {
        "context_window": 200000,
        "token_ratio": 3.5,  # Claude: ~3.5 chars/token
        "thresholds": {0.60: "checkpoint", 0.75: "safety", 0.85: "compress", 0.95: "spawn"}
    },
    "glm": {
        "context_window": 128000,
        "token_ratio": 2.5,  # GLM: ~2.5 chars/token (Chinese-optimized)
        "thresholds": {0.50: "checkpoint", 0.65: "safety", 0.75: "compress", 0.85: "spawn"}
    },
    "openai": {
        "context_window": 128000,
        "token_ratio": 4.0,  # GPT-4: ~4 chars/token
        "thresholds": {0.60: "checkpoint", 0.75: "safety", 0.85: "compress", 0.95: "spawn"}
    },
    "mistral": {
        "context_window": 128000,
        "token_ratio": 4.0,
        "thresholds": {0.60: "checkpoint", 0.75: "safety", 0.85: "compress", 0.95: "spawn"}
    },
    "google": {
        "context_window": 1000000,  # Gemini 1.5 Pro
        "token_ratio": 4.0,
        "thresholds": {0.60: "checkpoint", 0.75: "safety", 0.85: "compress", 0.95: "spawn"}
    }
}


def detect_ccs_provider() -> Optional[Dict[str, Any]]:
    """
    Detect active provider from CCS (Claude Config Switcher).

    Reads ~/.ccs/config.json to determine which provider is active.

    Returns:
        Dict with provider info or None if CCS not configured
    """
    ccs_config_path = Path.home() / ".ccs" / "config.json"

    if not ccs_config_path.exists():
        return None

    try:
        config = json.loads(ccs_config_path.read_text())
        current = config.get("current", "anthropic")
        providers = config.get("providers", {})
        provider_info = providers.get(current, {})

        env_vars = provider_info.get("env", {})

        return {
            "name": current,
            "display_name": provider_info.get("name", current),
            "model": env_vars.get("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"),
            "base_url": env_vars.get("ANTHROPIC_BASE_URL"),
            "auth_token": env_vars.get("ANTHROPIC_AUTH_TOKEN"),
            "api_key": env_vars.get("ANTHROPIC_API_KEY"),
            "config_dir": provider_info.get("configDir", "~/.claude")
        }
    except Exception:
        return None


def get_active_provider_config() -> ProviderConfig:
    """
    Get full configuration for active provider.

    Combines CCS detection with provider-specific settings.

    Returns:
        ProviderConfig with all settings for current provider
    """
    ccs = detect_ccs_provider()

    if ccs:
        provider_name = ccs["name"].lower()
        # Map CCS provider names to our config keys
        config_key = "glm" if "glm" in provider_name else provider_name
        config_key = config_key if config_key in PROVIDER_CONFIGS else "anthropic"

        provider_settings = PROVIDER_CONFIGS.get(config_key, PROVIDER_CONFIGS["anthropic"])

        return ProviderConfig(
            name=ccs["name"],
            model=ccs["model"],
            base_url=ccs.get("base_url"),
            context_window=provider_settings["context_window"],
            token_ratio=provider_settings["token_ratio"],
            fold_thresholds=provider_settings["thresholds"]
        )

    # Default to Anthropic if no CCS
    return ProviderConfig(
        name="anthropic",
        model=os.getenv("RALPH_LLM_MODEL", "claude-sonnet-4-5-20250929"),
        base_url=None,
        context_window=PROVIDER_CONFIGS["anthropic"]["context_window"],
        token_ratio=PROVIDER_CONFIGS["anthropic"]["token_ratio"],
        fold_thresholds=PROVIDER_CONFIGS["anthropic"]["thresholds"]
    )


def estimate_tokens(text: str, provider: str = None) -> int:
    """
    Estimate token count based on provider's tokenizer characteristics.

    Different models have different tokenizer efficiencies:
    - Claude: ~3.5 chars/token (BPE optimized for English)
    - GLM: ~2.5 chars/token (optimized for Chinese/multilingual)
    - GPT-4: ~4 chars/token

    Args:
        text: Text to estimate tokens for
        provider: Provider name (auto-detected if not specified)

    Returns:
        Estimated token count
    """
    if provider is None:
        config = get_active_provider_config()
        token_ratio = config.token_ratio
    else:
        provider_lower = provider.lower()
        if "glm" in provider_lower:
            token_ratio = PROVIDER_CONFIGS["glm"]["token_ratio"]
        elif "claude" in provider_lower or "anthropic" in provider_lower:
            token_ratio = PROVIDER_CONFIGS["anthropic"]["token_ratio"]
        elif "gpt" in provider_lower or "openai" in provider_lower:
            token_ratio = PROVIDER_CONFIGS["openai"]["token_ratio"]
        else:
            token_ratio = 4.0  # Conservative default

    return int(len(text) / token_ratio)


def get_fold_threshold(context_usage: float, provider: str = None) -> Optional[str]:
    """
    Get recommended action based on context usage and provider.

    Args:
        context_usage: Current context usage ratio (0.0 to 1.0)
        provider: Provider name (auto-detected if not specified)

    Returns:
        Recommended action: "checkpoint", "safety", "compress", "spawn", or None
    """
    config = get_active_provider_config() if provider is None else None

    if config:
        thresholds = config.fold_thresholds
    else:
        provider_lower = (provider or "anthropic").lower()
        config_key = "glm" if "glm" in provider_lower else "anthropic"
        thresholds = PROVIDER_CONFIGS.get(config_key, PROVIDER_CONFIGS["anthropic"])["thresholds"]

    # Find highest threshold that's exceeded
    for threshold in sorted(thresholds.keys(), reverse=True):
        if context_usage >= threshold:
            return thresholds[threshold]

    return None


def get_context_window(provider: str = None) -> int:
    """
    Get context window size for provider.

    Args:
        provider: Provider name (auto-detected if not specified)

    Returns:
        Context window size in tokens
    """
    if provider is None:
        return get_active_provider_config().context_window

    provider_lower = provider.lower()
    if "glm" in provider_lower:
        return PROVIDER_CONFIGS["glm"]["context_window"]
    elif "gemini" in provider_lower or "google" in provider_lower:
        return PROVIDER_CONFIGS["google"]["context_window"]
    else:
        return PROVIDER_CONFIGS["anthropic"]["context_window"]
