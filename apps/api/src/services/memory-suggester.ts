/**
 * Memory Suggester - Suggest existing memories based on indexed content
 */

// Compatible Database type (matches projects.ts)
export type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

import type { MemorySuggestion } from '@nexus/core';

/**
 * Suggest relevant existing memories based on indexed content
 */
export async function suggestMemories(
  db: Database,
  projectId: number,
  _stats: { files_scanned: number; files_indexed: number; files_skipped: number; chunks_created: number; errors: unknown[] }
): Promise<MemorySuggestion[]> {
  const suggestions: MemorySuggestion[] = [];

  // Get indexed file paths
  const files = db.query<{ path: string }>(`
    SELECT path FROM files WHERE project_id = ? LIMIT 50
  `, projectId);

  // Extract keywords from file paths
  const keywords = extractKeywords(files.map(f => f.path));

  // For each keyword, search for relevant memories
  for (const keyword of keywords) {
    try {
      const memories = db.query<{ id: number; summary: string | null; score: number }>(`
        SELECT o.id, o.summary, bm25(observations_fts) as score
        FROM observations_fts fts
        JOIN observations o ON o.id = fts.rowid
        WHERE observations_fts MATCH ?
        ORDER BY bm25(observations_fts)
        LIMIT 3
      `, keyword);

      for (const memory of memories) {
        if (memory.summary) {
          suggestions.push({
            memory_id: memory.id,
            summary: memory.summary,
            keyword: keyword,
            relevance: memory.score
          });
        }
      }
    } catch {
      // FTS5 search may fail if no memories exist
      continue;
    }
  }

  // Sort by relevance (lower BM25 score = better match)
  suggestions.sort((a, b) => a.relevance - b.relevance);

  // Remove duplicates by memory_id
  const seen = new Set<number>();
  const unique: MemorySuggestion[] = [];
  for (const suggestion of suggestions) {
    if (!seen.has(suggestion.memory_id)) {
      seen.add(suggestion.memory_id);
      unique.push(suggestion);
      if (unique.length >= 10) break;
    }
  }

  return unique;
}

/**
 * Extract keywords from file paths
 */
function extractKeywords(paths: string[]): string[] {
  const keywords = new Set<string>();

  for (const path of paths) {
    // Extract keywords from file names
    const parts = path.split(/[/\\.-]/);
    for (const part of parts) {
      // Filter: length >= 4, not common words, not index files
      if (
        part.length >= 4 &&
        !part.includes('index') &&
        !['test', 'spec', 'mock', 'stub', 'util', 'helper', 'base', 'abstract', 'interface'].includes(part.toLowerCase())
      ) {
        keywords.add(part);
      }
    }
  }

  return Array.from(keywords);
}
