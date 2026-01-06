"""Initial schema with all Ralph tables

Revision ID: 0001
Revises:
Create Date: 2026-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create enum types
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE session_status AS ENUM ('active', 'completed', 'terminated');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE memory_category AS ENUM ('decision', 'action', 'error', 'progress', 'context', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE memory_priority AS ENUM ('high', 'normal', 'low');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Sessions table
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("task_description", sa.Text(), nullable=False),
        sa.Column("max_tokens", sa.Integer(), default=200000),
        sa.Column("current_tokens", sa.Integer(), default=0),
        sa.Column(
            "status",
            postgresql.ENUM("active", "completed", "terminated", name="session_status", create_type=False),
            nullable=False,
            server_default="active"
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), onupdate=sa.func.now()),
    )

    # Memories table with vector embedding
    op.create_table(
        "memories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM("decision", "action", "error", "progress", "context", "other", name="memory_category", create_type=False),
            nullable=False,
            server_default="other"
        ),
        sa.Column(
            "priority",
            postgresql.ENUM("high", "normal", "low", name="memory_priority", create_type=False),
            nullable=False,
            server_default="normal"
        ),
        sa.Column("embedding", Vector(384)),  # 384 dimensions for all-MiniLM-L6-v2
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("access_count", sa.Integer(), default=0),
        sa.Column("last_accessed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_memories_session_id", "memories", ["session_id"])

    # Checkpoints table
    op.create_table(
        "checkpoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("state", postgresql.JSONB(), server_default="{}"),
        sa.Column("context_usage", sa.Integer(), default=0),
        sa.Column("memories_snapshot", postgresql.JSONB(), server_default="[]"),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_checkpoints_session_id", "checkpoints", ["session_id"])

    # Metrics history table
    op.create_table(
        "metrics_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric_type", sa.String(50), nullable=False),
        sa.Column("metric_value", sa.Float(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_metrics_history_session_id", "metrics_history", ["session_id"])
    op.create_index("ix_metrics_history_metric_type", "metrics_history", ["metric_type"])
    op.create_index("ix_metrics_history_timestamp", "metrics_history", ["timestamp"])

    # LLM calls table for quota tracking
    op.create_table(
        "llm_calls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("operation", sa.String(50), nullable=True),
        sa.Column("input_tokens", sa.Integer(), default=0),
        sa.Column("output_tokens", sa.Integer(), default=0),
        sa.Column("total_tokens", sa.Integer(), default=0),
        sa.Column("cost", sa.Float(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_llm_calls_session_id", "llm_calls", ["session_id"])
    op.create_index("ix_llm_calls_timestamp", "llm_calls", ["timestamp"])

    # Session lineage table for parent-child relationships
    op.create_table(
        "session_lineage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("parent_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("child_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("handoff_reason", sa.Text(), nullable=True),
        sa.Column("handoff_prompt", sa.Text(), nullable=True),
        sa.Column("checkpoint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checkpoints.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_session_lineage_parent_session_id", "session_lineage", ["parent_session_id"])
    op.create_index("ix_session_lineage_child_session_id", "session_lineage", ["child_session_id"])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("session_lineage")
    op.drop_table("llm_calls")
    op.drop_table("metrics_history")
    op.drop_table("checkpoints")
    op.drop_table("memories")
    op.drop_table("sessions")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS memory_priority")
    op.execute("DROP TYPE IF EXISTS memory_category")
    op.execute("DROP TYPE IF EXISTS session_status")

    # Don't drop vector extension (might be used elsewhere)
