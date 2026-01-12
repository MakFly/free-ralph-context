-- Migration 007: Session History
-- Persistent storage for CLI session history and daily aggregations
-- Version: 1.0.0
-- Date: 2025-01-12

-- ============================================================================
-- SESSION_HISTORY TABLE
-- Stores completed session records for historical tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  cli_type TEXT NOT NULL,                -- 'claude-code', 'codex', 'gemini'
  llm_model TEXT NOT NULL,               -- 'opus-4.5', 'sonnet-4', 'glm-4-plus'
  llm_provider TEXT NOT NULL,            -- 'anthropic', 'openai', 'google', 'zhipu'
  project_path TEXT NOT NULL,
  project_name TEXT NOT NULL,
  started_at INTEGER NOT NULL,           -- Unix timestamp ms
  ended_at INTEGER NOT NULL,             -- Unix timestamp ms
  duration_seconds INTEGER NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  model_usage_json TEXT,                 -- JSON: {model: {inputTokens, outputTokens, costUSD}}
  metadata_json TEXT,                    -- JSON: Additional metadata
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_session_history_session ON session_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_started ON session_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_history_project ON session_history(project_path);
CREATE INDEX IF NOT EXISTS idx_session_history_cli ON session_history(cli_type);
CREATE INDEX IF NOT EXISTS idx_session_history_date ON session_history(date(started_at / 1000, 'unixepoch'));

-- ============================================================================
-- SESSION_DAILY TABLE
-- Pre-aggregated daily stats for fast calendar view
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- 'YYYY-MM-DD' format
  session_count INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cache_read_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  cli_breakdown_json TEXT,               -- JSON: {claude-code: {count, cost}, ...}
  model_breakdown_json TEXT,             -- JSON: {opus-4.5: {count, cost}, ...}
  project_breakdown_json TEXT,           -- JSON: {project_name: {count, cost}, ...}
  first_session_at INTEGER,              -- First session timestamp of the day
  last_session_at INTEGER,               -- Last session timestamp of the day
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  UNIQUE(date)
);

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_session_daily_date ON session_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_session_daily_cost ON session_daily(total_cost_usd DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Recent sessions with formatted duration
CREATE VIEW IF NOT EXISTS v_recent_sessions AS
SELECT
  id,
  session_id,
  cli_type,
  llm_model,
  project_name,
  started_at,
  ended_at,
  duration_seconds,
  CASE
    WHEN duration_seconds < 60 THEN duration_seconds || 's'
    WHEN duration_seconds < 3600 THEN (duration_seconds / 60) || 'm'
    ELSE (duration_seconds / 3600) || 'h ' || ((duration_seconds % 3600) / 60) || 'm'
  END as duration_formatted,
  cost_usd,
  date(started_at / 1000, 'unixepoch') as session_date
FROM session_history
ORDER BY started_at DESC;

-- View: Daily summary for last 30 days
CREATE VIEW IF NOT EXISTS v_daily_summary AS
SELECT
  date,
  session_count,
  total_duration_seconds,
  CASE
    WHEN total_duration_seconds < 60 THEN total_duration_seconds || 's'
    WHEN total_duration_seconds < 3600 THEN (total_duration_seconds / 60) || 'm'
    ELSE (total_duration_seconds / 3600) || 'h ' || ((total_duration_seconds % 3600) / 60) || 'm'
  END as duration_formatted,
  total_cost_usd,
  ROUND(total_cost_usd / NULLIF(session_count, 0), 2) as avg_cost_per_session,
  cli_breakdown_json,
  model_breakdown_json
FROM session_daily
WHERE date >= date('now', '-30 days')
ORDER BY date DESC;

-- View: Weekly aggregation
CREATE VIEW IF NOT EXISTS v_weekly_summary AS
SELECT
  strftime('%Y-W%W', date) as week,
  SUM(session_count) as session_count,
  SUM(total_duration_seconds) as total_duration_seconds,
  SUM(total_cost_usd) as total_cost_usd,
  AVG(total_cost_usd) as avg_daily_cost,
  MIN(date) as week_start,
  MAX(date) as week_end
FROM session_daily
GROUP BY strftime('%Y-W%W', date)
ORDER BY week DESC;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update session_daily when session_history is inserted
CREATE TRIGGER IF NOT EXISTS trigger_update_daily_on_insert
AFTER INSERT ON session_history
BEGIN
  INSERT INTO session_daily (
    date,
    session_count,
    total_duration_seconds,
    total_input_tokens,
    total_output_tokens,
    total_cache_read_tokens,
    total_cost_usd,
    cli_breakdown_json,
    model_breakdown_json,
    project_breakdown_json,
    first_session_at,
    last_session_at
  )
  VALUES (
    date(NEW.started_at / 1000, 'unixepoch'),
    1,
    NEW.duration_seconds,
    NEW.input_tokens,
    NEW.output_tokens,
    NEW.cache_read_tokens,
    NEW.cost_usd,
    json_object(NEW.cli_type, json_object('count', 1, 'cost', NEW.cost_usd)),
    json_object(NEW.llm_model, json_object('count', 1, 'cost', NEW.cost_usd)),
    json_object(NEW.project_name, json_object('count', 1, 'cost', NEW.cost_usd)),
    NEW.started_at,
    NEW.ended_at
  )
  ON CONFLICT(date) DO UPDATE SET
    session_count = session_count + 1,
    total_duration_seconds = total_duration_seconds + NEW.duration_seconds,
    total_input_tokens = total_input_tokens + NEW.input_tokens,
    total_output_tokens = total_output_tokens + NEW.output_tokens,
    total_cache_read_tokens = total_cache_read_tokens + NEW.cache_read_tokens,
    total_cost_usd = total_cost_usd + NEW.cost_usd,
    last_session_at = NEW.ended_at,
    updated_at = strftime('%s', 'now') * 1000;
END;
