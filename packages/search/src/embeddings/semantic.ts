/**
 * Semantic Search - Vector-based search with embeddings
 *
 * Uses cosine similarity for semantic matching
 * Hybrid mode: semantic + keyword (FTS5)
 */

import { embed, embedBatch, getEmbeddingProvider } from './provider.js';

// ============================================
// HELPERS
// ============================================

/**
 * Escape special FTS5 query characters
 * FTS5 special characters: " * - + ( ) : ^
 */
function escapeQueryForFts5(query: string): string {
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

// ============================================
// TYPES
// ============================================

// Generic database interface
interface Database {
  query<T>(sql: string, params?: any[]): T[];
  queryOne<T>(sql: string, params?: any[]): T | undefined;
  insert(sql: string, params?: any[]): number;
  update(sql: string, params?: any[]): number;
}

export interface SemanticMatch {
  chunkId: number;
  fileId: number;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  symbol?: string;
  similarity: number;  // 0-1 cosine similarity
}

export interface SemanticSearchResult {
  query: string;
  hits: SemanticMatch[];
  processingTimeMs: number;
  embeddingTimeMs: number;
}

// ============================================
// VECTOR OPERATIONS
// ============================================

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Convert Float32Array to/from Buffer for SQLite storage
 */
export function vectorToBlob(vector: number[]): Buffer {
  const float32 = new Float32Array(vector);
  return Buffer.from(float32.buffer);
}

export function blobToVector(blob: Buffer): number[] {
  const float32 = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
  return Array.from(float32);
}

// ============================================
// EMBEDDING STORAGE
// ============================================

/**
 * Store embedding for a chunk
 */
export function storeEmbedding(
  db: Database,
  chunkId: number,
  vector: number[],
  model: string
): void {
  const blob = vectorToBlob(vector);

  // Upsert embedding
  db.update(
    `INSERT INTO embeddings (chunk_id, vector, model)
     VALUES (?, ?, ?)
     ON CONFLICT(chunk_id) DO UPDATE SET vector = ?, model = ?`,
    [chunkId, blob, model, blob, model]
  );
}

/**
 * Get embedding for a chunk
 */
export function getEmbedding(db: Database, chunkId: number): number[] | null {
  const row = db.queryOne<{ vector: Buffer }>(
    'SELECT vector FROM embeddings WHERE chunk_id = ?',
    [chunkId]
  );

  if (!row) return null;
  return blobToVector(row.vector);
}

/**
 * Get all embeddings with chunk metadata
 */
interface EmbeddingRow {
  chunk_id: number;
  file_id: number;
  path: string;
  start_line: number;
  end_line: number;
  content: string;
  symbol: string | null;
  vector: Buffer;
}

export function getAllEmbeddings(db: Database, projectId?: number): EmbeddingRow[] {
  const projectFilter = projectId ? 'WHERE f.project_id = ?' : '';
  const params = projectId ? [projectId] : [];

  return db.query<EmbeddingRow>(`
    SELECT
      e.chunk_id,
      c.file_id,
      f.path,
      c.start_line,
      c.end_line,
      c.content,
      c.symbol,
      e.vector
    FROM embeddings e
    JOIN chunks c ON e.chunk_id = c.id
    JOIN files f ON c.file_id = f.id
    ${projectFilter}
  `, params);
}

// ============================================
// SEMANTIC SEARCH
// ============================================

/**
 * Semantic search using embeddings
 */
export async function semanticSearch(
  db: Database,
  query: string,
  limit = 10,
  projectId?: number
): Promise<SemanticSearchResult> {
  const startTime = Date.now();

  // Embed query
  const embedStart = Date.now();
  const queryVector = await embed(query);
  const embeddingTimeMs = Date.now() - embedStart;

  // Get all embeddings
  const embeddings = getAllEmbeddings(db, projectId);

  // Calculate similarities
  const scored = embeddings.map(row => ({
    chunkId: row.chunk_id,
    fileId: row.file_id,
    path: row.path,
    startLine: row.start_line,
    endLine: row.end_line,
    content: row.content,
    symbol: row.symbol || undefined,
    similarity: cosineSimilarity(queryVector, blobToVector(row.vector)),
  }));

  // Sort by similarity and take top K
  scored.sort((a, b) => b.similarity - a.similarity);
  const hits = scored.slice(0, limit);

  return {
    query,
    hits,
    processingTimeMs: Date.now() - startTime,
    embeddingTimeMs,
  };
}

/**
 * Hybrid search: semantic + keyword
 * Combines FTS5 keyword results with semantic similarity
 */
export async function hybridSearch(
  db: Database,
  query: string,
  options: { limit?: number; keywordWeight?: number; semanticWeight?: number; projectId?: number } = {}
): Promise<SemanticSearchResult> {
  const { limit = 10, keywordWeight = 0.3, semanticWeight = 0.7, projectId } = options;
  const startTime = Date.now();

  // Embed query
  const embedStart = Date.now();
  const queryVector = await embed(query);
  const embeddingTimeMs = Date.now() - embedStart;

  // Build WHERE clause for project filtering
  const projectFilter = projectId ? 'AND f.project_id = ?' : '';

  // Escape query for FTS5 (handle special chars like - + * etc.)
  const escapedQuery = escapeQueryForFts5(query);
  const keywordParams = projectId ? [escapedQuery, projectId] : [escapedQuery];

  // Get FTS5 keyword scores (normalized)
  const keywordResults = db.query<{ chunk_id: number; score: number }>(`
    SELECT chunks_fts.rowid as chunk_id, -bm25(chunks_fts) as score
    FROM chunks_fts
    JOIN chunks c ON chunks_fts.rowid = c.id
    JOIN files f ON c.file_id = f.id
    WHERE chunks_fts MATCH ? ${projectFilter}
    ORDER BY score DESC
    LIMIT 100
  `, keywordParams);

  const keywordScores = new Map<number, number>();
  const maxKeywordScore = keywordResults[0]?.score || 1;
  for (const r of keywordResults) {
    keywordScores.set(r.chunk_id, r.score / maxKeywordScore);
  }

  // Get embeddings and calculate hybrid scores
  const embeddings = getAllEmbeddings(db, projectId);

  const scored = embeddings.map(row => {
    const semanticScore = cosineSimilarity(queryVector, blobToVector(row.vector));
    const keywordScore = keywordScores.get(row.chunk_id) || 0;
    const hybridScore = (semanticWeight * semanticScore) + (keywordWeight * keywordScore);

    return {
      chunkId: row.chunk_id,
      fileId: row.file_id,
      path: row.path,
      startLine: row.start_line,
      endLine: row.end_line,
      content: row.content,
      symbol: row.symbol || undefined,
      similarity: hybridScore,
    };
  });

  // Sort by hybrid score and take top K
  scored.sort((a, b) => b.similarity - a.similarity);
  const hits = scored.slice(0, limit);

  return {
    query,
    hits,
    processingTimeMs: Date.now() - startTime,
    embeddingTimeMs,
  };
}

// ============================================
// BATCH EMBEDDING FOR INDEXATION
// ============================================

/**
 * Embed and store multiple chunks
 * Processes in batches to avoid rate limits
 */
export async function embedChunks(
  db: Database,
  chunks: Array<{ id: number; content: string }>,
  batchSize = 10,
  onProgress?: (processed: number, total: number) => void
): Promise<{ embedded: number; errors: number }> {
  const provider = getEmbeddingProvider();
  let embedded = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(c => c.content);

    try {
      const results = await embedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        storeEmbedding(db, batch[j].id, results[j], provider.name);
        embedded++;
      }
    } catch (e) {
      console.error(`Batch ${i} failed:`, e);
      errors += batch.length;
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, chunks.length), chunks.length);
    }

    // Small delay to avoid rate limits
    if (i + batchSize < chunks.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return { embedded, errors };
}
