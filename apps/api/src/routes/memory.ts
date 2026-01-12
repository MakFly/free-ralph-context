/**
 * Memory Routes - Sprint 2
 * CRUD + Progressive Disclosure (recall/batch/timeline)
 * Sprint 6: Budget Mode middleware
 */

import { Hono } from 'hono';
import { budgetResponse, type BudgetOptions } from '../middleware/budget.js';

// Types
export interface Memory {
  id: number;
  session_id: string;
  project: string;
  type: 'decision' | 'bugfix' | 'feature' | 'refactor' | 'discovery' | 'change' | 'preference' | 'fact' | 'note';
  scope: 'repo' | 'branch' | 'ticket' | 'feature' | 'global';
  title: string;
  subtitle?: string;
  summary?: string;
  narrative?: string;
  facts_json?: string;
  concepts_json?: string;
  tags_json?: string;
  files_read_json?: string;
  files_modified_json?: string;
  confidence: number;
  prompt_number?: number;
  discovery_tokens: number;
  created_at: number;
}

export interface MemoryCompact {
  id: number;
  summary: string;
  type: string;
  scope: string;
  confidence: number;
  score?: number;
  created_at: number;
}

export interface MemoryLink {
  id: number;
  observation_id: number;
  file_id?: number;
  chunk_id?: number;
  link_type: 'reference' | 'origin' | 'example';
  path?: string;
  start_line?: number;
  end_line?: number;
  created_at: number;
}

type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

export function createMemoryRoutes(getDb: () => Promise<Database>) {
  const app = new Hono();

  // ==================== RECALL (Progressive Disclosure Step 1) ====================
  // Returns compact index (~50 tokens/item)
  // Sprint 6: Budget Mode support via ?maxTokens=1000&compact=true
  app.get('/recall', async (c) => {
    const db = await getDb();
    const q = c.req.query('q');
    const type = c.req.query('type');
    const scope = c.req.query('scope');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    // Budget options from query params
    const budgetOptions: BudgetOptions = {
      maxTokens: c.req.query('maxTokens') ? parseInt(c.req.query('maxTokens')!) : undefined,
      compact: c.req.query('compact') === 'true',
      estimateOnly: c.req.query('estimateOnly') === 'true',
    };

    let sql: string;
    let params: unknown[];

    if (q) {
      // FTS search
      sql = `
        SELECT
          o.id,
          COALESCE(o.summary, SUBSTR(o.title, 1, 50)) as summary,
          o.type,
          o.scope,
          o.confidence,
          o.created_at,
          bm25(observations_fts) as score
        FROM observations_fts
        JOIN observations o ON o.id = observations_fts.rowid
        WHERE observations_fts MATCH ?
        ${type ? 'AND o.type = ?' : ''}
        ${scope ? 'AND o.scope = ?' : ''}
        ORDER BY score
        LIMIT ? OFFSET ?
      `;
      params = [q];
      if (type) params.push(type);
      if (scope) params.push(scope);
      params.push(limit, offset);
    } else {
      // List all (recent first)
      sql = `
        SELECT
          id,
          COALESCE(summary, SUBSTR(title, 1, 50)) as summary,
          type,
          scope,
          confidence,
          created_at,
          NULL as score
        FROM observations
        WHERE 1=1
        ${type ? 'AND type = ?' : ''}
        ${scope ? 'AND scope = ?' : ''}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [];
      if (type) params.push(type);
      if (scope) params.push(scope);
      params.push(limit, offset);
    }

    const memories = db.query<MemoryCompact>(sql, ...params);
    const countSql = `SELECT COUNT(*) as total FROM observations WHERE 1=1 ${type ? 'AND type = ?' : ''} ${scope ? 'AND scope = ?' : ''}`;
    const countParams: unknown[] = [];
    if (type) countParams.push(type);
    if (scope) countParams.push(scope);
    const total = db.queryOne<{ total: number }>(countSql, ...countParams);

    // Apply budget mode
    return budgetResponse(c, {
      memories,
      total: total?.total || 0,
      limit,
      offset,
    }, budgetOptions);
  });

  // ==================== BATCH (Progressive Disclosure Step 2) ====================
  // Returns full content for specific IDs (~500 tokens/item)
  // Sprint 6: Budget Mode support via ?maxTokens=5000&compact=true
  app.post('/batch', async (c) => {
    const db = await getDb();
    const { ids } = await c.req.json<{ ids: number[] }>();

    // Budget options from query params
    const budgetOptions: BudgetOptions = {
      maxTokens: c.req.query('maxTokens') ? parseInt(c.req.query('maxTokens')!) : undefined,
      compact: c.req.query('compact') === 'true',
      estimateOnly: c.req.query('estimateOnly') === 'true',
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Missing or invalid ids array' }, 400);
    }

    // Limit batch size
    const safeIds = ids.slice(0, 50);
    const placeholders = safeIds.map(() => '?').join(',');

    const memories = db.query<Memory>(
      `SELECT * FROM observations WHERE id IN (${placeholders})`,
      ...safeIds
    );

    // Get links for these memories
    const links = db.query<MemoryLink & { path?: string; start_line?: number; end_line?: number }>(
      `SELECT
        ml.*,
        f.path,
        c.start_line,
        c.end_line
      FROM memory_links ml
      LEFT JOIN files f ON ml.file_id = f.id
      LEFT JOIN chunks c ON ml.chunk_id = c.id
      WHERE ml.observation_id IN (${placeholders})`,
      ...safeIds
    );

    // Group links by observation_id
    const linksByMemory = new Map<number, typeof links>();
    for (const link of links) {
      const existing = linksByMemory.get(link.observation_id) || [];
      existing.push(link);
      linksByMemory.set(link.observation_id, existing);
    }

    // Attach links to memories
    const memoriesWithLinks = memories.map(m => ({
      ...m,
      facts: m.facts_json ? JSON.parse(m.facts_json) : [],
      concepts: m.concepts_json ? JSON.parse(m.concepts_json) : [],
      tags: m.tags_json ? JSON.parse(m.tags_json) : [],
      files_read: m.files_read_json ? JSON.parse(m.files_read_json) : [],
      files_modified: m.files_modified_json ? JSON.parse(m.files_modified_json) : [],
      links: linksByMemory.get(m.id) || [],
    }));

    // Apply budget mode
    return budgetResponse(c, { memories: memoriesWithLinks }, budgetOptions);
  });

  // ==================== TIMELINE (Progressive Disclosure Step 3) ====================
  // Returns memories around a specific one for context
  app.get('/:id/timeline', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));
    const window = Math.min(parseInt(c.req.query('window') || '5'), 20);

    // Get the target memory's created_at
    const target = db.queryOne<{ created_at: number; session_id: string }>(
      'SELECT created_at, session_id FROM observations WHERE id = ?',
      id
    );

    if (!target) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    // Get memories before and after (same session preferred)
    const before = db.query<MemoryCompact>(
      `SELECT
        id,
        COALESCE(summary, SUBSTR(title, 1, 50)) as summary,
        type,
        scope,
        confidence,
        created_at
      FROM observations
      WHERE created_at < ? AND session_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
      target.created_at,
      target.session_id,
      window
    );

    const after = db.query<MemoryCompact>(
      `SELECT
        id,
        COALESCE(summary, SUBSTR(title, 1, 50)) as summary,
        type,
        scope,
        confidence,
        created_at
      FROM observations
      WHERE created_at > ? AND session_id = ?
      ORDER BY created_at ASC
      LIMIT ?`,
      target.created_at,
      target.session_id,
      window
    );

    return c.json({
      target_id: id,
      session_id: target.session_id,
      before: before.reverse(),
      after,
    });
  });

  // ==================== GET SINGLE ====================
  app.get('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const memory = db.queryOne<Memory>(
      'SELECT * FROM observations WHERE id = ?',
      id
    );

    if (!memory) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    // Get links
    const links = db.query<MemoryLink & { path?: string; start_line?: number; end_line?: number }>(
      `SELECT
        ml.*,
        f.path,
        c.start_line,
        c.end_line
      FROM memory_links ml
      LEFT JOIN files f ON ml.file_id = f.id
      LEFT JOIN chunks c ON ml.chunk_id = c.id
      WHERE ml.observation_id = ?`,
      id
    );

    return c.json({
      ...memory,
      facts: memory.facts_json ? JSON.parse(memory.facts_json) : [],
      concepts: memory.concepts_json ? JSON.parse(memory.concepts_json) : [],
      tags: memory.tags_json ? JSON.parse(memory.tags_json) : [],
      files_read: memory.files_read_json ? JSON.parse(memory.files_read_json) : [],
      files_modified: memory.files_modified_json ? JSON.parse(memory.files_modified_json) : [],
      links,
    });
  });

  // ==================== CREATE ====================
  app.post('/', async (c) => {
    const db = await getDb();
    const body = await c.req.json();

    const {
      session_id,
      project,
      type,
      scope = 'repo',
      title,
      subtitle,
      summary,
      narrative,
      facts = [],
      concepts = [],
      tags = [],
      files_read = [],
      files_modified = [],
      confidence = 0.8,
      prompt_number,
      discovery_tokens = 0,
    } = body;

    // Validation
    if (!session_id || !project || !type || !title) {
      return c.json({ error: 'Missing required fields: session_id, project, type, title' }, 400);
    }

    const validTypes = ['decision', 'bugfix', 'feature', 'refactor', 'discovery', 'change', 'preference', 'fact', 'note'];
    if (!validTypes.includes(type)) {
      return c.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, 400);
    }

    const validScopes = ['repo', 'branch', 'ticket', 'feature', 'global'];
    if (!validScopes.includes(scope)) {
      return c.json({ error: `Invalid scope. Must be one of: ${validScopes.join(', ')}` }, 400);
    }

    const result = db.run(
      `INSERT INTO observations (
        session_id, project, type, scope, title, subtitle, summary, narrative,
        facts_json, concepts_json, tags_json, files_read_json, files_modified_json,
        confidence, prompt_number, discovery_tokens, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      session_id,
      project,
      type,
      scope,
      title,
      subtitle || null,
      summary || title.substring(0, 50),
      narrative || null,
      JSON.stringify(facts),
      JSON.stringify(concepts),
      JSON.stringify(tags),
      JSON.stringify(files_read),
      JSON.stringify(files_modified),
      confidence,
      prompt_number || null,
      discovery_tokens,
      Date.now()
    );

    return c.json({ id: result.lastInsertRowid, created: true }, 201);
  });

  // ==================== UPDATE ====================
  app.patch('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check exists
    const exists = db.queryOne<{ id: number }>('SELECT id FROM observations WHERE id = ?', id);
    if (!exists) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    // Build update dynamically
    const updates: string[] = [];
    const values: unknown[] = [];

    const fields = ['type', 'scope', 'title', 'subtitle', 'summary', 'narrative', 'confidence', 'prompt_number', 'discovery_tokens'];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    const jsonFields = ['facts', 'concepts', 'tags', 'files_read', 'files_modified'];
    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        updates.push(`${field}_json = ?`);
        values.push(JSON.stringify(body[field]));
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    values.push(id);
    db.run(`UPDATE observations SET ${updates.join(', ')} WHERE id = ?`, ...values);

    return c.json({ id, updated: true });
  });

  // ==================== DELETE ====================
  app.delete('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const result = db.run('DELETE FROM observations WHERE id = ?', id);

    if (result.changes === 0) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    return c.json({ id, deleted: true });
  });

  // ==================== LINK MANAGEMENT ====================

  // Add link
  app.post('/:id/links', async (c) => {
    const db = await getDb();
    const observation_id = parseInt(c.req.param('id'));
    const { file_id, chunk_id, link_type = 'reference' } = await c.req.json();

    // Validate observation exists
    const exists = db.queryOne<{ id: number }>('SELECT id FROM observations WHERE id = ?', observation_id);
    if (!exists) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    if (!file_id && !chunk_id) {
      return c.json({ error: 'Must provide file_id or chunk_id' }, 400);
    }

    const result = db.run(
      `INSERT INTO memory_links (observation_id, file_id, chunk_id, link_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      observation_id,
      file_id || null,
      chunk_id || null,
      link_type,
      Date.now()
    );

    return c.json({ id: result.lastInsertRowid, created: true }, 201);
  });

  // Remove link
  app.delete('/:id/links/:linkId', async (c) => {
    const db = await getDb();
    const linkId = parseInt(c.req.param('linkId'));

    const result = db.run('DELETE FROM memory_links WHERE id = ?', linkId);

    if (result.changes === 0) {
      return c.json({ error: 'Link not found' }, 404);
    }

    return c.json({ id: linkId, deleted: true });
  });

  // Get links for a memory
  app.get('/:id/links', async (c) => {
    const db = await getDb();
    const observation_id = parseInt(c.req.param('id'));

    const links = db.query<MemoryLink & { path?: string; start_line?: number; end_line?: number; content?: string }>(
      `SELECT
        ml.*,
        f.path,
        c.start_line,
        c.end_line,
        c.content
      FROM memory_links ml
      LEFT JOIN files f ON ml.file_id = f.id
      LEFT JOIN chunks c ON ml.chunk_id = c.id
      WHERE ml.observation_id = ?`,
      observation_id
    );

    return c.json({ links });
  });

  // ==================== AUTO-CREATE DISABLED ====================
  app.post('/auto-create', async (c) => {
    return c.json({
      error: 'Auto-create disabled',
      message: 'Memory auto-creation has been removed'
    }, 410);
  });

  return app;
}
