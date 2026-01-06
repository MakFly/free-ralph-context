'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// CHECKPOINTS STATS CARD SKELETON
// ═══════════════════════════════════════════════════════

function CheckpointsStatsCardSkeleton({
  color = 'violet',
}: {
  color?: 'violet' | 'cyan' | 'amber' | 'emerald'
}) {
  const colorClasses = {
    violet: 'from-violet-500/5 to-fuchsia-500/5 border-violet-500/20',
    cyan: 'from-cyan-500/5 to-blue-500/5 border-cyan-500/20',
    amber: 'from-amber-500/5 to-orange-500/5 border-amber-500/20',
    emerald: 'from-emerald-500/5 to-green-500/5 border-emerald-500/20',
  }

  return (
    <Card className={cn('bg-gradient-to-br', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// CHECKPOINT CARD SKELETON
// ═══════════════════════════════════════════════════════

function CheckpointCardSkeleton() {
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
// MAIN CHECKPOINTS SKELETON
// ═══════════════════════════════════════════════════════

export function CheckpointsSkeleton() {
  return (
    <AppLayout title="Checkpoints">
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CheckpointsStatsCardSkeleton color="violet" />
          <CheckpointsStatsCardSkeleton color="cyan" />
          <CheckpointsStatsCardSkeleton color="amber" />
          <CheckpointsStatsCardSkeleton color="emerald" />
        </div>

        {/* Checkpoints Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-10 w-40 rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative pl-14">
                  {/* Timeline dot */}
                  <Skeleton className="absolute left-[20px] top-6 h-4 w-4 rounded-full" />
                  <CheckpointCardSkeleton />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
