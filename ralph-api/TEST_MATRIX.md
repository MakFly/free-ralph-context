# Ralph API Test Matrix - Service Coverage Map

## Overview
Maps all 14 services to test requirements, dependencies, and complexity.

---

## TIER 1: Critical Core Services (90%+ coverage required)

### Session Service
```
File: app/services/session_service.py
Lines: ~120
Functions: 8 async functions
Dependencies: SQLAlchemy, models.Session
DB Operations: INSERT, SELECT, UPDATE
Tests: 12
Coverage Target: 100%

Critical Test Cases:
  - create_session() defaults
  - create_session() custom max_tokens
  - get_session() with invalid UUID
  - update_tokens() incremental
  - complete_session() status transition
  - terminate_session() status transition
  - list_active_sessions() filtering
  - get_session_status() full details
  - context_usage property (0.0-1.0)
  - context_usage_percent property (0-100)
  - Session model relationships

Mocks: Database (real test DB)
```

### Quota Service
```
File: app/services/quota_service.py
Lines: ~160
Functions: 4 async functions + 1 helper
Dependencies: SQLAlchemy, models.LLMCall, models.Session, config
DB Operations: SUM aggregation, date filtering
Tests: 10
Coverage Target: 90%

Critical Test Cases:
  - get_daily_usage() fresh day
  - get_daily_usage() across midnight
  - get_daily_usage() percentage calculation
  - estimate_remaining_work() context limiting
  - estimate_remaining_work() quota limiting
  - estimate_remaining_work() action estimation
  - _get_recommendations() at 10k, 50k, 100k+ remaining
  - track_llm_call() increments session tokens
  - DAILY_LIMITS all plans
  - Warning threshold at 80%

Mocks: Database, datetime (for midnight crossing)
```

### Memory Service
```
File: app/services/memory_service.py
Lines: ~130
Functions: 5 async functions
Dependencies: SQLAlchemy, models.Memory, EmbeddingService, pgvector
DB Operations: INSERT, SELECT, DELETE, cosine_distance search
Tests: 12
Coverage Target: 90%

Critical Test Cases:
  - add_memory() with all categories (6)
  - add_memory() with all priorities (3)
  - add_memory() embedding generation
  - add_memory() metadata JSONB
  - get_session_memories() no filter
  - get_session_memories() by category
  - get_session_memories() order by created_at
  - search_memories() vector similarity
  - search_memories() top_k parameter
  - search_memories() min_score filtering
  - delete_memory() existing
  - delete_memory() non-existent returns False

Mocks: EmbeddingService (mock sentence-transformers), pgvector cosine_distance
```

### Checkpoint Service
```
File: app/services/checkpoint_service.py
Lines: ~150
Functions: 4 async functions
Dependencies: SQLAlchemy, models.Checkpoint, models.Memory
DB Operations: INSERT, SELECT, UPDATE with relationships
Tests: 10
Coverage Target: 90%

Critical Test Cases:
  - create_checkpoint() captures session state
  - create_checkpoint() snapshots memories_snapshot
  - create_checkpoint() with metadata
  - create_checkpoint() context_usage percentage
  - restore_checkpoint() reconstructs all data
  - restore_checkpoint() invalid checkpoint ID
  - list_checkpoints() ordered by created_at desc
  - list_checkpoints() returns correct fields
  - get_latest_checkpoint() finds most recent
  - get_latest_checkpoint() empty returns None

Mocks: Database (real test DB for relationships)
```

---

## TIER 2: Business Logic Services (85%+ coverage required)

### Compression Service
```
File: app/services/compression_service.py
Lines: ~130
Functions: 3 functions (1 async, 2 parsing helpers)
Dependencies: LLMProvider, pydantic
Tests: 8
Coverage Target: 85%

Critical Test Cases:
  - compress() calls LLM correctly
  - compress() calculates tokens_saved
  - compress() compression_ratio calculation
  - _extract_section() SUMMARY
  - _extract_section() missing section returns ""
  - _extract_list_section() "- " format
  - _extract_list_section() "* " format
  - _extract_list_section() empty returns []

Mocks: LLMProvider (mock Claude API response)
```

### Fold Service
```
File: app/services/fold_service.py
Lines: ~140
Functions: 3 async functions
Dependencies: SQLAlchemy, models.Session, CompressionService
DB Operations: SELECT, UPDATE session tokens
Tests: 8
Coverage Target: 85%

Critical Test Cases:
  - should_fold() at 0.60 threshold
  - should_fold() at 0.75 threshold
  - should_fold() at 0.85 threshold
  - should_fold() at 0.95 threshold
  - should_fold() urgency levels assigned
  - execute_fold() creates checkpoint
  - execute_fold() updates session tokens
  - execute_fold() FoldResult has metrics

Mocks: CompressionService, LLMProvider, Database
```

### Spawn Service
```
File: app/services/spawn_service.py
Lines: ~180
Functions: 4 async functions (1 helper)
Dependencies: SQLAlchemy, models.Session, models.SessionLineage, CheckpointService
DB Operations: INSERT, UPDATE with relationships
Tests: 10
Coverage Target: 85%

Critical Test Cases:
  - should_spawn() task >= 90% returns False
  - should_spawn() context >= 90% AND task < 80% returns True
  - should_spawn() loop detection (3+ same outputs)
  - should_spawn() error cascade (> 5 errors)
  - should_spawn() preserve_context fields
  - execute_spawn() creates child session
  - execute_spawn() creates SessionLineage
  - execute_spawn() marks parent COMPLETED
  - execute_spawn() creates checkpoint
  - execute_spawn() handoff prompt generation

Mocks: LLMProvider (for handoff prompt), Database, CheckpointService
```

### Boundary Service
```
File: app/services/boundary_service.py
Lines: ~130
Functions: 3 functions (2 async)
Dependencies: SQLAlchemy, models.Session, CheckpointService, config
Tests: 8
Coverage Target: 85%

Critical Test Cases:
  - check_boundaries() time warning at 4h
  - check_boundaries() time critical at 5h+
  - check_boundaries() context critical >= 90%
  - check_boundaries() context high >= 75%
  - check_boundaries() multiple warnings
  - check_boundaries() recommended_actions populated
  - auto_checkpoint_if_needed() creates checkpoint
  - auto_checkpoint_if_needed() skips when not needed

Mocks: Database, CheckpointService, datetime
```

### Lineage Service
```
File: app/services/lineage_service.py
Lines: ~130
Functions: 4 async functions
Dependencies: SQLAlchemy, models.Session, models.SessionLineage, CheckpointService
DB Operations: SELECT with relationships, tree walking
Tests: 8
Coverage Target: 80%

Critical Test Cases:
  - get_session_lineage() returns ancestors root-first
  - get_session_lineage() stops at root
  - get_session_lineage() empty lineage
  - get_children() returns all children
  - get_children() no children returns []
  - restore_from_parent() creates new session
  - restore_from_parent() creates lineage
  - restore_from_parent() restores checkpoint

Mocks: Database, CheckpointService, SessionService
```

---

## TIER 3: Supporting Services (80%+ coverage required)

### Embedding Service
```
File: app/services/embedding_service.py
Lines: ~100
Functions: 3-4 functions
Dependencies: sentence-transformers, redis
Tests: 6
Coverage Target: 80%

Test Cases:
  - encode() returns 384-dim vector
  - encode() cache hit
  - encode() cache miss
  - batch_encode() multiple texts
  - Model loading
  - Vector dimension validation

Mocks: sentence-transformers, Redis
```

### Search Service
```
File: app/services/search_service.py
Lines: ~100
Functions: 4-5 functions
Dependencies: EmbeddingService, Redis
Tests: 5
Coverage Target: 80%

Test Cases:
  - add_memory() stores in cache
  - get_session_memories() retrieves
  - delete_memory() removes from cache
  - search_memories() ranked by similarity
  - cache TTL respected

Mocks: Redis, EmbeddingService
```

### LLM Provider
```
File: app/services/llm_provider.py
Lines: ~150
Functions: 4-5 functions (mock all external APIs)
Dependencies: anthropic, openai, google.generativeai, mistralai
Tests: 8
Coverage Target: 80%

Test Cases:
  - get_llm_provider() returns configured
  - complete() with Anthropic (mocked)
  - complete() with OpenAI (mocked)
  - token estimation
  - Max tokens respected
  - System + user prompt concatenation
  - Error handling for invalid provider

Mocks: Anthropic API, OpenAI API, Google AI, Mistral API
```

---

## Integration Tests (By API Route Group)

### Sessions Management
```
Endpoints: 5
POST   /api/sessions
GET    /api/sessions/{id}
POST   /api/sessions/{id}/complete
POST   /api/sessions/{id}/terminate
GET    /api/sessions/active

Tests: 15
Coverage: Happy path + error scenarios
```

### Memories Management
```
Endpoints: 4
POST   /memories/
GET    /memories/session/{id}
GET    /memories/search
DELETE /memories/{session_id}/{memory_id}

Tests: 12
Coverage: CRUD, search, filters
```

### Checkpoints
```
Endpoints: 3
POST /api/checkpoints/{session_id}
GET  /api/checkpoints/{session_id}
GET  /api/checkpoints/{id}/restore

Tests: 10
Coverage: Lifecycle, relationships
```

### Continuity (Spawn, Fold, Compress, Boundaries, Lineage)
```
Endpoints: 10
POST /api/spawn/should
POST /api/spawn/execute
POST /api/fold/should
POST /api/fold/execute
POST /api/compress
GET  /api/boundaries/{session_id}
GET  /api/lineage/{session_id}
POST /api/quota/daily
POST /api/quota/remaining/{session_id}
POST /api/quota/track

Tests: 20
Coverage: All decision paths, workflows
```

### SSE Streaming
```
Endpoint: 1
GET /events/{session_id}

Tests: 5
Coverage: Connection, format, cleanup
```

---

## Database Integration Tests

### Cascade Behavior
```
Tests: 3
- Delete session cascades to memories
- Delete session cascades to checkpoints
- Delete session cascades to lineage
```

### Transactions
```
Tests: 3
- Multiple operations in single transaction
- Rollback on error
- Concurrent isolation
```

### pgvector
```
Tests: 4
- Cosine distance calculation
- Similarity scores in [0, 1]
- Top K ordering
- 384-dim vectors
```

### JSONB Operations
```
Tests: 3
- Metadata storage/retrieval
- State JSONB preservation
- Empty object defaults
```

---

## Test Count Summary

| Tier | Component | Unit Tests | Integration | Total |
|------|-----------|----------|------------|-------|
| 1 | Session | 12 | 5 | 17 |
| 1 | Quota | 10 | 3 | 13 |
| 1 | Memory | 12 | 4 | 16 |
| 1 | Checkpoint | 10 | 3 | 13 |
| **Tier 1 Total** | | **44** | **15** | **59** |
| 2 | Compression | 8 | 2 | 10 |
| 2 | Fold | 8 | 2 | 10 |
| 2 | Spawn | 10 | 3 | 13 |
| 2 | Boundary | 8 | 2 | 10 |
| 2 | Lineage | 8 | 2 | 10 |
| **Tier 2 Total** | | **42** | **11** | **53** |
| 3 | Embedding | 6 | 1 | 7 |
| 3 | Search | 5 | 1 | 6 |
| 3 | LLM Provider | 8 | 1 | 9 |
| **Tier 3 Total** | | **19** | **3** | **22** |
| **Database** | | - | 10 | 10 |
| **Streaming** | | - | 5 | 5 |
| **Totals** | | **105** | **44** | **149** |

**Estimated execution time:** 4-5 minutes for all 149 tests

---

## Coverage Targets by Component

```
Session Service         100%  ########################################
Quota Service            90%  ##################################
Memory Service           90%  ##################################
Checkpoint Service       90%  ##################################
Compression Service      85%  #################################
Fold Service             85%  #################################
Spawn Service            85%  #################################
Boundary Service         85%  #################################
Lineage Service          80%  ##############################
Embedding Service        80%  ##############################
Search Service           80%  ##############################
LLM Provider             80%  ##############################
Curation Service         75%  ###########################
Other Services           70%  ##########################

Overall Target:          80%  ##############################
```

---

**Document:** Ralph API Test Matrix
**Services Covered:** 14 critical services
**Total Tests:** 149 unit + integration
**Estimated Duration:** < 5 minutes
**Coverage Target:** 80%+
