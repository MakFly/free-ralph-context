# Architecture Token Efficiency Unifiée

**Objectif** : Combiner les mécanismes de claude-mem + mgrep pour maximiser l'efficacité tokens.

**Cible** : Réduction **20x tokens** vs baseline (10x claude-mem + 2x mgrep cumulés)

---

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXUS UNIFIED SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │    SEARCH    │    │    MEMORY    │    │   LEARNING   │              │
│  │   (mgrep)    │    │ (claude-mem) │    │   (unique)   │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │                                           │
│                    ┌────────▼────────┐                                  │
│                    │ PROGRESSIVE     │                                  │
│                    │ DISCLOSURE      │                                  │
│                    │ (3-Layer)       │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│         ┌───────────────────┼───────────────────┐                       │
│         │                   │                   │                       │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐              │
│  │  Layer 1     │    │  Layer 2     │    │  Layer 3     │              │
│  │  INDEX       │    │  CONTEXT     │    │  FULL        │              │
│  │  ~50 tokens  │    │  ~150 tokens │    │  ~500 tokens │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mécanismes combinés

### 2.1 De claude-mem (Memory)

| Mécanisme | Description | Token Savings |
|-----------|-------------|---------------|
| **3-Layer Disclosure** | index → context → full | ~10x |
| **Observation Types** | decision/bugfix/feature/discovery | Filtrage intelligent |
| **Timeline** | Contexte chronologique | Debug rapide |
| **Session Summaries** | Résumé de session structuré | Compression 100:1 |
| **Discovery Tokens** | ROI tracking | Mesure efficacité |
| **FTS5 + ChromaDB** | Hybrid search local | Pertinence accrue |

### 2.2 De mgrep (Search)

| Mécanisme | Description | Token Savings |
|-----------|-------------|---------------|
| **Compact Output** | `path:lines [score%]` | ~2x |
| **Semantic Search** | Natural language queries | Moins d'itérations |
| **Reranking** | Cross-encoder top-k | Meilleur top-1 |
| **xxhash64** | Dédup rapide | Skip inutiles |
| **gitignore hiérarchique** | Filtrage intelligent | Moins de bruit |
| **Answer Synthesis** | Résumé des hits | Compréhension rapide |

### 2.3 Unique à Nexus (Learning)

| Mécanisme | Description | Token Savings |
|-----------|-------------|---------------|
| **PatternCards 2-étapes** | metadata → templates on-demand | ~5x |
| **Success Rate Ranking** | Patterns efficaces en premier | Moins d'échecs |
| **Dry-run Apply** | Preview avant écriture | Évite corrections |

---

## 3. Schéma de données unifié

### 3.1 Tables SQLite (inspiré claude-mem)

```sql
-- ==================== FILES & CHUNKS ====================

CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL,              -- xxhash64 (mgrep)
    mtime INTEGER NOT NULL,
    size INTEGER NOT NULL,
    lang TEXT,
    ignored BOOLEAN DEFAULT FALSE,
    indexed_at INTEGER NOT NULL
);
CREATE INDEX idx_files_hash ON files(hash);
CREATE INDEX idx_files_path ON files(path);

CREATE TABLE chunks (
    id INTEGER PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    content TEXT NOT NULL,
    symbol TEXT,                     -- Nom fonction/classe (tree-sitter)
    kind TEXT,                       -- function/class/method/block
    token_count INTEGER,             -- Estimation tokens
    UNIQUE(file_id, start_line, end_line)
);
CREATE INDEX idx_chunks_file ON chunks(file_id);
CREATE INDEX idx_chunks_symbol ON chunks(symbol);

-- FTS5 pour recherche keyword
CREATE VIRTUAL TABLE chunks_fts USING fts5(
    content, symbol, path,
    content='chunks',
    content_rowid='id'
);

-- Embeddings optionnels
CREATE TABLE embeddings (
    chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    vector BLOB NOT NULL,            -- Float32 array serialisé
    model TEXT NOT NULL              -- all-MiniLM-L6-v2, etc.
);

-- ==================== OBSERVATIONS (claude-mem) ====================

CREATE TABLE observations (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    project TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN (
        'decision', 'bugfix', 'feature', 'refactor',
        'discovery', 'change', 'preference', 'fact'
    )),
    title TEXT NOT NULL,             -- ~20 chars max
    subtitle TEXT,                   -- ~100 chars max
    narrative TEXT,                  -- Full context
    facts_json TEXT,                 -- JSON array of atomic facts
    concepts_json TEXT,              -- JSON array: how-it-works, pattern, gotcha...
    files_read_json TEXT,
    files_modified_json TEXT,
    prompt_number INTEGER,
    discovery_tokens INTEGER DEFAULT 0,  -- Coût de découverte
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_obs_session ON observations(session_id);
CREATE INDEX idx_obs_project ON observations(project);
CREATE INDEX idx_obs_type ON observations(type);
CREATE INDEX idx_obs_created ON observations(created_at DESC);

-- FTS5 pour observations
CREATE VIRTUAL TABLE observations_fts USING fts5(
    title, subtitle, narrative, facts_json, concepts_json,
    content='observations',
    content_rowid='id'
);

-- ==================== SESSION SUMMARIES (claude-mem) ====================

CREATE TABLE session_summaries (
    id INTEGER PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    project TEXT NOT NULL,
    request TEXT,                    -- What was asked
    investigated TEXT,               -- What was explored
    learned TEXT,                    -- Key learnings
    completed TEXT,                  -- What shipped
    next_steps TEXT,                 -- Trajectory
    notes TEXT,
    discovery_tokens INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- FTS5 pour summaries
CREATE VIRTUAL TABLE summaries_fts USING fts5(
    request, investigated, learned, completed, next_steps, notes,
    content='session_summaries',
    content_rowid='id'
);

-- ==================== PATTERNS (unique Nexus) ====================

CREATE TABLE patterns (
    id INTEGER PRIMARY KEY,
    intent TEXT NOT NULL,            -- "Create a new API endpoint"
    title TEXT NOT NULL,
    tags_json TEXT,
    constraints_json TEXT,           -- {lang, framework, version, path_pattern}
    variables_json TEXT,             -- [{name, type, transform, default}]
    templates_json TEXT,             -- [{path, content}] ou ref vers fichiers
    checklist_json TEXT,
    gotchas_json TEXT,
    sources_json TEXT,               -- Liens vers chunks/files d'origine
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX idx_patterns_intent ON patterns(intent);

-- FTS5 pour patterns
CREATE VIRTUAL TABLE patterns_fts USING fts5(
    intent, title, tags_json, gotchas_json,
    content='patterns',
    content_rowid='id'
);

-- ==================== FEEDBACK (Nexus) ====================

CREATE TABLE feedback (
    id INTEGER PRIMARY KEY,
    pattern_id INTEGER NOT NULL REFERENCES patterns(id),
    outcome TEXT NOT NULL CHECK(outcome IN ('success', 'fail')),
    notes TEXT,
    patch_id TEXT,                   -- Référence au patch appliqué
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_feedback_pattern ON feedback(pattern_id);
```

### 3.2 Calcul success_rate

```sql
-- Vue calculée
CREATE VIEW patterns_with_stats AS
SELECT
    p.*,
    CASE
        WHEN (p.success_count + p.fail_count) = 0 THEN 0.5
        ELSE CAST(p.success_count AS REAL) / (p.success_count + p.fail_count)
    END AS success_rate
FROM patterns p;
```

---

## 4. Progressive Disclosure (3-Layer Pattern)

### 4.1 Implémentation unifiée

```typescript
// Applicable à: Search, Memory, Patterns

interface ProgressiveDisclosure<TCompact, TFull> {
  // Layer 1: Index compact (~50 tokens/item)
  recall(query: string, options?: RecallOptions): Promise<TCompact[]>;

  // Layer 2: Context/Timeline (~150 tokens/item)
  timeline?(anchor: string, window: number): Promise<TCompact[]>;

  // Layer 3: Full details (~500+ tokens/item)
  get(ids: string[]): Promise<TFull[]>;
}
```

### 4.2 Formats de sortie

#### Layer 1: Index (tous les systèmes)

```markdown
| ID | Time | Type | Title | Tokens |
|----|------|------|-------|--------|
| #456 | 2:30 PM | 🟣 feature | OAuth2 PKCE implementation | ~125 |
| #455 | 2:15 PM | 🔴 bugfix | Token refresh race condition | ~89 |
```

**Token cost**: ~50 tokens/row

#### Layer 2: Context (Memory/Observations)

```markdown
### Timeline around #456

**Before:**
| #454 | 2:00 PM | 🔵 discovery | Found existing auth middleware |
| #455 | 2:15 PM | 🔴 bugfix | Token refresh race condition |

**Anchor:**
| #456 | 2:30 PM | 🟣 feature | OAuth2 PKCE implementation | ← HERE

**After:**
| #457 | 2:45 PM | ✅ docs | Updated auth documentation |
```

**Token cost**: ~150 tokens/window

#### Layer 3: Full Details (on-demand)

```json
{
  "id": 456,
  "type": "feature",
  "title": "OAuth2 PKCE implementation",
  "subtitle": "Secure auth flow for mobile clients",
  "narrative": "Implemented OAuth2 authorization code flow with PKCE...",
  "facts": [
    "PKCE uses S256 challenge method",
    "Code verifier is 43-128 chars"
  ],
  "files_modified": ["src/auth/oauth.ts", "src/auth/pkce.ts"],
  "discovery_tokens": 1250
}
```

**Token cost**: ~500-1000 tokens/item

---

## 5. MCP Tools Contract

### 5.1 Tool: `__WORKFLOW` (Documentation obligatoire)

```typescript
{
  name: '__WORKFLOW',
  description: `
MANDATORY 3-LAYER WORKFLOW:

1. SEARCH/RECALL → Get index with IDs (~50 tokens/result)
   code.search({ query, k: 10 })
   memory.recall({ query, k: 10 })
   learning.recall({ query, k: 3 })

2. CONTEXT/TIMELINE → Get surrounding context (optional)
   memory.timeline({ anchor: ID, window: 5 })

3. GET/FETCH → Full details ONLY for filtered IDs
   code.open({ path, startLine, endLine })
   memory.get({ ids: [...] })
   learning.getTemplates({ patternId })

⚠️ NEVER fetch full details without filtering first.
Token savings: 10-20x vs naive approach.
`
}
```

### 5.2 Code Search Tools

```typescript
// Layer 1: Search index
code.search({
  query: string,
  mode?: 'keyword' | 'semantic' | 'hybrid',
  k?: number,           // max 12 (cap)
  filters?: {
    lang?: string,
    path?: string,      // glob pattern
    kind?: string       // function/class/method
  }
}) → {
  hits: [{
    id: string,         // chunk_id
    path: string,
    lines: string,      // "42-58"
    symbol?: string,
    score: number,
    preview: string     // ~80 chars max
  }],
  truncated: boolean,
  message?: string      // "Refine query for more results"
}

// Layer 3: Open full snippet
code.open({
  path: string,
  startLine: number,
  endLine: number
}) → {
  content: string,      // max 200 lines (cap)
  lang: string,
  symbols: string[],    // Adjacent symbols
  truncated: boolean
}
```

### 5.3 Memory Tools

```typescript
// Layer 1: Recall index
memory.recall({
  query: string,
  scope?: 'repo' | 'branch' | 'global',
  type?: 'decision' | 'preference' | 'fact' | 'discovery',
  k?: number
}) → {
  items: [{
    id: string,
    type: string,
    title: string,      // ~20 chars
    score: number,
    created_at: number
  }]
}

// Layer 2: Timeline context
memory.timeline({
  anchor: string,       // observation ID
  window?: number       // items before/after (default 5)
}) → {
  before: [{ id, type, title, created_at }],
  anchor: { id, type, title, subtitle, created_at },
  after: [{ id, type, title, created_at }]
}

// Layer 3: Full details
memory.get({
  ids: string[]
}) → {
  items: [{
    id: string,
    type: string,
    title: string,
    subtitle: string,
    narrative: string,
    facts: string[],
    concepts: string[],
    files_read: string[],
    files_modified: string[],
    discovery_tokens: number,
    created_at: number
  }]
}

// Write
memory.upsert({
  type: string,
  scope: string,
  title: string,
  content: string,
  tags?: string[],
  links?: { chunk_id?: string, file_id?: string }[]
}) → { id: string }
```

### 5.4 Learning Tools

```typescript
// Layer 1: Recall PatternCards (compact)
learning.recall({
  query: string,
  lang?: string,
  framework?: string,
  k?: number           // max 3 (cap)
}) → {
  patterns: [{
    id: string,
    intent: string,
    title: string,
    constraints: object,
    success_rate: number,
    usage_count: number
  }]
}

// Layer 3: Get templates (on-demand)
learning.getTemplates({
  patternId: string
}) → {
  variables: [{
    name: string,
    type: string,
    transform?: string,
    default?: string
  }],
  templates: [{
    path: string,
    content: string
  }],
  checklist: string[],
  gotchas: string[]
}

// Apply
learning.apply({
  patternId: string,
  variables: Record<string, string>,
  mode: 'dry-run' | 'write'
}) → {
  patch: [{
    path: string,
    action: 'create' | 'modify',
    diff?: string       // dry-run only
  }],
  checklist: string[],
  patchId?: string      // write mode only
}

// Feedback
learning.feedback({
  patternId: string,
  outcome: 'success' | 'fail',
  notes?: string,
  patchId?: string
}) → { success_rate: number }
```

---

## 6. Budget Mode (Caps stricts)

### 6.1 Configuration

```typescript
const BUDGET_CAPS = {
  // Search
  maxSearchHits: 12,
  maxSnippetLines: 80,
  maxOpenLines: 200,

  // Memory
  maxRecallItems: 20,
  maxTimelineWindow: 10,
  maxFullItems: 5,

  // Learning
  maxPatternCards: 3,
  maxTemplateChars: 6000,

  // Global
  maxToolReturnChars: 20000,
  truncationMessage: "Results truncated. Refine query or specify IDs."
};
```

### 6.2 Truncation Strategy

```typescript
function enforceLimit<T>(
  items: T[],
  limit: number,
  estimateTokens: (item: T) => number
): { items: T[], truncated: boolean, message?: string } {
  let totalTokens = 0;
  const result: T[] = [];

  for (const item of items) {
    const tokens = estimateTokens(item);
    if (totalTokens + tokens > limit) {
      return {
        items: result,
        truncated: true,
        message: `Showing ${result.length}/${items.length}. Use IDs to fetch specific items.`
      };
    }
    result.push(item);
    totalTokens += tokens;
  }

  return { items: result, truncated: false };
}
```

---

## 7. Hybrid Search (local)

### 7.1 Algorithme RRF (Reciprocal Rank Fusion)

```typescript
// Combine BM25 (keyword) + Vector (semantic)
function hybridSearch(
  query: string,
  options: { alpha?: number, k?: number, rrf_k?: number }
): SearchResult[] {
  const { alpha = 0.7, k = 10, rrf_k = 60 } = options;

  // 1. BM25 search (FTS5)
  const bm25Results = fts5Search(query, k * 2);

  // 2. Vector search (if embeddings available)
  const vectorResults = embeddingsAvailable
    ? vectorSearch(embed(query), k * 2)
    : [];

  // 3. RRF fusion
  const scores = new Map<string, number>();

  for (let i = 0; i < bm25Results.length; i++) {
    const id = bm25Results[i].id;
    const rrfScore = (1 - alpha) * (1 / (rrf_k + i + 1));
    scores.set(id, (scores.get(id) || 0) + rrfScore);
  }

  for (let i = 0; i < vectorResults.length; i++) {
    const id = vectorResults[i].id;
    const rrfScore = alpha * (1 / (rrf_k + i + 1));
    scores.set(id, (scores.get(id) || 0) + rrfScore);
  }

  // 4. Sort by combined score
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id, score]) => ({ id, score }));
}
```

### 7.2 Reranking (optional)

```typescript
async function rerank(
  query: string,
  results: SearchResult[],
  topK: number = 5
): Promise<SearchResult[]> {
  if (!rerankModel) return results.slice(0, topK);

  // Cross-encoder scoring
  const pairs = results.slice(0, 20).map(r => ({
    query,
    passage: getContent(r.id)
  }));

  const scores = await rerankModel.score(pairs);

  return results
    .slice(0, 20)
    .map((r, i) => ({ ...r, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

---

## 8. Token Economics Dashboard

### 8.1 Métriques à tracker

```typescript
interface TokenMetrics {
  // Per-tool
  search_calls: number;
  search_tokens_returned: number;

  memory_recall_calls: number;
  memory_get_calls: number;
  memory_tokens_saved: number;  // vs fetching all

  learning_recall_calls: number;
  learning_apply_calls: number;

  // ROI
  total_discovery_tokens: number;  // Coût initial de découverte
  total_read_tokens: number;       // Coût de lecture (économisé)
  savings_percent: number;         // (discovery - read) / discovery
}
```

### 8.2 Display format

```markdown
# Token Economics - Session abc123

## Summary
- Discovery cost: 12,500 tokens
- Read cost: 1,250 tokens
- **Savings: 90% (11,250 tokens)**

## Breakdown
| Operation | Calls | Tokens | Avg |
|-----------|-------|--------|-----|
| code.search | 15 | 750 | 50 |
| memory.recall | 8 | 400 | 50 |
| memory.get | 3 | 1,500 | 500 |
| learning.recall | 2 | 200 | 100 |
```

---

## 9. Lifecycle Hooks Integration

### 9.1 hooks.json (Claude Code)

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "nexus context inject",
          "timeout": 60
        }
      ]
    }],
    "PostToolUse": [{
      "matcher": "Edit|Write|Bash",
      "hooks": [
        {
          "type": "command",
          "command": "nexus observe --tool=$TOOL_NAME",
          "timeout": 30
        }
      ]
    }],
    "Stop": [{
      "hooks": [
        {
          "type": "command",
          "command": "nexus summarize",
          "timeout": 120
        }
      ]
    }]
  }
}
```

### 9.2 Context Injection

```typescript
// Généré au SessionStart
function generateSessionContext(project: string): string {
  const config = loadContextConfig();
  const observations = queryRecentObservations(project, config.totalCount);
  const patterns = queryTopPatterns(project, 3);
  const summary = queryLastSummary(project);

  return `
# Project Context: ${project}

## Recent Observations (${observations.length})
${formatObservationsCompact(observations, config.fullCount)}

## Top Patterns
${formatPatternsCompact(patterns)}

## Last Session
${formatSummaryCompact(summary)}

---
Use \`memory.recall\`, \`learning.recall\` for more context.
`.trim();
}
```

---

## 10. Implementation Sprints Update

### Sprint 0 - Foundation
- [x] SQLite schema unifié (toutes tables)
- [x] xxhash64 pour dédup (mgrep)
- [x] FTS5 triggers auto-sync

### Sprint 1 - Search
- [x] Hybrid search (BM25 + optional vector)
- [x] Compact output format (mgrep style)
- [x] Reranking optional

### Sprint 2 - Memory
- [x] 3-Layer progressive disclosure
- [x] Timeline tool
- [x] Token economics tracking
- [x] Session summaries

### Sprint 5 - MCP
- [x] __WORKFLOW documentation tool
- [x] Context injection prompts
- [x] Lifecycle hooks integration

---

## 11. Résumé des gains

| Source | Mécanisme | Token Savings |
|--------|-----------|---------------|
| claude-mem | Progressive Disclosure 3-Layer | 10x |
| claude-mem | Session Summaries | Compression 100:1 |
| claude-mem | Discovery Tokens ROI | Mesurable |
| mgrep | Compact Output | 2x |
| mgrep | Semantic + Rerank | Moins d'itérations |
| mgrep | xxhash64 dédup | Skip reindex |
| Nexus | PatternCards 2-step | 5x sur templates |
| Nexus | Success Rate Ranking | Moins d'échecs |

**Total combiné estimé : 15-20x token reduction**

---

## 12. Fichiers à créer

```
packages/
  core/
    src/
      search/
        hybrid.ts           # BM25 + Vector RRF
        rerank.ts           # Cross-encoder optional
      memory/
        disclosure.ts       # 3-layer pattern
        timeline.ts         # Chronological context
        economics.ts        # Token tracking
      learning/
        patterns.ts         # PatternCards 2-step
        apply.ts            # Dry-run + write

  storage/
    src/
      migrations/
        001_unified_schema.sql
      hash.ts               # xxhash64 wrapper

  indexer/
    src/
      chunker.ts            # AST-aware chunking
      watcher.ts            # Incremental updates

apps/
  mcp-server/
    src/
      tools/
        workflow.ts         # __WORKFLOW doc
        search.ts
        memory.ts
        learning.ts
      prompts/
        context.ts          # Session injection
```
