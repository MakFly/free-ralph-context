import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'

// MCP Tools list
const MCP_TOOLS = [
  {
    name: 'ralph_malloc',
    description: 'Initialize a new Ralph session for context management',
    category: 'Session',
  },
  {
    name: 'ralph_get_status',
    description: 'Get session status including token usage and memory count',
    category: 'Session',
  },
  {
    name: 'ralph_compress',
    description:
      'Compress trajectory while preserving critical information (3-5x reduction)',
    category: 'Context',
  },
  {
    name: 'ralph_add_memory',
    description:
      'Store an important decision, action, or context for later retrieval',
    category: 'Memory',
  },
  {
    name: 'ralph_search',
    description: 'Search memories semantically to recall past decisions',
    category: 'Memory',
  },
  {
    name: 'ralph_checkpoint',
    description: 'Create a named checkpoint of the current session state',
    category: 'Session',
  },
  {
    name: 'ralph_should_fold',
    description: 'Evaluate if context should be folded based on current usage',
    category: 'Context',
  },
  {
    name: 'ralph_fold',
    description:
      'Execute context folding: compress trajectory + create checkpoint',
    category: 'Context',
  },
  {
    name: 'ralph_curate',
    description: 'Curate memories to keep only high-value entries',
    category: 'Memory',
  },
  {
    name: 'ralph_scan_project',
    description:
      'Scan project to detect framework, patterns, and conventions. ONE-TIME setup',
    category: 'Patterns',
  },
  {
    name: 'ralph_learn_pattern',
    description:
      'Learn and store a code pattern for later reuse. Saves ~1500 tokens/use',
    category: 'Patterns',
  },
  {
    name: 'ralph_get_pattern',
    description:
      'Get a learned pattern by name or description with code examples',
    category: 'Patterns',
  },
  {
    name: 'ralph_list_patterns',
    description: 'List all learned patterns for this project/session',
    category: 'Patterns',
  },
]

export function MCPPPage() {
  return (
    <AppLayout title="MCP Server">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-mono">Ralph MCP Server</h1>
          <p className="text-muted-foreground">
            Model Context Protocol server for Claude Code - Pattern learning &
            context optimization
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-4 rounded-lg border p-4 bg-card">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium">Connected</span>
          </div>
          <div className="text-sm text-muted-foreground">
            API:{' '}
            <code className="px-2 py-1 rounded bg-muted">
              http://localhost:8000
            </code>
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="rounded-lg border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Architecture</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="font-mono font-semibold text-blue-500">
                Claude Code
              </div>
              <div className="text-xs text-muted-foreground">MCP Client</div>
            </div>
            <div className="text-2xl">→</div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="font-mono font-semibold text-violet-500">
                Ralph MCP
              </div>
              <div className="text-xs text-muted-foreground">
                stdio Server (Python)
              </div>
            </div>
            <div className="text-2xl">→</div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="font-mono font-semibold text-emerald-500">
                Ralph API
              </div>
              <div className="text-xs text-muted-foreground">
                FastAPI + Docker
              </div>
            </div>
          </div>
        </div>

        {/* Pattern Learning Section */}
        <div className="rounded-lg border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            Pattern Learning - Save Tokens Forever
          </h2>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Learn a code pattern once (cost: ~2000 tokens), reuse forever
              (save: ~1500 tokens per use). After just 2 uses, you're saving
              tokens on every request!
            </p>

            {/* Example: Next.js Server Actions */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="font-semibold text-blue-400">
                Example: Next.js Server Actions
              </div>
              <div className="font-mono text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                <span className="text-blue-400">You:</span> ralph_learn_pattern
                with pattern_name=&quot;NextJS Server Actions&quot;,
                description=&quot;Server Actions are async functions&quot;,
                tags=[&quot;nextjs&quot;, &quot;server-actions&quot;]
                <br />
                <br />
                <span className="text-violet-400">Claude:</span> [Calls
                ralph_learn_pattern tool]
                <br />
                <span className="text-emerald-400">✅</span> Pattern learned!
                ID: pattern-nextjs-server-actions-a1b2c3
                <br />
                <br />
                <span className="text-blue-400">You:</span> Create a server
                action to delete a todo
                <br />
                <span className="text-violet-400">Claude:</span> [Calls
                ralph_get_pattern with query=&quot;NextJS Server Actions&quot;]
                <br />
                <span className="text-amber-400">📋</span> Pattern retrieved!
                Using learned structure...
                <br />
                <span className="text-emerald-400">✅</span> Created delete
                action following the learned pattern
                <br />
                <span className="text-green-400">💰</span> Saved ~1500 tokens by
                reusing pattern!
              </div>
            </div>

            {/* Example: Laravel Controller */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="font-semibold text-red-400">
                Example: Laravel Controller
              </div>
              <div className="font-mono text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                <span className="text-blue-400">You:</span> ralph_learn_pattern
                with pattern_name=&quot;Laravel Resource Controller&quot;,
                description=&quot;Standard REST controller&quot;,
                tags=[&quot;laravel&quot;, &quot;controller&quot;,
                &quot;rest&quot;]
                <br />
                <br />
                <span className="text-violet-400">Claude:</span> [Calls
                ralph_learn_pattern tool]
                <br />
                <span className="text-emerald-400">✅</span> Pattern learned!
                ID: pattern-laravel-resource-controller-x9y8z7
                <br />
                <br />
                <span className="text-blue-400">You:</span> Generate a
                CategoryController following our project conventions
                <br />
                <span className="text-violet-400">Claude:</span> [Calls
                ralph_get_pattern with query=&quot;Laravel Resource
                Controller&quot;]
                <br />
                <span className="text-amber-400">📋</span> Pattern retrieved!
                Applying to CategoryController...
                <br />
                <span className="text-emerald-400">✅</span> Generated
                CategoryController with all REST methods
                <br />
                <span className="text-green-400">💰</span> Saved ~2000 tokens!
              </div>
            </div>

            {/* Token Savings */}
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="font-semibold text-green-400 mb-2">
                Token Savings Calculator
              </div>
              <div className="text-xs space-y-1">
                <div>
                  • <strong>One-time cost:</strong> ~2000 tokens to learn a
                  pattern
                </div>
                <div>
                  • <strong>Per-use savings:</strong> ~1500-2000 tokens
                </div>
                <div>
                  • <strong>Break-even:</strong> 1-2 uses
                </div>
                <div>
                  • <strong>After 10 uses:</strong> Saved 13,000-18,000 tokens!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MCP Tools */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-semibold">
              Available Tools ({MCP_TOOLS.length})
            </h2>
            <div className="text-sm text-muted-foreground">
              Prefix: <code className="px-2 py-1 rounded bg-muted">ralph_</code>
            </div>
          </div>
          <div className="divide-y">
            {MCP_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="flex flex-col gap-1 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <code
                      className={`text-sm font-semibold ${
                        tool.category === 'Patterns'
                          ? 'text-amber-500'
                          : 'text-violet-500'
                      }`}
                    >
                      {tool.name}
                    </code>
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      tool.category === 'Patterns'
                        ? 'bg-amber-500/20 text-amber-500'
                        : 'bg-muted'
                    }`}
                  >
                    {tool.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Example */}
        <div className="rounded-lg border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Usage in Claude</h2>
          <div className="space-y-4 text-sm">
            <div className="flex flex-col gap-2">
              <div className="font-mono text-xs bg-muted p-3 rounded-lg">
                <span className="text-blue-400">You:</span> ralph_malloc with
                task description "Build a REST API"
                <br />
                <span className="text-violet-400">Claude:</span> [Calls
                ralph_malloc tool]
                <br />
                <span className="text-emerald-400">✅</span> Session
                initialized: abc-123-def
                <br />
                <br />
                <span className="text-blue-400">You:</span> ralph_add_memory
                "Using FastAPI for this project"
                <br />
                <span className="text-violet-400">Claude:</span> [Calls
                ralph_add_memory tool]
                <br />
                <span className="text-emerald-400">✅</span> Memory stored:
                decision/high priority
                <br />
                <br />
                <span className="text-blue-400">You:</span> ralph_get_status
                <br />
                <span className="text-violet-400">Claude:</span> [Calls
                ralph_get_status tool]
                <br />
                <span className="text-emerald-400">Session:</span> abc-123-def
                <br />
                <span className="text-emerald-400">Token usage:</span> 15,234 /
                200,000 (7.6%)
                <br />
                <span className="text-emerald-400">Memories:</span> 1
              </div>
            </div>
          </div>
        </div>

        {/* Installation Info */}
        <div className="rounded-lg border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Installation</h2>
          <div className="space-y-4 text-sm">
            <div className="flex flex-col gap-2">
              <div className="font-semibold">1. Install MCP Server</div>
              <div className="font-mono text-xs bg-muted p-3 rounded-lg">
                <span className="text-blue-400">$</span> cd ralph-mcp
                <br />
                <span className="text-blue-400">$</span> ./install.sh
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="font-semibold">2. Restart Claude Desktop</div>
              <div className="text-muted-foreground">
                The MCP tools will be available automatically after restart.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
