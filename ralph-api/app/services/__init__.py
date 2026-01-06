"""Services module for Ralph API."""

from app.services.search_service import SearchService
from app.services.llm_provider import get_llm_provider, estimate_tokens
from app.services.compression_service import compress, CompressResult
from app.services.checkpoint_service import (
    create_checkpoint,
    restore_checkpoint,
    list_checkpoints,
    get_latest_checkpoint,
)
from app.services.fold_service import should_fold, execute_fold, ShouldFoldResult, FoldResult
from app.services.session_service import (
    create_session,
    get_session,
    update_tokens,
    complete_session,
    list_active_sessions,
    get_session_status,
)
from app.services.memory_service import (
    add_memory,
    get_session_memories,
    search_memories,
    delete_memory,
)

__all__ = [
    "SearchService",
    "get_llm_provider",
    "estimate_tokens",
    "compress",
    "CompressResult",
    "create_checkpoint",
    "restore_checkpoint",
    "list_checkpoints",
    "get_latest_checkpoint",
    "should_fold",
    "execute_fold",
    "ShouldFoldResult",
    "FoldResult",
    "create_session",
    "get_session",
    "update_tokens",
    "complete_session",
    "list_active_sessions",
    "get_session_status",
    "add_memory",
    "get_session_memories",
    "search_memories",
    "delete_memory",
]
