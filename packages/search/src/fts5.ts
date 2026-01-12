/**
 * FTS5 Search - SQLite full-text search with BM25 ranking
 *
 * Features:
 * - BM25 relevance scoring (like mgrep)
 * - Native SQLite (no external dependencies)
 * - Instant search on indexed content
 */

// Generic database interface (compatible with @nexus/storage)
interface Database {
  query<T>(sql: string, params?: any[]): T[];
  queryOne<T>(sql: string, params?: any[]): T | undefined;
}

// ============================================
// TYPES
// ============================================

export interface FtsSearchOptions {
  limit?: number;
  offset?: number;
  highlight?: boolean;
  projectId?: number;  // Filter by project_id for multi-tenant support
}

export interface FtsMatch {
  chunkId: number;
  fileId: number;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  symbol?: string;
  score: number;  // BM25 score
}

export interface FtsSearchResult {
  query: string;
  hits: FtsMatch[];
  totalHits: number;
  processingTimeMs: number;
}

// ============================================
// FTS5 SEARCH
// ============================================

/**
 * Search chunks using FTS5 with BM25 ranking
 */
export function ftsSearch(
  db: Database,
  query: string,
  options: FtsSearchOptions = {}
): FtsSearchResult {
  const { limit = 20, offset = 0, projectId } = options;
  const startTime = Date.now();

  // Escape special FTS5 characters
  const escapedQuery = escapeQuery(query);

  // Build WHERE clause for project filtering
  const projectFilter = projectId ? 'AND f.project_id = ?' : '';

  // FTS5 search with BM25 ranking
  // bm25(chunks_fts) returns negative scores (more negative = more relevant)
  // We negate it to get positive scores
  const sql = `
    SELECT
      c.id as chunkId,
      c.file_id as fileId,
      f.path,
      c.start_line as startLine,
      c.end_line as endLine,
      c.content,
      c.symbol,
      -bm25(chunks_fts) as score
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.id
    JOIN files f ON c.file_id = f.id
    WHERE chunks_fts MATCH ? ${projectFilter}
    ORDER BY score DESC
    LIMIT ? OFFSET ?
  `;

  const params = projectId
    ? [escapedQuery, projectId, limit, offset]
    : [escapedQuery, limit, offset];

  const hits = db.query<FtsMatch>(sql, params);

  // Get total count
  const countSql = `
    SELECT COUNT(*) as count
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.id
    JOIN files f ON c.file_id = f.id
    WHERE chunks_fts MATCH ? ${projectFilter}
  `;
  const countParams = projectId ? [escapedQuery, projectId] : [escapedQuery];
  const countResult = db.queryOne<{ count: number }>(countSql, countParams);

  return {
    query,
    hits,
    totalHits: countResult?.count || 0,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Quick search with default options
 */
export function quickFtsSearch(db: Database, query: string, limit = 10): FtsMatch[] {
  return ftsSearch(db, query, { limit }).hits;
}

/**
 * Search with path filter
 */
export function ftsSearchInPath(
  db: Database,
  query: string,
  pathPattern: string,
  options: FtsSearchOptions = {}
): FtsSearchResult {
  const { limit = 20, offset = 0 } = options;
  const startTime = Date.now();

  const escapedQuery = escapeQuery(query);

  const sql = `
    SELECT
      c.id as chunkId,
      c.file_id as fileId,
      f.path,
      c.start_line as startLine,
      c.end_line as endLine,
      c.content,
      c.symbol,
      -bm25(chunks_fts) as score
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.id
    JOIN files f ON c.file_id = f.id
    WHERE chunks_fts MATCH ?
      AND f.path LIKE ?
    ORDER BY score DESC
    LIMIT ? OFFSET ?
  `;

  const hits = db.query<FtsMatch>(sql, [escapedQuery, pathPattern, limit, offset]);

  return {
    query,
    hits,
    totalHits: hits.length, // Approximate for filtered
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================
// FORMATTING (mgrep style)
// ============================================

/**
 * Format match in mgrep compact style: path:lines [score%]
 */
export function formatMgrep(match: FtsMatch): string {
  const scorePercent = Math.round(match.score * 10); // Normalize score
  return `./${match.path}:${match.startLine}-${match.endLine} [${scorePercent}%]`;
}

/**
 * Format all matches in mgrep style
 */
export function formatMgrepList(matches: FtsMatch[]): string {
  return matches.map(formatMgrep).join('\n');
}

/**
 * Format match with content preview
 */
export function formatWithPreview(match: FtsMatch, maxLines = 3): string {
  const header = formatMgrep(match);
  const lines = match.content.split('\n').slice(0, maxLines);
  const preview = lines.map(l => `  ${l}`).join('\n');
  return `${header}\n${preview}`;
}

// ============================================
// HELPERS
// ============================================

/**
 * Escape special FTS5 query characters
 */
function escapeQuery(query: string): string {
  // FTS5 special characters: " * - + ( ) : ^
  // Must wrap in quotes if query contains ANY special character

  // Already quoted - just escape internal quotes
  if (query.startsWith('"') && query.endsWith('"')) {
    return query;
  }

  // Check for FTS5 special characters that need escaping
  const hasSpecialChars = /[\s\-\+\*\(\)\:\^]/.test(query);

  if (hasSpecialChars) {
    // Wrap in quotes to treat as literal phrase/term
    return `"${query.replace(/"/g, '""')}"`;
  }

  // Simple word without special chars - use as is
  return query;
}

/**
 * Build FTS5 query for multiple terms (AND)
 */
export function buildAndQuery(terms: string[]): string {
  return terms.map(t => `"${t.replace(/"/g, '""')}"`).join(' AND ');
}

/**
 * Build FTS5 query for multiple terms (OR)
 */
export function buildOrQuery(terms: string[]): string {
  return terms.map(t => `"${t.replace(/"/g, '""')}"`).join(' OR ');
}

/**
 * Build prefix query for autocomplete
 */
export function buildPrefixQuery(prefix: string): string {
  return `${prefix}*`;
}
