# Ralph API Test Sprint - Product Requirements Document

**Version:** 2.0
**Status:** Sprint Planning
**Date:** January 2026

---

## Executive Summary

Ralph API requires comprehensive test coverage across 14 services, 6 data models, and 25+ REST endpoints. This PRD defines a staged test sprint focusing on **critical path coverage first** (unit tests for core services), followed by integration tests for API reliability, then infrastructure hardening.

**Target Coverage:** 80%+ with emphasis on:
- Service logic correctness (context boundaries, compression, spawning)
- Data persistence (PostgreSQL + pgvector)
- External integrations (LLM providers, Redis cache)
- SSE streaming and async operations

---

## 1. UNIT TEST STRATEGY

### 1.1 Services to Test (Priority Order)

#### TIER 1: Critical Core (Days 1-2)
These services are **cross-cutting** and block other tests:

**Session Service** (`session_service.py`)
- Core session lifecycle management (malloc-like)
- Test cases:
  - Create session with defaults
  - Create with custom max_tokens
  - Get non-existent session returns None
  - Update tokens incrementally
  - Complete session status transition
  - Terminate session
  - List active sessions filters correctly
  - Context usage calculation (0.0-1.0 ratio)
  - Boundary cases: zero tokens, max int tokens

**Quota Service** (`quota_service.py`)
- Daily token tracking and capacity planning
- Test cases:
  - Get daily usage on fresh day
  - Get daily usage across midnight boundary
  - Estimate remaining work (context vs daily limits)
  - Limiting factor logic (which exhausts first)
  - Recommendations based on remaining capacity
  - Track LLM call increments session tokens
  - All plan limits (free, pro, max_2x, etc.)
  - Warning threshold at 80%
  - Recommendations for 10k, 50k, 100k+ remaining

**Memory Service** (`memory_service.py`)
- Semantic memory with embeddings
- Test cases:
  - Add memory with all categories (decision, action, error, etc.)
  - Add memory with all priority levels
  - Embedding generation and storage
  - Get session memories filters by category
  - Get session memories ordered by created_at
  - Search memories by vector similarity
  - Search with top_k and min_score filters
  - Delete memory
  - Delete non-existent memory returns False
  - Metadata JSONB storage and retrieval
  - Access count tracking via touch()

**Checkpoint Service** (`checkpoint_service.py`)
- Session state snapshots
- Test cases:
  - Create checkpoint captures session state correctly
  - Create checkpoint snapshots all memories
  - Create checkpoint with metadata
  - Restore checkpoint reconstructs data
  - List checkpoints ordered by created_at desc
  - Get latest checkpoint returns most recent
  - Non-existent checkpoint raises ValueError
  - Empty memories_snapshot in restored data

#### TIER 2: Business Logic (Days 3-4)

**Compression Service** (`compression_service.py`)
- LLM-powered trajectory compression
- Test cases:
  - Compress with mocked LLM
  - Output parsing (SUMMARY, DECISIONS, FILES, ERRORS sections)
  - Token estimation accuracy (original → compressed ratio)
  - Compression ratio calculation
  - Tokens saved calculation
  - Extraction of list sections (handles "- " and "* " bullets)
  - Empty sections return empty lists
  - Malformed LLM output handling
  - Ratio parameter (0.25, 0.5, 0.75)

**Fold Service** (`fold_service.py`)
- Context folding decisions
- Test cases:
  - should_fold at thresholds: 0.60, 0.75, 0.85, 0.95
  - Urgency levels assigned correctly
  - Recommended action matches threshold (checkpoint/compress/spawn)
  - execute_fold creates checkpoint
  - execute_fold updates session tokens
  - FoldResult contains all metrics (before/after/freed tokens)
  - Non-existent session raises ValueError

**Spawn Service** (`spawn_service.py`)
- Subprocess spawning decisions
- Test cases:
  - should_spawn returns False when task >= 90% complete
  - should_spawn returns True when context >= 90% AND task < 80%
  - Loop detection (3+ identical recent outputs)
  - Error cascade (> 5 consecutive errors)
  - preserve_context lists correct fields
  - execute_spawn creates child session
  - execute_spawn creates SessionLineage record
  - execute_spawn marks parent as COMPLETED
  - execute_spawn creates checkpoint with handoff metadata
  - Handoff prompt generation (mocked LLM)
  - Non-existent parent raises ValueError

**Boundary Service** (`boundary_service.py`)
- 5-hour reset and quota boundaries
- Test cases:
  - check_boundaries returns warnings list
  - Time boundary: 4h elapsed generates warning
  - Time boundary: 5h+ elapsed is critical
  - Context critical warning at >= 90%
  - Context high warning at >= 75%
  - Recommended actions populated correctly
  - should_checkpoint flag set
  - should_compress flag set
  - auto_checkpoint_if_needed creates checkpoint when needed
  - auto_checkpoint_if_needed skips when thresholds not met

**Lineage Service** (`lineage_service.py`)
- Parent-child session continuity tracking
- Test cases:
  - get_session_lineage returns ancestors root-first
  - get_session_lineage stops at root
  - get_children returns all spawned sessions
  - restore_from_parent creates new session
  - restore_from_parent links via SessionLineage
  - restore_from_parent restores checkpoint if available
  - Memory count in returned data

#### TIER 3: Supporting Services (Days 5)

**Embedding Service** (`embedding_service.py`)
- Local embeddings with sentence-transformers
- Test cases:
  - Encode text returns 384-dim vector
  - Cache hit returns cached embedding
  - Cache miss generates new embedding
  - Batch encode multiple texts
  - Model loading at startup
  - Vector dimension validation

**Search Service** (`search_service.py`)
- Redis-based search and caching
- Test cases:
  - Add memory to cache
  - Get session memories from cache
  - Delete memory from cache
  - Cache TTL respected
  - Search results ranked by similarity

**LLM Provider** (`llm_provider.py`)
- Multi-provider abstraction (Claude, GPT, Gemini, Mistral)
- Test cases:
  - get_llm_provider returns configured provider
  - complete() with Anthropic API (mocked)
  - complete() with OpenAI API (mocked)
  - Token estimation for strings
  - Token counting per provider
  - Max tokens parameter respected
  - System prompt + user prompt concatenation

**Curation & Search Services** (less critical, D5+)
- Lower priority but useful for completeness

---

### 1.2 Mocking Strategy

#### Database Mocking
```python
# Use pytest fixtures with in-memory or test PostgreSQL
@pytest.fixture
async def test_db():
    """Test database session (use test DB or in-memory SQLite)"""
    # Option 1: Test PostgreSQL instance (preferred for pgvector)
    # Option 2: SQLite with mock pgvector functions
```

#### LLM Provider Mocking
```python
# Mock at service level
@pytest.fixture
def mock_llm():
    """Mock LLMProvider for compression/spawn tests"""
    with patch('app.services.llm_provider.get_llm_provider') as mock:
        yield mock
```

#### Redis Mocking
```python
# Use fakeredis or mock Redis client
@pytest.fixture
async def mock_redis():
    """Mock Redis for caching tests"""
    # fakeredis or unittest.mock.MagicMock
```

---

## 2. INTEGRATION TEST STRATEGY

### 2.1 API Endpoint Tests

#### Session Management Endpoints
```
POST /api/sessions           → create_session
GET  /api/sessions/{id}      → get_session
POST /api/sessions/{id}/complete → complete_session
POST /api/sessions/{id}/terminate → terminate_session
GET  /api/sessions/active    → list_active_sessions
```

**Test cases per endpoint:**
- Happy path (200 response)
- Invalid input validation (422)
- Not found handling (404)
- Response schema matches OpenAPI spec
- Token updates reflected in status
- Status transitions validated

#### Memory Management Endpoints
```
POST /memories/                        → add_memory
GET  /memories/session/{session_id}    → get_session_memories
GET  /memories/search?query=...        → search_memories
DELETE /memories/{session_id}/{memory_id}
```

**Test cases:**
- Add memory with valid categories/priorities
- Add memory generates embedding
- Search returns results ordered by similarity
- Category filter works
- Limit parameter respected
- Delete idempotent (second delete still succeeds)

#### Checkpoint Endpoints
```
POST /api/checkpoints/{session_id}     → create_checkpoint
GET  /api/checkpoints/{session_id}     → list_checkpoints
GET  /api/checkpoints/{id}/restore     → restore_checkpoint
```

**Test cases:**
- Checkpoint captures all current session state
- Memories snapshot complete
- Restore reconstructs exact state
- Multiple checkpoints per session
- Oldest kept, newest returned first

#### Continuity Endpoints (Spawn/Fold)
```
POST /api/spawn/should                 → should_spawn
POST /api/spawn/execute                → execute_spawn
GET  /api/boundaries/{session_id}      → check_boundaries
POST /api/fold/should                  → should_fold
POST /api/fold/execute                 → execute_fold
POST /api/compress                     → compress trajectory
GET  /api/lineage/{session_id}         → get_session_lineage
```

**Test cases:**
- Boundary checks return warnings at correct thresholds
- Spawn creates child with checkpoint
- Fold compresses and creates checkpoint
- Compress preserves file paths and line numbers
- Lineage returns ancestors root-first
- All status codes per scenario

#### Quota Endpoints
```
GET /api/quota/daily                   → get_daily_usage
GET /api/quota/remaining/{session_id}  → estimate_remaining_work
POST /api/quota/track                  → track_llm_call
```

**Test cases:**
- Daily usage across midnight
- Remaining capacity calculation
- Limiting factor identification
- Recommendations populated
- LLM call tracking increments session

---

### 2.2 Database Integration Tests

#### Cascade Behavior
- Delete session cascades to memories, checkpoints, lineage
- Foreign key constraints enforced
- Orphan records cleaned up

#### Transactions
- Multiple operations in single transaction
- Rollback on error
- Concurrent session updates isolated

#### Vector Search (pgvector)
- Cosine distance calculation correct
- Similarity scores in [0, 1] range
- Top K ordering preserved
- Large vector dimension (384) handled

#### JSONB Operations
- Metadata JSONB stored/retrieved
- State JSONB preserved during restore
- Empty objects default correctly

---

### 2.3 SSE Streaming Tests

#### Streaming Behavior
```
GET /events/{session_id} → EventSource stream
```

**Test cases:**
- Connection opens and maintains
- Events published as session updates occur
- Proper SSE format (data:, event:, id:)
- Reconnection handling
- Cleanup on disconnect
- No memory leaks with long-running streams

---

## 3. TEST INFRASTRUCTURE

### 3.1 Pytest Configuration

```python
# conftest.py structure
pytest_plugins = [
    "pytest_asyncio",
]

# Core fixtures
@pytest.fixture
async def async_client():
    """FastAPI test client"""

@pytest.fixture
async def db_session():
    """Test database connection"""

@pytest.fixture
async def redis_client():
    """Test Redis connection or mock"""

@pytest.fixture
async def session_factory(db_session):
    """Create test sessions quickly"""

@pytest.fixture
async def memory_factory(db_session, session_factory):
    """Create test memories with embeddings"""
```

### 3.2 Test Database Setup

#### Option 1: Test PostgreSQL (Preferred)
- Docker Compose spin-up for CI
- Separate test DB from dev
- Real pgvector support
- Alembic migrations applied automatically

#### Option 2: SQLite + Mock pgvector
- Faster for unit tests
- Less CI overhead
- Mock cosine_distance operator

#### Migrations
- Apply Alembic migrations to test DB
- Drop/recreate between test runs
- Transaction rollback per test (faster)

### 3.3 CI/CD Integration

#### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:latest
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -e ".[dev]"
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3
```

---

## 4. ACCEPTANCE CRITERIA

### 4.1 Coverage Requirements

| Component | Target | Priority |
|-----------|--------|----------|
| Services (14) | 85%+ | MUST |
| Models (6) | 90%+ | MUST |
| API routes (9) | 80%+ | MUST |
| Edge cases | Coverage | MUST |
| **Overall** | **80%+** | **MUST** |

**Critical paths that MUST be tested (100%):**
- Session creation and token tracking
- Memory add/search operations
- Checkpoint create/restore flow
- Compression ratio calculation
- Spawn decision logic (all branches)
- Fold decision logic (all thresholds)
- Boundary warnings (all boundary types)
- Database cascade deletes
- pgvector similarity search

---

### 4.2 Quality Gates

**Pre-merge criteria:**
- [ ] All critical path tests passing
- [ ] 80%+ overall coverage
- [ ] No coverage regressions
- [ ] All async tests complete correctly
- [ ] Database transactions isolated
- [ ] Mock usage consistent
- [ ] Type hints validated with mypy
- [ ] No SQL injection vulnerabilities

**Performance baseline:**
- Session creation < 100ms
- Memory search < 200ms
- Checkpoint restore < 150ms
- All tests complete in < 5 min total

---

## 5. SPRINT EXECUTION PLAN

### Phase 1: Foundation (2 days)
- Set up test infrastructure (conftest.py, fixtures, mocking)
- Test database provisioning (PostgreSQL + migrations)
- Implement base fixtures (db_session, async_client, factories)
- TIER 1 unit tests (Session, Quota, Memory, Checkpoint)

### Phase 2: Core Logic (2 days)
- TIER 2 unit tests (Compression, Fold, Spawn, Boundary, Lineage)
- Database integration tests (cascade, JSONB, transactions)
- pgvector search tests

### Phase 3: Integration & APIs (1.5 days)
- API endpoint tests for all 9 route groups
- SSE streaming tests
- End-to-end workflow tests
- Performance benchmarking

### Phase 4: Hardening (0.5 days)
- Error scenarios and edge cases
- Concurrent operation tests
- Resource cleanup verification
- Coverage gap analysis

---

## 6. TEST DATA & FIXTURES

### Sample Session Factory
```python
@pytest.fixture
async def sample_session(db_session):
    return await create_session(
        db_session,
        task_description="Test task",
        max_tokens=200000
    )
```

### Sample Memory Factory
```python
@pytest.fixture
async def sample_memories(db_session, sample_session):
    memories = []
    for category in MemoryCategory:
        mem = await add_memory(
            db_session,
            sample_session.id,
            content=f"Test {category.value}",
            category=category.value
        )
        memories.append(mem)
    return memories
```

---

## 7. KNOWN CHALLENGES & MITIGATION

| Challenge | Mitigation |
|-----------|-----------|
| LLM API mocking | Use unittest.mock + fixture overrides |
| pgvector in test | Use real test PostgreSQL or mock cosine_distance |
| Async complexity | pytest-asyncio + async fixtures |
| Transaction isolation | Use rollback per test vs drop/recreate |
| Vector embedding cache | Mock Redis with fakeredis |
| Concurrent session updates | Separate test DB instances or locks |

---

## 8. SUCCESS METRICS

- [ ] 80%+ code coverage across all services
- [ ] All TIER 1 & 2 services at 85%+ coverage
- [ ] Zero critical path test failures
- [ ] Tests complete in < 5 minutes
- [ ] Database isolation verified (no test pollution)
- [ ] All async operations complete without warnings
- [ ] Mock usage consistent and documented

---

## Deliverables

1. **conftest.py** - Comprehensive pytest configuration
2. **tests/unit/** - Unit tests for all 14 services
3. **tests/integration/** - API and database integration tests
4. **tests/fixtures.py** - Reusable test factories and mocks
5. **CI/CD workflow** - GitHub Actions pipeline
6. **Coverage report** - Target 80%+ with gap analysis
7. **README.md (tests)** - How to run tests locally and in CI

---

**Next Step:** Implement Phase 1 infrastructure, beginning with conftest.py and TIER 1 unit tests.
