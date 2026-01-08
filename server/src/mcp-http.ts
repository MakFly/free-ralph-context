/**
 * MCP Streamable HTTP Transport
 *
 * This module sets up the MCP server with Streamable HTTP transport
 * using the official WebStandardStreamableHTTPServerTransport from the SDK.
 *
 * Usage:
 *   client: claude mcp add --transport http https://your-server.com/mcp
 *
 * Specification: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

// Import tool handlers
import {
  createContext,
  getContext,
  listContexts,
  deleteContext,
  updateContext,
} from './tools/context.js';
import {
  addMemory,
  deleteMemory,
  updateMemory,
} from './tools/memory.js';
import { searchMemories as searchMemoriesFirst } from './tools/search-first.js';
import { autoSaveMemory } from './tools/auto-save.js';
import { mgrep, mgrepFiles } from './tools/mgrep.js';

/**
 * Create MCP server with all tools registered
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'free-context-server',
    version: '0.1.0',
  });

  // Register context tools
  server.registerTool(
    'create_context',
    {
      description: 'Create a new context (collection of memories)',
      inputSchema: z.object({
        name: z.string().min(1).max(200).describe('Name of the context'),
        description: z.string().optional().describe('Optional description'),
        tags: z.array(z.string()).optional().describe('Optional tags'),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional().describe('Optional metadata'),
      }),
    },
    async (args) => {
      const result = await createContext(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'get_context',
    {
      description: 'Get details of a specific context',
      inputSchema: z.object({
        contextId: z.string().describe('ID of the context'),
      }),
    },
    async (args) => {
      const result = await getContext(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'list_contexts',
    {
      description: 'List all contexts',
      inputSchema: z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    },
    async (args) => {
      const result = await listContexts(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'update_context',
    {
      description: 'Update an existing context',
      inputSchema: z.object({
        contextId: z.string().describe('ID of the context'),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional(),
      }),
    },
    async (args) => {
      const result = await updateContext(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'delete_context',
    {
      description: 'Delete a context and all its memories',
      inputSchema: z.object({
        contextId: z.string().describe('ID of the context'),
      }),
    },
    async (args) => {
      const result = await deleteContext(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register memory tools
  server.registerTool(
    'add_memory',
    {
      description: 'Add a new memory to a context',
      inputSchema: z.object({
        contextId: z.string().describe('ID of the context'),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']),
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional(),
      }),
    },
    async (args) => {
      const result = await addMemory(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'update_memory',
    {
      description: 'Update an existing memory',
      inputSchema: z.object({
        memoryId: z.string().describe('ID of the memory'),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
        metadata: z.record(z.any()).optional(),
      }),
    },
    async (args) => {
      const result = await updateMemory(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'delete_memory',
    {
      description: 'Delete a memory',
      inputSchema: z.object({
        memoryId: z.string().describe('ID of the memory'),
      }),
    },
    async (args) => {
      const result = await deleteMemory(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register search tools
  server.registerTool(
    'search_memories',
    {
      description: 'Search-First tool: Find memories with compact excerpts',
      inputSchema: z.object({
        query: z.string().min(1),
        contextId: z.string().optional(),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
        stack: z.enum(['nextjs', 'laravel', 'symfony', 'react19', 'vuejs', 'devops', 'php-api-platform', 'basic', 'search', 'automation', 'advanced']).optional(),
        limit: z.number().optional().default(10),
        mode: z.enum(['compact', 'standard', 'detailed']).optional().default('compact'),
      }),
    },
    async (args) => {
      const result = await searchMemoriesFirst(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register automation tools
  server.registerTool(
    'auto_save_memory',
    {
      description: 'Intelligently save content with duplicate detection',
      inputSchema: z.object({
        content: z.string().min(1),
        contextId: z.string().optional(),
        type: z.enum(['note', 'conversation', 'snippet', 'reference', 'task', 'idea']).optional(),
        title: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        checkDuplicates: z.boolean().optional().default(true),
        duplicateThreshold: z.number().optional().default(0.8),
      }),
    },
    async (args) => {
      const result = await autoSaveMemory(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register file search tools
  server.registerTool(
    'mgrep',
    {
      description: 'Ultra-fast file content search optimized for minimal token usage',
      inputSchema: z.object({
        pattern: z.string().min(1),
        path: z.string().optional(),
        glob: z.string().optional(),
        ignoreCase: z.boolean().optional().default(false),
        contextLines: z.number().min(0).max(5).optional().default(2),
        maxResults: z.number().optional().default(50),
        outputMode: z.enum(['concise', 'context', 'files-with-matches']).optional().default('concise'),
      }),
    },
    async (args) => {
      const result = await mgrep(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    'mgrep_files',
    {
      description: 'Fast file discovery using glob patterns',
      inputSchema: z.object({
        pattern: z.string().optional().default('*'),
        path: z.string().optional(),
        maxResults: z.number().optional().default(100),
      }),
    },
    async (args) => {
      const result = await mgrepFiles(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}

/**
 * Create Hono app with MCP Streamable HTTP endpoint
 */
export async function createMcpHttpApp() {
  // Create MCP server
  const server = createMcpServer();

  // Create transport with session management
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => {
      // Generate a unique session ID
      return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    },
    onsessioninitialized: (sessionId) => {
      console.log(`[MCP] Session initialized: ${sessionId}`);
    },
    onsessionclosed: (sessionId) => {
      console.log(`[MCP] Session closed: ${sessionId}`);
    },
  });

  // Connect server to transport
  await server.connect(transport);

  // Create Hono app
  const app = new Hono();

  // Enable CORS
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version', 'Authorization'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
  }));

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      transport: 'streamable-http',
      timestamp: new Date().toISOString(),
    });
  });

  // MCP endpoint - handle all HTTP methods
  app.all('/mcp', async (c) => {
    const response = await transport.handleRequest(c.req.raw);
    return response;
  });

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'Free Context MCP Server',
      version: '0.1.0',
      transport: 'streamable-http',
      endpoints: {
        health: '/health',
        mcp: '/mcp',
      },
    });
  });

  return { app, transport, server };
}

/**
 * Start MCP HTTP server
 */
export async function startMcpHttpServer(port: number = 3001) {
  const { app } = await createMcpHttpApp();

  const server = Bun.serve({
    fetch: app.fetch,
    port,
  });

  console.log(`[MCP HTTP] Server running on http://localhost:${port}`);
  console.log(`[MCP HTTP] Health check: http://localhost:${port}/health`);
  console.log(`[MCP HTTP] MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`[MCP HTTP] Usage: claude mcp add --transport http http://localhost:${port}/mcp`);

  return server;
}
