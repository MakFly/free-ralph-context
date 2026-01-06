"""
Fold Service - Context folding and compression decisions

Provider-aware thresholds:
- Anthropic (Claude): Standard thresholds (60/75/85/95%)
- GLM (z.ai): More aggressive thresholds (50/65/75/85%) due to smaller context window
- OpenAI/Mistral: Standard thresholds
- Google (Gemini): Relaxed thresholds due to 1M+ context
"""

from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, Tuple
from uuid import UUID
from pathlib import Path
import json
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Session
from app.services.compression_service import compress
from app.services.checkpoint_service import create_checkpoint, get_latest_checkpoint


class Urgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ShouldFoldResult(BaseModel):
    """Result of should_fold evaluation."""
    should_fold: bool
    urgency: Urgency
    reason: str
    recommended_action: str
    context_usage: float
    provider: str = "anthropic"


class FoldResult(BaseModel):
    """Result of fold execution."""
    checkpoint_id: str
    summary: str
    tokens_before: int
    tokens_after: int
    tokens_freed: int
    compression_ratio: float


# Provider-specific thresholds
# GLM has smaller context (128k vs 200k) so we're more aggressive
PROVIDER_THRESHOLDS: Dict[str, Dict[float, Tuple[Urgency, str, str]]] = {
    "anthropic": {
        0.60: (Urgency.MEDIUM, "Consider milestone checkpoint", "checkpoint"),
        0.75: (Urgency.HIGH, "Safety checkpoint recommended", "checkpoint"),
        0.85: (Urgency.HIGH, "Fold/compress REQUIRED", "compress"),
        0.95: (Urgency.CRITICAL, "MUST spawn new agent", "spawn"),
    },
    "glm": {
        0.50: (Urgency.MEDIUM, "Consider milestone checkpoint (GLM)", "checkpoint"),
        0.65: (Urgency.HIGH, "Safety checkpoint recommended (GLM)", "checkpoint"),
        0.75: (Urgency.HIGH, "Fold/compress REQUIRED (GLM)", "compress"),
        0.85: (Urgency.CRITICAL, "MUST spawn new agent (GLM)", "spawn"),
    },
    "openai": {
        0.60: (Urgency.MEDIUM, "Consider milestone checkpoint", "checkpoint"),
        0.75: (Urgency.HIGH, "Safety checkpoint recommended", "checkpoint"),
        0.85: (Urgency.HIGH, "Fold/compress REQUIRED", "compress"),
        0.95: (Urgency.CRITICAL, "MUST spawn new agent", "spawn"),
    },
    "google": {
        0.70: (Urgency.MEDIUM, "Consider milestone checkpoint (Gemini)", "checkpoint"),
        0.80: (Urgency.HIGH, "Safety checkpoint recommended (Gemini)", "checkpoint"),
        0.90: (Urgency.HIGH, "Fold/compress REQUIRED (Gemini)", "compress"),
        0.97: (Urgency.CRITICAL, "MUST spawn new agent (Gemini)", "spawn"),
    },
}

# Default thresholds (backward compatibility)
THRESHOLDS = PROVIDER_THRESHOLDS["anthropic"]


def detect_active_provider() -> str:
    """
    Detect active provider from CCS (Claude Config Switcher).

    Returns:
        Provider name: "anthropic", "glm", "openai", or "google"
    """
    ccs_config_path = Path.home() / ".ccs" / "config.json"

    if not ccs_config_path.exists():
        return "anthropic"

    try:
        config = json.loads(ccs_config_path.read_text())
        current = config.get("current", "anthropic")

        # Map CCS provider names to our threshold keys
        if "glm" in current.lower():
            return "glm"
        elif "openai" in current.lower() or "gpt" in current.lower():
            return "openai"
        elif "google" in current.lower() or "gemini" in current.lower():
            return "google"
        else:
            return "anthropic"
    except Exception:
        return "anthropic"


def get_thresholds_for_provider(provider: str = None) -> Dict[float, Tuple[Urgency, str, str]]:
    """Get thresholds for a specific provider."""
    if provider is None:
        provider = detect_active_provider()
    return PROVIDER_THRESHOLDS.get(provider, PROVIDER_THRESHOLDS["anthropic"])


async def should_fold(
    context_usage: float,
    memory_count: int = 0,
    provider: str = None
) -> ShouldFoldResult:
    """
    Evaluate if context should be folded/compressed.

    Uses provider-aware thresholds:
    - GLM: More aggressive (50/65/75/85%) due to smaller context window
    - Anthropic: Standard (60/75/85/95%)
    - Google: Relaxed (70/80/90/97%) due to 1M+ context

    Args:
        context_usage: Current context usage as ratio (0.0 to 1.0)
        memory_count: Number of memories in session
        provider: Provider name (auto-detected from CCS if not specified)

    Returns:
        ShouldFoldResult with recommendation
    """
    detected_provider = provider or detect_active_provider()
    thresholds = get_thresholds_for_provider(detected_provider)

    for threshold, (urgency, reason, action) in sorted(thresholds.items(), reverse=True):
        if context_usage >= threshold:
            return ShouldFoldResult(
                should_fold=True,
                urgency=urgency,
                reason=reason,
                recommended_action=action,
                context_usage=context_usage,
                provider=detected_provider
            )

    return ShouldFoldResult(
        should_fold=False,
        urgency=Urgency.LOW,
        reason="Context usage acceptable",
        recommended_action="continue",
        context_usage=context_usage,
        provider=detected_provider
    )


async def execute_fold(
    db: AsyncSession,
    session_id: UUID,
    trajectory: str,
    label: str = "auto-fold"
) -> FoldResult:
    """
    Execute fold: compress trajectory and create checkpoint.

    Args:
        db: Database session
        session_id: Session to fold
        trajectory: Conversation trajectory to compress
        label: Label for the checkpoint

    Returns:
        FoldResult with compression metrics
    """
    # Get session
    session = await db.get(Session, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    tokens_before = session.current_tokens

    # Compress the trajectory
    compressed = await compress(trajectory, ratio=0.25)

    # Create checkpoint with compressed state
    checkpoint = await create_checkpoint(
        db,
        session_id,
        label,
        metadata={
            "compressed_summary": compressed.summary,
            "decisions": compressed.decisions,
            "files": compressed.files,
            "errors": compressed.errors,
            "compression_ratio": compressed.compression_ratio
        }
    )

    # Update session tokens
    session.current_tokens = compressed.compressed_tokens
    await db.commit()

    return FoldResult(
        checkpoint_id=str(checkpoint.id),
        summary=compressed.summary,
        tokens_before=tokens_before,
        tokens_after=compressed.compressed_tokens,
        tokens_freed=compressed.tokens_saved,
        compression_ratio=compressed.compression_ratio
    )
