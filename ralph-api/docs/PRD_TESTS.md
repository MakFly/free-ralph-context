# PRD: Ralph API Test Suite

## Executive Summary

Test suite for Ralph API ensuring reliability of context management operations for Claude Code Max Plan users.

## Problem Statement

Ralph manages AI agent context across 5-hour boundaries and daily quotas. Failures in compression, checkpointing, or quota tracking can cause:
- Loss of work context
- Unexpected session terminations
- Inaccurate usage tracking

## Solution

Comprehensive test suite with:
- **38+ unit tests** covering core services
- **7+ integration tests** for API endpoints
- **80%+ coverage** on critical paths

## Test Categories

### Tier 1: Critical Core (Must Have)
| Service | Tests | Priority |
|---------|-------|----------|
| session_service | 10 | P0 |
| quota_service | 8 | P0 |
| checkpoint_service | 6 | P0 |

### Tier 2: Business Logic (Should Have)
| Service | Tests | Priority |
|---------|-------|----------|
| compression_service | 6 | P1 |
| fold_service | 7 | P1 |
| spawn_service | 5 | P1 |
| boundary_service | 5 | P1 |

### Tier 3: Supporting (Nice to Have)
| Service | Tests | Priority |
|---------|-------|----------|
| lineage_service | 4 | P2 |
| curation_service | 4 | P2 |
| llm_provider | 3 | P2 |

## Key Test Cases

### Session Lifecycle
- ✅ Create session with defaults
- ✅ Update token count
- ✅ Complete/terminate session
- ✅ Context usage calculation

### Compression
- ✅ Compress trajectory
- ✅ Preserve decisions/files/errors
- ✅ Calculate compression ratio
- ✅ Handle LLM failures

### Fold Decision
- ✅ Threshold boundaries (60/75/85/95%)
- ✅ Urgency levels
- ✅ Recommended actions
- ✅ Execute fold flow

### Quota Management
- ✅ Track daily usage
- ✅ Estimate remaining work
- ✅ Warning thresholds
- ✅ LLM call tracking

## Infrastructure

### Fixtures
```python
@pytest.fixture
async def db_session()      # Async SQLite session
async def client()          # HTTP test client
def session_factory()       # Create test sessions
def mock_llm()             # Mock LLM responses
def mock_redis()           # Mock Redis client
```

### Mocking Strategy
| Component | Strategy |
|-----------|----------|
| Database | SQLite in-memory |
| LLM | AsyncMock |
| Redis | MagicMock |
| HTTP | httpx AsyncClient |

## Success Criteria

- [ ] All tests pass
- [ ] 80%+ coverage on services
- [ ] <5 second test suite runtime
- [ ] No flaky tests
- [ ] CI/CD integration ready

## Commands

```bash
# Run tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html

# Specific service
pytest tests/test_session_service.py -v

# Watch mode
pytest-watch tests/
```

## Future Enhancements

1. **E2E Tests** - Full flow from malloc to spawn
2. **Load Tests** - Concurrent session handling
3. **SSE Tests** - Real-time streaming verification
4. **Chaos Tests** - Database/Redis failures
