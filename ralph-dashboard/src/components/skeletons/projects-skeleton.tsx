'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// PROJECTS STATS CARD SKELETON (Compact)
// ═══════════════════════════════════════════════════════

function ProjectsStatsCardSkeleton({
  color = 'violet',
}: {
  color?: 'violet' | 'emerald' | 'amber' | 'rose'
}) {
  const colorClasses = {
    violet: 'from-violet-500/5 to-fuchsia-500/5 border-violet-500/20',
    emerald: 'from-emerald-500/5 to-green-500/5 border-emerald-500/20',
    amber: 'from-amber-500/5 to-orange-500/5 border-amber-500/20',
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
// PROJECT LIST ROW SKELETON (Enhanced)
// ═══════════════════════════════════════════════════════

function ProjectListRowSkeleton() {
  return (
    <tr className="border-b transition-colors">
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
// PROJECTS TABLE SKELETON
// ═══════════════════════════════════════════════════════

function ProjectsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[300px]">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[200px]">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">
                  <Skeleton className="h-4 w-12" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px]">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[150px]">
                  <Skeleton className="h-4 w-12" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <ProjectListRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN PROJECTS SKELETON
// ═══════════════════════════════════════════════════════

export function ProjectsSkeleton() {
  return (
    <AppLayout title="Projects">
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ProjectsStatsCardSkeleton color="violet" />
          <ProjectsStatsCardSkeleton color="emerald" />
          <ProjectsStatsCardSkeleton color="amber" />
          <ProjectsStatsCardSkeleton color="rose" />
        </div>

        {/* Projects Table */}
        <ProjectsTableSkeleton />
      </div>
    </AppLayout>
  )
}
