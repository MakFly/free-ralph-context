/**
 * Search-First memory tool
 * Lightweight search with compact excerpts to minimize token usage
 * Uses FTS5 with BM25 ranking and intelligent excerpt generation
 */

import { z } from 'zod/v4';
import { getDb, getRawDb } from '../storage/client.js';
import { memories, contexts } from '../storage/schema.js';
import { eq, and } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const SearchMemoriesSchema = z.object({
  query: z.string().min(1),
  contextId: z.string().optional(),
  type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
  stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
  limit: z.number().optional().default(10),
  mode: z.enum(['compact', 'standard', 'detailed']).optional().default('compact'),
});

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: string;
  contextId: string;
  contextName: string | null;
  stack: string | null;
  score: number;
  tokens: number;
}

/**
 * Generate smart excerpt centered on search terms
 * Prioritizes passages containing the query terms
 */
function generateSmartExcerpt(content: string, query: string, maxTokens: number = 100): string {
  // Clean and tokenize query
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 5); // Use top 5 terms

  // Split content into paragraphs
  const paragraphs = content.split(/\n\n+/);

  // Score each paragraph based on query term matches
  const scoredParagraphs = paragraphs.map(para => {
    const lowerPara = para.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      if (lowerPara.includes(term)) {
        // Higher score for exact term matches
        score += 10;
        // Bonus for multiple occurrences
        const occurrences = (lowerPara.match(new RegExp(term, 'g')) || []).length;
        score += occurrences * 2;
      }
    }

    // Prefer shorter paragraphs for excerpts
    score -= Math.min(para.length / 100, 5);

    return { paragraph: para, score };
  });

  // Sort by score descending
  scoredParagraphs.sort((a, b) => b.score - a.score);

  // Take best paragraph(s) until we hit token limit
  let excerpt = '';
  let currentTokens = 0;
  const avgCharsPerToken = 4;

  for (const { paragraph } of scoredParagraphs) {
    const estimatedTokens = paragraph.length / avgCharsPerToken;

    if (currentTokens + estimatedTokens > maxTokens) {
      // Take partial paragraph
      const remainingChars = (maxTokens - currentTokens) * avgCharsPerToken;
      excerpt += paragraph.substring(0, Math.floor(remainingChars)) + '...';
      break;
    }

    excerpt += (excerpt ? '\n\n' : '') + paragraph;
    currentTokens += estimatedTokens;

    if (currentTokens >= maxTokens * 0.9) break;
  }

  // Fallback: if no matches, take first paragraph
  if (!excerpt && paragraphs.length > 0) {
    const firstPara = paragraphs[0];
    const maxChars = maxTokens * avgCharsPerToken;
    excerpt = firstPara.length > maxChars
      ? firstPara.substring(0, maxChars) + '...'
      : firstPara;
  }

  return excerpt.trim() || 'No excerpt available';
}

/**
 * Estimate token count for text
 * Approximate: 1 token ≈ 4 characters
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Search memories with FTS5 and compact excerpts
 * This is the Search-First approach: lightweight results first
 */
export async function searchMemories(args: unknown): Promise<CallToolResult> {
  try {
    const input = SearchMemoriesSchema.parse(args);
    const db = getDb();
    const sqlite = getRawDb();

    // Build FTS5 query
    const ftsQuery = input.query.replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ');

    let sql = `
      SELECT DISTINCT
        m.id,
        m.title,
        m.content,
        m.type,
        m.context_id,
        m.stack,
        bm25(memories_fts) as fts_rank,
        c.name as context_name
      FROM memories m
      JOIN memories_fts ON m.id = memories_fts.memory_id
      LEFT JOIN contexts c ON m.context_id = c.id
      WHERE memories_fts MATCH ?
    `;

    const params: any[] = [ftsQuery];

    // Add optional filters
    if (input.contextId) {
      sql += ' AND m.context_id = ?';
      params.push(input.contextId);
    }

    if (input.type) {
      sql += ' AND m.type = ?';
      params.push(input.type);
    }

    if (input.stack) {
      sql += ' AND m.stack = ?';
      params.push(input.stack);
    }

    // Order by BM25 score (lower is better in FTS5)
    sql += ' ORDER BY fts_rank LIMIT ?';
    params.push(input.limit);

    const rows = sqlite.query(sql).all(...params) as any[];
    sqlite.close();

    if (rows.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              results: [],
              total: 0,
              query: input.query,
              mode: input.mode,
            }, null, 2),
          },
        ],
      };
    }

    // Configure excerpt length based on mode
    const excerptConfig = {
      compact: { maxTokens: 60, context: 'minimal' },
      standard: { maxTokens: 120, context: 'moderate' },
      detailed: { maxTokens: 250, context: 'full' },
    };

    const config = excerptConfig[input.mode];

    // Process results with excerpts
    const results: SearchResult[] = rows.map((row, index) => {
      const excerpt = generateSmartExcerpt(row.content, input.query, config.maxTokens);
      const tokens = estimateTokens(`${row.title} ${excerpt}`);

      // Convert BM25 score to 0-1 range (lower BM25 = better)
      // Typical BM25 values range from 0 to 50+
      const normalizedScore = Math.max(0, 1 - (row.fts_rank / 30));

      return {
        id: row.id,
        title: row.title,
        excerpt,
        type: row.type,
        contextId: row.context_id,
        contextName: row.context_name,
        stack: row.stack,
        score: normalizedScore,
        tokens,
      };
    });

    // Calculate total tokens
    const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results,
            total: results.length,
            query: input.query,
            mode: input.mode,
            totalTokens,
            avgTokensPerResult: Math.round(totalTokens / results.length),
            meta: {
              searchMethod: 'fts5_bm25',
              excerptStrategy: 'smart_context_aware',
              recommend: 'Use expand_memory() for full content of selected results',
            },
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
