/**
 * Project Routes - Sprint 7
 * Multi-project support for token isolation
 */

import { Hono } from 'hono';
import { analyzeIndex } from '../services/index-analyzer.js';

export interface Project {
  id: number;
  name: string;
  root_path: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_indexed_at?: string;
  file_count: number;
  chunk_count: number;
  memory_count: number;
  pattern_count: number;
}

export interface ProjectFile {
  id: number;
  path: string;
  language?: string;
  size: number;
  chunk_count: number;
}

type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

export function createProjectRoutes(getDb: () => Promise<Database>) {
  const app = new Hono();

  // ==================== LIST PROJECTS ====================
  app.get('/', async (c) => {
    const db = await getDb();

    const projects = db.query<Project>(
      `SELECT * FROM projects ORDER BY updated_at DESC`
    );

    // Recalculate counts for each project
    const projectsWithCounts = projects.map((project) => {
      const fileCount = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM files WHERE project_id = ?',
        project.id
      );
      const chunkCount = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM chunks c JOIN files f ON c.file_id = f.id WHERE f.project_id = ?',
        project.id
      );
      const memoryCount = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM observations WHERE project_id = ?',
        project.id
      );
      // Note: candidates table doesn't have project_id column, count all patterns
      const patternCount = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM candidates'
      );

      return {
        ...project,
        file_count: fileCount?.count ?? 0,
        chunk_count: chunkCount?.count ?? 0,
        memory_count: memoryCount?.count ?? 0,
        pattern_count: patternCount?.count ?? 0,
      };
    });

    return c.json({ projects: projectsWithCounts });
  });

  // ==================== GET PROJECT BY ID ====================
  app.get('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const project = db.queryOne<Project>(
      'SELECT * FROM projects WHERE id = ?',
      id
    );

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Recalculate counts from actual tables
    const fileCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM files WHERE project_id = ?',
      id
    );
    const chunkCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM chunks c JOIN files f ON c.file_id = f.id WHERE f.project_id = ?',
      id
    );
    const memoryCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM observations WHERE project_id = ?',
      id
    );
    // Note: candidates table doesn't have project_id column, count all patterns
    const patternCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM candidates'
    );

    return c.json({
      ...project,
      file_count: fileCount?.count ?? 0,
      chunk_count: chunkCount?.count ?? 0,
      memory_count: memoryCount?.count ?? 0,
      pattern_count: patternCount?.count ?? 0,
    });
  });

  // ==================== DETECT PROJECT BY PATH ====================
  // Finds the project whose root_path is a parent of the given path
  app.get('/detect', async (c) => {
    const db = await getDb();
    const path = c.req.query('path');

    if (!path) {
      return c.json({ error: 'path query parameter required' }, 400);
    }

    // Find project where path starts with root_path
    // Order by length DESC to get the most specific match
    const project = db.queryOne<Project>(
      `SELECT * FROM projects
       WHERE ? LIKE root_path || '%'
       ORDER BY length(root_path) DESC
       LIMIT 1`,
      path
    );

    if (!project) {
      return c.json({ project: null, detected: false });
    }

    return c.json({ project, detected: true });
  });

  // ==================== CREATE PROJECT ====================
  app.post('/', async (c) => {
    const db = await getDb();
    const body = await c.req.json();

    const { name, root_path, description } = body;

    if (!name || !root_path) {
      return c.json({ error: 'name and root_path are required' }, 400);
    }

    // Check if project with same root_path exists
    const existing = db.queryOne<{ id: number }>(
      'SELECT id FROM projects WHERE root_path = ?',
      root_path
    );

    if (existing) {
      return c.json({ error: 'Project with this root_path already exists', existing_id: existing.id }, 409);
    }

    const result = db.run(
      `INSERT INTO projects (name, root_path, description)
       VALUES (?, ?, ?)`,
      name,
      root_path,
      description || null
    );

    return c.json({ id: result.lastInsertRowid, created: true }, 201);
  });

  // ==================== UPDATE PROJECT ====================
  app.patch('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const exists = db.queryOne<{ id: number }>('SELECT id FROM projects WHERE id = ?', id);
    if (!exists) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.last_indexed_at !== undefined) {
      updates.push('last_indexed_at = ?');
      values.push(body.last_indexed_at);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    db.run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, ...values);

    return c.json({ id, updated: true });
  });

  // ==================== DELETE PROJECT ====================
  // Cascades to files but keeps memories (sets project_id = NULL)
  app.delete('/:id', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const result = db.run('DELETE FROM projects WHERE id = ?', id);

    if (result.changes === 0) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json({ id, deleted: true });
  });

  // ==================== GET PROJECT FILES (Tree) ====================
  app.get('/:id/files', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));
    const flat = c.req.query('flat') === 'true';

    const exists = db.queryOne<{ id: number }>('SELECT id FROM projects WHERE id = ?', id);
    if (!exists) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const files = db.query<ProjectFile>(
      `SELECT
         f.id,
         f.path,
         f.lang as language,
         f.size,
         COUNT(c.id) as chunk_count
       FROM files f
       LEFT JOIN chunks c ON c.file_id = f.id
       WHERE f.project_id = ?
       GROUP BY f.id
       ORDER BY f.path`,
      id
    );

    if (flat) {
      return c.json({ files });
    }

    // Build tree structure
    const tree = buildFileTree(files);
    return c.json({ tree });
  });

  // ==================== GET PROJECT STATS ====================
  app.get('/:id/stats', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const project = db.queryOne<Project>(
      'SELECT * FROM projects WHERE id = ?',
      id
    );

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Recalculate counts from actual tables
    const fileCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM files WHERE project_id = ?',
      id
    );
    const chunkCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM chunks c JOIN files f ON c.file_id = f.id WHERE f.project_id = ?',
      id
    );
    const memoryCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM observations WHERE project_id = ?',
      id
    );
    // Note: candidates table doesn't have project_id column, count all patterns
    const patternCount = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM candidates'
    );

    // Get additional stats
    const chunkStats = db.queryOne<{ total: number; with_embeddings: number }>(
      `SELECT
         COUNT(*) as total,
         COUNT(embedding) as with_embeddings
       FROM chunks c
       JOIN files f ON c.file_id = f.id
       WHERE f.project_id = ?`,
      id
    );

    const languageStats = db.query<{ language: string; count: number }>(
      `SELECT language, COUNT(*) as count
       FROM files
       WHERE project_id = ? AND language IS NOT NULL
       GROUP BY language
       ORDER BY count DESC
       LIMIT 10`,
      id
    );

    return c.json({
      ...project,
      file_count: fileCount?.count ?? 0,
      chunk_count: chunkCount?.count ?? 0,
      memory_count: memoryCount?.count ?? 0,
      pattern_count: patternCount?.count ?? 0,
      chunks_total: chunkStats?.total || 0,
      chunks_with_embeddings: chunkStats?.with_embeddings || 0,
      languages: languageStats,
    });
  });

  // ==================== REINDEX PROJECT ====================
  // Marks project for reindexing (actual indexing done by external tool)
  app.post('/:id/reindex', async (c) => {
    const db = await getDb();
    const id = parseInt(c.req.param('id'));

    const project = db.queryOne<Project>(
      'SELECT * FROM projects WHERE id = ?',
      id
    );

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Clear existing files (cascade will handle chunks)
    db.run('DELETE FROM files WHERE project_id = ?', id);

    // Update project stats
    db.run(
      `UPDATE projects SET
         file_count = 0,
         chunk_count = 0,
         updated_at = datetime('now'),
         last_indexed_at = NULL
       WHERE id = ?`,
      id
    );

    return c.json({
      id,
      root_path: project.root_path,
      message: 'Project cleared for reindexing. Run indexer with this project_id.',
    });
  });

  // ==================== POST-INDEX ANALYSIS ====================
  // Analyzes indexed content for patterns and memory suggestions
  app.post('/post-index', async (c) => {
    const db = await getDb();
    const { project_id, stats } = await c.req.json();

    if (!project_id || !stats) {
      return c.json({ error: 'project_id and stats are required' }, 400);
    }

    // Verify project exists
    const project = db.queryOne<Project>(
      'SELECT * FROM projects WHERE id = ?',
      project_id
    );

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Run analysis
    const results = await analyzeIndex(db, project_id, stats);

    return c.json(results);
  });

  return app;
}

// Helper: Build tree structure from flat file list
interface TreeNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: TreeNode[];
  // File-specific
  id?: number;
  language?: string;
  size?: number;
  chunk_count?: number;
  // Directory-specific
  file_count?: number;
}

function buildFileTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = {
    name: '.',
    path: '',
    type: 'directory',
    children: [],
    file_count: 0,
  };

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      if (isLast) {
        // It's a file
        current.children!.push({
          name: part,
          path: file.path,
          type: 'file',
          id: file.id,
          language: file.language,
          size: file.size,
          chunk_count: file.chunk_count,
        });
        // Update parent file counts
        let parent: TreeNode | null = current;
        while (parent) {
          parent.file_count = (parent.file_count || 0) + 1;
          parent = null; // Only update immediate parent for simplicity
        }
      } else {
        // It's a directory
        let child = current.children!.find(c => c.name === part && c.type === 'directory');
        if (!child) {
          child = {
            name: part,
            path: currentPath,
            type: 'directory',
            children: [],
            file_count: 0,
          };
          current.children!.push(child);
        }
        current = child;
      }
    }
  }

  // Sort children: directories first, then files, alphabetically
  const sortChildren = (node: TreeNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };
  sortChildren(root);

  return root;
}
