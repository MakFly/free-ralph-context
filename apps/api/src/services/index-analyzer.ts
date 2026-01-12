/**
 * Index Analyzer - Orchestrates post-index analysis
 * Coordinates pattern detection and memory suggestions
 */

// Compatible Database type (matches projects.ts)
export type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

import type { IndexAnalysis, IndexStats } from '@nexus/core';
import { detectAutoPatterns } from './pattern-detector.js';
import { suggestMemories } from './memory-suggester.js';

/**
 * Analyze indexed content and suggest patterns/memories
 */
export async function analyzeIndex(
  db: Database,
  projectId: number,
  stats: IndexStats
): Promise<IndexAnalysis> {
  const result: IndexAnalysis = {
    patterns_detected: 0,
    memories_suggested: 0,
    candidates_created: [],
    memory_suggestions: [],
    errors: []
  };

  try {
    // 1. Detect patterns automatically
    const candidates = await detectAutoPatterns(db, projectId, stats);
    result.patterns_detected = candidates.length;
    result.candidates_created = candidates.map((c) => ({
      id: c.id,
      kind: c.kind,
      sources: c.sources,
      label: c.label,
      tags: c.tags,
      status: c.status
    }));
  } catch (error) {
    result.errors.push(`Pattern detection failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    // 2. Suggest relevant memories
    const memories = await suggestMemories(db, projectId, stats);
    result.memories_suggested = memories.length;
    result.memory_suggestions = memories;
  } catch (error) {
    result.errors.push(`Memory suggestion failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Get analysis results for a project (not implemented yet)
 */
export async function getIndexAnalysis(
  _db: Database,
  _projectId: number,
  _limit: number = 10
): Promise<IndexAnalysis | null> {
  // This could query a stored analysis table if we implement persistence
  // For now, return null to indicate analysis should be run
  return null;
}
