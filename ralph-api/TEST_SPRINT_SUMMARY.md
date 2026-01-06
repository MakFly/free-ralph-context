# Ralph API Test Sprint - Executive Summary

## The Challenge
Ralph API is a sophisticated context management system with:
- **14 specialized services** (compression, checkpoint, spawn, quota, etc.)
- **6 SQLAlchemy models** with relationships and cascades
- **25+ REST endpoints** across 9 API route groups
- **Complex integrations**: PostgreSQL+pgvector, Redis, LLM providers (Claude, GPT, Gemini, Mistral), SSE streaming
- **Critical business logic**: session boundaries, context folding, subprocess spawning decisions

**Current state:** Zero test coverage. Starting from scratch.

---

## Sprint Approach: Risk-Based Testing

Rather than test everything equally, we prioritize by **impact on system correctness**:

### TIER 1: Critical Path (Days 1-2) - 50% of sprint effort
These 4 services are **cross-cutting**. If they fail, everything fails.

| Service | Why Critical | Key Tests |
|---------|-------------|-----------|
| **Session Service** | Manages session lifecycle (like malloc) | Create, update tokens, list active, status transitions |
| **Quota Service** | Tracks daily limits and token budgets | Daily usage, remaining capacity, limiting factor logic |
| **Memory Service** | Semantic storage with vector embeddings | Add/search/delete with pgvector, metadata storage |
| **Checkpoint Service** | State snapshots for recovery | Create, restore, cascade deletes, JSONB persistence |

**Success metric:** These 4 services at 90%+ coverage. 60 unit tests.

### TIER 2: Business Logic (Days 3-4) - 30% sprint effort
Decision-making services that trigger spawning, compression, and boundaries.

| Service | Purpose | Key Tests |
|---------|---------|-----------|
| **Compression** | LLM-powered trajectory folding (25% compression ratio) | Text parsing, token estimation, section extraction |
| **Fold** | When to compress (60%, 75%, 85%, 95% thresholds) | Threshold evaluation, urgency levels, checkpoint creation |
| **Spawn** | When to spawn subprocess (context critical, loops, errors) | Decision logic, child creation, lineage tracking |
| **Boundary** | 5-hour reset warnings and quota boundaries | Time/context/quota checks, auto-checkpointing |
| **Lineage** | Parent-child session continuity | Ancestor walking, restore from checkpoint |

**Success metric:** These 5 services at 85%+ coverage. 50 unit tests.

### TIER 3: Supporting Services (Day 5) - 15% sprint effort
Infrastructure and external APIs.

| Service | Role |
|---------|------|
| **Embedding** | sentence-transformers local embeddings |
| **Search** | Redis-based memory caching and search |
| **LLM Provider** | Multi-provider abstraction (mocked in tests) |

**Success metric:** 80%+ coverage. 30 unit tests.

### Integration Tests (Days 3-5) - 5% sprint effort
- 9 API route groups (50 endpoint tests)
- Database transaction isolation
- SSE streaming
- pgvector similarity search

---

## Test Infrastructure (Foundation - Day 1)

### Fixtures Needed
```python
test_db              # PostgreSQL with migrations applied
async_client         # FastAPI test client
mock_llm            # Anthropic API mock
mock_redis          # fakeredis or unittest.mock
session_factory     # Quick session creation
memory_factory      # Quick memory creation with embeddings
```

### Mocking Strategy
- **Database:** Real test PostgreSQL (pgvector support) or SQLite + mock operators
- **LLM:** unittest.mock.patch at service level (compression, spawn, fold)
- **Redis:** fakeredis for cache tests
- **External APIs:** pytest.fixture with Mock objects

### CI/CD Pipeline
- PostgreSQL + Redis Docker services
- Alembic migrations auto-applied
- pytest with coverage reporting
- Codecov integration

---

## Coverage Targets

| Component | Target | Rationale |
|-----------|--------|-----------|
| TIER 1 Services | 90%+ | Foundation of system |
| TIER 2 Services | 85%+ | Complex business logic |
| TIER 3 Services | 80%+ | Nice-to-have accuracy |
| **All Services** | **80%+** | Overall gate |
| **Critical paths** | **100%** | Session create/update, memory search, checkpoint restore, spawn decision, fold decision |

**Critical paths (100% coverage MUST-HAVE):**
1. Session creation and token tracking
2. Memory add/search/delete
3. Checkpoint create/restore cascade
4. Compression ratio calculation
5. Spawn decision (all decision branches)
6. Fold decision (all thresholds: 60%, 75%, 85%, 95%)
7. Boundary time/context/quota warnings
8. Database cascade deletes
9. pgvector cosine distance search

---

## Sprint Schedule (5 Days)

| Phase | Days | Focus | Deliverables |
|-------|------|-------|--------------|
| **Phase 1: Foundation** | 1-2 | Test infrastructure | conftest.py, fixtures, DB setup, TIER 1 unit tests (Session, Quota, Memory, Checkpoint) |
| **Phase 2: Core Logic** | 3-4 | Business logic tests | TIER 2 unit tests (Compression, Fold, Spawn, Boundary, Lineage), DB integration tests |
| **Phase 3: Integration** | 4-5 | API & streaming | 9 API route test suites, SSE tests, end-to-end workflows |
| **Phase 4: Hardening** | 5 | Edge cases & performance | Error scenarios, concurrent operations, cleanup, coverage gaps |

**Time breakdown:**
- Foundation setup: 20% (Day 1)
- TIER 1 tests: 30% (Days 1-2)
- TIER 2 tests: 25% (Days 3-4)
- Integration: 15% (Days 4-5)
- Hardening: 10% (Day 5)

---

## Quality Gates (Pass/Fail Criteria)

**Pre-merge must satisfy:**
- [ ] 80%+ overall coverage
- [ ] 100% critical path coverage
- [ ] All TIER 1 services at 85%+ minimum
- [ ] Zero test failures
- [ ] Database isolation verified
- [ ] Async operations complete without warnings
- [ ] No SQL injection vectors
- [ ] Mock usage consistent

**Performance baseline:**
- Session CRUD < 100ms
- Memory search < 200ms
- Checkpoint restore < 150ms
- Full test suite < 5 minutes

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **pgvector complexity** | Use real test DB; mock cosine_distance only if needed |
| **Async test fragility** | pytest-asyncio + explicit fixture cleanup |
| **Test data pollution** | Transaction rollback per test (faster than drop/recreate) |
| **Mock inconsistency** | Document mock interfaces; use factories for consistency |
| **LLM API flakiness** | All LLM calls mocked; no external API calls in tests |
| **Coverage gaps** | Use coverage.py to identify untested branches; add targeted tests |

---

## Success Metrics

- **Coverage:** 80%+ overall, 90%+ TIER 1, 85%+ TIER 2
- **Speed:** < 5 minutes total
- **Reliability:** Zero flaky tests; all async operations complete correctly
- **Database:** Perfect isolation; no test pollution
- **Documentation:** Every fixture, mock, and test strategy documented

---

## Deliverables (Final)

1. **PRD_TEST_SPRINT.md** - Full requirements (565 lines, this document's parent)
2. **conftest.py** - Pytest configuration, all fixtures
3. **tests/unit/test_session_service.py** - 12+ tests, 100% coverage
4. **tests/unit/test_quota_service.py** - 10+ tests, 90%+ coverage
5. **tests/unit/test_memory_service.py** - 12+ tests, 90%+ coverage
6. **tests/unit/test_checkpoint_service.py** - 10+ tests, 90%+ coverage
7. **tests/unit/test_compression_service.py** - 8+ tests, 85%+ coverage
8. **tests/unit/test_fold_service.py** - 8+ tests, 85%+ coverage
9. **tests/unit/test_spawn_service.py** - 10+ tests, 85%+ coverage
10. **tests/unit/test_boundary_service.py** - 8+ tests, 85%+ coverage
11. **tests/unit/test_lineage_service.py** - 8+ tests, 80%+ coverage
12. **tests/integration/test_api_sessions.py** - 15+ endpoint tests
13. **tests/integration/test_api_memories.py** - 12+ endpoint tests
14. **tests/integration/test_api_checkpoints.py** - 10+ endpoint tests
15. **tests/integration/test_api_continuity.py** - 10+ endpoint tests
16. **tests/integration/test_database.py** - Cascade, transactions, pgvector
17. **.github/workflows/test.yml** - CI/CD pipeline
18. **tests/README.md** - How to run tests locally
19. **Coverage report** - Gap analysis and metrics

---

## Next Steps

1. **Kickoff meeting:** Review TIER 1 service APIs and dependencies
2. **Day 1 AM:** Implement conftest.py, create all fixtures
3. **Day 1 PM:** Create test_session_service.py (12 tests)
4. **Day 2:** Complete TIER 1 (quota, memory, checkpoint - 32 tests)
5. **Days 3-4:** TIER 2 services (Compression, Fold, Spawn, Boundary, Lineage)
6. **Day 5:** Integration tests, CI setup, coverage analysis

---

**Document:** Ralph API Test Sprint PRD
**Status:** Ready for Sprint Planning
**File:** `/home/kev/Documents/lab/brainstorming/free-ralph-context/ralph-api/PRD_TEST_SPRINT.md`
