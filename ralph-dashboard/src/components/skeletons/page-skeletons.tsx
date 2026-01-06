'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// STATS CARD SKELETON
// ═══════════════════════════════════════════════════════

export function StatsCardSkeleton({
  color = 'violet',
}: {
  color?: 'violet' | 'cyan' | 'rose' | 'amber' | 'emerald'
}) {
  const colorClasses = {
    violet: 'from-violet-500/5 to-fuchsia-500/5 border-violet-500/20',
    cyan: 'from-cyan-500/5 to-blue-500/5 border-cyan-500/20',
    rose: 'from-rose-500/5 to-red-500/5 border-rose-500/20',
    amber: 'from-amber-500/5 to-orange-500/5 border-amber-500/20',
    emerald: 'from-emerald-500/5 to-green-500/5 border-emerald-500/20',
  }

  return (
    <Card className={cn('bg-gradient-to-br', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardStatsCardSkeleton({
  color = 'violet',
}: {
  color?: 'violet' | 'cyan' | 'rose' | 'amber' | 'emerald'
}) {
  const colorClasses = {
    violet: 'from-violet-500/5 to-fuchsia-500/5 border-violet-500/20',
    cyan: 'from-cyan-500/5 to-blue-500/5 border-cyan-500/20',
    rose: 'from-rose-500/5 to-red-500/5 border-rose-500/20',
    amber: 'from-amber-500/5 to-orange-500/5 border-amber-500/20',
    emerald: 'from-emerald-500/5 to-green-500/5 border-emerald-500/20',
  }

  return (
    <Card className={cn('bg-gradient-to-br', colorClasses[color])}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardFooter>
        <Skeleton className="h-4 w-40" />
      </CardFooter>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// PROJECT TABLE ROW SKELETON
// ═══════════════════════════════════════════════════════

export function ProjectTableRowSkeleton() {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </td>
      <td className="p-4 align-middle">
        <div className="flex items-center gap-3 min-w-[180px]">
          <Progress value={0} className="h-2 flex-1 animate-pulse" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </td>
      <td className="p-4 align-middle">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      </td>
      <td className="p-4 align-middle">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      <td className="p-4 align-middle">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="p-4 align-middle">
        <Skeleton className="h-8 w-16 rounded" />
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════
// PROJECT LIST ROW SKELETON (Enhanced for /projects route)
// ═══════════════════════════════════════════════════════

export function ProjectListRowSkeleton() {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </td>
      <td className="p-4 align-middle">
        <div className="space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <Progress value={0} className="h-2 animate-pulse" />
        </div>
      </td>
      <td className="p-4 align-middle">
        <Skeleton className="h-8 w-24 rounded-full" />
      </td>
      <td className="p-4 align-middle">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      </td>
      <td className="p-4 align-middle">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════
// CONTEXT GAUGE SKELETON
// ═══════════════════════════════════════════════════════

export function ContextGaugeSkeleton() {
  return (
    <Card className="border-2 border-muted/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-8">
          <Skeleton className="h-[200px] w-[200px] rounded-full shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
            <Progress value={0} className="h-2 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// STAT CARD (Small) SKELETON
// ═══════════════════════════════════════════════════════

export function StatCardSkeleton() {
  return (
    <Card className="bg-gradient-to-br from-background to-muted/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// ACTION CARD SKELETON
// ═══════════════════════════════════════════════════════

export function ActionCardSkeleton() {
  return (
    <Card className="hover:border-muted-foreground/20 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// MEMORY CARD SKELETON
// ═══════════════════════════════════════════════════════

export function MemoryCardSkeleton() {
  return (
    <Card className="transition-all hover:shadow-md bg-muted/10 border-0">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// CHECKPOINT CARD SKELETON
// ═══════════════════════════════════════════════════════

export function CheckpointCardSkeleton() {
  return (
    <Card className="transition-all hover:shadow-md bg-violet-500/5 border-violet-500/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <div className="flex items-center gap-2">
                  <Progress value={0} className="h-2 flex-1 animate-pulse" />
                  <Skeleton className="h-5 w-8" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// TABLE HEADER SKELETON
// ═══════════════════════════════════════════════════════

export function TableHeaderSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// ACTIVITY CONSOLE SKELETON
// ═══════════════════════════════════════════════════════

export function ActivityConsoleSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
    </Card>
  )
}
