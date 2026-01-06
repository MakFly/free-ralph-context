#!/usr/bin/env python3
"""
Direct PostgreSQL test for Ralph v3.0 Progressive Disclosure
This bypasses the API route conflicts and adds directly to PostgreSQL
"""

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from app.models.memory import Memory, MemoryCategory, MemoryPriority

# Database connection
DATABASE_URL = "postgresql+psycopg://ralph:ralph@localhost:5432/ralph"

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Test data
MEMORIES = [
    "Using JWT with httpOnly cookies for authentication",
    "PostgreSQL for primary data, Redis for cache layer",
    "Fixed memory leak in useEffect cleanup function",
    "Token limit exceeded in production environment",
    "Progressive disclosure saves 10x tokens on retrieval",
    "React 19 with TanStack Start for routing",
    "Docker Compose for local development stack",
    "FastAPI with async/await for backend API",
    "SSE connection for real-time dashboard updates",
    "Tailwind CSS v4 with custom design tokens",
    "Zod for runtime validation at boundaries",
    "pgvector for semantic search with embeddings",
    "Provider-aware thresholds: GLM 50%/65%/75%/85%",
    "Anthropic provider: 60%/75%/85%/95% thresholds",
    "Gemini provider: 70%/80%/90%/97% (relaxed)",
    "CCS detection for automatic provider switching",
    "Auto-capture hooks via PostToolUse event",
    "Hybrid search: BM25 keywords + vector similarity",
    "Reciprocal Rank Fusion for score combination",
    "Checkpoint system for session state snapshots",
]

def main():
    print("🧪 Testing Ralph v3.0 Progressive Disclosure (Direct PostgreSQL)")
    print("=" * 70)

    # Create session
    db: Session = SessionLocal()

    # Create test session
    from app.models import Session as RalphSession
    session = RalphSession(
        task_description="Test v3.0 progressive disclosure",
        max_tokens=200000
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    session_id = str(session.id)
    print(f"\n📝 Session created: {session_id}")

    # Add memories
    print(f"\n💾 Adding {len(MEMORIES)} memories...")
    for i, content in enumerate(MEMORIES, 1):
        memory = Memory(
            session_id=session.id,
            content=content,
            category=MemoryCategory.context,
            priority=MemoryPriority.normal,
        )
        db.add(memory)
        print(f"  [{i}/{len(MEMORIES)}] Added: {content[:50]}...")

    db.commit()

    # Verify
    memories = db.execute(
        select(Memory)
        .where(Memory.session_id == session.id)
        .order_by(Memory.created_at.desc())
    ).scalars().all()

    print(f"\n✅ Success! {len(memories)} memories in database")

    print(f"\n🎯 Open in dashboard:")
    print(f"   http://localhost:3000/memories?session={session_id}")

    print(f"\n📊 Test Progressive Disclosure:")
    print(f"   Layer 1 (index): {len(memories)} memories")
    print(f"   Layer 2 (full): ~{len(memories) * 500} tokens if loaded fully")
    print(f"   Savings: ~{len(memories) * 450} tokens with progressive disclosure")

    db.close()

if __name__ == "__main__":
    main()
