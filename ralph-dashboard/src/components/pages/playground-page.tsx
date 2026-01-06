'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  CheckCircle,
  Clock,
  ExternalLink,
  GitMerge,
  Loader2,
  Search,
  XCircle,
  Zap,
} from 'lucide-react'
import type { Preset } from '@/components/playground'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fetchLLMStatus, useRalphData } from '@/stores/ralph-store'
import { cn } from '@/lib/utils'
import {
  ParametersPanel,
  PlaygroundProvider,
  PlaygroundToolbar,
  ToolCard,
  usePlayground,
} from '@/components/playground'

const RALPH_API = import.meta.env.VITE_RALPH_API_URL || ''

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface WarpGrepMatch {
  file: string
  line: number
  content: string
}

interface CrossSearchResult {
  id: string
  content: string
  category: string
  score: number
  sessionId: string
}

// ═══════════════════════════════════════════════════════════════════════════
// INNER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PlaygroundContent() {
  const { loading, callHistory, callTool } = usePlayground()
  const { llmStatus } = useRalphData()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Tool State
  const [originalCode, setOriginalCode] = useState(`function greet(name) {
  console.log("Hello " + name);
}`)
  const [editInstructions, setEditInstructions] = useState(
    'Use template literals',
  )
  const [filePath, setFilePath] = useState('src/utils.ts')
  const [fastApplyResult, setFastApplyResult] = useState<{
    success: boolean
    patchedCode: string
    tokensUsed?: number
    latencyMs?: number
  } | null>(null)

  const [searchPattern, setSearchPattern] = useState('function')
  const [searchPath, setSearchPath] = useState(
    '/home/kev/Documents/lab/brainstorming/free-ralph-context/ralph-mcp/src',
  )
  const [warpGrepResults, setWarpGrepResults] = useState<Array<WarpGrepMatch>>(
    [],
  )
  const [warpGrepStats, setWarpGrepStats] = useState<{
    total: number
    files: number
    ms: number
  } | null>(null)

  const [memoryQuery, setMemoryQuery] = useState('compression')
  const [crossResults, setCrossResults] = useState<Array<CrossSearchResult>>([])
  const [crossStats, setCrossStats] = useState<{
    sessions: number
    saved: number
    hint?: string
  } | null>(null)

  const [tokenSavings, setTokenSavings] = useState<{
    extension: number
  } | null>(null)

  // LLM Parameters
  const [llmParams, setLlmParams] = useState({
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  })
  const [currentModel, setCurrentModel] = useState('claude-3-5-sonnet')

  // Handlers
  const handleFastApply = async () => {
    const result = await callTool('fast-apply', '/api/tools/fast-apply', {
      originalCode,
      editInstructions,
      filePath,
      llmParams,
    })
    if (result.data) {
      setFastApplyResult({
        success: (result.data as { success?: boolean }).success ?? true,
        patchedCode:
          (result.data as { patchedCode?: string }).patchedCode || originalCode,
        tokensUsed: (result.data as { tokensUsed?: number }).tokensUsed,
        latencyMs: result.latencyMs,
      })
    }
  }

  const handleWarpGrep = async () => {
    const result = await callTool('warpgrep', '/api/tools/warpgrep', {
      patterns: [{ type: 'literal', value: searchPattern, weight: 1.0 }],
      paths: [searchPath],
      maxResults: 15,
    })
    if (result.data) {
      setWarpGrepResults(
        (result.data as { matches?: Array<WarpGrepMatch> }).matches || [],
      )
      setWarpGrepStats({
        total: (result.data as { totalMatches?: number }).totalMatches || 0,
        files: (result.data as { filesSearched?: number }).filesSearched || 0,
        ms: (result.data as { searchTime?: number }).searchTime || 0,
      })
    }
  }

  const handleCrossSearch = async () => {
    const result = await callTool('cross-search', '/api/tools/cross-search', {
      query: memoryQuery,
      topK: 10,
    })
    if (result.data) {
      setCrossResults(
        (result.data as { results?: Array<CrossSearchResult> }).results || [],
      )
      setCrossStats({
        sessions:
          (result.data as { sessionsSearched?: number }).sessionsSearched || 0,
        saved: (result.data as { tokensSaved?: number }).tokensSaved || 0,
        hint: (result.data as { hint?: string }).hint,
      })
    }
  }

  const handleTokenSavings = async () => {
    const result = await callTool('token-savings', '/api/token-savings')
    if (result.data) {
      setTokenSavings({
        extension:
          (result.data as { effectiveExtension?: number }).effectiveExtension ||
          1,
      })
    }
  }

  const handleLoadPreset = (preset: Preset) => {
    Object.entries(preset.values).forEach(([key, value]) => {
      if (key === 'originalCode') setOriginalCode(value as string)
      if (key === 'editInstructions') setEditInstructions(value as string)
      if (key === 'filePath') setFilePath(value as string)
      if (key === 'searchPattern') setSearchPattern(value as string)
      if (key === 'searchPath') setSearchPath(value as string)
      if (key === 'memoryQuery') setMemoryQuery(value as string)
    })
  }

  // Current values for preset
  const currentValues = {
    originalCode,
    editInstructions,
    filePath,
    searchPattern,
    searchPath,
    memoryQuery,
  }

  // Auto-scroll history
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [callHistory])

  // Initial load
  useEffect(() => {
    fetchLLMStatus()
    handleTokenSavings()
  }, [])

  return (
    <AppLayout title="Playground">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 p-4 h-[calc(100vh-var(--header-height)-60px)]">
        {/* LEFT: TOOLS */}
        <ScrollArea className="h-full">
          <div className="space-y-4 pr-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Playground</h1>
                <p className="text-sm text-muted-foreground">
                  Test Ralph MCP tools · {llmStatus?.provider || 'mistral'}/
                  {llmStatus?.model || 'devstral'}
                </p>
              </div>
              <PlaygroundToolbar
                onLoadPreset={handleLoadPreset}
                currentValues={currentValues}
                currentModel={currentModel}
                onModelChange={setCurrentModel}
              />
            </div>

            {/* Tools */}
            <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {/* FAST APPLY */}
              <ToolCard
                icon={Zap}
                title="Fast Apply"
                description="Transform code using LLM. Paste code, describe changes, get patched result."
                isLoading={loading === 'fast-apply'}
                loadingTool={loading}
                toolName="fast-apply"
                onRun={handleFastApply}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Code
                    </label>
                    <Textarea
                      value={originalCode}
                      onChange={(e) => setOriginalCode(e.target.value)}
                      rows={4}
                      className="font-mono text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Instructions
                      </label>
                      <Input
                        value={editInstructions}
                        onChange={(e) => setEditInstructions(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        File path
                      </label>
                      <Input
                        value={filePath}
                        onChange={(e) => setFilePath(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {fastApplyResult && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      {fastApplyResult.success ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" /> Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" /> Failed
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {fastApplyResult.latencyMs}ms ·{' '}
                        {fastApplyResult.tokensUsed || 0} tokens
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Original
                        </div>
                        <pre className="p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                          {originalCode}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Patched
                        </div>
                        <pre className="p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                          {fastApplyResult.patchedCode}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </ToolCard>

              {/* WARPGREP */}
              <ToolCard
                icon={Search}
                title="WarpGrep"
                description="Parallel code search. Find patterns across files instantly."
                isLoading={loading === 'warpgrep'}
                loadingTool={loading}
                toolName="warpgrep"
                onRun={handleWarpGrep}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Pattern
                    </label>
                    <Input
                      value={searchPattern}
                      onChange={(e) => setSearchPattern(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Path
                    </label>
                    <Input
                      value={searchPath}
                      onChange={(e) => setSearchPath(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {warpGrepStats && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>{warpGrepStats.total}</strong> matches
                      </span>
                      <span>
                        <strong>{warpGrepStats.files}</strong> files
                      </span>
                      <span className="text-muted-foreground">
                        {warpGrepStats.ms}ms
                      </span>
                    </div>
                    {warpGrepResults.length > 0 && (
                      <div className="space-y-1 max-h-40 overflow-auto">
                        {warpGrepResults.map((m, i) => (
                          <div key={i} className="p-2 bg-muted rounded text-sm">
                            <div className="text-xs text-muted-foreground mb-1">
                              {m.file.split('/').pop()}:{m.line}
                            </div>
                            <code className="font-mono text-xs">
                              {m.content}
                            </code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ToolCard>

              {/* CROSS SEARCH */}
              <ToolCard
                icon={GitMerge}
                title="Cross Search"
                description="Search memories across ALL past sessions. Find what you did before."
                isLoading={loading === 'cross-search'}
                loadingTool={loading}
                toolName="cross-search"
                onRun={handleCrossSearch}
              >
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Query</label>
                  <Input
                    value={memoryQuery}
                    onChange={(e) => setMemoryQuery(e.target.value)}
                  />
                </div>

                {crossStats && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>{crossStats.sessions}</strong> sessions searched
                      </span>
                      <span>
                        <strong>{crossStats.saved}</strong> tokens saved
                      </span>
                    </div>
                    {crossStats.hint && (
                      <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                        {crossStats.hint}
                      </p>
                    )}
                    {crossResults.length > 0 && (
                      <div className="space-y-1 max-h-40 overflow-auto">
                        {crossResults.map((r) => (
                          <div
                            key={r.id}
                            className="p-2 bg-muted rounded text-sm"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {r.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {(r.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p>{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ToolCard>

              {/* TOKEN SAVINGS - LINK TO DASHBOARD */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <CardTitle className="text-base">Token Savings</CardTitle>
                  </div>
                  <CardDescription>
                    Compression stats available on the{' '}
                    <Link
                      href="/metrics"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Metrics page <ExternalLink className="w-3 h-3" />
                    </Link>
                  </CardDescription>
                </CardHeader>
                {tokenSavings && (
                  <CardContent>
                    <div className="text-center p-4 bg-muted rounded">
                      <div className="text-3xl font-bold">
                        {tokenSavings.extension.toFixed(2)}x
                      </div>
                      <div className="text-sm text-muted-foreground">
                        context extension
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* PARAMETERS */}
              <ParametersPanel parameters={llmParams} onChange={setLlmParams} />
            </div>
          </div>
        </ScrollArea>

        {/* RIGHT: ACTIVITY LOG */}
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Activity Log
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {callHistory.length} calls
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4 pb-4" ref={scrollRef}>
              {callHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Clock className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No calls yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {callHistory.map((call) => (
                    <div
                      key={call.id}
                      className={cn(
                        'p-2 rounded border-l-2',
                        call.status === 'pending' &&
                          'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
                        call.status === 'success' &&
                          'border-l-green-500 bg-green-50 dark:bg-green-950/20',
                        call.status === 'error' &&
                          'border-l-red-500 bg-red-50 dark:bg-red-950/20',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{call.tool}</span>
                        <span className="text-xs text-muted-foreground">
                          {call.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        {call.status === 'pending' && (
                          <span className="text-yellow-600">Running...</span>
                        )}
                        {call.status === 'success' && (
                          <>
                            <span className="text-green-600">OK</span>
                            <span className="text-muted-foreground">
                              {call.latencyMs}ms
                            </span>
                          </>
                        )}
                        {call.status === 'error' && (
                          <>
                            <span className="text-red-600">Error</span>
                            <span className="text-muted-foreground">
                              {call.latencyMs}ms
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTED PAGE WITH PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function PlaygroundPage() {
  return (
    <PlaygroundProvider>
      <PlaygroundContent />
    </PlaygroundProvider>
  )
}
