/**
 * Nexus API Server
 * v2: FTS5-based search (mgrep-like, local, no cloud)
 */

// Load .env
const envFile = Bun.file('./.env');
if (await envFile.exists()) {
  const content = await envFile.text();
  for (const line of content.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value;
    }
  }
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { join } from 'path';
import { readFileSync } from 'fs';

// Database
import { createDatabase, initHash } from '@nexus/storage';

// Encryption for synthesis API keys
import { decryptApiKey, isEncrypted } from '@nexus/core';

// FTS5 search (BM25 ranking)
import { ftsSearch, formatMgrep, type FtsSearchOptions } from '@nexus/search/dist/fts5.js';

// Ripgrep fallback (for live grep without index)
import { rgSearch } from '@nexus/search/dist/ripgrep.js';

// Semantic search (embeddings)
import {
  initEmbeddings,
  semanticSearch,
  hybridSearch,
} from '@nexus/search/dist/embeddings/index.js';

// LLM Synthesis
import {
  SynthesisService,
  type SynthesisSettings,
} from '@nexus/search/dist/synthesis.js';

// Routes
import healthRoutes from './routes/health.js';
import { createMemoryRoutes } from './routes/memory.js';
import { createPatternsRoutes } from './routes/patterns.js';
import { createProjectRoutes } from './routes/projects.js';
import { createCaptureRoutes } from './routes/capture.js';
import { createContextRoutes } from './routes/context.js';
import { createWatcherRoutes } from './routes/watcher.js';
import { createSettingsRoutes } from './routes/settings.js';
import { createSessionsRoutes } from './routes/sessions.js';
import { createSessionsHistoryRoutes } from './routes/sessions-history.js';
import { createBenchmarkRoutes } from './routes/benchmark.js';
import { createStreamRoutes } from './routes/stream.js';

// Embeddings initialization flag
let embeddingsInitialized = false;

async function ensureEmbeddings() {
  if (!embeddingsInitialized && process.env.MISTRAL_API_KEY) {
    initEmbeddings({
      provider: (process.env.EMBEDDING_PROVIDER as 'mistral' | 'openai' | 'ollama') || 'mistral',
      apiKey: process.env.MISTRAL_API_KEY || process.env.OPENAI_API_KEY,
    });
    embeddingsInitialized = true;
  }
}

// Create Hono app
const app = new Hono();

// Database singleton
let db: Awaited<ReturnType<typeof createDatabase>> | null = null;

async function getDb() {
  if (!db) {
    await initHash();
    // import.meta.dir = apps/api/src/, so we go to parent then nexus.db
    const dbPath = import.meta.dir + '/../nexus.db';
    console.log('[DB] Using database path:', dbPath, 'resolved:', new URL(dbPath, 'file://').pathname);
    db = createDatabase({ path: dbPath, verbose: false });
  }
  return db;
}

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Routes
app.route('/', healthRoutes);
app.route('/memory', createMemoryRoutes(getDb as any));
app.route('/patterns', createPatternsRoutes(getDb as any));
app.route('/projects', createProjectRoutes(getDb as any));
app.route('/capture', createCaptureRoutes(getDb as any));
app.route('/context', createContextRoutes(getDb as any));
app.route('/watcher', createWatcherRoutes(getDb as any));
app.route('/settings', createSettingsRoutes(getDb as any));
app.route('/sessions', createSessionsRoutes(getDb as any));
app.route('/sessions/history', createSessionsHistoryRoutes(getDb as any));
app.route('/benchmark', createBenchmarkRoutes(getDb as any));
app.route('/stream', createStreamRoutes(getDb as any));

// Stats route
app.get('/stats', async (c) => {
  const database = await getDb();
  const fileCount = database.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM files');
  const chunkCount = database.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM chunks');
  const embeddingCount = database.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM embeddings');

  return c.json({
    files: fileCount?.count || 0,
    chunks: chunkCount?.count || 0,
    embeddings: embeddingCount?.count || 0,
    engines: {
      keyword: 'fts5',
      semantic: embeddingsInitialized ? 'mistral' : 'not configured',
    },
  });
});

// Search endpoint - FTS5 with BM25 ranking (mgrep-like)
app.post('/search', async (c) => {
  const database = await getDb();
  const body = await c.req.json();
  const { q, limit = 20, offset = 0, project_id, synthesize = false } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  try {
    const options: FtsSearchOptions = {
      limit: Math.min(limit, 100),
      offset,
      projectId: project_id,
    };

    const result = ftsSearch(database as any, q, options);

    // If synthesize is true, return LLM-synthesized observation
    if (synthesize) {
      // Get synthesis settings from database
      const synthesisSettings = await getSynthesisSettings(database);

      const synthesisService = new SynthesisService(synthesisSettings);
      const searchResults = result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        score: h.score,
      }));

      const synthesisResult = await synthesisService.synthesize(q, searchResults);

      return c.json({
        query: q,
        project_id,
        mode: 'synthesized',
        observation: synthesisResult.observation,
        metadata: {
          synthesisMode: synthesisResult.mode,
          provider: synthesisResult.provider,
          confidence: synthesisResult.confidence,
          totalHits: result.totalHits,
          processingTimeMs: result.processingTimeMs,
          compressionRatio: synthesisResult.compressionRatio,
        },
      });
    }

    // Default: return raw code
    return c.json({
      query: q,
      project_id,
      hits: result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        score: h.score,
        mgrep: formatMgrep(h),  // path:lines [score%]
      })),
      totalHits: result.totalHits,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (e) {
    return c.json({ error: 'Search failed', message: String(e) }, 500);
  }
});

// Search code endpoint - Raw code without synthesis (always returns hits)
app.post('/search/code', async (c) => {
  const database = await getDb();
  const body = await c.req.json();
  const { q, limit = 20, offset = 0, project_id } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  try {
    const options: FtsSearchOptions = {
      limit: Math.min(limit, 100),
      offset,
      projectId: project_id,
    };

    const result = ftsSearch(database as any, q, options);

    return c.json({
      query: q,
      project_id,
      mode: 'raw',
      hits: result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        score: h.score,
        mgrep: formatMgrep(h),
      })),
      totalHits: result.totalHits,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (e) {
    return c.json({ error: 'Search code failed', message: String(e) }, 500);
  }
});

// Live grep endpoint - ripgrep for unindexed search
app.post('/grep', async (c) => {
  const body = await c.req.json();
  const { q, path, limit = 20, glob, regex = false } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  const searchPath = path || join(process.cwd(), 'packages');

  try {
    const result = await rgSearch({
      query: q,
      path: searchPath,
      maxResults: Math.min(limit, 50),
      fileGlob: glob,
      regex,
      contextLines: 2,
    });

    return c.json({
      query: q,
      hits: result.matches.map(m => ({
        path: m.path,
        line: m.lineNumber,
        content: m.content,
      })),
      totalHits: result.totalMatches,
      filesSearched: result.filesSearched,
      processingTimeMs: result.durationMs,
      truncated: result.truncated,
    });
  } catch (e) {
    return c.json({ error: 'Grep failed', message: String(e) }, 500);
  }
});

// Semantic search endpoint - embeddings + cosine similarity
app.post('/search/semantic', async (c) => {
  const database = await getDb();
  await ensureEmbeddings();

  if (!embeddingsInitialized) {
    return c.json({ error: 'Embeddings not configured. Set MISTRAL_API_KEY in .env' }, 503);
  }

  const body = await c.req.json();
  const { q, limit = 10, project_id } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  try {
    const result = await semanticSearch(database as any, q, Math.min(limit, 50), project_id);

    return c.json({
      query: q,
      mode: 'semantic',
      project_id,
      hits: result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        similarity: h.similarity,
        mgrep: `./${h.path}:${h.startLine}-${h.endLine} [${(h.similarity * 100).toFixed(0)}%]`,
      })),
      embeddingTimeMs: result.embeddingTimeMs,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (e) {
    return c.json({ error: 'Semantic search failed', message: String(e) }, 500);
  }
});

// Hybrid search endpoint - semantic + keyword
app.post('/search/hybrid', async (c) => {
  const database = await getDb();
  await ensureEmbeddings();

  if (!embeddingsInitialized) {
    return c.json({ error: 'Embeddings not configured. Set MISTRAL_API_KEY in .env' }, 503);
  }

  const body = await c.req.json();
  const { q, limit = 10, semanticWeight = 0.7, keywordWeight = 0.3, project_id } = body;

  if (!q || typeof q !== 'string') {
    return c.json({ error: 'Missing query parameter "q"' }, 400);
  }

  try {
    const result = await hybridSearch(database as any, q, {
      limit: Math.min(limit, 50),
      semanticWeight,
      keywordWeight,
      projectId: project_id,
    });

    return c.json({
      query: q,
      mode: 'hybrid',
      weights: { semantic: semanticWeight, keyword: keywordWeight },
      project_id,
      hits: result.hits.map(h => ({
        path: h.path,
        startLine: h.startLine,
        endLine: h.endLine,
        content: h.content,
        symbol: h.symbol,
        score: h.similarity,
        mgrep: `./${h.path}:${h.startLine}-${h.endLine} [${(h.similarity * 100).toFixed(0)}%]`,
      })),
      embeddingTimeMs: result.embeddingTimeMs,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (e) {
    return c.json({ error: 'Hybrid search failed', message: String(e) }, 500);
  }
});

// Open file endpoint - read file content
app.post('/open', async (c) => {
  const { path: filePath, startLine, endLine, project_id } = await c.req.json();

  if (!filePath || typeof filePath !== 'string') {
    return c.json({ error: 'Missing file path' }, 400);
  }

  try {
    let fullPath = filePath;

    // Resolve path based on project or fallback logic
    if (!filePath.startsWith('/')) {
      // Get project root from database (most reliable)
      const database = await getDb();

      if (project_id) {
        const project = database.queryOne<{ root_path: string }>(
          'SELECT root_path FROM projects WHERE id = ?',
          project_id
        );
        if (project?.root_path) {
          fullPath = join(project.root_path, filePath);
        }
      }

      // If still relative, try to find the project by path in database
      if (!fullPath.startsWith('/')) {
        // Look for a project that contains this file path
        const projects = database.query<{ root_path: string }>(
          'SELECT root_path FROM projects ORDER BY id DESC'
        );

        // Clean the path (remove ./ prefix)
        const cleanPath = filePath.replace(/^\.\//, '');

        for (const project of projects) {
          const candidatePath = join(project.root_path, cleanPath);
          try {
            readFileSync(candidatePath, 'utf-8');
            fullPath = candidatePath;
            break;
          } catch {
            // Try next project
          }
        }

        // Last fallback: try from monorepo root (2 levels up from apps/api)
        if (!fullPath.startsWith('/')) {
          const monorepoRoot = join(process.cwd(), '..', '..');
          fullPath = join(monorepoRoot, cleanPath);
        }
      }
    }

    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, (startLine || 1) - 1);
    const end = Math.min(lines.length, endLine || lines.length);
    const excerpt = lines.slice(start, end).join('\n');

    return c.json({
      path: filePath,
      startLine: start + 1,
      endLine: end,
      totalLines: lines.length,
      content: excerpt,
    });
  } catch (e) {
    return c.json({ error: 'File not found', message: String(e) }, 404);
  }
});

// Helper: Get synthesis settings from database
async function getSynthesisSettings(db: any): Promise<Partial<SynthesisSettings>> {
  const settings = db.query(`
    SELECT key, value, encrypted FROM settings WHERE category = 'synthesis'
  `) as Array<{ key: string; value: string; encrypted: number }>;

  const config: Partial<SynthesisSettings> = {};

  for (const setting of settings) {
    let value = setting.value;
    if (setting.encrypted === 1 && isEncrypted(value)) {
      try {
        value = decryptApiKey(value);
      } catch {
        // Keep encrypted if decryption fails
        value = '';
      }
    }

    if (setting.key === 'synthesis_mode') config.mode = value as any;
    if (setting.key === 'synthesis_provider') config.provider = value as any;
    if (setting.key === 'synthesis_api_key') config.apiKey = value;
    if (setting.key === 'synthesis_model') config.model = value;
    if (setting.key === 'synthesis_confidence') config.confidence = parseFloat(value);
  }

  return config;
}

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('[API Error]', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Server config
const port = parseInt(process.env.PORT || '3001');

// Init embeddings
await ensureEmbeddings();

// Log endpoints on first load
console.log(`[API] Server running on http://localhost:${port}`);
console.log(`[API] Endpoints:`);
console.log(`  POST /search          - Keyword (FTS5 + BM25)`);
console.log(`  POST /search/semantic - Semantic (embeddings)`);
console.log(`  POST /search/hybrid   - Hybrid (70% sem + 30% kw)`);
console.log(`  POST /grep            - Live grep (ripgrep)`);
console.log(`  POST /open            - Read file content`);
console.log(`  GET  /stats           - Database stats`);
console.log(`  GET  /memory/recall   - Memory index (compact)`);
console.log(`  POST /memory/batch    - Memory batch (full)`);
console.log(`  *    /memory/:id      - Memory CRUD`);
console.log(`  POST /patterns/capture  - Capture candidate`);
console.log(`  POST /patterns/distill  - Distill to pattern`);
console.log(`  GET  /patterns/recall   - Pattern recall (compact)`);
console.log(`  *    /patterns/:id      - Pattern CRUD`);
console.log(`  GET  /projects          - List projects`);
console.log(`  GET  /projects/detect   - Detect project by path`);
console.log(`  *    /projects/:id      - Project CRUD`);
console.log(`  GET  /projects/:id/files - Project files tree`);
console.log(`  POST /capture          - Auto-capture single observation`);
console.log(`  POST /capture/batch    - Auto-capture batch`);
console.log(`  POST /capture/distill  - Trigger LLM distillation`);
console.log(`  GET  /capture/session/:id - Get session observations`);
console.log(`  GET  /capture/queue     - Get pending distillation queue`);
console.log(`  GET  /context/inject   - Context injection for hooks`);
console.log(`  POST /watcher/start    - Start file watcher`);
console.log(`  POST /watcher/stop     - Stop file watcher`);
console.log(`  POST /watcher/pause    - Pause file watcher`);
console.log(`  POST /watcher/resume   - Resume file watcher`);
console.log(`  GET  /watcher/status   - Get watcher status`);
console.log(`  GET  /watcher/queue    - Get queued files`);
console.log(`  GET  /sessions         - CLI sessions (Claude, Codex, Gemini)`);
console.log(`  GET  /sessions/summary - Sessions summary`);
console.log(`  GET  /sessions/history/daily  - Daily calendar view`);
console.log(`  GET  /sessions/history/list   - Paginated history`);
console.log(`  GET  /sessions/history/stats  - Usage statistics`);
console.log(`  POST /sessions/history/import - Import from JSONL`);
console.log(`  POST /sessions/history/record - Record session end`);
console.log(`[API] Semantic search: ${embeddingsInitialized ? 'enabled (Mistral)' : 'disabled (set MISTRAL_API_KEY)'}`);
console.log(`[API] Auto-capture: enabled (hooks compatible)`);
console.log(`[API] File watcher: enabled (chokidar)`);

// Export for Bun.serve with hot reload support
export default {
  port,
  fetch: app.fetch,
};

// Also export app for tests
export { app, port };
