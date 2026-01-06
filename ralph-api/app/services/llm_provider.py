"""
Unified LLM Provider - Supports Anthropic, OpenAI, Google, Mistral
"""

from abc import ABC, abstractmethod
from typing import Optional
import os
import tiktoken

from app.core.config import settings


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        """Generate completion from prompt."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        pass

    @property
    @abstractmethod
    def model(self) -> str:
        """Model identifier."""
        pass


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider."""

    def __init__(self, model: str = "claude-3-5-sonnet-20241022"):
        from anthropic import Anthropic
        self._model = model
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY"))

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def model(self) -> str:
        return self._model

    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        response = self.client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system or "",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider."""

    def __init__(self, model: str = "gpt-4-turbo"):
        from openai import OpenAI
        self._model = model
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY"))

    @property
    def name(self) -> str:
        return "openai"

    @property
    def model(self) -> str:
        return self._model

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


class GoogleProvider(LLMProvider):
    """Google Gemini provider."""

    def __init__(self, model: str = "gemini-2.0-flash"):
        import google.generativeai as genai
        self._model = model
        genai.configure(api_key=settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY"))
        self.client = genai.GenerativeModel(model)

    @property
    def name(self) -> str:
        return "google"

    @property
    def model(self) -> str:
        return self._model

    async def complete(self, prompt: str, system: str = None, max_tokens: int = 4096) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = self.client.generate_content(
            full_prompt,
            generation_config={"max_output_tokens": max_tokens}
        )
        return response.text


class MistralProvider(LLMProvider):
    """Mistral AI provider."""

    def __init__(self, model: str = "codestral-latest"):
        from mistralai import Mistral
        self._model = model
        self.client = Mistral(api_key=settings.MISTRAL_API_KEY or os.getenv("MISTRAL_API_KEY"))

    @property
    def name(self) -> str:
        return "mistral"

    @property
    def model(self) -> str:
        return self._model

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


def get_llm_provider(provider_name: str = None) -> LLMProvider:
    """Factory function to get LLM provider based on config or name."""
    name = provider_name or settings.RALPH_LLM

    if "claude" in name.lower():
        return AnthropicProvider(model=name if "claude" in name else "claude-3-5-sonnet-20241022")
    elif "gpt" in name.lower():
        return OpenAIProvider(model=name if "gpt" in name else "gpt-4-turbo")
    elif "gemini" in name.lower():
        return GoogleProvider(model=name if "gemini" in name else "gemini-2.0-flash")
    elif "mistral" in name.lower():
        return MistralProvider(model=name if "mistral" in name else "codestral-latest")
    else:
        # Default to Anthropic
        return AnthropicProvider()


def estimate_tokens(text: str) -> int:
    """Estimate token count using tiktoken."""
    try:
        encoding = tiktoken.encoding_for_model("gpt-4")
        return len(encoding.encode(text))
    except Exception:
        # Fallback: ~4 chars per token
        return len(text) // 4
