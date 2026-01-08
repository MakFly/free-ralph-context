/**
 * MCP Transport Setup
 *
 * This module creates and configures the MCP server with Streamable HTTP transport
 * using the official SDK.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import * as z from 'zod/v4';
import * as contextTools from './tools/context.js';
import * as memoryTools from './tools/memory.js';
import * as searchFirstTools from './tools/search-first.js';
import * as autoSave from './tools/auto-save.js';
import * as mgrepTools from './tools/mgrep.js';

// Singleton instance
let mcpTransport: WebStandardStreamableHTTPServerTransport | null = null;

/**
 * Create and configure MCP server with all tools
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'free-context-server',
    version: '0.1.0',
  });

  // Context tools
  server.registerTool(
    'create_context',
    {
      description: 'Create a new context (collection of memories)',
      inputSchema: {
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional(),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await contextTools.createContext(args), null, 2) }],
    })
  );

  server.registerTool(
    'get_context',
    {
      description: 'Get details of a specific context',
      inputSchema: {
        contextId: z.string(),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await contextTools.getContext(args), null, 2) }],
    })
  );

  server.registerTool(
    'list_contexts',
    {
      description: 'List all contexts',
      inputSchema: {
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await contextTools.listContexts(args), null, 2) }],
    })
  );

  server.registerTool(
    'update_context',
    {
      description: 'Update an existing context',
      inputSchema: {
        contextId: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional(),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await contextTools.updateContext(args), null, 2) }],
    })
  );

  server.registerTool(
    'delete_context',
    {
      description: 'Delete a context and all its memories',
      inputSchema: {
        contextId: z.string(),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await contextTools.deleteContext(args), null, 2) }],
    })
  );

  // Memory tools
  server.registerTool(
    'add_memory',
    {
      description: 'Add a new memory to a context',
      inputSchema: {
        contextId: z.string(),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']),
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional(),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await memoryTools.addMemory(args), null, 2) }],
    })
  );

  server.registerTool(
    'update_memory',
    {
      description: 'Update an existing memory',
      inputSchema: {
        memoryId: z.string(),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional(),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await memoryTools.updateMemory(args), null, 2) }],
    })
  );

  server.registerTool(
    'delete_memory',
    {
      description: 'Delete a memory',
      inputSchema: {
        memoryId: z.string(),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await memoryTools.deleteMemory(args), null, 2) }],
    })
  );

  // Search tools
  server.registerTool(
    'search_memories',
    {
      description: 'Search-First tool: Find memories with compact excerpts',
      inputSchema: {
        query: z.string().min(1),
        contextId: z.string().optional(),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        limit: z.number().optional().default(10),
        mode: z.enum(['compact', 'standard', 'detailed']).optional().default('compact'),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await searchFirstTools.searchMemories(args), null, 2) }],
    })
  );

  // Automation tools
  server.registerTool(
    'auto_save_memory',
    {
      description: 'Intelligently save content with duplicate detection',
      inputSchema: {
        content: z.string().min(1),
        contextId: z.string().optional(),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
        title: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        checkDuplicates: z.boolean().optional().default(true),
        duplicateThreshold: z.number().optional().default(0.8),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await autoSave.autoSaveMemory(args), null, 2) }],
    })
  );

  // File search tools
  server.registerTool(
    'mgrep',
    {
      description: 'Ultra-fast file content search',
      inputSchema: {
        pattern: z.string().min(1),
        path: z.string().optional(),
        glob: z.string().optional(),
        ignoreCase: z.boolean().optional().default(false),
        contextLines: z.number().min(0).max(5).optional().default(2),
        maxResults: z.number().optional().default(50),
        outputMode: z.enum(['concise', 'context', 'files-with-matches']).optional().default('concise'),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await mgrepTools.mgrep(args), null, 2) }],
    })
  );

  server.registerTool(
    'mgrep_files',
    {
      description: 'Fast file discovery using glob patterns',
      inputSchema: {
        pattern: z.string().optional().default('*'),
        path: z.string().optional(),
        maxResults: z.number().optional().default(100),
      },
    },
    async (args) => ({
      content: [{ type: 'text', text: JSON.stringify(await mgrepTools.mgrepFiles(args), null, 2) }],
    })
  );

  return server;
}

/**
 * Create MCP transport handler
 * Returns a function that handles incoming HTTP requests
 */
export async function createMcpTransport(): Promise<(req: Request) => Promise<Response>> {
  // Return singleton if already created
  if (mcpTransport) {
    return mcpTransport.handleRequest.bind(mcpTransport);
  }

  // Create MCP server
  const server = createMcpServer();

  // Create transport
  mcpTransport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => {
      return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    },
  });

  // Connect server to transport
  await server.connect(mcpTransport);

  console.log('[MCP] Streamable HTTP transport initialized');

  // Return request handler
  return mcpTransport.handleRequest.bind(mcpTransport);
}

/**
 * Close MCP transport (cleanup)
 */
export async function closeMcpTransport() {
  if (mcpTransport) {
    await mcpTransport.close();
    mcpTransport = null;
    console.log('[MCP] Transport closed');
  }
}
