/**
 * Sessions History Routes
 * Historical session tracking with daily aggregations
 * Enables Calendar View and usage analytics
 */

import { Hono } from 'hono';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Types
export interface SessionHistoryRecord {
  id: number;
  session_id: string;
  cli_type: string;
  llm_model: string;
  llm_provider: string;
  project_path: string;
  project_name: string;
  started_at: number;
  ended_at: number;
  duration_seconds: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  model_usage_json: string | null;
  metadata_json: string | null;
  created_at: number;
}

export interface SessionDailyRecord {
  id: number;
  date: string;
  session_count: number;
  total_duration_seconds: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cost_usd: number;
  cli_breakdown_json: string | null;
  model_breakdown_json: string | null;
  project_breakdown_json: string | null;
  first_session_at: number | null;
  last_session_at: number | null;
  updated_at: number;
}

export interface DailyCalendarItem {
  date: string;
  sessionCount: number;
  totalCost: number;
  totalDuration: number;
  cliBreakdown: Record<string, { count: number; cost: number }>;
  modelBreakdown: Record<string, { count: number; cost: number }>;
  intensity: number; // 0-4 for heatmap coloring
}

// Pricing table (same as sessions.ts)
const ANTHROPIC_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-4-5-20251101': { input: 15, output: 75, cacheRead: 1.50 },
  'opus-4.5': { input: 15, output: 75, cacheRead: 1.50 },
  'claude-sonnet-4-20250514': { input: 3, output: 15, cacheRead: 0.30 },
  'sonnet-4': { input: 3, output: 15, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4, cacheRead: 0.08 },
  'haiku-4.5': { input: 0.80, output: 4, cacheRead: 0.08 },
};

// Calculate cost from tokens
function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0
): number {
  const pricing = ANTHROPIC_PRICING[modelId] || ANTHROPIC_PRICING['opus-4.5'];
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output +
    (cacheReadTokens / 1_000_000) * pricing.cacheRead
  );
}

// Parse a single JSONL session file
async function parseSessionJsonl(filepath: string): Promise<{
  sessionId: string;
  startedAt: number;
  endedAt: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  mainModel: string;
  modelUsage: Record<string, { inputTokens: number; outputTokens: number; costUsd: number }>;
} | null> {
  try {
    const content = await readFile(filepath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    if (lines.length === 0) return null;

    let sessionId = '';
    let startedAt = 0;
    let endedAt = 0;
    const modelUsage: Record<string, { inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number }> = {};

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Extract session ID
        if (entry.sessionId && !sessionId) {
          sessionId = entry.sessionId;
        }

        // Extract timestamps
        if (entry.timestamp) {
          const ts = new Date(entry.timestamp).getTime();
          if (!startedAt || ts < startedAt) startedAt = ts;
          if (ts > endedAt) endedAt = ts;
        }

        // Extract usage from assistant messages
        if (entry.type === 'assistant' && entry.message?.usage) {
          const usage = entry.message.usage;
          const modelId = entry.message.model || 'claude-opus-4-5-20251101';

          if (!modelUsage[modelId]) {
            modelUsage[modelId] = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUsd: 0 };
          }

          const m = modelUsage[modelId];
          m.inputTokens += usage.input_tokens || 0;
          m.outputTokens += usage.output_tokens || 0;
          m.cacheReadTokens += usage.cache_read_input_tokens || 0;
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Calculate costs
    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheRead = 0;
    let totalCost = 0;
    let maxCost = 0;
    let mainModel = 'unknown';

    for (const [model, usage] of Object.entries(modelUsage)) {
      usage.costUsd = calculateCost(model, usage.inputTokens, usage.outputTokens, usage.cacheReadTokens);
      totalInput += usage.inputTokens;
      totalOutput += usage.outputTokens;
      totalCacheRead += usage.cacheReadTokens;
      totalCost += usage.costUsd;

      if (usage.costUsd > maxCost) {
        maxCost = usage.costUsd;
        mainModel = model;
      }
    }

    // Normalize model name
    if (mainModel.includes('opus')) mainModel = 'opus-4.5';
    else if (mainModel.includes('sonnet')) mainModel = 'sonnet-4';
    else if (mainModel.includes('haiku')) mainModel = 'haiku-4.5';

    return {
      sessionId: sessionId || filepath.split('/').pop()?.replace('.jsonl', '') || 'unknown',
      startedAt,
      endedAt,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cacheReadTokens: totalCacheRead,
      cacheWriteTokens: 0,
      costUsd: totalCost,
      mainModel,
      modelUsage: Object.fromEntries(
        Object.entries(modelUsage).map(([k, v]) => [k, { inputTokens: v.inputTokens, outputTokens: v.outputTokens, costUsd: v.costUsd }])
      ),
    };
  } catch {
    return null;
  }
}

// Scan all JSONL files from ~/.claude/projects
async function scanAllSessions(): Promise<Array<{
  projectPath: string;
  projectName: string;
  sessions: Awaited<ReturnType<typeof parseSessionJsonl>>[];
}>> {
  const home = homedir();
  const projectsDir = join(home, '.claude', 'projects');

  if (!existsSync(projectsDir)) return [];

  const results: Array<{
    projectPath: string;
    projectName: string;
    sessions: Awaited<ReturnType<typeof parseSessionJsonl>>[];
  }> = [];

  try {
    const projectFolders = await readdir(projectsDir);

    for (const folder of projectFolders) {
      const projectDir = join(projectsDir, folder);

      // Convert folder name back to path: -home-kev-Documents -> /home/kev/Documents
      const projectPath = folder.replace(/^-/, '/').replace(/-/g, '/');
      const projectName = projectPath.split('/').pop() || folder;

      try {
        const files = await readdir(projectDir);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

        const sessions: Awaited<ReturnType<typeof parseSessionJsonl>>[] = [];

        for (const file of jsonlFiles) {
          const session = await parseSessionJsonl(join(projectDir, file));
          if (session && session.startedAt > 0) {
            sessions.push(session);
          }
        }

        if (sessions.length > 0) {
          results.push({ projectPath, projectName, sessions });
        }
      } catch {
        // Skip folders that can't be read
      }
    }
  } catch {
    // Projects dir doesn't exist or can't be read
  }

  return results;
}

type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

export function createSessionsHistoryRoutes(getDb: () => Promise<Database>) {
  const app = new Hono();

  // ==================== IMPORT FROM JSONL ====================
  // Scans ~/.claude/projects and imports all sessions into DB
  app.post('/import', async (c) => {
    const db = await getDb();
    const scanned = await scanAllSessions();

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const project of scanned) {
      for (const session of project.sessions) {
        if (!session) continue;

        try {
          // Check if already exists
          const existing = db.queryOne<{ id: number }>(
            'SELECT id FROM session_history WHERE session_id = ?',
            session.sessionId
          );

          if (existing) {
            skipped++;
            continue;
          }

          // Insert new session
          db.run(
            `INSERT INTO session_history (
              session_id, cli_type, llm_model, llm_provider,
              project_path, project_name, started_at, ended_at,
              duration_seconds, input_tokens, output_tokens,
              cache_read_tokens, cache_write_tokens, cost_usd,
              model_usage_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            session.sessionId,
            'claude-code',
            session.mainModel,
            'anthropic',
            project.projectPath,
            project.projectName,
            session.startedAt,
            session.endedAt,
            Math.round((session.endedAt - session.startedAt) / 1000),
            session.inputTokens,
            session.outputTokens,
            session.cacheReadTokens,
            session.cacheWriteTokens,
            session.costUsd,
            JSON.stringify(session.modelUsage)
          );

          imported++;
        } catch (e) {
          errors.push(`${session.sessionId}: ${String(e)}`);
        }
      }
    }

    return c.json({
      imported,
      skipped,
      errors: errors.slice(0, 10),
      total_scanned: scanned.reduce((sum, p) => sum + p.sessions.length, 0),
    });
  });

  // ==================== DAILY CALENDAR ====================
  // Returns daily aggregations for calendar view
  app.get('/daily', async (c) => {
    const db = await getDb();
    const days = Math.min(parseInt(c.req.query('days') || '30'), 365);
    const startDate = c.req.query('start'); // YYYY-MM-DD format

    let sql = `
      SELECT * FROM session_daily
      WHERE date >= date('now', '-${days} days')
    `;

    if (startDate) {
      sql = `
        SELECT * FROM session_daily
        WHERE date >= ?
      `;
    }

    sql += ' ORDER BY date DESC';

    const rows = startDate
      ? db.query<SessionDailyRecord>(sql, startDate)
      : db.query<SessionDailyRecord>(sql);

    // Calculate intensity for heatmap (0-4 scale based on cost)
    const maxCost = Math.max(...rows.map(r => r.total_cost_usd), 1);

    const calendar: DailyCalendarItem[] = rows.map(row => ({
      date: row.date,
      sessionCount: row.session_count,
      totalCost: row.total_cost_usd,
      totalDuration: row.total_duration_seconds,
      cliBreakdown: row.cli_breakdown_json ? JSON.parse(row.cli_breakdown_json) : {},
      modelBreakdown: row.model_breakdown_json ? JSON.parse(row.model_breakdown_json) : {},
      intensity: Math.min(4, Math.floor((row.total_cost_usd / maxCost) * 4)),
    }));

    // Calculate summary stats
    const totalCost = rows.reduce((sum, r) => sum + r.total_cost_usd, 0);
    const totalSessions = rows.reduce((sum, r) => sum + r.session_count, 0);
    const avgDailyCost = totalCost / Math.max(rows.length, 1);

    // Trend: compare last 7 days to previous 7 days
    const last7 = rows.slice(0, 7).reduce((sum, r) => sum + r.total_cost_usd, 0);
    const prev7 = rows.slice(7, 14).reduce((sum, r) => sum + r.total_cost_usd, 0);
    const trend = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;

    return c.json({
      calendar,
      summary: {
        totalCost,
        totalSessions,
        avgDailyCost,
        trend: Math.round(trend),
        daysTracked: rows.length,
      },
    });
  });

  // ==================== HISTORY LIST ====================
  // Returns paginated session history
  app.get('/list', async (c) => {
    const db = await getDb();
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const offset = parseInt(c.req.query('offset') || '0');
    const date = c.req.query('date'); // Filter by specific date
    const project = c.req.query('project');
    const cli = c.req.query('cli');

    let conditions: string[] = [];
    let params: unknown[] = [];

    if (date) {
      conditions.push("date(started_at / 1000, 'unixepoch') = ?");
      params.push(date);
    }
    if (project) {
      conditions.push('project_name LIKE ?');
      params.push(`%${project}%`);
    }
    if (cli) {
      conditions.push('cli_type = ?');
      params.push(cli);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const rows = db.query<SessionHistoryRecord>(
      `SELECT * FROM session_history
       ${whereClause}
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      limit,
      offset
    );

    const countResult = db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM session_history ${whereClause}`,
      ...params
    );

    return c.json({
      sessions: rows.map(row => ({
        ...row,
        model_usage: row.model_usage_json ? JSON.parse(row.model_usage_json) : {},
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      })),
      total: countResult?.count || 0,
      limit,
      offset,
    });
  });

  // ==================== SINGLE SESSION ====================
  app.get('/:id', async (c) => {
    const db = await getDb();
    const id = c.req.param('id');

    const row = db.queryOne<SessionHistoryRecord>(
      'SELECT * FROM session_history WHERE id = ? OR session_id = ?',
      id, id
    );

    if (!row) {
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json({
      ...row,
      model_usage: row.model_usage_json ? JSON.parse(row.model_usage_json) : {},
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
    });
  });

  // ==================== RECORD SESSION ====================
  // Called by session-end hook to persist session data
  app.post('/record', async (c) => {
    const db = await getDb();
    const body = await c.req.json();

    const {
      session_id,
      cli_type = 'claude-code',
      llm_model,
      llm_provider = 'anthropic',
      project_path,
      project_name,
      started_at,
      ended_at,
      duration_seconds,
      input_tokens = 0,
      output_tokens = 0,
      cache_read_tokens = 0,
      cache_write_tokens = 0,
      cost_usd = 0,
      model_usage = {},
      metadata = {},
    } = body;

    if (!session_id) {
      return c.json({ error: 'session_id is required' }, 400);
    }

    // Check if already exists
    const existing = db.queryOne<{ id: number }>(
      'SELECT id FROM session_history WHERE session_id = ?',
      session_id
    );

    if (existing) {
      return c.json({ message: 'Session already recorded', id: existing.id });
    }

    const result = db.run(
      `INSERT INTO session_history (
        session_id, cli_type, llm_model, llm_provider,
        project_path, project_name, started_at, ended_at,
        duration_seconds, input_tokens, output_tokens,
        cache_read_tokens, cache_write_tokens, cost_usd,
        model_usage_json, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      session_id,
      cli_type,
      llm_model || 'unknown',
      llm_provider,
      project_path || process.cwd(),
      project_name || project_path?.split('/').pop() || 'unknown',
      started_at || Date.now(),
      ended_at || Date.now(),
      duration_seconds || 0,
      input_tokens,
      output_tokens,
      cache_read_tokens,
      cache_write_tokens,
      cost_usd,
      JSON.stringify(model_usage),
      JSON.stringify(metadata)
    );

    return c.json({
      message: 'Session recorded',
      id: Number(result.lastInsertRowid),
    });
  });

  // ==================== STATS ====================
  app.get('/stats', async (c) => {
    const db = await getDb();

    const totalSessions = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM session_history'
    );

    const totalCost = db.queryOne<{ sum: number }>(
      'SELECT COALESCE(SUM(cost_usd), 0) as sum FROM session_history'
    );

    const todayCost = db.queryOne<{ sum: number }>(
      `SELECT COALESCE(SUM(cost_usd), 0) as sum FROM session_history
       WHERE date(started_at / 1000, 'unixepoch') = date('now')`
    );

    const thisWeekCost = db.queryOne<{ sum: number }>(
      `SELECT COALESCE(SUM(cost_usd), 0) as sum FROM session_history
       WHERE started_at >= strftime('%s', 'now', 'weekday 0', '-7 days') * 1000`
    );

    const thisMonthCost = db.queryOne<{ sum: number }>(
      `SELECT COALESCE(SUM(cost_usd), 0) as sum FROM session_history
       WHERE started_at >= strftime('%s', 'now', 'start of month') * 1000`
    );

    const avgSessionCost = db.queryOne<{ avg: number }>(
      'SELECT COALESCE(AVG(cost_usd), 0) as avg FROM session_history'
    );

    return c.json({
      totalSessions: totalSessions?.count || 0,
      totalCost: totalCost?.sum || 0,
      todayCost: todayCost?.sum || 0,
      thisWeekCost: thisWeekCost?.sum || 0,
      thisMonthCost: thisMonthCost?.sum || 0,
      avgSessionCost: avgSessionCost?.avg || 0,
    });
  });

  return app;
}

export default createSessionsHistoryRoutes;
