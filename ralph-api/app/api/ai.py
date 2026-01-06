"""
AI Suggestions API Endpoints

Provides:
- POST /api/ai/suggestions - Generate AI suggestions
- GET  /api/ai/llm-config - Get LLM configuration (without API keys)
- POST /api/ai/config - Save LLM configuration (encrypts API key)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

from app.core.database import get_db
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key
from app.models.llm_config import LlmConfig, LlmProvider
from app.services.suggestion_service import SuggestionService


router = APIRouter(prefix="/api/ai", tags=["AI Suggestions"])


# ═══════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════

class LlmConfigRequest(BaseModel):
    """Request to save LLM configuration."""
    provider: Literal["anthropic", "openai", "mistral", "google"]
    api_key: str = Field(..., min_length=10, description="API key for the provider")
    is_active: bool = True


class LlmConfigResponse(BaseModel):
    """LLM configuration response (without actual API key)."""
    id: str
    provider: str
    is_active: bool
    has_key: bool
    key_masked: str
    created_at: str
    updated_at: str


class SuggestionsRequest(BaseModel):
    """Request to generate suggestions."""
    provider: Optional[Literal["anthropic", "openai", "mistral", "google"]] = None


class SuggestionResponse(BaseModel):
    """Single suggestion."""
    id: str
    title: str
    description: str
    category: Literal["feature", "optimization", "bug-fix", "refactor", "architecture"]
    priority: Literal["high", "medium", "low"]


class SuggestionsResponse(BaseModel):
    """Response with generated suggestions."""
    suggestions: list[SuggestionResponse]
    provider: str
    timestamp: str


# ═══════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════

@router.post("/suggestions", response_model=SuggestionsResponse)
async def generate_suggestions(
    request: SuggestionsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate AI-powered suggestions in French.

    Uses the configured LLM provider's API key from the database.
    If provider is specified, uses that provider; otherwise uses the active one.
    """
    # Determine which provider to use
    provider_name = request.provider

    if provider_name:
        # Get specific provider config
        result = await db.execute(
            select(LlmConfig).where(
                LlmConfig.provider == provider_name,
                LlmConfig.is_active == True
            )
        )
        config = result.scalar_one_or_none()
    else:
        # Get any active provider config
        result = await db.execute(
            select(LlmConfig).where(LlmConfig.is_active == True)
        )
        config = result.scalar_one_or_none()
        if config:
            provider_name = config.provider

    if not config or not provider_name:
        raise HTTPException(
            status_code=400,
            detail="No active LLM configuration found. Please configure an LLM provider first."
        )

    # Decrypt API key
    try:
        api_key = decrypt_api_key(config.encrypted_api_key)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="API key decryption failed. This usually means the ENCRYPTION_KEY has changed. Please delete and re-add your LLM configuration in Settings."
        )

    # Get current project status from transcript watcher (event-driven)
    from app.services.transcript_watcher import get_transcript_watcher
    transcript_watcher = get_transcript_watcher()
    status = await transcript_watcher.get_status()

    # Get conversation context from ~/.claude-glm
    from app.services.conversation_service import ConversationService
    conv_service = ConversationService(days_back=7)
    conversation_context = conv_service.get_recent_context()

    # Build project context WITH conversation history
    project_context = {
        "projects": status.get("projects", []),
        "stats": {
            "totalTokens": status.get("totalTokens", 0),
            "projectCount": status.get("projectCount", 0)
        },
        "conversation_context": conversation_context
    }

    # Generate suggestions
    try:
        suggestion_service = SuggestionService(provider=provider_name, api_key=api_key)
        suggestions = await suggestion_service.generate_suggestions(project_context)

        return SuggestionsResponse(
            suggestions=suggestions,
            provider=provider_name,
            timestamp=datetime.utcnow().isoformat()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate suggestions: {str(e)}"
        )


@router.get("/llm-config", response_model=list[LlmConfigResponse])
async def get_llm_config(db: AsyncSession = Depends(get_db)):
    """Get all LLM configurations (without exposing actual API keys)."""
    result = await db.execute(select(LlmConfig))
    configs = result.scalars().all()

    responses = []
    for config in configs:
        # Try to decrypt for masking, but handle failures gracefully
        key_masked = "(invalid or encrypted with different key)"
        if config.encrypted_api_key:
            try:
                decrypted = decrypt_api_key(config.encrypted_api_key)
                key_masked = mask_api_key(decrypted)
            except Exception:
                key_masked = "(invalid or encrypted with different key)"
        else:
            key_masked = "(not set)"

        responses.append(
            LlmConfigResponse(
                id=str(config.id),
                provider=config.provider,
                is_active=config.is_active,
                has_key=bool(config.encrypted_api_key),
                key_masked=key_masked,
                created_at=config.created_at.isoformat(),
                updated_at=config.updated_at.isoformat()
            )
        )

    return responses


@router.post("/config")
async def save_llm_config(
    config_request: LlmConfigRequest,
    db: AsyncSession = Depends(get_db)
):
    """Save or update LLM configuration (encrypts API key).

    If a config for this provider already exists, it will be updated.
    """
    # Check if config already exists for this provider
    result = await db.execute(
        select(LlmConfig).where(LlmConfig.provider == config_request.provider)
    )
    existing_config = result.scalar_one_or_none()

    # Encrypt the API key
    encrypted_key = encrypt_api_key(config_request.api_key)

    if existing_config:
        # Update existing config
        existing_config.encrypted_api_key = encrypted_key
        existing_config.is_active = config_request.is_active
        existing_config.updated_at = datetime.utcnow()
    else:
        # Create new config
        new_config = LlmConfig(
            provider=config_request.provider,
            encrypted_api_key=encrypted_key,
            is_active=config_request.is_active
        )
        db.add(new_config)

    await db.commit()

    return {
        "success": True,
        "message": f"Configuration saved for {config_request.provider}",
        "provider": config_request.provider,
        "has_key": True
    }


@router.delete("/config/{provider}")
async def delete_llm_config(
    provider: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete LLM configuration for a provider."""
    if provider not in ["anthropic", "openai", "mistral", "google"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}"
        )

    result = await db.execute(
        select(LlmConfig).where(LlmConfig.provider == provider)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"No configuration found for {provider}"
        )

    await db.delete(config)
    await db.commit()

    return {
        "success": True,
        "message": f"Configuration deleted for {provider}"
    }


@router.post("/config/{provider}/toggle")
async def toggle_llm_config(
    provider: str,
    db: AsyncSession = Depends(get_db)
):
    """Toggle active status for an LLM configuration."""
    if provider not in ["anthropic", "openai", "mistral", "google"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}"
        )

    result = await db.execute(
        select(LlmConfig).where(LlmConfig.provider == provider)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"No configuration found for {provider}"
        )

    config.is_active = not config.is_active
    await db.commit()

    return {
        "success": True,
        "message": f"Configuration {'activated' if config.is_active else 'deactivated'} for {provider}",
        "is_active": config.is_active
    }


# ═══════════════════════════════════════════════════════
# Contextual Suggestion Endpoints
# ═══════════════════════════════════════════════════════

@router.post("/suggestions/memory/{memory_id}", response_model=SuggestionsResponse)
async def generate_memory_suggestions(
    memory_id: str,
    provider: Optional[Literal["anthropic", "openai", "mistral", "google"]] = None,
    db: AsyncSession = Depends(get_db)
):
    """Generate AI suggestions for a specific memory."""
    # Get active LLM config
    if provider:
        result = await db.execute(
            select(LlmConfig).where(
                LlmConfig.provider == provider,
                LlmConfig.is_active == True
            )
        )
        config = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(LlmConfig).where(LlmConfig.is_active == True)
        )
        config = result.scalar_one_or_none()
        if config:
            provider = config.provider

    if not config or not provider:
        raise HTTPException(
            status_code=400,
            detail="No active LLM configuration found"
        )

    # Decrypt API key
    try:
        api_key = decrypt_api_key(config.encrypted_api_key)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="API key decryption failed. This usually means the ENCRYPTION_KEY has changed. Please delete and re-add your LLM configuration in Settings."
        )

    # Get memory and related memories from Ralph DB
    from app.services.ralph_db import get_ralph_db
    ralph_db = get_ralph_db()

    memories_data = ralph_db.get_all_memories(limit=1000)
    memory = next((m for m in memories_data if m['id'] == memory_id), None)

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    # Get related memories from same session
    session_memories = ralph_db.get_memories_by_session(memory['session_id'], limit=50)
    related_memories = [m for m in session_memories if m['id'] != memory_id][:5]

    # Build memory context
    memory_context = {
        "id": memory['id'],
        "content": memory['content'],
        "category": memory.get('category', 'other'),
        "priority": memory.get('priority', 'normal'),
        "sessionId": memory['session_id'],
        "createdAt": memory.get('created_at'),
    }

    # Generate suggestions
    try:
        suggestion_service = SuggestionService(provider=provider, api_key=api_key)
        suggestions = await suggestion_service.generate_memory_suggestions(
            memory=memory_context,
            related_memories=related_memories
        )

        return SuggestionsResponse(
            suggestions=suggestions,
            provider=provider,
            timestamp=datetime.utcnow().isoformat()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate memory suggestions: {str(e)}"
        )


@router.post("/suggestions/project/{project_name}", response_model=SuggestionsResponse)
async def generate_project_suggestions(
    project_name: str,
    provider: Optional[Literal["anthropic", "openai", "mistral", "google"]] = None,
    db: AsyncSession = Depends(get_db)
):
    """Generate AI suggestions for a specific project."""
    # Get active LLM config
    if provider:
        result = await db.execute(
            select(LlmConfig).where(
                LlmConfig.provider == provider,
                LlmConfig.is_active == True
            )
        )
        config = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(LlmConfig).where(LlmConfig.is_active == True)
        )
        config = result.scalar_one_or_none()
        if config:
            provider = config.provider

    if not config or not provider:
        raise HTTPException(
            status_code=400,
            detail="No active LLM configuration found"
        )

    # Decrypt API key
    try:
        api_key = decrypt_api_key(config.encrypted_api_key)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="API key decryption failed. This usually means the ENCRYPTION_KEY has changed. Please delete and re-add your LLM configuration in Settings."
        )

    # Get project data from transcript watcher (event-driven, with Redis cache)
    import json
    from app.services.transcript_watcher import get_transcript_watcher
    from app.core.redis_client import get_redis

    redis = get_redis()

    # Try Redis cache first (TTL 5 seconds)
    cache_key = f"transcript:status"
    cached_status = await redis.get(cache_key)

    if cached_status:
        status = json.loads(cached_status)
    else:
        transcript_watcher = get_transcript_watcher()
        status = await transcript_watcher.get_status()
        # Cache for 5 seconds
        await redis.setex(cache_key, 5, json.dumps(status))

    # Find the project by name
    project = next(
        (p for p in status.get("projects", []) if p.get("name") == project_name),
        None
    )

    if not project:
        # Try case-insensitive match
        project = next(
            (p for p in status.get("projects", []) if p.get("name", "").lower() == project_name.lower()),
            None
        )

    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")

    # Get sessions for this project from Ralph DB
    from app.services.ralph_db import get_ralph_db
    ralph_db = get_ralph_db()

    sessions = ralph_db.get_all_sessions(limit=100)
    project_sessions = [
        s for s in sessions
        if s.get('project_path', '') == project.get('projectPath', '')
    ][:10]

    # Build project context
    project_context = {
        "name": project.get("name"),
        "projectPath": project.get("projectPath"),
        "currentTokens": project.get("currentTokens", 0),
        "maxTokens": project.get("maxTokens", 200000),
        "contextUsage": project.get("pct", 0) / 100,  # Convert percentage to decimal
        "pct": project.get("pct", 0),
        "lastUpdated": project.get("lastUpdated"),
    }

    # Generate suggestions
    try:
        suggestion_service = SuggestionService(provider=provider, api_key=api_key)
        suggestions = await suggestion_service.generate_project_suggestions(
            project=project_context,
            sessions=project_sessions
        )

        return SuggestionsResponse(
            suggestions=suggestions,
            provider=provider,
            timestamp=datetime.utcnow().isoformat()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate project suggestions: {str(e)}"
        )
