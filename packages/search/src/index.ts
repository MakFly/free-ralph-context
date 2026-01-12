/**
 * @nexus/search - SQLite FTS5 Search for Nexus
 *
 * Uses SQLite FTS5 for efficient full-text search with:
 * - BM25 ranking
 * - Native integration (no external dependencies)
 * - Lightweight and fast
 *
 * Sprint 8: Added ChromaDB hybrid support for large datasets
 * Sprint 9: Added LLM synthesis for compact observations
 */

// Re-export FTS5 functions
export {
  ftsSearch,
  quickFtsSearch,
  ftsSearchInPath,
  formatMgrep,
  formatMgrepList,
  formatWithPreview,
  buildAndQuery,
  buildOrQuery,
  buildPrefixQuery,
  type FtsSearchOptions,
  type FtsMatch,
  type FtsSearchResult,
} from './fts5.js';

// Re-export ripgrep functions
export {
  rgSearch,
  quickSearch,
  searchByType,
  formatMatch,
  formatMatchList,
  type RgSearchOptions,
  type RgMatch,
  type RgSearchResult,
} from './ripgrep.js';

// Re-export ChromaDB hybrid support (Sprint 8)
export {
  ChromaClient,
  getChromaClient,
  NEXUS_COLLECTIONS,
  type ChromaConfig,
  type ChromaCollectionConfig,
  type ChromaEmbedding,
  type ChromaQueryResult
} from './chroma.js';

export {
  HybridRouter,
  getHybridRouter,
  shouldUseChroma,
  type HybridRouterConfig,
  type RouterResult,
  type RouterEngine
} from './hybrid-router.js';

// ============================================
// TYPES
// ============================================

export interface ChunkDocument {
  id: string;
  file_id: number;
  path: string;
  start_line: number;
  end_line: number;
  content: string;
  symbol?: string;
  kind?: string;
  lang?: string;
  indexed_at: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: string;
}

export interface SearchResult {
  hits: SearchHit[];
  totalHits: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
}

export interface SearchHit {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  symbol?: string;
  kind?: string;
  lang?: string;
  score: number;
}

// ============================================
// DATABASE INTERFACE
// ============================================

interface Database {
  run(sql: string, params?: any[]): void;
  query<T>(sql: string, params?: any[]): T[];
  queryOne<T>(sql: string, params?: any[]): T | undefined;
}

// Module state
let searchDb: Database | null = null;
let initialized = false;

/**
 * Initialize search with a database connection
 * Uses SQLite FTS5 - no external dependencies needed
 */
export async function initSearch(db?: Database): Promise<void> {
  if (db) {
    searchDb = db;
  }
  initialized = true;
}

/**
 * Check if search is initialized
 */
export function isSearchInitialized(): boolean {
  return initialized;
}

/**
 * Get the database (for direct FTS5 queries)
 */
export function getSearchDb(): Database | null {
  return searchDb;
}

/**
 * Index chunks into SQLite (direct insert, FTS5 auto-syncs via triggers)
 */
export async function indexChunks(chunks: ChunkDocument[]): Promise<number> {
  if (!searchDb) {
    // If no db provided, skip indexing (tests without full setup)
    console.warn('Search DB not initialized, skipping chunk indexing');
    return 0;
  }

  for (const chunk of chunks) {
    searchDb.run(
      `INSERT OR REPLACE INTO chunks (file_id, start_line, end_line, content, symbol, kind)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        chunk.file_id,
        chunk.start_line,
        chunk.end_line,
        chunk.content,
        chunk.symbol || null,
        chunk.kind || null,
      ]
    );
  }

  return chunks.length;
}

/**
 * Search chunks using FTS5 with BM25 ranking
 */
export async function search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  if (!searchDb) {
    return {
      hits: [],
      totalHits: 0,
      limit: options.limit || 20,
      offset: options.offset || 0,
      processingTimeMs: 0,
    };
  }

  const { limit = 20, offset = 0 } = options;
  const startTime = Date.now();

  // Escape query for FTS5
  const escapedQuery = query.includes(' ') ? `"${query}"` : query;

  const sql = `
    SELECT
      c.id,
      f.path,
      c.start_line as startLine,
      c.end_line as endLine,
      c.content,
      c.symbol,
      c.kind,
      -bm25(chunks_fts) as score
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.id
    JOIN files f ON c.file_id = f.id
    WHERE chunks_fts MATCH ?
    ORDER BY score DESC
    LIMIT ? OFFSET ?
  `;

  const hits = searchDb.query<any>(sql, [escapedQuery, limit, offset]);

  return {
    hits: hits.map((h: any) => ({
      id: String(h.id),
      path: h.path,
      startLine: h.startLine,
      endLine: h.endLine,
      content: h.content,
      symbol: h.symbol,
      kind: h.kind,
      lang: undefined,
      score: h.score || 0,
    })),
    totalHits: hits.length,
    limit,
    offset,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Delete chunks for a specific file
 */
export async function deleteChunksForFile(fileId: number): Promise<number> {
  if (!searchDb) return 0;
  searchDb.run('DELETE FROM chunks WHERE file_id = ?', [fileId]);
  return 1;
}

/**
 * Clear all chunks
 */
export async function clearIndex(): Promise<number> {
  if (!searchDb) return 0;
  searchDb.run('DELETE FROM chunks');
  return 1;
}

/**
 * Get index stats
 */
export async function getIndexStats(): Promise<{
  numberOfDocuments: number;
  isIndexing: boolean;
}> {
  if (!searchDb) {
    return { numberOfDocuments: 0, isIndexing: false };
  }
  const result = searchDb.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM chunks');
  return {
    numberOfDocuments: result?.count || 0,
    isIndexing: false,
  };
}

/**
 * Create a chunk ID from file_id and line range
 */
export function makeChunkId(fileId: number, startLine: number, endLine: number): string {
  return `f${fileId}_l${startLine}-${endLine}`;
}

/**
 * Format search hit in compact mgrep style
 */
export function formatCompact(hit: SearchHit): string {
  const score = Math.round(hit.score * 100);
  return `./${hit.path}:${hit.startLine}-${hit.endLine} [${score}%]`;
}

// Re-export synthesis functions (Sprint 9)
export {
  SynthesisService,
  synthesizeSearchResults,
} from './synthesis.js';

export type { SynthesizedObservation } from './synthesis.js';
