"""Add pgvector embeddings for hybrid search

Revision ID: 20260106_0001
Revises: 20260105_0001_initial_schema
Create Date: 2026-01-06

This migration:
1. Enables pgvector extension
2. Adds embedding column to memories table (1536 dimensions)
3. Creates IVFFlat index for approximate nearest neighbor search
4. Adds GIN index for faster keyword search

Performance notes:
- IVFFlat index with 100 lists is good for ~100k vectors
- Use HNSW for larger datasets (slower build, faster query)
- Embedding column is nullable for backward compatibility
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20260106_0001'
down_revision = '20260105_0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # 2. Add embedding column (1536 dimensions for OpenAI/Anthropic embeddings)
    op.execute('''
        ALTER TABLE memories
        ADD COLUMN IF NOT EXISTS embedding vector(1536)
    ''')

    # 3. Create IVFFlat index for approximate nearest neighbor search
    # Using 100 lists, suitable for datasets up to ~100k vectors
    # For larger datasets, consider HNSW index instead
    op.execute('''
        CREATE INDEX IF NOT EXISTS ix_memories_embedding
        ON memories
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    ''')

    # 4. Add GIN index for faster full-text keyword search
    # This improves ILIKE performance for keyword search
    op.execute('''
        CREATE INDEX IF NOT EXISTS ix_memories_content_gin
        ON memories
        USING gin (to_tsvector('english', content))
    ''')

    # 5. Add composite index for common query pattern
    op.execute('''
        CREATE INDEX IF NOT EXISTS ix_memories_session_category
        ON memories (session_id, category)
    ''')


def downgrade() -> None:
    # Remove indexes
    op.execute('DROP INDEX IF EXISTS ix_memories_session_category')
    op.execute('DROP INDEX IF EXISTS ix_memories_content_gin')
    op.execute('DROP INDEX IF EXISTS ix_memories_embedding')

    # Remove embedding column
    op.execute('ALTER TABLE memories DROP COLUMN IF EXISTS embedding')

    # Note: We don't remove the pgvector extension as other tables might use it
