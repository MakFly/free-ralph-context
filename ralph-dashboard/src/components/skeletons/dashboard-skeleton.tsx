'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// DASHBOARD STATS CARD SKELETON
// ═══════════════════════════════════════════════════════

function DashboardStatsCardSkeleton({
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
          <Skeleton className="h-6 w-16 rounded-full" />
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

function ProjectTableRowSkeleton() {
  return (
    <tr className="border-b transition-colors">
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
// TABLE SKELETON
// ═══════════════════════════════════════════════════════

function TableSkeleton() {
  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[250px]">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[180px]">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  <Skeleton className="h-4 w-12" />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  <Skeleton className="h-4 w-12" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <ProjectTableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD SKELETON
// ═══════════════════════════════════════════════════════

export function DashboardSkeleton() {
  return (
    <AppLayout title="Context Monitor">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <DashboardStatsCardSkeleton color="violet" />
          <DashboardStatsCardSkeleton color="cyan" />
          <DashboardStatsCardSkeleton color="rose" />
          <DashboardStatsCardSkeleton color="amber" />
        </div>

        {/* Table */}
        <TableSkeleton />
      </div>
    </AppLayout>
  )
}
