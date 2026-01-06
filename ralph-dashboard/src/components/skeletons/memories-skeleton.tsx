'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// MEMORIES STATS CARD SKELETON
// ═══════════════════════════════════════════════════════

function MemoriesStatsCardSkeleton({
  color = 'violet',
}: {
  color?: 'violet' | 'emerald' | 'rose'
}) {
  const colorClasses = {
    violet: 'from-violet-500/5 to-fuchsia-500/5 border-violet-500/20',
    emerald: 'from-emerald-500/5 to-green-500/5 border-emerald-500/20',
    rose: 'from-rose-500/5 to-red-500/5 border-rose-500/20',
  }

  return (
    <Card className={cn('bg-gradient-to-br', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// MEMORY CARD SKELETON
// ═══════════════════════════════════════════════════════

function MemoryCardSkeleton() {
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
// MAIN MEMORIES SKELETON
// ═══════════════════════════════════════════════════════

export function MemoriesSkeleton() {
  return (
    <AppLayout title="Memories">
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MemoriesStatsCardSkeleton color="violet" />
          <MemoriesStatsCardSkeleton color="violet" />
          <MemoriesStatsCardSkeleton color="emerald" />
          <MemoriesStatsCardSkeleton color="rose" />
        </div>

        {/* Memories List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-48 rounded" />
                <Skeleton className="h-10 w-32 rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <MemoryCardSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
