"""
Embedding Service - Text to vector embeddings for semantic search

Supports multiple providers:
- OpenAI (text-embedding-3-small, 1536 dimensions)
- Anthropic (via Voyage AI partnership)
- Local models (sentence-transformers)

Usage:
    embeddings = await get_embeddings(["text1", "text2"])
    # Returns list of 1536-dimension vectors
"""

import os
from typing import List, Optional
from abc import ABC, abstractmethod
import httpx

from app.core.config import settings


# Embedding dimension - matches OpenAI text-embedding-3-small
EMBEDDING_DIM = 1536


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    @abstractmethod
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        pass

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Return embedding dimensions."""
        pass


class OpenAIEmbedding(EmbeddingProvider):
    """OpenAI embedding provider using text-embedding-3-small."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = "text-embedding-3-small"
        self.base_url = "https://api.openai.com/v1/embeddings"

    async def embed(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "input": texts
                }
            )
            response.raise_for_status()
            data = response.json()

        # Extract embeddings in order
        embeddings = [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
        return embeddings

    @property
    def dimensions(self) -> int:
        return EMBEDDING_DIM


class VoyageEmbedding(EmbeddingProvider):
    """Voyage AI embedding provider (Anthropic partnership)."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("VOYAGE_API_KEY")
        self.model = "voyage-2"
        self.base_url = "https://api.voyageai.com/v1/embeddings"

    async def embed(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            raise ValueError("Voyage AI API key not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "input": texts
                }
            )
            response.raise_for_status()
            data = response.json()

        embeddings = [item["embedding"] for item in data["data"]]
        return embeddings

    @property
    def dimensions(self) -> int:
        return 1024  # Voyage-2 uses 1024 dimensions


class LocalEmbedding(EmbeddingProvider):
    """Local embedding using sentence-transformers (fallback)."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
            except ImportError:
                raise ImportError(
                    "sentence-transformers not installed. "
                    "Install with: pip install sentence-transformers"
                )
        return self._model

    async def embed(self, texts: List[str]) -> List[List[float]]:
        model = self._get_model()
        embeddings = model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()

    @property
    def dimensions(self) -> int:
        return 384  # MiniLM uses 384 dimensions


# === Factory Function ===

_embedding_provider: Optional[EmbeddingProvider] = None


def get_embedding_provider() -> EmbeddingProvider:
    """
    Get the configured embedding provider.

    Priority:
    1. OpenAI (if OPENAI_API_KEY set)
    2. Voyage AI (if VOYAGE_API_KEY set)
    3. Local (fallback, requires sentence-transformers)
    """
    global _embedding_provider

    if _embedding_provider is not None:
        return _embedding_provider

    # Check for API keys
    if os.getenv("OPENAI_API_KEY"):
        _embedding_provider = OpenAIEmbedding()
    elif os.getenv("VOYAGE_API_KEY"):
        _embedding_provider = VoyageEmbedding()
    else:
        # Fallback to local
        try:
            _embedding_provider = LocalEmbedding()
        except ImportError:
            raise RuntimeError(
                "No embedding provider available. "
                "Set OPENAI_API_KEY, VOYAGE_API_KEY, or install sentence-transformers."
            )

    return _embedding_provider


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Get embeddings for a list of texts.

    Args:
        texts: List of strings to embed

    Returns:
        List of embedding vectors (each EMBEDDING_DIM dimensions)
    """
    if not texts:
        return []

    provider = get_embedding_provider()
    return await provider.embed(texts)


async def get_embedding(text: str) -> List[float]:
    """
    Get embedding for a single text.

    Args:
        text: String to embed

    Returns:
        Embedding vector (EMBEDDING_DIM dimensions)
    """
    embeddings = await get_embeddings([text])
    return embeddings[0] if embeddings else []


def has_embedding_provider() -> bool:
    """Check if any embedding provider is available."""
    try:
        get_embedding_provider()
        return True
    except RuntimeError:
        return False
