'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// HEADER SKELETON
// ═══════════════════════════════════════════════════════

function HeaderSkeleton() {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Badge
              variant="outline"
              className="bg-violet-500/10 text-violet-500 border-0 animate-pulse"
            >
              Loading...
            </Badge>
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
          </span>
          Connecting
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CONTEXT GAUGE SKELETON
// ═══════════════════════════════════════════════════════

function ContextGaugeSkeleton() {
  return (
    <Card className="border-2 border-muted/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-8">
          {/* Circular Gauge */}
          <Skeleton className="h-[200px] w-[200px] rounded-full shrink-0" />
          {/* Details */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Separator />
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
// STAT CARD SKELETON
// ═══════════════════════════════════════════════════════

function StatCardSkeleton() {
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

function ActionCardSkeleton() {
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
// ACTIVITY CONSOLE SKELETON
// ═══════════════════════════════════════════════════════

function ActivityConsoleSkeleton() {
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
          <Skeleton className="h-6 w-32 rounded-full" />
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

// ═══════════════════════════════════════════════════════
// MAIN PROJECT DETAIL SKELETON
// ═══════════════════════════════════════════════════════

export function ProjectDetailSkeleton() {
  return (
    <AppLayout title="Project">
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <HeaderSkeleton />

        {/* Main Gauge */}
        <ContextGaugeSkeleton />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionCardSkeleton />
              <ActionCardSkeleton />
              <ActionCardSkeleton />
              <ActionCardSkeleton />
            </div>
          </CardContent>
        </Card>

        {/* Live Console */}
        <ActivityConsoleSkeleton />
      </div>
    </AppLayout>
  )
}
