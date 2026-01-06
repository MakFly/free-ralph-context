# Ralph API Test Sprint - Quick Reference Guide

## At a Glance

**What:** Create 149 tests achieving 80%+ coverage of Ralph API
**When:** 5-day sprint (one week)
**Who:** Test engineer / QA engineer
**Why:** Ralph is production-ready but untested; foundational bugs could cascade

---

## The Essentials

### Services by Criticality

#### MUST TEST (Tier 1) - 4 services, 44 unit tests
- Session Service (12 tests) - Session lifecycle
- Quota Service (10 tests) - Token budgets and limits
- Memory Service (12 tests) - Vector storage & search
- Checkpoint Service (10 tests) - State snapshots

**Success metric:** All 4 at 90%+ coverage

#### SHOULD TEST (Tier 2) - 5 services, 42 unit tests
- Compression Service (8 tests) - LLM-powered folding
- Fold Service (8 tests) - When to compress (4 thresholds)
- Spawn Service (10 tests) - When to spawn subprocess
- Boundary Service (8 tests) - 5-hour reset warnings
- Lineage Service (8 tests) - Parent-child continuity

**Success metric:** All 5 at 85%+ coverage

#### NICE-TO-HAVE (Tier 3) - 3 services, 19 unit tests
- Embedding Service (6 tests) - Local embeddings
- Search Service (5 tests) - Redis caching
- LLM Provider (8 tests) - Multi-provider abstraction

**Success metric:** All 3 at 80%+ coverage

---

## Daily Breakdown

### Day 1: Foundation
- [ ] Create conftest.py with all fixtures
- [ ] Set up test PostgreSQL (Docker)
- [ ] Implement database factories (sessions, memories, etc.)
- [ ] Mock Redis and LLM providers
- [ ] Write 12 Session Service tests

**Deliverable:** conftest.py + test_session_service.py

### Day 2: Tier 1 Complete
- [ ] Write 10 Quota Service tests
- [ ] Write 12 Memory Service tests
- [ ] Write 10 Checkpoint Service tests
- [ ] Verify all Tier 1 at 90%+ coverage

**Deliverable:** test_quota_service.py, test_memory_service.py, test_checkpoint_service.py

### Day 3-4: Tier 2 Logic
- [ ] Write Compression Service tests (8 tests)
- [ ] Write Fold Service tests (8 tests)
- [ ] Write Spawn Service tests (10 tests)
- [ ] Write Boundary Service tests (8 tests)
- [ ] Write Lineage Service tests (8 tests)
- [ ] Database integration tests (10 tests)

**Deliverable:** All Tier 2 test files + DB integration

### Day 4-5: Integration & Hardening
- [ ] API endpoint tests (44 tests across 5 route groups)
- [ ] SSE streaming tests (5 tests)
- [ ] Coverage gap analysis
- [ ] Edge case testing
- [ ] CI/CD setup (.github/workflows/test.yml)

**Deliverable:** All integration tests + CI pipeline

---

## Test Fixtures Needed

```python
# Database
@pytest.fixture
async def test_db() -> AsyncSession:
    """Test PostgreSQL connection"""

@pytest.fixture
async def sample_session(test_db) -> Session:
    """Quick session creation"""

# External APIs
@pytest.fixture
def mock_llm():
    """Mock Claude/GPT API"""

@pytest.fixture
async def mock_redis():
    """Mock Redis cache"""

# Factories
@pytest.fixture
async def session_factory(test_db):
    """Create N sessions quickly"""

@pytest.fixture
async def memory_factory(test_db, sample_session):
    """Create N memories with embeddings"""
```

---

## Critical Test Cases (100% Coverage Required)

### Must Test All Branches

**Session Service**
```python
- Create with defaults vs custom max_tokens
- Get with valid vs invalid UUID
- Status transitions: active -> completed -> (dead)
- Context usage calculation edge cases (0, max, mid-range)
```

**Quota Service**
```python
- Daily limit calculation across all plans
- Remaining work: context limiting vs quota limiting
- Recommendations at 10k, 50k, 100k+ remaining
```

**Memory Service**
```python
- Add with all 6 categories + 3 priorities
- Search with different top_k and min_score
- Delete existing vs non-existent (idempotent)
```

**Checkpoint Service**
```python
- Create captures all session fields
- Restore reconstructs exact state
- Handle empty memories_snapshot
```

**Compression Service**
```python
- Parse all 4 output sections (SUMMARY, DECISIONS, FILES, ERRORS)
- Handle malformed LLM responses
- Ratio calculation (0.25, 0.5, 0.75)
```

**Fold Service**
```python
- All 4 thresholds: 60%, 75%, 85%, 95%
- Urgency levels (LOW, MEDIUM, HIGH, CRITICAL)
```

**Spawn Service**
```python
- Task completion: >= 90% (no spawn) vs < 90% (maybe spawn)
- Context critical: >= 90% (spawn)
- Loop detection: 3+ identical outputs
- Error cascade: > 5 consecutive errors
```

**Boundary Service**
```python
- Time: warn at 4h, critical at 5h
- Context: warn at 75%, critical at 90%
- All warning types generated
```

---

## Mocking Strategy

### Database Mocks
```python
# Use real test PostgreSQL for:
# - Relationships and cascades
# - JSONB operations
# - pgvector cosine distance
#
# NEVER mock the database for core business logic tests
```

### LLM Mocks
```python
# Mock these functions:
# - compression_service.compress() -> LLM call
# - spawn_service._generate_handoff_prompt()
# - Any external API call
#
# Return realistic structured responses
```

### Redis Mocks
```python
# Use fakeredis for:
# - Cache hits/misses
# - TTL expiry
# - Key deletion
```

---

## Coverage Targets

| Component | Target | Why |
|-----------|--------|-----|
| Session | 100% | Foundation; must be bulletproof |
| Quota | 90% | Complex business rules |
| Memory | 90% | Semantic operations |
| Checkpoint | 90% | State recovery |
| Compression | 85% | LLM-dependent parsing |
| Fold | 85% | Threshold-based decisions |
| Spawn | 85% | Multi-condition logic |
| Boundary | 85% | Time-based warnings |
| Lineage | 80% | Graph traversal |
| Embedding | 80% | External library |
| Search | 80% | Cache abstraction |
| LLM Provider | 80% | Multi-provider adapter |
| **Overall** | **80%** | Gate before merge |

---

## Running Tests

### Locally
```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run specific test
pytest tests/unit/test_session_service.py

# Run single test
pytest tests/unit/test_session_service.py::test_create_session

# Run with verbose output
pytest -v
```

### In CI
```bash
# GitHub Actions handles:
# - PostgreSQL Docker container
# - Redis Docker container
# - Dependency installation
# - Test execution
# - Coverage reporting
```

---

## Common Gotchas

### Async/Await
```python
# ALL database operations must be awaited
# Use @pytest.mark.asyncio on test functions
# Use async fixtures with @pytest.fixture

@pytest.mark.asyncio
async def test_session_create(test_db):
    session = await create_session(test_db, "task")
    assert session.id is not None
```

### pgvector
```python
# Cosine distance returns similarity in [0, 1]
# Ensure mock returns correct range
# Test with real PostgreSQL, not SQLite
```

### Transaction Isolation
```python
# Use rollback per test for speed
# Avoids drop/recreate overhead
# Ensures test isolation
```

### Fixture Scope
```python
# Most fixtures should be function-scoped (fresh each test)
# Session-scoped databases can cause pollution
```

---

## Success Checklist

Before declaring sprint done:

- [ ] 80%+ overall coverage
- [ ] 100% critical path coverage
- [ ] All TIER 1 at 90%+
- [ ] All TIER 2 at 85%+
- [ ] Zero test failures
- [ ] Zero flaky/intermittent failures
- [ ] Database isolation verified
- [ ] No SQL injection vectors
- [ ] Tests complete in < 5 minutes
- [ ] CI/CD pipeline functional
- [ ] Coverage report published
- [ ] Documentation complete

---

## Key Metrics

```
Total Tests:        149
  - Unit tests:     105
  - Integration:     44

Services Tested:     14
Lines of Test Code: ~3500

Execution Time:      < 5 minutes
Coverage:            80%+
Success Rate:        100%
Flakiness:           0%
```

---

## File Paths

```
/app/services/          <- What to test
/tests/unit/            <- Unit tests (105 tests)
/tests/integration/     <- Integration tests (44 tests)
/tests/conftest.py      <- Fixtures and config
/tests/fixtures.py      <- Reusable factories
/tests/README.md        <- How to run tests
/.github/workflows/test.yml <- CI/CD pipeline
```

---

## Resources

- **Full PRD:** PRD_TEST_SPRINT.md (565 lines, complete requirements)
- **Test Matrix:** TEST_MATRIX.md (456 lines, service mapping)
- **Summary:** TEST_SPRINT_SUMMARY.md (210 lines, executive overview)

---

**Quick Wins:**
1. Start with Session Service (simplest, highest value)
2. Use factories for repeated setup
3. Mock at service boundaries (don't mock DB)
4. Run tests locally before pushing
5. Check coverage with `pytest --cov`

**Time Estimates:**
- Foundation setup: 4 hours
- TIER 1 tests: 8 hours
- TIER 2 tests: 10 hours
- Integration: 8 hours
- CI/CD + hardening: 4 hours
- **Total:** 34 hours (5 days × 6.8 hours)

---

Good luck! Ralph API will be production-grade once this sprint is complete.
