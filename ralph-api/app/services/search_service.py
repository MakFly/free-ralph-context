"""
Search service with keyword-based search (NO embeddings, just LLM API calls)
"""

import json
import logging
from typing import Optional
import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class SearchService:
    """
    Simple keyword-based search service with Redis storage.
    For semantic search, use the AI suggestions endpoint with LLM APIs.
    """

    def __init__(self, redis_client: redis.Redis):
        """Initialize search service."""
        self.redis = redis_client

    async def add_memory(
        self,
        session_id: str,
        memory_id: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """
        Add a memory to Redis.

        Args:
            session_id: Session identifier
            memory_id: Unique memory identifier
            content: Memory text content
            metadata: Optional metadata dict

        Returns:
            Created memory info
        """
        # Store memory data
        memory_key = f"memory:{session_id}:{memory_id}"
        memory_data = {
            "id": memory_id,
            "session_id": session_id,
            "content": content,
            "metadata": metadata or {},
            "created_at": int(__import__("time").time()),
        }

        # Store memory
        await self.redis.hset(
            memory_key,
            mapping={"data": json.dumps(memory_data)}
        )

        # Add to session index
        await self.redis.sadd(f"session_memories:{session_id}", memory_id)

        logger.info(f"Memory added: {memory_id} in session {session_id}")

        return memory_data

    async def search(
        self,
        session_id: str,
        query: str,
        top_k: int = 5,
        min_score: float = 0.5,
    ) -> list[dict]:
        """
        Keyword-based search within a session.

        Args:
            session_id: Session to search within
            query: Search query text (keyword matching)
            top_k: Number of results to return
            min_score: Minimum match score (0-1), based on word overlap

        Returns:
            List of matching memories with scores
        """
        # Get all memory IDs in session
        memory_ids = await self.redis.smembers(f"session_memories:{session_id}")

        if not memory_ids:
            return []

        # Fetch all memories and calculate keyword match scores
        results = []
        query_words = set(query.lower().split())

        for memory_id in memory_ids:
            memory_key = f"memory:{session_id}:{memory_id}"
            data_bytes = await self.redis.hget(memory_key, "data")

            if not data_bytes:
                continue

            memory_data = json.loads(data_bytes)
            content_words = set(memory_data["content"].lower().split())

            # Calculate word overlap score
            overlap = query_words & content_words
            if overlap:
                score = len(overlap) / max(len(query_words), 1)
                if score >= min_score:
                    results.append({
                        **memory_data,
                        "score": float(score),
                    })

        # Sort by score and return top_k
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    async def search_all_sessions(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.5,
    ) -> list[dict]:
        """
        Search across all sessions.

        Args:
            query: Search query text
            top_k: Number of results per session
            min_score: Minimum match score

        Returns:
            List of matching memories from all sessions
        """
        # Get all session keys
        session_keys = await self.redis.keys("session_memories:*")
        all_results = []

        for session_key in session_keys:
            session_id = session_key.split(":")[-1]
            results = await self.search(session_id, query, top_k, min_score)
            all_results.extend(results)

        # Sort by score across all sessions
        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:top_k]

    async def get_session_memories(
        self,
        session_id: str,
    ) -> list[dict]:
        """
        Get all memories in a session.

        Args:
            session_id: Session identifier

        Returns:
            List of all memories
        """
        memory_ids = await self.redis.smembers(f"session_memories:{session_id}")

        if not memory_ids:
            return []

        memories = []
        for memory_id in memory_ids:
            memory_key = f"memory:{session_id}:{memory_id}"
            data_bytes = await self.redis.hget(memory_key, "data")

            if data_bytes:
                memory_data = json.loads(data_bytes)
                memories.append(memory_data)

        return memories

    async def delete_memory(
        self,
        session_id: str,
        memory_id: str,
    ) -> bool:
        """
        Delete a memory from Redis.

        Args:
            session_id: Session identifier
            memory_id: Memory identifier

        Returns:
            True if deleted, False if not found
        """
        memory_key = f"memory:{session_id}:{memory_id}"

        # Check if exists
        exists = await self.redis.exists(memory_key)
        if not exists:
            return False

        # Delete memory
        await self.redis.delete(memory_key)

        # Remove from indexes
        await self.redis.srem(f"session_memories:{session_id}", memory_id)

        logger.info(f"Memory deleted: {memory_id} in session {session_id}")

        return True

    async def close(self):
        """Close resources."""
        logger.info("Search service closed")
