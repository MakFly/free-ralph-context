"""
Redis client wrapper for Ralph API
"""

import redis.asyncio as redis
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


# Global Redis client instance
_redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    """Get or create Redis client instance."""
    global _redis_client

    if _redis_client is None:
        _redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=settings.REDIS_DECODE_RESPONSES,
            socket_connect_timeout=5,
            socket_keepalive=True,
        )
        logger.info(f"Redis client created: {settings.REDIS_HOST}:{settings.REDIS_PORT}")

    return _redis_client


async def close_redis():
    """Close Redis connection."""
    global _redis_client

    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed")


async def ping_redis() -> bool:
    """Ping Redis to check connection."""
    try:
        client = get_redis()
        await client.ping()
        return True
    except Exception as e:
        logger.error(f"Redis ping failed: {e}")
        return False
