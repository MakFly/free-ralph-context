/**
 * Search API Routes
 * Search-First: Returns compact excerpts instead of full content
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod/v4';
import { searchMemories, SearchMemoriesSchema } from '../tools/search-first.js';
import type { ErrorResponse, SuccessResponse } from './middleware.js';

// Valid memory types
const memoryTypes = ['note', 'conversation', 'snippet', 'reference', 'task', 'idea'] as const;
const searchModes = ['compact', 'standard', 'detailed'] as const;

/**
 * Search query schema (Search-First)
 */
const searchSchema = z.object({
  query: z.string().min(1),
  contextId: z.string().optional(),
  type: z.enum(memoryTypes).optional(),
  stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
  limit: z.number().optional().default(10),
  mode: z.enum(searchModes).optional().default('compact'),
});

/**
 * Create search router
 */
export const searchRouter = new Hono();

/**
 * POST /api/search - Search-First: Returns compact excerpts with FTS5
 * This is the Search-First approach: lightweight results first, use GET /memories/:id for full content
 */
searchRouter.post('/', zValidator('json', searchSchema), async (c) => {
  try {
    const input = c.req.valid('json');

    // Use the Search-First tool (compact excerpts)
    const result = await searchMemories({
      query: input.query,
      contextId: input.contextId,
      type: input.type,
      stack: input.stack,
      limit: input.limit,
      mode: input.mode || 'compact',
    });

    // Parse the result from searchMemories
    const textContent = result.content[0]?.text;
    if (!textContent) {
      throw new Error('No content from search tool');
    }

    const searchResult = JSON.parse(textContent);

    if (!searchResult.success) {
      return c.json<ErrorResponse>({
        success: false,
        error: searchResult.error || 'Search failed',
      }, 500);
    }

    // Transform results to match the expected format for the frontend
    const results = searchResult.results.map((r: any) => ({
      memory: {
        id: r.id,
        title: r.title,
        type: r.type,
        contextId: r.contextId,
        stack: r.stack,
        createdAt: r.metadata?.createdAt || r.createdAt,
        excerpt: r.excerpt, // NEW: Compact excerpt instead of full content
      },
      context: r.contextName ? {
        id: r.contextId,
        name: r.contextName,
      } : null,
      score: r.score,
      tokens: r.tokens,
    }));

    return c.json<SuccessResponse<{
      results: typeof results;
      total: number;
      query: string;
      mode: string;
      totalTokens: number;
      avgTokensPerResult: number;
    }>>({
      success: true,
      data: {
        results,
        total: searchResult.total,
        query: searchResult.query,
        mode: searchResult.mode,
        totalTokens: searchResult.totalTokens,
        avgTokensPerResult: searchResult.avgTokensPerResult,
      },
    });
  } catch (error) {
    console.error('[API] Error searching memories:', error);
    return c.json<ErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search memories',
      },
      500
    );
  }
});
