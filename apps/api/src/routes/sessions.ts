/**
 * Sessions Routes - CLI Session Detection
 * Detects ACTIVE sessions from Claude Code, Codex, Gemini
 * Uses process detection + config enrichment
 */

import { Hono } from 'hono';
import { readFile, readdir, readlink } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Types
export type CliType = 'claude-code' | 'codex' | 'gemini' | 'unknown';
export type SessionStatus = 'active' | 'idle' | 'ended';

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  costUSD: number;
}

export interface CliSession {
  id: string;
  cli_type: CliType;
  llm_model: string;
  llm_provider: string;
  project_path: string;
  project_name: string;
  git_branch?: string;
  status: SessionStatus;
  started_at: number;
  last_activity_at: number;
  duration_seconds: number;
  tokens_used: number;
  cost_usd: number;
  model_usage: Record<string, ModelUsage>;
  config_source: string;
  pid?: number;
  tty?: string;
}

export interface SessionsSummary {
  total: number;
  active: number;
  by_cli: Record<CliType, number>;
  by_model: Record<string, number>;
  total_cost: number;
}

export interface SessionsResponse {
  sessions: CliSession[];
  summary: SessionsSummary;
  last_updated: number;
  ccs_current?: string;
}

// Helper: Read JSON file safely
async function readJsonSafe<T>(path: string): Promise<T | null> {
  try {
    if (!existsSync(path)) return null;
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// Anthropic pricing per million tokens (as of Jan 2026)
// Cache read = 10% of input price (90% discount)
// Cache creation is NOT counted in displayed cost (matches Claude Code behavior)
const ANTHROPIC_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-4-5-20251101': { input: 15, output: 75, cacheRead: 1.50 },
  'opus-4.5': { input: 15, output: 75, cacheRead: 1.50 },
  'claude-sonnet-4-20250514': { input: 3, output: 15, cacheRead: 0.30 },
  'sonnet-4': { input: 3, output: 15, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4, cacheRead: 0.08 },
  'haiku-4.5': { input: 0.80, output: 4, cacheRead: 0.08 },
};

// Calculate cost from tokens using pricing table
// Note: Cache creation is NOT counted (matches Claude Code behavior)
function calculateCostFromTokens(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0
): number {
  const pricing = ANTHROPIC_PRICING[modelId] || ANTHROPIC_PRICING['opus-4.5'];
  const cost =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output +
    (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  return cost;
}

// Parse session .jsonl file to extract usage data
// processStartTime: optional timestamp to match session start with process start
async function parseSessionJsonl(projectPath: string, processStartTime?: number): Promise<{
  sessionId: string | null;
  modelUsage: Record<string, ModelUsage>;
  totalCost: number;
  totalTokens: number;
} | null> {
  const home = homedir();

  // Convert project path to Claude's project folder name format
  // /home/kev/Documents/lab/brainstorming/nexus -> -home-kev-Documents-lab-brainstorming-nexus
  const projectFolderName = projectPath.replace(/\//g, '-').replace(/^-/, '-');
  const projectsDir = join(home, '.claude', 'projects', projectFolderName);

  if (!existsSync(projectsDir)) return null;

  try {
    const files = await readdir(projectsDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    if (jsonlFiles.length === 0) return null;

    // Get file stats and first timestamp for each session
    const sessionInfos = await Promise.all(
      jsonlFiles.map(async (f) => {
        const filepath = join(projectsDir, f);
        const stat = await Bun.file(filepath).stat();

        // Read first few lines to get session start timestamp
        let firstTimestamp: number | null = null;
        try {
          const content = await readFile(filepath, 'utf-8');
          const lines = content.split('\n').slice(0, 5);
          for (const line of lines) {
            if (!line) continue;
            const entry = JSON.parse(line);
            if (entry.timestamp) {
              firstTimestamp = new Date(entry.timestamp).getTime();
              break;
            }
          }
        } catch { /* ignore */ }

        return {
          name: f,
          mtime: stat?.mtime?.getTime() || 0,
          path: filepath,
          startTime: firstTimestamp,
        };
      })
    );

    // Find matching session based on process start time
    let targetSession = sessionInfos[0];

    if (processStartTime) {
      // Find session that started closest to (but before or at) process start time
      // Allow 5 minute tolerance for session creation before process fully starts
      const tolerance = 5 * 60 * 1000; // 5 minutes

      const candidates = sessionInfos
        .filter(s => s.startTime && s.startTime <= processStartTime + tolerance)
        .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

      if (candidates.length > 0) {
        targetSession = candidates[0];
      }
    } else {
      // Fallback: use most recently modified
      sessionInfos.sort((a, b) => b.mtime - a.mtime);
      targetSession = sessionInfos[0];
    }

    // Parse the jsonl file
    const content = await readFile(targetSession.path, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    const modelUsage: Record<string, ModelUsage> = {};
    let sessionId: string | null = null;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Extract session ID
        if (entry.sessionId && !sessionId) {
          sessionId = entry.sessionId;
        }

        // Extract usage from assistant messages
        if (entry.type === 'assistant' && entry.message?.usage) {
          const usage = entry.message.usage;
          const modelId = entry.message.model || 'claude-opus-4-5-20251101';

          if (!modelUsage[modelId]) {
            modelUsage[modelId] = {
              inputTokens: 0,
              outputTokens: 0,
              cacheReadInputTokens: 0,
              cacheCreationInputTokens: 0,
              costUSD: 0,
            };
          }

          const m = modelUsage[modelId];
          m.inputTokens += usage.input_tokens || 0;
          m.outputTokens += usage.output_tokens || 0;
          m.cacheReadInputTokens = (m.cacheReadInputTokens || 0) + (usage.cache_read_input_tokens || 0);
          m.cacheCreationInputTokens = (m.cacheCreationInputTokens || 0) + (usage.cache_creation_input_tokens || 0);
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Calculate costs for each model
    let totalCost = 0;
    let totalTokens = 0;

    for (const [modelId, usage] of Object.entries(modelUsage)) {
      usage.costUSD = calculateCostFromTokens(
        modelId,
        usage.inputTokens,
        usage.outputTokens,
        usage.cacheReadInputTokens || 0
      );
      totalCost += usage.costUSD;
      totalTokens += usage.inputTokens + usage.outputTokens;
    }

    return { sessionId, modelUsage, totalCost, totalTokens };
  } catch {
    return null;
  }
}

// Helper: Detect main model from usage
function detectMainModel(modelUsage: Record<string, ModelUsage> | undefined): string {
  if (!modelUsage) return 'unknown';

  let maxCost = 0;
  let mainModel = 'unknown';

  for (const [model, usage] of Object.entries(modelUsage)) {
    if (usage.costUSD > maxCost) {
      maxCost = usage.costUSD;
      mainModel = model;
    }
  }

  // Normalize model names
  if (mainModel.includes('opus')) return 'opus-4.5';
  if (mainModel.includes('sonnet')) return 'sonnet-4';
  if (mainModel.includes('haiku')) return 'haiku-4.5';
  if (mainModel.includes('glm')) return mainModel;
  if (mainModel.includes('gpt')) return mainModel;

  return mainModel;
}

// Helper: Detect provider from model
function detectProvider(model: string): string {
  if (model.includes('claude') || model.includes('opus') || model.includes('sonnet') || model.includes('haiku')) {
    return 'anthropic';
  }
  if (model.includes('glm')) return 'zhipu';
  if (model.includes('gpt') || model.includes('codex')) return 'openai';
  if (model.includes('gemini')) return 'google';
  return 'unknown';
}

// Helper: Calculate total tokens from usage
function calculateTotalTokens(modelUsage: Record<string, ModelUsage> | undefined): number {
  if (!modelUsage) return 0;
  return Object.values(modelUsage).reduce(
    (sum, usage) => sum + usage.inputTokens + usage.outputTokens,
    0
  );
}

// CCS Config type
interface CcsConfig {
  current: string;
  providers: Record<string, {
    name: string;
    configDir: string;
    env?: {
      ANTHROPIC_MODEL?: string;
    };
  }>;
}

// Claude Config type
interface ClaudeConfig {
  projects?: Record<string, {
    lastSessionId?: string;
    lastCost?: number;
    lastDuration?: number;
    lastModelUsage?: Record<string, ModelUsage>;
    lastTotalInputTokens?: number;
    lastTotalOutputTokens?: number;
  }>;
}

// Process info from ps
interface ProcessInfo {
  pid: number;
  tty: string;
  cmd: string;
  cwd?: string;
  startTime?: number;
  envModel?: string;      // ANTHROPIC_MODEL from env
  envBaseUrl?: string;    // ANTHROPIC_BASE_URL from env
  isGlm?: boolean;        // Detected as GLM provider
}

// Detect active CLI processes
async function detectActiveProcesses(): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = [];

  try {
    // Get all claude/codex/gemini processes
    const { stdout } = await execAsync(
      'ps aux | grep -E "^[^ ]+ +[0-9]+ .*(claude|codex|gemini)" | grep -v grep'
    );

    const lines = stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      // Parse ps output: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
      const parts = line.split(/\s+/);
      if (parts.length < 11) continue;

      const pid = parseInt(parts[1]);
      const tty = parts[6];
      const cmd = parts.slice(10).join(' ');

      // Skip non-terminal processes (background services)
      if (tty === '?' || !tty.startsWith('pts/')) continue;

      // Determine CLI type from command
      let cliType: 'claude' | 'codex' | 'gemini' | null = null;
      if (cmd.includes('claude') && !cmd.includes('codex')) {
        cliType = 'claude';
      } else if (cmd.includes('codex')) {
        cliType = 'codex';
      } else if (cmd.includes('gemini')) {
        cliType = 'gemini';
      }

      if (!cliType) continue;

      // Get cwd from /proc
      let cwd: string | undefined;
      try {
        cwd = await readlink(`/proc/${pid}/cwd`);
      } catch {
        // Process might have ended
      }

      // Get start time from /proc/[pid]/stat
      let startTime: number | undefined;
      try {
        const stat = await readFile(`/proc/${pid}/stat`, 'utf-8');
        const statParts = stat.split(' ');
        // Field 22 is starttime in clock ticks since boot
        const startTicks = parseInt(statParts[21]);
        // Get system boot time
        const uptime = await readFile('/proc/uptime', 'utf-8');
        const uptimeSeconds = parseFloat(uptime.split(' ')[0]);
        const bootTime = Date.now() - (uptimeSeconds * 1000);
        // Clock ticks per second (usually 100)
        const ticksPerSecond = 100;
        startTime = bootTime + (startTicks / ticksPerSecond) * 1000;
      } catch {
        startTime = Date.now();
      }

      // Read environment variables from /proc/[pid]/environ
      let envModel: string | undefined;
      let envBaseUrl: string | undefined;
      let isGlm = false;
      try {
        const environ = await readFile(`/proc/${pid}/environ`, 'utf-8');
        const envVars = environ.split('\0');
        for (const envVar of envVars) {
          if (envVar.startsWith('ANTHROPIC_MODEL=')) {
            envModel = envVar.split('=')[1];
          }
          if (envVar.startsWith('ANTHROPIC_BASE_URL=')) {
            envBaseUrl = envVar.split('=')[1];
            // If base URL contains z.ai, it's GLM
            if (envBaseUrl.includes('z.ai')) {
              isGlm = true;
            }
          }
        }
      } catch {
        // Can't read environ (permission denied or process ended)
      }

      processes.push({
        pid,
        tty,
        cmd,
        cwd,
        startTime,
        envModel,
        envBaseUrl,
        isGlm,
      });
    }
  } catch {
    // No processes found or ps failed
  }

  return processes;
}

// Main detection function
async function detectSessions(): Promise<SessionsResponse> {
  const sessions: CliSession[] = [];
  const home = homedir();

  // 1. Read CCS config for current provider
  const ccsConfig = await readJsonSafe<CcsConfig>(join(home, '.ccs/config.json'));
  const currentCcsProvider = ccsConfig?.current;

  // 2. Detect ACTIVE processes first
  const activeProcesses = await detectActiveProcesses();

  // 3. Load Claude configs for enrichment
  const claudeConfigs: Map<string, { config: ClaudeConfig; source: string }> = new Map();
  const claudeDirs = ['.claude', '.claude-glm'];

  for (const dir of claudeDirs) {
    const configPath = join(home, dir, '.claude.json');
    const config = await readJsonSafe<ClaudeConfig>(configPath);
    if (config) {
      claudeConfigs.set(dir, { config, source: `~/${dir}/.claude.json` });
    }
  }

  // 4. Match active processes with config data
  for (const proc of activeProcesses) {
    // Determine if this process is using GLM based on its environment
    // No ANTHROPIC_MODEL and no ANTHROPIC_BASE_URL = Anthropic OAuth (opus)
    const isProcessGlm = proc.isGlm || proc.envModel?.includes('glm');
    const isAnthropicOAuth = !proc.envModel && !proc.envBaseUrl;

    // For Anthropic OAuth, the default model is opus-4.5
    // For GLM, the model comes from env or CCS config
    let llmModel = 'unknown';
    if (proc.envModel) {
      llmModel = proc.envModel;
    } else if (isAnthropicOAuth) {
      // Anthropic OAuth default is opus-4.5
      llmModel = 'opus-4.5';
    } else if (isProcessGlm && ccsConfig?.providers?.glm?.env?.ANTHROPIC_MODEL) {
      llmModel = ccsConfig.providers.glm.env.ANTHROPIC_MODEL;
    }

    // Choose config dir based on process type
    const configDir = isProcessGlm ? '.claude-glm' : '.claude';
    const configData = claudeConfigs.get(configDir);

    // Also try the other config if no match found
    const altConfigDir = isProcessGlm ? '.claude' : '.claude-glm';
    const altConfigData = claudeConfigs.get(altConfigDir);

    let projectData: {
      lastSessionId?: string;
      lastCost?: number;
      lastDuration?: number;
      lastModelUsage?: Record<string, ModelUsage>;
    } | undefined;

    // Find matching project by cwd - try primary config first, then alternate
    if (proc.cwd) {
      projectData = configData?.config.projects?.[proc.cwd];
      if (!projectData || !projectData.lastSessionId) {
        projectData = altConfigData?.config.projects?.[proc.cwd];
      }
    }

    const projectName = proc.cwd?.split('/').pop() || 'unknown';

    // If we still don't have a model, try from project config
    if (llmModel === 'unknown' && projectData?.lastModelUsage) {
      llmModel = detectMainModel(projectData.lastModelUsage);
    }

    // Final fallback
    if (llmModel === 'unknown') {
      llmModel = proc.cmd.includes('codex') ? 'gpt-5.2-codex' : 'opus-4.5';
    }

    const durationMs = Date.now() - (proc.startTime || Date.now());
    let configSource = projectData?.lastSessionId
      ? (isProcessGlm ? '~/.claude-glm/.claude.json' : '~/.claude/.claude.json')
      : 'process (live)';

    // For cost: each session writes to its own config
    // GLM sessions -> ~/.claude-glm/.claude.json
    // Anthropic OAuth sessions -> parse .jsonl files directly
    // Cost displayed is from the CURRENT session
    let cost = 0;
    let tokens = 0;
    let modelUsage: Record<string, ModelUsage> = {};
    let sessionId = projectData?.lastSessionId;

    // Find project data from the correct config based on process type
    let matchingProjectData: typeof projectData = undefined;

    if (proc.cwd) {
      if (isProcessGlm) {
        // GLM process -> data in .claude-glm config
        matchingProjectData = claudeConfigs.get('.claude-glm')?.config.projects?.[proc.cwd];
      } else {
        // Anthropic OAuth process -> data in .claude config (legacy, may not exist)
        matchingProjectData = claudeConfigs.get('.claude')?.config.projects?.[proc.cwd];
      }
    }

    // Use lastCost directly if available (GLM stores this)
    if (matchingProjectData?.lastCost) {
      cost = matchingProjectData.lastCost;
    }

    // Include all model usage from this session if available
    if (matchingProjectData?.lastModelUsage) {
      modelUsage = matchingProjectData.lastModelUsage;
      tokens = calculateTotalTokens(modelUsage);
    }

    // FALLBACK for Anthropic OAuth: Parse .jsonl files directly
    // This is needed because Claude Code official doesn't store lastCost in .claude.json
    if (isAnthropicOAuth && cost === 0 && proc.cwd) {
      const jsonlData = await parseSessionJsonl(proc.cwd, proc.startTime);
      if (jsonlData) {
        cost = jsonlData.totalCost;
        tokens = jsonlData.totalTokens;
        modelUsage = jsonlData.modelUsage;
        configSource = '~/.claude/projects/*.jsonl';
        if (jsonlData.sessionId) {
          sessionId = jsonlData.sessionId;
        }
      }
    }

    sessions.push({
      id: sessionId || `active-${proc.pid}`,
      cli_type: proc.cmd.includes('codex') ? 'codex' : proc.cmd.includes('gemini') ? 'gemini' : 'claude-code',
      llm_model: llmModel,
      llm_provider: detectProvider(llmModel),
      project_path: proc.cwd || home,
      project_name: projectName,
      status: 'active',
      started_at: proc.startTime || Date.now(),
      last_activity_at: Date.now(),
      duration_seconds: Math.round(durationMs / 1000),
      tokens_used: tokens,
      cost_usd: cost,
      model_usage: modelUsage,
      config_source: configSource,
      pid: proc.pid,
      tty: proc.tty,
    });
  }

  // 5. Detect Codex from Cursor (background processes)
  try {
    const { stdout } = await execAsync(
      'ps aux | grep codex | grep app-server | grep -v grep'
    );
    const lines = stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/\s+/);
      const pid = parseInt(parts[1]);

      // Check if not already added
      if (!sessions.some(s => s.pid === pid)) {
        sessions.push({
          id: `codex-cursor-${pid}`,
          cli_type: 'codex',
          llm_model: 'gpt-5.2-codex',
          llm_provider: 'openai',
          project_path: home,
          project_name: 'Cursor (background)',
          status: 'active',
          started_at: Date.now(),
          last_activity_at: Date.now(),
          duration_seconds: 0,
          tokens_used: 0,
          cost_usd: 0,
          model_usage: {},
          config_source: 'cursor-extension',
          pid,
          tty: 'background',
        });
      }
    }
  } catch {
    // No Cursor codex processes
  }

  // Compute summary
  const summary: SessionsSummary = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    by_cli: {
      'claude-code': sessions.filter(s => s.cli_type === 'claude-code').length,
      'codex': sessions.filter(s => s.cli_type === 'codex').length,
      'gemini': sessions.filter(s => s.cli_type === 'gemini').length,
      'unknown': sessions.filter(s => s.cli_type === 'unknown').length,
    },
    by_model: sessions.reduce((acc, s) => {
      acc[s.llm_model] = (acc[s.llm_model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    total_cost: sessions.reduce((sum, s) => sum + s.cost_usd, 0),
  };

  return {
    sessions: sessions.sort((a, b) => b.cost_usd - a.cost_usd),
    summary,
    last_updated: Date.now(),
    ccs_current: currentCcsProvider,
  };
}

// Database type
type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

// Create routes - accepts optional getDb for database operations
export function createSessionsRoutes(getDb?: () => Promise<Database>) {
  const app = new Hono();

  // GET /sessions - List all detected sessions
  app.get('/', async (c) => {
    try {
      const result = await detectSessions();
      return c.json(result);
    } catch (e) {
      return c.json({ error: 'Failed to detect sessions', message: String(e) }, 500);
    }
  });

  // GET /sessions/summary - Just the summary
  app.get('/summary', async (c) => {
    try {
      const result = await detectSessions();
      return c.json(result.summary);
    } catch (e) {
      return c.json({ error: 'Failed to get summary', message: String(e) }, 500);
    }
  });

  // POST /sessions/init - Initialize session in database (called by hooks)
  app.post('/init', async (c) => {
    if (!getDb) {
      return c.json({ error: 'Database not configured' }, 503);
    }

    try {
      const db = await getDb();
      const { session_id, project, cwd, first_prompt, started_at } = await c.req.json();

      if (!session_id) {
        return c.json({ error: 'Missing session_id' }, 400);
      }

      // Check if session already exists
      const existing = db.queryOne<{ id: number }>(
        'SELECT id FROM sessions WHERE session_id = ?',
        session_id
      );

      if (existing) {
        return c.json({ ok: true, id: existing.id, existed: true });
      }

      // Store additional data in metadata JSON
      const metadata = JSON.stringify({
        project: project || 'unknown',
        cwd: cwd || process.cwd(),
        first_prompt: first_prompt || null,
      });

      // Insert new session using existing table schema
      const result = db.run(
        `INSERT INTO sessions (session_id, started_at, metadata)
         VALUES (?, ?, ?)`,
        session_id,
        started_at || Date.now(),
        metadata
      );

      return c.json({ ok: true, id: result.lastInsertRowid, created: true }, 201);
    } catch (e) {
      return c.json({ error: 'Failed to init session', message: String(e) }, 500);
    }
  });

  // POST /sessions/summarize - Generate and save session summary (called by hooks)
  app.post('/summarize', async (c) => {
    if (!getDb) {
      return c.json({ error: 'Database not configured' }, 503);
    }

    try {
      const db = await getDb();
      const { session_id, project, stop_reason, last_message, ended_at } = await c.req.json();

      if (!session_id) {
        return c.json({ error: 'Missing session_id' }, 400);
      }

      // Get all observations from this session
      const observations = db.query<{ type: string; title: string; summary?: string }>(
        `SELECT type, title, summary FROM observations
         WHERE session_id = ?
         ORDER BY created_at ASC`,
        session_id
      );

      // Generate algorithmic summary (no LLM required)
      const typeCounts: Record<string, number> = {};
      const titles: string[] = [];

      for (const obs of observations) {
        typeCounts[obs.type] = (typeCounts[obs.type] || 0) + 1;
        if (titles.length < 5) {
          titles.push(obs.summary || obs.title);
        }
      }

      const typesSummary = Object.entries(typeCounts)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');

      const summary = {
        request: `Session with ${observations.length} observations`,
        investigated: typesSummary || 'Nothing captured',
        learned: titles.slice(0, 3).join('; ') || 'No learnings captured',
        completed: last_message?.substring(0, 200) || 'Session ended',
      };

      // Update session record with ended_at and metadata
      const existingSession = db.queryOne<{ metadata: string }>(
        'SELECT metadata FROM sessions WHERE session_id = ?',
        session_id
      );

      let metadata: Record<string, unknown> = {};
      if (existingSession?.metadata) {
        try {
          metadata = JSON.parse(existingSession.metadata);
        } catch { /* ignore */ }
      }
      metadata.stop_reason = stop_reason || 'unknown';
      metadata.summary = summary;

      db.run(
        `UPDATE sessions SET ended_at = ?, metadata = ? WHERE session_id = ?`,
        ended_at || Date.now(),
        JSON.stringify(metadata),
        session_id
      );

      // Insert summary into session_summaries
      const result = db.run(
        `INSERT INTO session_summaries (session_id, project, request, investigated, learned, completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        session_id,
        project || 'unknown',
        summary.request,
        summary.investigated,
        summary.learned,
        summary.completed,
        Date.now()
      );

      return c.json({
        ok: true,
        id: result.lastInsertRowid,
        summary,
        observations_count: observations.length,
      });
    } catch (e) {
      return c.json({ error: 'Failed to summarize session', message: String(e) }, 500);
    }
  });

  return app;
}

export default createSessionsRoutes;
