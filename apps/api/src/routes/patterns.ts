/**
 * Patterns Routes - Sprint 3 Learning Core
 * Capture, Distill, CRUD, Recall (Progressive Disclosure)
 * Sprint 6: Budget Mode middleware
 */

import { Hono } from 'hono';
import { budgetResponse, type BudgetOptions } from '../middleware/budget.js';

// Types
export interface PatternConstraints {
  lang?: string;
  framework?: string;
  version?: string;
  pathPattern?: string;
}

export interface PatternVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  transform?: 'pascalCase' | 'camelCase' | 'kebabCase' | 'snakeCase' | 'none';
  default?: string;
}

export interface PatternTemplate {
  path: string;
  content: string;
}

export interface PatternSource {
  chunkId?: number;
  fileId?: number;
}

export interface Pattern {
  id: number;
  intent: string;
  title: string;
  tags_json?: string;
  constraints_json?: string;
  variables_json?: string;
  templates_json?: string;
  checklist_json?: string;
  gotchas_json?: string;
  sources_json?: string;
  usage_count: number;
  success_count: number;
  fail_count: number;
  created_at: number;
  updated_at: number;
}

export interface PatternCompact {
  id: number;
  intent: string;
  title: string;
  tags: string[];
  constraints: PatternConstraints;
  success_rate: number;
  usage_count: number;
  score?: number;
}

export interface PatternFull extends PatternCompact {
  variables: PatternVariable[];
  templates: PatternTemplate[];
  checklist: string[];
  gotchas: string[];
  sources: PatternSource[];
  success_count: number;
  fail_count: number;
  created_at: number;
  updated_at: number;
}

export interface Candidate {
  id: number;
  kind: 'diff' | 'chunks' | 'folder';
  sources_json: string;
  label?: string;
  tags_json?: string;
  status: 'pending' | 'distilled' | 'archived';
  created_at: number;
}

type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

// Variable extraction heuristics
function extractVariables(content: string, _kind?: string): PatternVariable[] {
  const variables: PatternVariable[] = [];
  const seen = new Set<string>();

  // Common patterns to detect
  const patterns = [
    // Class names (PascalCase)
    { regex: /class\s+([A-Z][a-zA-Z0-9]+)/g, name: 'ClassName', transform: 'pascalCase' as const },
    // Function names (camelCase)
    { regex: /function\s+([a-z][a-zA-Z0-9]+)/g, name: 'FunctionName', transform: 'camelCase' as const },
    // Route paths
    { regex: /['"]\/([a-z-]+)(?:\/|['"])/g, name: 'RoutePath', transform: 'kebabCase' as const },
    // Resource names in routes
    { regex: /\/api\/([a-z-]+)/g, name: 'ResourceName', transform: 'kebabCase' as const },
    // Table names
    { regex: /(?:table|TABLE)\s+['"`]?([a-z_]+)['"`]?/g, name: 'TableName', transform: 'snakeCase' as const },
    // Component names (React)
    { regex: /export\s+(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9]+)/g, name: 'ComponentName', transform: 'pascalCase' as const },
  ];

  for (const { regex, name, transform } of patterns) {
    const matches = content.matchAll(regex);
    for (const match of matches) {
      if (!seen.has(name)) {
        seen.add(name);
        variables.push({
          name,
          type: 'string',
          transform,
          default: match[1],
        });
      }
    }
  }

  return variables;
}

// Template generation with variable placeholders
function generateTemplate(content: string, variables: PatternVariable[]): string {
  let template = content;

  for (const variable of variables) {
    if (variable.default) {
      // Replace occurrences with Mustache-style placeholders
      const regex = new RegExp(escapeRegex(variable.default), 'g');
      template = template.replace(regex, `{{${variable.name}}}`);
    }
  }

  return template;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createPatternsRoutes(getDb: () => Promise<Database>) {
  const app = new Hono();

  // ==================== CAPTURE (S3.1) ====================
  // Create a candidate for later distillation
  app.post('/capture', async (c) => {
    const db = await getDb();
    const body = await c.req.json();

    const { kind, sources, label, tags = [] } = body;

    // Validation
    if (!kind || !['diff', 'chunks', 'folder'].includes(kind)) {
      return c.json({ error: 'Invalid kind. Must be: diff, chunks, or folder' }, 400);
    }

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return c.json({ error: 'Sources array is required' }, 400);
    }

    const result = db.run(
      `INSERT INTO candidates (kind, sources_json, label, tags_json, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      kind,
      JSON.stringify(sources),
      label || null,
      JSON.stringify(tags),
      Date.now()
    );

    return c.json({ id: result.lastInsertRowid, status: 'pending', created: true }, 201);
  });

  // List candidates
  app.get('/candidates', async (c) => {
    const db = await getDb();
    const status = c.req.query('status');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    let sql = 'SELECT * FROM candidates';
    const params: unknown[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const candidates = db.query<Candidate>(sql, ...params);

    return c.json({
      candidates: candidates.map(c => ({
        ...c,
        sources: JSON.parse(c.sources_json),
        tags: c.tags_json ? JSON.parse(c.tags_json) : [],
      })),
    });
  });

  // Get single candidate
  app.get('/candidates/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const candidate = db.queryOne<Candidate>(
      'SELECT * FROM candidates WHERE id = ?',
      id
    );

    if (!candidate) {
      return c.json({ error: 'Candidate not found' }, 404);
    }

    return c.json({
      ...candidate,
      sources: JSON.parse(candidate.sources_json),
      tags: candidate.tags_json ? JSON.parse(candidate.tags_json) : [],
    });
  });

  // Delete candidate
  app.delete('/candidates/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const result = db.run('DELETE FROM candidates WHERE id = ?', id);

    if (result.changes === 0) {
      return c.json({ error: 'Candidate not found' }, 404);
    }

    return c.json({ id, deleted: true });
  });

  // ==================== DISTILL (S3.2) ====================
  // Transform candidate into pattern draft
  app.post('/distill', async (c) => {
    const db = await getDb();
    const body = await c.req.json();

    const { candidateId, intent, title, constraints = {}, variablesHint = [] } = body;

    if (!candidateId || !intent || !title) {
      return c.json({ error: 'candidateId, intent, and title are required' }, 400);
    }

    // Get candidate
    const candidate = db.queryOne<Candidate>(
      'SELECT * FROM candidates WHERE id = ?',
      candidateId
    );

    if (!candidate) {
      return c.json({ error: 'Candidate not found' }, 404);
    }

    if (candidate.status === 'distilled') {
      return c.json({ error: 'Candidate already distilled' }, 400);
    }

    const sources = JSON.parse(candidate.sources_json) as PatternSource[];

    // Gather content from sources
    let combinedContent = '';
    const templates: PatternTemplate[] = [];

    for (const source of sources) {
      if (source.chunkId) {
        const chunk = db.queryOne<{ content: string; file_id: number }>(
          'SELECT content, file_id FROM chunks WHERE id = ?',
          source.chunkId
        );
        if (chunk) {
          const file = db.queryOne<{ path: string }>(
            'SELECT path FROM files WHERE id = ?',
            chunk.file_id
          );
          combinedContent += chunk.content + '\n';
          templates.push({
            path: file?.path || `file_${chunk.file_id}`,
            content: chunk.content,
          });
        }
      } else if (source.fileId) {
        const file = db.queryOne<{ path: string }>(
          'SELECT path FROM files WHERE id = ?',
          source.fileId
        );
        // Get all chunks for this file
        const chunks = db.query<{ content: string; start_line: number; end_line: number }>(
          'SELECT content, start_line, end_line FROM chunks WHERE file_id = ? ORDER BY start_line',
          source.fileId
        );
        const fullContent = chunks.map(c => c.content).join('\n');
        combinedContent += fullContent + '\n';
        if (file) {
          templates.push({
            path: file.path,
            content: fullContent,
          });
        }
      }
    }

    // Extract variables from content
    const extractedVariables = extractVariables(combinedContent, candidate.kind);
    const variables = [...extractedVariables, ...variablesHint];

    // Generate templates with placeholders
    const templatesWithPlaceholders = templates.map(t => ({
      path: generateTemplate(t.path, variables),
      content: generateTemplate(t.content, variables),
    }));

    // Create pattern
    const result = db.run(
      `INSERT INTO patterns (
        intent, title, tags_json, constraints_json, variables_json, templates_json,
        checklist_json, gotchas_json, sources_json, usage_count, success_count, fail_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
      intent,
      title,
      JSON.stringify(candidate.tags_json ? JSON.parse(candidate.tags_json) : []),
      JSON.stringify(constraints),
      JSON.stringify(variables),
      JSON.stringify(templatesWithPlaceholders),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify(sources),
      Date.now(),
      Date.now()
    );

    // Mark candidate as distilled
    db.run(
      'UPDATE candidates SET status = ? WHERE id = ?',
      'distilled',
      candidateId
    );

    return c.json({
      id: result.lastInsertRowid,
      intent,
      title,
      variables,
      templates: templatesWithPlaceholders.length,
      created: true,
    }, 201);
  });

  // ==================== RECALL (S3.4) - Progressive Disclosure ====================
  // Step 1: Compact PatternCards (~100 tokens each)
  app.get('/recall', async (c) => {
    const db = await getDb();
    const q = c.req.query('q');
    const lang = c.req.query('lang');
    const framework = c.req.query('framework');
    const limit = Math.min(parseInt(c.req.query('limit') || '3'), 10);

    // Budget options from query params
    const budgetOptions: BudgetOptions = {
      maxTokens: c.req.query('maxTokens') ? parseInt(c.req.query('maxTokens')!) : undefined,
      compact: c.req.query('compact') === 'true',
      estimateOnly: c.req.query('estimateOnly') === 'true',
    };

    let patterns: Pattern[];

    if (q) {
      // FTS search
      patterns = db.query<Pattern>(
        `SELECT p.*
         FROM patterns_fts fts
         JOIN patterns p ON p.id = fts.rowid
         WHERE patterns_fts MATCH ?
         ORDER BY bm25(patterns_fts)
         LIMIT ?`,
        q,
        limit * 3 // Get more to filter
      );
    } else {
      // Return by success rate
      patterns = db.query<Pattern>(
        `SELECT * FROM patterns_with_stats
         ORDER BY success_rate DESC, usage_count DESC
         LIMIT ?`,
        limit * 3
      );
    }

    // Filter by constraints
    let filtered = patterns;
    if (lang || framework) {
      filtered = patterns.filter(p => {
        const constraints = p.constraints_json ? JSON.parse(p.constraints_json) as PatternConstraints : {};
        if (lang && constraints.lang && constraints.lang !== lang) return false;
        if (framework && constraints.framework && constraints.framework !== framework) return false;
        return true;
      });
    }

    // Limit to max 3 (or specified limit)
    const results = filtered.slice(0, limit);

    // Return compact cards (no templates)
    const compact: PatternCompact[] = results.map(p => {
      const successRate = (p.success_count + p.fail_count) > 0
        ? p.success_count / (p.success_count + p.fail_count)
        : 0.5;

      return {
        id: p.id,
        intent: p.intent,
        title: p.title,
        tags: p.tags_json ? JSON.parse(p.tags_json) : [],
        constraints: p.constraints_json ? JSON.parse(p.constraints_json) : {},
        success_rate: successRate,
        usage_count: p.usage_count,
      };
    });

    // Apply budget mode
    return budgetResponse(c, { patterns: compact, total: filtered.length }, budgetOptions);
  });

  // Step 2: Get templates on-demand (~2000+ tokens)
  // Sprint 6: Budget Mode support via ?maxTokens=3000&compact=true
  app.get('/:id/templates', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    // Budget options from query params
    const budgetOptions: BudgetOptions = {
      maxTokens: c.req.query('maxTokens') ? parseInt(c.req.query('maxTokens')!) : undefined,
      compact: c.req.query('compact') === 'true',
      estimateOnly: c.req.query('estimateOnly') === 'true',
    };

    const pattern = db.queryOne<Pattern>(
      'SELECT * FROM patterns WHERE id = ?',
      id
    );

    if (!pattern) {
      return c.json({ error: 'Pattern not found' }, 404);
    }

    // Apply budget mode
    return budgetResponse(c, {
      id: pattern.id,
      variables: pattern.variables_json ? JSON.parse(pattern.variables_json) : [],
      templates: pattern.templates_json ? JSON.parse(pattern.templates_json) : [],
      checklist: pattern.checklist_json ? JSON.parse(pattern.checklist_json) : [],
      gotchas: pattern.gotchas_json ? JSON.parse(pattern.gotchas_json) : [],
    }, budgetOptions);
  });

  // ==================== CRUD (S3.3) ====================

  // List all patterns
  app.get('/', async (c) => {
    const db = await getDb();
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    const patterns = db.query<Pattern & { success_rate: number }>(
      `SELECT * FROM patterns_with_stats
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      limit,
      offset
    );

    const total = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM patterns');

    return c.json({
      patterns: patterns.map(p => ({
        id: p.id,
        intent: p.intent,
        title: p.title,
        tags: p.tags_json ? JSON.parse(p.tags_json) : [],
        constraints: p.constraints_json ? JSON.parse(p.constraints_json) : {},
        success_rate: p.success_rate,
        usage_count: p.usage_count,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      total: total?.count || 0,
      limit,
      offset,
    });
  });

  // Get single pattern (full)
  app.get('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const pattern = db.queryOne<Pattern>(
      'SELECT * FROM patterns WHERE id = ?',
      id
    );

    if (!pattern) {
      return c.json({ error: 'Pattern not found' }, 404);
    }

    const successRate = (pattern.success_count + pattern.fail_count) > 0
      ? pattern.success_count / (pattern.success_count + pattern.fail_count)
      : 0.5;

    return c.json({
      id: pattern.id,
      intent: pattern.intent,
      title: pattern.title,
      tags: pattern.tags_json ? JSON.parse(pattern.tags_json) : [],
      constraints: pattern.constraints_json ? JSON.parse(pattern.constraints_json) : {},
      variables: pattern.variables_json ? JSON.parse(pattern.variables_json) : [],
      templates: pattern.templates_json ? JSON.parse(pattern.templates_json) : [],
      checklist: pattern.checklist_json ? JSON.parse(pattern.checklist_json) : [],
      gotchas: pattern.gotchas_json ? JSON.parse(pattern.gotchas_json) : [],
      sources: pattern.sources_json ? JSON.parse(pattern.sources_json) : [],
      success_rate: successRate,
      usage_count: pattern.usage_count,
      success_count: pattern.success_count,
      fail_count: pattern.fail_count,
      created_at: pattern.created_at,
      updated_at: pattern.updated_at,
    });
  });

  // Create pattern directly (without distill)
  app.post('/', async (c) => {
    const db = await getDb();
    const body = await c.req.json();

    const {
      intent,
      title,
      tags = [],
      constraints = {},
      variables = [],
      templates = [],
      checklist = [],
      gotchas = [],
      sources = [],
    } = body;

    if (!intent || !title) {
      return c.json({ error: 'intent and title are required' }, 400);
    }

    const result = db.run(
      `INSERT INTO patterns (
        intent, title, tags_json, constraints_json, variables_json, templates_json,
        checklist_json, gotchas_json, sources_json, usage_count, success_count, fail_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
      intent,
      title,
      JSON.stringify(tags),
      JSON.stringify(constraints),
      JSON.stringify(variables),
      JSON.stringify(templates),
      JSON.stringify(checklist),
      JSON.stringify(gotchas),
      JSON.stringify(sources),
      Date.now(),
      Date.now()
    );

    return c.json({ id: result.lastInsertRowid, created: true }, 201);
  });

  // Update pattern
  app.patch('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    // Check exists
    const exists = db.queryOne<{ id: number }>('SELECT id FROM patterns WHERE id = ?', id);
    if (!exists) {
      return c.json({ error: 'Pattern not found' }, 404);
    }

    // Build update dynamically
    const updates: string[] = [];
    const values: unknown[] = [];

    const stringFields = ['intent', 'title'];
    for (const field of stringFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    const jsonFields = ['tags', 'constraints', 'variables', 'templates', 'checklist', 'gotchas', 'sources'];
    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        updates.push(`${field}_json = ?`);
        values.push(JSON.stringify(body[field]));
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    db.run(`UPDATE patterns SET ${updates.join(', ')} WHERE id = ?`, ...values);

    return c.json({ id, updated: true });
  });

  // Delete pattern
  app.delete('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const result = db.run('DELETE FROM patterns WHERE id = ?', id);

    if (result.changes === 0) {
      return c.json({ error: 'Pattern not found' }, 404);
    }

    return c.json({ id, deleted: true });
  });

  // ==================== FEEDBACK ====================
  // Record pattern usage outcome
  app.post('/:id/feedback', async (c) => {
    const db = await getDb();
    const patternId = parseInt(c.req.param('id'));
    const { outcome, notes, patchId } = await c.req.json();

    if (!outcome || !['success', 'fail'].includes(outcome)) {
      return c.json({ error: 'outcome must be "success" or "fail"' }, 400);
    }

    // Check pattern exists
    const exists = db.queryOne<{ id: number }>('SELECT id FROM patterns WHERE id = ?', patternId);
    if (!exists) {
      return c.json({ error: 'Pattern not found' }, 404);
    }

    // Insert feedback
    db.run(
      `INSERT INTO feedback (pattern_id, outcome, notes, patch_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      patternId,
      outcome,
      notes || null,
      patchId || null,
      Date.now()
    );

    // Update counters
    if (outcome === 'success') {
      db.run(
        'UPDATE patterns SET success_count = success_count + 1, usage_count = usage_count + 1 WHERE id = ?',
        patternId
      );
    } else {
      db.run(
        'UPDATE patterns SET fail_count = fail_count + 1, usage_count = usage_count + 1 WHERE id = ?',
        patternId
      );
    }

    return c.json({ recorded: true, outcome });
  });

  // ==================== APPLY (S4.1/S4.2) ====================
  // Apply pattern with variables - dry-run or write mode
  app.post('/:id/apply', async (c) => {
    const db = await getDb();
    const patternId = parseInt(c.req.param('id'));
    const { variables, mode = 'dry-run', targetPath = '.' } = await c.req.json();

    // Get pattern
    const pattern = db.queryOne<Pattern>(
      'SELECT * FROM patterns WHERE id = ?',
      patternId
    );

    if (!pattern) {
      return c.json({ error: 'Pattern not found' }, 404);
    }

    const patternVariables = pattern.variables_json ? JSON.parse(pattern.variables_json) as PatternVariable[] : [];
    const templates = pattern.templates_json ? JSON.parse(pattern.templates_json) as PatternTemplate[] : [];
    const checklist = pattern.checklist_json ? JSON.parse(pattern.checklist_json) as string[] : [];
    const gotchas = pattern.gotchas_json ? JSON.parse(pattern.gotchas_json) as string[] : [];

    // Validate required variables
    const providedVars = variables || {};
    const missingVars: string[] = [];
    for (const v of patternVariables) {
      if (!providedVars[v.name] && !v.default) {
        missingVars.push(v.name);
      }
    }

    if (missingVars.length > 0) {
      return c.json({
        error: 'Missing required variables',
        missing: missingVars
      }, 400);
    }

    // Merge with defaults
    const resolvedVars: Record<string, string> = {};
    for (const v of patternVariables) {
      let value = providedVars[v.name] || v.default || '';

      // Apply transforms
      if (v.transform && value) {
        switch (v.transform) {
          case 'pascalCase':
            value = value.replace(/(?:^|[-_\s])(\w)/g, (_: string, c: string) => c.toUpperCase());
            break;
          case 'camelCase':
            value = value.replace(/(?:^|[-_\s])(\w)/g, (_: string, c: string) => c.toUpperCase());
            value = value.charAt(0).toLowerCase() + value.slice(1);
            break;
          case 'kebabCase':
            value = value.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            value = value.replace(/[\s_]+/g, '-');
            break;
          case 'snakeCase':
            value = value.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
            value = value.replace(/[\s-]+/g, '_');
            break;
        }
      }
      resolvedVars[v.name] = value;
    }

    // Resolve templates with variables
    const resolvedTemplates: Array<{ path: string; content: string; action: 'create' | 'modify' }> = [];

    for (const template of templates) {
      let path = template.path;
      let content = template.content;

      // Replace Mustache-style variables
      for (const [name, value] of Object.entries(resolvedVars)) {
        const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
        path = path.replace(regex, value);
        content = content.replace(regex, value);
      }

      // Resolve path relative to targetPath
      const fullPath = path.startsWith('/') ? path : `${targetPath}/${path}`;

      resolvedTemplates.push({
        path: fullPath,
        content,
        action: 'create', // In a real impl, check if file exists
      });
    }

    // Dry-run mode - just return preview
    if (mode === 'dry-run') {
      return c.json({
        mode: 'dry-run',
        patternId,
        variables: resolvedVars,
        files: resolvedTemplates,
        checklist,
        gotchas,
        preview: true,
      });
    }

    // Write mode - actually create files (not implemented for safety)
    // In production, this would use fs.writeFileSync
    // For now, just simulate success
    const patchId = `patch-${patternId}-${Date.now()}`;

    return c.json({
      mode: 'write',
      patternId,
      patchId,
      variables: resolvedVars,
      files: resolvedTemplates.map(f => ({
        path: f.path,
        action: f.action,
      })),
      checklist,
      applied: true,
    });
  });

  // ==================== AUTO-CREATE DISABLED ====================
  app.post('/auto-create', async (c) => {
    return c.json({
      error: 'Auto-create disabled',
      message: 'Pattern auto-creation has been removed'
    }, 410);
  });

  return app;
}
