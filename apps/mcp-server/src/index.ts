#!/usr/bin/env node
/**
 * Nexus MCP Server - Sprint 7 (Turbo)
 * 3 consolidated tools for 40-50x token savings
 * - nexus_code: search, open, stats
 * - nexus_memory: recall, get, upsert
 * - nexus_learn: recall, templates, apply, feedback
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// API base URL
const API_URL = process.env.NEXUS_API_URL || 'http://localhost:3001';

// Compact format helpers
const TYPE_SHORT: Record<string, string> = {
  decision: 'D', bugfix: 'B', feature: 'F', refactor: 'R',
  discovery: 'X', change: 'C', preference: 'P', fact: 'A', note: 'N'
};
const SCOPE_SHORT: Record<string, string> = {
  repo: 'R', branch: 'B', ticket: 'T', feature: 'F', global: 'G'
};

// Helper to make API calls
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Create MCP server
const server = new Server(
  {
    name: 'nexus-mcp',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Define 3 consolidated tools (was 9)
const TOOLS = [
  {
    name: 'nexus_code',
    description: 'Code search and file operations. Actions: search (FTS5/semantic), open (read file), stats (repo info).',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'open', 'stats'], description: 'Action to perform' },
        query: { type: 'string', description: 'Search query (for search)' },
        mode: { type: 'string', enum: ['keyword', 'semantic', 'hybrid'], description: 'Search mode (default: keyword)' },
        limit: { type: 'number', description: 'Max results (default: 10)' },
        path: { type: 'string', description: 'File path (for open)' },
        startLine: { type: 'number', description: 'Start line (for open)' },
        endLine: { type: 'number', description: 'End line (for open)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'nexus_memory',
    description: 'Memory system. Actions: recall (compact index), get (full by IDs), upsert (create/update), timeline (context around ID).',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['recall', 'get', 'upsert', 'timeline'], description: 'Action to perform' },
        query: { type: 'string', description: 'Search query (for recall)' },
        type: { type: 'string', enum: ['decision', 'preference', 'fact', 'note', 'discovery', 'bugfix', 'feature', 'refactor', 'change'] },
        scope: { type: 'string', enum: ['repo', 'branch', 'ticket', 'feature', 'global'] },
        limit: { type: 'number', description: 'Max results (default: 10)' },
        tier: { type: 'number', enum: [1, 2, 3], description: 'Detail level: 1=IDs, 2=summary, 3=full (default: 2)' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Memory IDs (for get)' },
        anchor: { type: 'number', description: 'Memory ID for timeline center point' },
        window: { type: 'number', description: 'Number of items before/after anchor (default: 5)' },
        title: { type: 'string', description: 'Title (for upsert)' },
        narrative: { type: 'string', description: 'Content (for upsert)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags (for upsert)' },
        confidence: { type: 'number', description: 'Confidence 0-1 (for upsert)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'nexus_learn',
    description: 'Pattern learning. Actions: recall (find patterns), templates (get full), apply (dry-run/write), feedback (record outcome).',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['recall', 'templates', 'apply', 'feedback'], description: 'Action to perform' },
        query: { type: 'string', description: 'Search query (for recall)' },
        lang: { type: 'string', description: 'Filter by language' },
        framework: { type: 'string', description: 'Filter by framework' },
        patternId: { type: 'number', description: 'Pattern ID (for templates/apply/feedback)' },
        variables: { type: 'object', description: 'Variable values (for apply)' },
        mode: { type: 'string', enum: ['dry-run', 'write'], description: 'Apply mode (default: dry-run)' },
        outcome: { type: 'string', enum: ['success', 'fail'], description: 'Outcome (for feedback)' },
        notes: { type: 'string', description: 'Notes (for feedback)' },
      },
      required: ['action'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ============================================
    // NEXUS_CODE
    // ============================================
    if (name === 'nexus_code') {
      const { action, query, mode = 'keyword', limit = 10, path, startLine, endLine } = args as any;

      if (action === 'search') {
        if (!query) throw new Error('query required for search');
        const endpoint = mode === 'keyword' ? '/search' : mode === 'semantic' ? '/search/semantic' : '/search/hybrid';
        const result = await api<{ hits: any[] }>(endpoint, {
          method: 'POST',
          body: JSON.stringify({ q: query, limit }),
        });

        // Ultra-compact format: path:lines|score|symbol
        const compact = result.hits.slice(0, limit).map((h: any) =>
          `${h.path}:${h.startLine}-${h.endLine}|${Math.round((h.score || h.similarity || 0) * 100)}|${h.symbol || ''}`
        ).join('\n');

        return { content: [{ type: 'text', text: compact || 'No results' }] };
      }

      if (action === 'open') {
        if (!path) throw new Error('path required for open');
        const result = await api<{ content: string; path: string }>('/open', {
          method: 'POST',
          body: JSON.stringify({ path, startLine: startLine || 1, endLine }),
        });
        return { content: [{ type: 'text', text: `// ${result.path}\n${result.content}` }] };
      }

      if (action === 'stats') {
        const result = await api<any>('/stats');
        // Compact stats
        return {
          content: [{ type: 'text', text: `Files:${result.files}|Chunks:${result.chunks}|Emb:${result.embeddings}` }]
        };
      }

      throw new Error(`Unknown action: ${action}`);
    }

    // ============================================
    // NEXUS_MEMORY
    // ============================================
    if (name === 'nexus_memory') {
      const { action, query, type, scope, limit = 10, tier = 2, ids, title, narrative, tags = [], confidence = 0.8 } = args as any;

      if (action === 'recall') {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (type) params.set('type', type);
        if (scope) params.set('scope', scope);
        params.set('limit', String(limit));

        const result = await api<{ memories: any[]; total: number }>(`/memory/recall?${params}`);

        // Tier-based output
        if (tier === 1) {
          // Tier 1: IDs + confidence only (~5 tokens/item)
          const compact = result.memories.map((m: any) =>
            `${m.id}|${Math.round(m.confidence * 100)}`
          ).join(' ');
          return { content: [{ type: 'text', text: compact || 'Empty' }] };
        }

        // Tier 2 (default): Compact format (~12 tokens/item)
        const compact = result.memories.map((m: any) =>
          `${m.id}|${TYPE_SHORT[m.type] || m.type}|${SCOPE_SHORT[m.scope] || m.scope}|${m.summary || m.title}|${Math.round(m.confidence * 100)}`
        ).join('\n');

        return { content: [{ type: 'text', text: compact || 'No memories' }] };
      }

      if (action === 'get') {
        if (!ids || ids.length === 0) throw new Error('ids required for get');
        const result = await api<{ memories: any[] }>('/memory/batch', {
          method: 'POST',
          body: JSON.stringify({ ids }),
        });

        // Full content but still compact format
        const full = result.memories.map((m: any) =>
          `[${m.id}] ${m.title}\n${TYPE_SHORT[m.type] || m.type}|${SCOPE_SHORT[m.scope] || m.scope}|${Math.round(m.confidence * 100)}%\n${m.narrative || ''}\nTags:${(m.tags || []).join(',')}`
        ).join('\n---\n');

        return { content: [{ type: 'text', text: full || 'No memories' }] };
      }

      if (action === 'upsert') {
        if (!type || !title) throw new Error('type and title required for upsert');
        const result = await api<{ id: number }>('/memory', {
          method: 'POST',
          body: JSON.stringify({
            session_id: `mcp-${Date.now()}`,
            project: 'nexus',
            type,
            scope: scope || 'repo',
            title,
            narrative,
            tags,
            confidence,
          }),
        });

        return { content: [{ type: 'text', text: `Created:${result.id}` }] };
      }

      if (action === 'timeline') {
        const { anchor, window = 5 } = args as any;
        if (!anchor) throw new Error('anchor (memory ID) required for timeline');

        const result = await api<{ target_id: number; session_id: string; before: any[]; after: any[] }>(
          `/memory/${anchor}/timeline?window=${window}`
        );

        // Format timeline: before → [anchor] → after
        const formatObs = (o: any) => `${o.id}|${TYPE_SHORT[o.type] || o.type}|${o.summary || o.title}`;

        const lines: string[] = [];

        // Before (oldest first)
        for (const o of result.before) {
          lines.push(`← ${formatObs(o)}`);
        }

        // Anchor point
        lines.push(`→ [${result.target_id}] (anchor)`);

        // After (newest first)
        for (const o of result.after) {
          lines.push(`→ ${formatObs(o)}`);
        }

        const compact = lines.join('\n');
        return { content: [{ type: 'text', text: compact || 'No timeline data' }] };
      }

      throw new Error(`Unknown action: ${action}`);
    }

    // ============================================
    // NEXUS_LEARN
    // ============================================
    if (name === 'nexus_learn') {
      const { action, query, lang, framework, patternId, variables, mode = 'dry-run', outcome, notes } = args as any;

      if (action === 'recall') {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (lang) params.set('lang', lang);
        if (framework) params.set('framework', framework);
        params.set('limit', '3'); // Max 3 patterns

        const result = await api<{ patterns: any[] }>(`/patterns/recall?${params}`);

        // Compact pattern format (~15 tokens/item)
        const compact = result.patterns.map((p: any) =>
          `${p.id}|${p.title}|${p.intent}|${p.lang || ''}|${p.framework || ''}|${Math.round(p.success_rate * 100)}%|${p.usage_count}`
        ).join('\n');

        return { content: [{ type: 'text', text: compact || 'No patterns' }] };
      }

      if (action === 'templates') {
        if (!patternId) throw new Error('patternId required for templates');
        const result = await api<{ variables: any[]; templates: any[]; checklist: string[]; gotchas: string[] }>(`/patterns/${patternId}/templates`);

        // Compact but complete
        let output = 'VARS:' + result.variables.map((v: any) =>
          `{{${v.name}}}:${v.type}${v.transform ? `:${v.transform}` : ''}`
        ).join(',');

        output += '\nTEMPLATES:\n' + result.templates.map((t: any) =>
          `[${t.path}]\n${t.content}`
        ).join('\n---\n');

        if (result.checklist.length > 0) {
          output += '\nCHECK:' + result.checklist.join('|');
        }
        if (result.gotchas.length > 0) {
          output += '\nWARN:' + result.gotchas.join('|');
        }

        return { content: [{ type: 'text', text: output }] };
      }

      if (action === 'apply') {
        if (!patternId || !variables) throw new Error('patternId and variables required for apply');
        const result = await api<any>(`/patterns/${patternId}/apply`, {
          method: 'POST',
          body: JSON.stringify({ variables, mode }),
        });

        let output = `MODE:${result.mode}\n`;
        output += result.files.map((f: any) =>
          `[${f.action}]${f.path}\n${f.content}`
        ).join('\n---\n');

        if (result.checklist?.length > 0) {
          output += '\nCHECK:' + result.checklist.join('|');
        }

        return { content: [{ type: 'text', text: output }] };
      }

      if (action === 'feedback') {
        if (!patternId || !outcome) throw new Error('patternId and outcome required for feedback');
        await api(`/patterns/${patternId}/feedback`, {
          method: 'POST',
          body: JSON.stringify({ outcome, notes }),
        });

        return { content: [{ type: 'text', text: `OK:${outcome}` }] };
      }

      throw new Error(`Unknown action: ${action}`);
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `ERR:${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// Define prompts
const PROMPTS = [
  {
    name: 'session_start',
    description: 'Context injection at session start',
  },
  {
    name: 'onboarding',
    description: 'Project onboarding with top patterns',
  },
];

// List prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  try {
    if (name === 'session_start') {
      const stats = await api<any>('/stats');
      const memories = await api<{ memories: any[] }>('/memory/recall?limit=5');
      const patterns = await api<{ patterns: any[] }>('/patterns/recall?limit=3');

      // Ultra-compact prompt injection
      let prompt = `NEXUS|Files:${stats.files}|Chunks:${stats.chunks}|Emb:${stats.embeddings}\n`;
      prompt += `MEM:${memories.memories.map((m: any) => `${TYPE_SHORT[m.type] || m.type}:${m.summary || m.title}`).join('|') || 'none'}\n`;
      prompt += `PAT:${patterns.patterns.map((p: any) => `${p.title}(${Math.round(p.success_rate * 100)}%)`).join('|') || 'none'}`;

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      };
    }

    if (name === 'onboarding') {
      const patterns = await api<{ patterns: any[] }>('/patterns/recall?limit=5');

      let prompt = 'PATTERNS:\n' + patterns.patterns.map((p: any) =>
        `${p.id}|${p.title}|${p.intent}|${Math.round(p.success_rate * 100)}%`
      ).join('\n');

      prompt += '\nUSE:nexus_code(search/open)|nexus_memory(recall/get/upsert)|nexus_learn(recall/templates/apply/feedback)';

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  } catch (error) {
    return {
      messages: [{ role: 'user', content: { type: 'text', text: `ERR:${error}` } }],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Nexus MCP Server v0.2.0 (Turbo) running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
