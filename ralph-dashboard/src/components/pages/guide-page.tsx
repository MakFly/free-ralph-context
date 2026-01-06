'use client'

import * as React from 'react'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Terminal,
  XCircle,
  Zap,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { fetchMCPStatus, useRalphData } from '@/stores/ralph-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ============================================================
// COPY BUTTON
// ============================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={copy}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  )
}

// ============================================================
// CODE BLOCK (compact)
// ============================================================

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="group relative rounded-lg border bg-zinc-950 overflow-hidden">
      <pre className="p-3 text-xs overflow-x-auto">
        <code className="text-zinc-300 font-mono">{children}</code>
      </pre>
      <div className="absolute top-1 right-1">
        <CopyButton text={children} />
      </div>
    </div>
  )
}

// ============================================================
// COLLAPSIBLE SECTION
// ============================================================

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-violet-500" />
          <span className="font-semibold text-sm">{title}</span>
          {count && (
            <Badge variant="outline" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-3 pt-0 border-t">{children}</div>}
    </div>
  )
}

// ============================================================
// MCP TOOLS DATA
// ============================================================

const MCP_TOOLS = {
  session: [
    {
      name: 'ralph_malloc',
      desc: 'Initialize session',
      usage: 'ralph_malloc("Build REST API")',
    },
    {
      name: 'ralph_free',
      desc: 'End session + extract learnings',
      usage: 'ralph_free()',
    },
    {
      name: 'ralph_get_status',
      desc: 'Get token usage & stats',
      usage: 'ralph_get_status()',
    },
    {
      name: 'ralph_restore_session',
      desc: 'Restore previous session',
      usage: 'ralph_restore_session("session-id")',
    },
  ],
  memory: [
    {
      name: 'ralph_add_memory',
      desc: 'Store important info',
      usage: 'ralph_add_memory("Using JWT auth", category="decision")',
    },
    {
      name: 'ralph_recall',
      desc: 'Recall by keywords',
      usage: 'ralph_recall("authentication")',
    },
    {
      name: 'ralph_search',
      desc: 'Semantic search',
      usage: 'ralph_search("how did we handle auth?")',
    },
    {
      name: 'ralph_curate',
      desc: 'Clean low-value memories',
      usage: 'ralph_curate()',
    },
  ],
  context: [
    {
      name: 'ralph_compress',
      desc: 'Compress trajectory 3-5x',
      usage: 'ralph_compress(trajectory)',
    },
    {
      name: 'ralph_should_fold',
      desc: 'Check if folding needed',
      usage: 'ralph_should_fold()',
    },
    {
      name: 'ralph_fold',
      desc: 'Compress + checkpoint',
      usage: 'ralph_fold(trajectory, "phase-1")',
    },
    {
      name: 'ralph_checkpoint',
      desc: 'Save session state',
      usage: 'ralph_checkpoint("before-refactor")',
    },
  ],
  search: [
    {
      name: 'ralph_warpgrep',
      desc: 'Multi-pattern parallel search',
      usage: 'ralph_warpgrep([{type:"literal", value:"auth"}])',
    },
    {
      name: 'ralph_cross_search',
      desc: 'Search across all sessions',
      usage: 'ralph_cross_search("payment integration")',
    },
    {
      name: 'ralph_inherit_memories',
      desc: 'Import from past sessions',
      usage: 'ralph_inherit_memories(["auth", "api"])',
    },
  ],
  patterns: [
    {
      name: 'ralph_scan_project',
      desc: 'Detect framework & patterns',
      usage: 'ralph_scan_project()',
    },
    {
      name: 'ralph_learn_pattern',
      desc: 'Store reusable pattern',
      usage: 'ralph_learn_pattern("NextJS Server Actions")',
    },
    {
      name: 'ralph_get_pattern',
      desc: 'Retrieve learned pattern',
      usage: 'ralph_get_pattern("server actions")',
    },
    {
      name: 'ralph_list_patterns',
      desc: 'List all patterns',
      usage: 'ralph_list_patterns()',
    },
  ],
  orchestration: [
    {
      name: 'ralph_orchestrate',
      desc: 'Get agent + tool recommendations',
      usage: 'ralph_orchestrate("implement auth")',
    },
    {
      name: 'ralph_should_spawn',
      desc: 'Check if subprocess needed',
      usage: 'ralph_should_spawn()',
    },
  ],
  cortex: [
    {
      name: 'ralph_cortex',
      desc: 'AI decision engine - routes to agents/skills',
      usage: 'ralph_cortex("trouve l\'auth")',
    },
    {
      name: '/cortex',
      desc: 'Slash command - shortcut for ralph_cortex',
      usage: '/cortex où sont les tests ?',
    },
    {
      name: 'ralph_learn_from_transcripts',
      desc: 'Learn patterns from Claude history',
      usage: 'ralph_learn_from_transcripts(50)',
    },
  ],
}

// ============================================================
// WORKFLOW STEPS
// ============================================================

const WORKFLOWS = {
  basic: {
    title: 'Basic Session',
    icon: Rocket,
    steps: [
      {
        tool: 'ralph_malloc',
        say: 'Initialize a session for: Build user authentication',
        result: 'Session created: abc-123',
      },
      {
        tool: 'ralph_add_memory',
        say: 'Store: Using bcrypt for password hashing',
        result: 'Memory stored: decision/high',
      },
      {
        tool: 'ralph_get_status',
        say: 'Check my context usage',
        result: '15,234 / 200,000 tokens (7.6%)',
      },
      {
        tool: 'ralph_free',
        say: 'End this session',
        result: 'Session closed, learnings extracted',
      },
    ],
  },
  context: {
    title: 'Context Management',
    icon: Brain,
    steps: [
      {
        tool: 'ralph_get_status',
        say: 'Check context usage',
        result: 'Context at 68% - approaching threshold',
      },
      {
        tool: 'ralph_should_fold',
        say: 'Should I compress?',
        result: 'Yes, recommend folding at 70%',
      },
      {
        tool: 'ralph_fold',
        say: "Fold with checkpoint 'api-complete'",
        result: 'Compressed 3.2x, checkpoint saved',
      },
      {
        tool: 'ralph_get_status',
        say: 'Check context now',
        result: 'Context at 22% - ready for more work',
      },
    ],
  },
  patterns: {
    title: 'Pattern Learning',
    icon: Sparkles,
    steps: [
      {
        tool: 'ralph_scan_project',
        say: 'Scan this project',
        result: 'Detected: Next.js 14, App Router, TypeScript',
      },
      {
        tool: 'ralph_learn_pattern',
        say: 'Learn our Server Actions pattern',
        result: 'Pattern learned! ID: pattern-xyz',
      },
      {
        tool: 'ralph_get_pattern',
        say: 'Get the server actions pattern',
        result: 'Pattern retrieved with code examples',
      },
      {
        tool: 'ralph_list_patterns',
        say: 'List all learned patterns',
        result: '3 patterns: Server Actions, API Routes, Components',
      },
    ],
  },
  search: {
    title: 'Fast Search',
    icon: Search,
    steps: [
      {
        tool: 'ralph_warpgrep',
        say: 'Search for auth, login, and session files',
        result: 'Found 47 matches in 12 files (2.3s)',
      },
      {
        tool: 'ralph_cross_search',
        say: 'How did we handle OAuth before?',
        result: 'Found in session from 3 days ago',
      },
      {
        tool: 'ralph_inherit_memories',
        say: 'Import OAuth knowledge',
        result: 'Imported 5 relevant memories',
      },
    ],
  },
  cortex: {
    title: 'Cortex AI',
    icon: Sparkles,
    steps: [
      {
        tool: '/cortex',
        say: 'Où sont les tests dans ce projet ?',
        result: 'Analyse → Route vers swe-scout → Résultats en 2s',
      },
      {
        tool: '/cortex',
        say: 'Fix la typo dans login',
        result: 'Analyse → Route vers snipper → Fix appliqué',
      },
      {
        tool: '/cortex',
        say: 'Commit ces changements',
        result: 'Analyse → Route vers /commit skill → Git commité',
      },
      {
        tool: 'ralph_learn_from_transcripts',
        say: 'Apprends de mes habitudes',
        result: '5 patterns découverts dans 50 transcripts',
      },
    ],
  },
}

// ============================================================
// CATEGORY ICONS
// ============================================================

const CategoryIcon = ({ category }: { category: keyof typeof MCP_TOOLS }) => {
  const icons = {
    session: <Folder className="h-3 w-3 text-blue-500" />,
    memory: <Brain className="h-3 w-3 text-emerald-500" />,
    context: <Brain className="h-3 w-3 text-violet-500" />,
    search: <Search className="h-3 w-3 text-amber-500" />,
    patterns: <Sparkles className="h-3 w-3 text-pink-500" />,
    orchestration: <Zap className="h-3 w-3 text-cyan-500" />,
    cortex: <Sparkles className="h-3 w-3 text-fuchsia-500" />,
  }
  return icons[category]
}

// ============================================================
// GUIDE PAGE
// ============================================================

export function GuidePage() {
  const { mcpStatus } = useRalphData()
  const [refreshing, setRefreshing] = React.useState(false)
  const [activeWorkflow, setActiveWorkflow] =
    React.useState<keyof typeof WORKFLOWS>('basic')
  const [openToolCategory, setOpenToolCategory] =
    React.useState<string>('session')

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMCPStatus()
    setTimeout(() => setRefreshing(false), 500)
  }

  return (
    <AppLayout title="Ralph Guide">
      <div className="flex flex-col gap-4 p-6">
        {/* ============================================================ */}
        {/* HEADER + STATUS (same row) */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-violet-500" />
            <h1 className="text-xl font-bold font-mono">Ralph MCP Guide</h1>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className={cn(
                  'gap-1.5 border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-500/50 cursor-pointer',
                  !mcpStatus?.connected && 'opacity-50',
                )}
              >
                {refreshing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : mcpStatus?.connected ? (
                  <CheckCircle className="h-3 w-3 text-violet-500" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 bg-violet-500/20"
                >
                  {mcpStatus?.tools_count || 0} tools
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cliquer pour actualiser</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ============================================================ */}
        {/* QUICK START */}
        {/* ============================================================ */}
        <Card className="p-4 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 border-violet-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Quick Start</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Terminal className="h-3 w-3 text-violet-500" />
                Start Services
              </div>
              <CodeBlock>{`cd ralph-api && docker up -d
cd ralph-dashboard && bun dev`}</CodeBlock>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Zap className="h-3 w-3 text-amber-500" />
                Restart Claude
              </div>
              <CodeBlock>{`exit && claude
/mcp`}</CodeBlock>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Brain className="h-3 w-3 text-emerald-500" />
                Use Ralph
              </div>
              <CodeBlock>{`"Initialize Ralph for: task"`}</CodeBlock>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/* 2-COLUMN LAYOUT */}
        {/* ============================================================ */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN - Workflows + Tools (7 cols) */}
          <div className="col-span-7 flex flex-col gap-6">
            {/* WORKFLOWS */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold">Workflows</h2>
              </div>

              <Tabs
                value={activeWorkflow}
                onValueChange={(v) =>
                  setActiveWorkflow(v as keyof typeof WORKFLOWS)
                }
              >
                <TabsList className="mb-3 h-8">
                  {Object.entries(WORKFLOWS).map(([key, wf]) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="h-7 text-xs data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-500"
                    >
                      <wf.icon className="h-3 w-3 mr-1" />
                      {wf.title}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(WORKFLOWS).map(([key, wf]) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <div className="space-y-2">
                      {wf.steps.map((step, i) => (
                        <div
                          key={i}
                          className="flex gap-3 p-3 rounded-lg bg-muted/30 border"
                        >
                          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-500 font-bold text-xs">
                            {i + 1}
                          </div>
                          <div className="flex-1 space-y-1">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] h-5"
                            >
                              {step.tool}
                            </Badge>
                            <div className="text-xs">
                              <span className="text-blue-400 font-medium">
                                Say:
                              </span>{' '}
                              <span className="text-foreground">
                                "{step.say}"
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="text-emerald-400 font-medium">
                                →
                              </span>{' '}
                              <span className="text-muted-foreground">
                                {step.result}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>

            {/* TOOLS REFERENCE (accordion) */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold">
                  Tools Reference ({mcpStatus?.tools_count || 28})
                </h2>
              </div>

              <div className="space-y-2">
                {Object.entries(MCP_TOOLS).map(([category, tools]) => (
                  <CollapsibleSection
                    key={category}
                    title={category}
                    icon={
                      (
                        {
                          session: Folder,
                          memory: Brain,
                          context: Brain,
                          search: Search,
                          patterns: Sparkles,
                          orchestration: Zap,
                          cortex: Sparkles,
                        } as const
                      )[category] || Zap
                    }
                    count={tools.length}
                    defaultOpen={category === openToolCategory}
                  >
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="group p-2 rounded text-xs hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                        >
                          <code className="text-violet-400 font-medium text-[11px]">
                            {tool.name}
                          </code>
                          <div className="text-muted-foreground mt-0.5 text-[10px]">
                            {tool.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN - Magic Phrases + Config (5 cols) */}
          <div className="col-span-5 flex flex-col gap-6">
            {/* MAGIC PHRASES (compact grid) */}
            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Magic Phrases</h2>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/50 space-y-1.5">
                  <div className="font-semibold text-[10px] text-amber-500 uppercase tracking-wider">
                    Session
                  </div>
                  <CodeBlock>"Initialize Ralph for: [task]"</CodeBlock>
                  <CodeBlock>"Check my context usage"</CodeBlock>
                  <CodeBlock>"End this Ralph session"</CodeBlock>
                </div>

                <div className="p-2 rounded bg-muted/50 space-y-1.5">
                  <div className="font-semibold text-[10px] text-amber-500 uppercase tracking-wider">
                    Memory
                  </div>
                  <CodeBlock>"Remember: [decision]"</CodeBlock>
                  <CodeBlock>"What do you remember about X?"</CodeBlock>
                  <CodeBlock>"Compress context"</CodeBlock>
                </div>

                <div className="p-2 rounded bg-muted/50 space-y-1.5">
                  <div className="font-semibold text-[10px] text-amber-500 uppercase tracking-wider">
                    Patterns
                  </div>
                  <CodeBlock>"Scan this project"</CodeBlock>
                  <CodeBlock>"Learn our [X] pattern"</CodeBlock>
                  <CodeBlock>"Use the [X] pattern"</CodeBlock>
                </div>

                <div className="p-2 rounded bg-muted/50 space-y-1.5">
                  <div className="font-semibold text-[10px] text-amber-500 uppercase tracking-wider">
                    Search
                  </div>
                  <CodeBlock>"Search for X, Y, Z"</CodeBlock>
                  <CodeBlock>"What did we do for X?"</CodeBlock>
                  <CodeBlock>"Import knowledge about X"</CodeBlock>
                </div>
              </div>

              <div className="mt-3 p-2 rounded bg-violet-500/10 border border-violet-500/20">
                <div className="text-[10px] text-violet-400 font-medium mb-1">
                  💡 Pro tip
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Claude auto-detects these phrases and calls the right Ralph
                  tool
                </div>
              </div>
            </Card>

            {/* CONFIG (compact) */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-semibold">Config</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="font-semibold text-[10px] mb-1.5 text-muted-foreground uppercase tracking-wider">
                    Ports
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                      <span className="text-muted-foreground">API</span>
                      <code>:8000</code>
                    </div>
                    <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Dash</span>
                      <code>:3000</code>
                    </div>
                    <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                      <span className="text-muted-foreground">SSE</span>
                      <code>:3847</code>
                    </div>
                    <div className="flex justify-between p-1.5 bg-muted/50 rounded">
                      <span className="text-muted-foreground">DB</span>
                      <code>sqlite</code>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-[10px] mb-1.5 text-muted-foreground uppercase tracking-wider">
                    Environment
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="p-1.5 bg-muted/50 rounded font-mono truncate">
                      <span className="text-muted-foreground">RALPH_LLM=</span>
                      <span className="text-emerald-400">
                        claude-3-5-sonnet
                      </span>
                    </div>
                    <div className="p-1.5 bg-muted/50 rounded font-mono truncate">
                      <span className="text-muted-foreground">RALPH_DB=</span>
                      <span className="text-violet-400">./ralph.db</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-[10px] mb-1.5 text-muted-foreground uppercase tracking-wider">
                    MCP Config
                  </div>
                  <CodeBlock>{`~/.claude/.claude.json
mcpServers.ralph.command
mcpServers.ralph.args`}</CodeBlock>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
