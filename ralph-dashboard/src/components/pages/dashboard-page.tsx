'use client'

import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Brain, RefreshCw } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useRalphFiles } from '@/hooks/use-ralph-files'
import { MemoriesSection } from '@/components/sections/memories-section'
import { StatusSection } from '@/components/sections/status-section'
import { TokensSection } from '@/components/sections/tokens-section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Suggestions */}
      <Skeleton className="h-32 rounded-lg" />

      {/* Memories */}
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════

export function DashboardPage() {
  const {
    memories,
    systemStatus,
    recentMemories,
    tokenSavings,
    formatRelativeTime,
    isLoading,
    error,
    refresh,
  } = useRalphFiles()

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <DashboardSkeleton />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Brain className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Unable to load Ralph data
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Dashboard">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono">Ralph Dashboard</h1>
            <p className="text-muted-foreground">
              Context management for AI coding sessions
            </p>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className={cn('h-4 w-4 mr-2')} />
            Refresh
          </Button>
        </div>

        {/* Top row: Token savings + System status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Savings */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              Token Savings
            </h2>
            <TokensSection
              tokenSavings={tokenSavings}
              totalMemories={systemStatus.totalMemories}
            />
          </div>

          {/* System Status */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              System Status
            </h2>
            <StatusSection
              systemStatus={systemStatus}
              formatRelativeTime={formatRelativeTime}
            />
          </div>
        </div>

        {/* Recent Memories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              Recent Memories
            </h2>
            {memories.length > 5 && (
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link to="/memories">
                  View all ({memories.length})
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>
          <MemoriesSection
            memories={recentMemories}
            formatRelativeTime={formatRelativeTime}
            limit={5}
          />
        </div>

        {/* Empty state when no data */}
        {memories.length === 0 && suggestions.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start coding in your project to see Ralph automatically capture
              context
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Waiting for hooks activity...
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
