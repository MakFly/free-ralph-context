-- Ralph MCP Sessions Schema
-- Stores session metadata for multi-project session management

-- Sessions table
CREATE TABLE IF NOT EXISTS mcp_sessions (
    id TEXT PRIMARY KEY,                    -- UUID session_id
    project_path TEXT NOT NULL,             -- /home/user/project
    task_description TEXT,                  -- Task description
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    max_tokens INTEGER DEFAULT 200000,
    current_tokens INTEGER DEFAULT 0,       -- Tokens used in this session
    status TEXT DEFAULT 'active'            -- active, completed, archived
);

-- Migration: Add status column to existing databases
-- SQLite doesn't support ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so we use this workaround
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- We'll handle this migration in Python code

-- Patterns table - stores learned code patterns
CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,                    -- UUID pattern_id
    session_id TEXT NOT NULL,               -- Owner session
    pattern_name TEXT NOT NULL,             -- e.g., "Symfony BetterAuth Paseto"
    pattern_description TEXT NOT NULL,      -- Detailed description
    code_example TEXT,                      -- Optional code example
    tags TEXT NOT NULL DEFAULT '[]',        -- JSON array of tags
    source_mode TEXT NOT NULL DEFAULT 'manual', -- 'llm' or 'generic' or 'manual'
    source_files TEXT,                      -- JSON array of source files
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES mcp_sessions(id) ON DELETE CASCADE
);

-- Memories table - stores decisions, actions, context
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,                    -- UUID memory_id
    session_id TEXT NOT NULL,               -- Owner session
    content TEXT NOT NULL,                  -- Memory content
    category TEXT NOT NULL DEFAULT 'other', -- decision, action, error, progress, context, other
    priority TEXT NOT NULL DEFAULT 'normal', -- high, normal, low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES mcp_sessions(id) ON DELETE CASCADE
);

-- Projects table - global project registry with FTS5 index
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL UNIQUE,              -- Project name (e.g., "iautos")
    path TEXT NOT NULL UNIQUE,              -- Absolute path
    description TEXT,                       -- Optional description
    aliases TEXT NOT NULL DEFAULT '[]',     -- JSON array of aliases
    keywords TEXT NOT NULL DEFAULT '[]',    -- JSON array of keywords
    framework TEXT,                         -- Detected framework
    file_count INTEGER DEFAULT 0,           -- Number of source files
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scanned TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 full-text search table for projects
CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
    name,
    description,
    path,
    content=projects,
    content_rowid=rowid,
    tokenize='porter unicode61'
);

-- FTS5 triggers to keep index in sync
CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
    INSERT INTO projects_fts(rowid, name, description, path)
    VALUES (new.rowid, new.name, new.description, new.path);
END;

CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
    DELETE FROM projects_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
    UPDATE projects_fts
    SET name = new.name, description = new.description, path = new.path
    WHERE rowid = new.rowid;
END;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sessions_project ON mcp_sessions(project_path);
CREATE INDEX IF NOT EXISTS idx_sessions_accessed ON mcp_sessions(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_session ON patterns(session_id);
CREATE INDEX IF NOT EXISTS idx_patterns_name ON patterns(pattern_name);
CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
CREATE INDEX IF NOT EXISTS idx_projects_scanned ON projects(last_scanned DESC);
