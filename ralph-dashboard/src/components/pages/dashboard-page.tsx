'use client'

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle,
  Cpu,
  Database,
  ExternalLink,
  FolderOpen,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import type { Project } from '@/hooks/use-ralph-sse'
import { useRalphData } from '@/stores/ralph-store'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton'
import { SuggestionsCard } from '@/components/ai/suggestions-card'

const RALPH_API = import.meta.env.VITE_RALPH_API_URL || ''

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface TokenSavings {
  totalSaved: number
  compressionRatio: number
  sessionsOptimized: number
  totalSessions: number
  avgSavingsPerSession: number
  topSessions: Array<{
    id: string
    name: string
    saved: number
    usagePercent: number
  }>
  timestamp: string
}

interface MemoryStats {
  total: number
  sessions: number
}

// ═══════════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════════

function getStatusConfig(pct: number) {
  if (pct >= 85) return { label: 'CRITICAL', text: 'text-rose-500' }
  if (pct >= 70) return { label: 'COMPRESS', text: 'text-amber-500' }
  if (pct >= 60) return { label: 'CHECKPOINT', text: 'text-yellow-500' }
  return { label: 'OK', text: 'text-emerald-500' }
}

// ═══════════════════════════════════════════════════════
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════

const columns: Array<ColumnDef<Project>> = [
  {
    accessorKey: 'name',
    header: 'Project',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-mono text-sm">{row.original.name}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
            {row.original.projectPath}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'pct',
    header: 'Context',
    cell: ({ row }) => {
      const config = getStatusConfig(row.original.pct)
      return (
        <div className="flex items-center gap-2 min-w-[140px]">
          <Progress value={row.original.pct} className="h-1.5 flex-1" />
          <span className={cn('font-mono text-xs', config.text)}>
            {row.original.pct}%
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'currentTokens',
    header: 'Tokens',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {Math.round(row.original.currentTokens / 1000)}k / 200k
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const config = getStatusConfig(row.original.pct)
      return (
        <Badge variant="outline" className={cn('text-xs', config.text)}>
          {config.label}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
        <Link to="/projects/$name" params={{ name: row.original.name }}>
          View <ExternalLink className="w-3 h-3 ml-1" />
        </Link>
      </Button>
    ),
  },
]

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════

export function DashboardPage() {
  const { status, isLoading, sseConnected } = useRalphData()
  const [tokenSavings, setTokenSavings] = useState<TokenSavings | null>(null)
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const [savingsRes, memoriesRes] = await Promise.all([
        fetch(`${RALPH_API}/api/token-savings`),
        fetch(`${RALPH_API}/api/memories`),
      ])
      const savings = await savingsRes.json()
      const memories = await memoriesRes.json()

      setTokenSavings(savings)
      setMemoryStats({
        total: memories.memories?.length || memories.length || 0,
        sessions: memories.sessions?.length || 0,
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchStats])

  if (isLoading || !sseConnected) {
    return <DashboardSkeleton />
  }

  const sortedProjects = [...status.projects].sort((a, b) => b.pct - a.pct)
  const criticalCount = sortedProjects.filter((p) => p.pct >= 85).length
  const warningCount = sortedProjects.filter(
    (p) => p.pct >= 70 && p.pct < 85,
  ).length

  return (
    <AppLayout title="Dashboard">
      <div className="flex flex-col gap-4 p-4">
        {/* Hero Card - Token Savings */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Context Compression
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-mono">
                    {tokenSavings
                      ? ((1 - tokenSavings.compressionRatio) * 100).toFixed(0)
                      : '0'}
                    %
                  </span>
                  <span className="text-muted-foreground">efficiency</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {(tokenSavings?.totalSaved || 0).toLocaleString()} tokens
                  saved across {tokenSavings?.sessionsOptimized || 0} sessions
                </p>
              </div>
              <div className="text-right">
                <Sparkles className="w-12 h-12 text-muted-foreground/30" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Projects</span>
              </div>
              <div className="text-2xl font-bold font-mono">
                {status.projectCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Memories</span>
              </div>
              <div className="text-2xl font-bold font-mono">
                {memoryStats?.total || 0}
              </div>
            </CardContent>
          </Card>

          <Card className={criticalCount > 0 ? 'border-rose-500/50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle
                  className={cn(
                    'w-4 h-4',
                    criticalCount > 0
                      ? 'text-rose-500'
                      : 'text-muted-foreground',
                  )}
                />
                <span
                  className={cn(
                    'text-xs',
                    criticalCount > 0
                      ? 'text-rose-500'
                      : 'text-muted-foreground',
                  )}
                >
                  Critical
                </span>
              </div>
              <div
                className={cn(
                  'text-2xl font-bold font-mono',
                  criticalCount > 0 ? 'text-rose-500' : '',
                )}
              >
                {criticalCount}
              </div>
            </CardContent>
          </Card>

          <Card className={warningCount > 0 ? 'border-amber-500/50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap
                  className={cn(
                    'w-4 h-4',
                    warningCount > 0
                      ? 'text-amber-500'
                      : 'text-muted-foreground',
                  )}
                />
                <span
                  className={cn(
                    'text-xs',
                    warningCount > 0
                      ? 'text-amber-500'
                      : 'text-muted-foreground',
                  )}
                >
                  Warning
                </span>
              </div>
              <div
                className={cn(
                  'text-2xl font-bold font-mono',
                  warningCount > 0 ? 'text-amber-500' : '',
                )}
              >
                {warningCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operations Breakdown */}
        {tokenSavings?.byOperation && tokenSavings.byOperation.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">
                Savings by Operation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {tokenSavings.byOperation.map((op, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 border rounded text-xs"
                  >
                    <span className="font-mono">{op.operation}</span>
                    <span className="text-muted-foreground">
                      -{(op.saved || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Suggestions */}
        <SuggestionsCard />

        {/* Projects Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono">
                Active Sessions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={fetchStats}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={sortedProjects}
              searchKey="name"
              searchPlaceholder="Search..."
            />
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              How Ralph saves tokens:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium">Auto-save</span>
                  <p className="text-muted-foreground">
                    Captures every file edit as a memory
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium">Auto-context</span>
                  <p className="text-muted-foreground">
                    Retrieves relevant memories automatically
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium">Compress</span>
                  <p className="text-muted-foreground">
                    When context &gt;70%, compress to continue
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
