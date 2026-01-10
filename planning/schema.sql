-- ============================================================
-- NEXUS UNIFIED SCHEMA v1
-- ============================================================
-- Extracted from architecture planning
-- To be used as reference for Sprint 0 migration
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ==================== FILES & CHUNKS ====================

CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL,              -- xxhash64 format: "xxh64:abc123..."
    mtime INTEGER NOT NULL,
    size INTEGER NOT NULL,
    lang TEXT,
    ignored BOOLEAN DEFAULT FALSE,
    indexed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);

CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    content TEXT NOT NULL,
    symbol TEXT,                     -- Function/class name (tree-sitter)
    kind TEXT,                       -- function/class/method/block
    token_count INTEGER,             -- Token estimate (~chars/4)
    UNIQUE(file_id, start_line, end_line)
);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_symbol ON chunks(symbol);

-- FTS5 for keyword search
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    content, symbol,
    content='chunks',
    content_rowid='id'
);

-- FTS5 sync triggers
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
    INSERT INTO chunks_fts(rowid, content, symbol)
    VALUES (new.id, new.content, new.symbol);
END;
CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
    INSERT INTO chunks_fts(chunks_fts, rowid, content, symbol)
    VALUES ('delete', old.id, old.content, old.symbol);
END;
CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
    INSERT INTO chunks_fts(chunks_fts, rowid, content, symbol)
    VALUES ('delete', old.id, old.content, old.symbol);
    INSERT INTO chunks_fts(rowid, content, symbol)
    VALUES (new.id, new.content, new.symbol);
END;

-- Optional embeddings (Sprint 1.1)
CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    vector BLOB NOT NULL,            -- Float32 array
    model TEXT NOT NULL              -- e.g., "all-MiniLM-L6-v2"
);

-- ==================== OBSERVATIONS (Memory) ====================

CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    project TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN (
        'decision', 'bugfix', 'feature', 'refactor',
        'discovery', 'change', 'preference', 'fact', 'note'
    )),
    title TEXT NOT NULL,             -- ~20 chars max (compact)
    subtitle TEXT,                   -- ~100 chars max
    narrative TEXT,                  -- Full context
    facts_json TEXT,                 -- JSON array
    concepts_json TEXT,              -- JSON array
    files_read_json TEXT,            -- JSON array
    files_modified_json TEXT,        -- JSON array
    prompt_number INTEGER,
    discovery_tokens INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_obs_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_obs_project ON observations(project);
CREATE INDEX IF NOT EXISTS idx_obs_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_obs_created ON observations(created_at DESC);

-- FTS5 for observations
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
    title, subtitle, narrative,
    content='observations',
    content_rowid='id'
);

-- FTS5 sync triggers for observations
CREATE TRIGGER IF NOT EXISTS obs_ai AFTER INSERT ON observations BEGIN
    INSERT INTO observations_fts(rowid, title, subtitle, narrative)
    VALUES (new.id, new.title, new.subtitle, new.narrative);
END;
CREATE TRIGGER IF NOT EXISTS obs_ad AFTER DELETE ON observations BEGIN
    INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative)
    VALUES ('delete', old.id, old.title, old.subtitle, old.narrative);
END;

-- ==================== SESSION SUMMARIES ====================

CREATE TABLE IF NOT EXISTS session_summaries (
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
CREATE INDEX IF NOT EXISTS idx_summaries_project ON session_summaries(project);
CREATE INDEX IF NOT EXISTS idx_summaries_created ON session_summaries(created_at DESC);

-- FTS5 for summaries
CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
    request, investigated, learned, completed, next_steps,
    content='session_summaries',
    content_rowid='id'
);

-- ==================== PATTERNS (Learning) ====================

CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY,
    intent TEXT NOT NULL,            -- "Create a new API endpoint"
    title TEXT NOT NULL,
    tags_json TEXT,                  -- JSON array
    constraints_json TEXT,           -- {lang, framework, version, pathPattern}
    variables_json TEXT,             -- [{name, type, transform, default}]
    templates_json TEXT,             -- [{path, content}]
    checklist_json TEXT,             -- JSON array
    gotchas_json TEXT,               -- JSON array
    sources_json TEXT,               -- [{chunkId?, fileId?}]
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patterns_intent ON patterns(intent);

-- FTS5 for patterns
CREATE VIRTUAL TABLE IF NOT EXISTS patterns_fts USING fts5(
    intent, title,
    content='patterns',
    content_rowid='id'
);

-- View with calculated success_rate
CREATE VIEW IF NOT EXISTS patterns_with_stats AS
SELECT
    p.*,
    CASE
        WHEN (p.success_count + p.fail_count) = 0 THEN 0.5
        ELSE CAST(p.success_count AS REAL) / (p.success_count + p.fail_count)
    END AS success_rate
FROM patterns p;

-- ==================== FEEDBACK ====================

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY,
    pattern_id INTEGER NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK(outcome IN ('success', 'fail')),
    notes TEXT,
    patch_id TEXT,                   -- Reference to applied patch
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_pattern ON feedback(pattern_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

-- ==================== CANDIDATES (Learning capture) ====================

CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL CHECK(kind IN ('diff', 'chunks', 'folder')),
    sources_json TEXT NOT NULL,      -- JSON array of source refs
    label TEXT,
    tags_json TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'distilled', 'archived')),
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
