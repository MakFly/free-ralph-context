'use client'

import * as React from 'react'
import {
  Archive,
  Clock,
  Copy,
  Database,
  Download,
  Folder,
  GitBranch,
  History,
  MoreHorizontalIcon,
  Play,
  Trash2,
  Zap,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { CheckpointsSkeleton } from '@/components/skeletons/checkpoints-skeleton'
import { useRalphSSE } from '@/hooks/use-ralph-sse'

// Checkpoint type from API
interface Checkpoint {
  id: string
  sessionId: string
  label: string
  project: string
  contextUsage: number
  tokens: number
  memoriesCount: number
  createdAt: string
  state?: Record<string, unknown>
}

function CheckpointCard({ checkpoint }: { checkpoint: Checkpoint }) {
  const pct = Math.round(checkpoint.contextUsage * 100)
  const isWarning = pct >= 70

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        isWarning
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-violet-500/20 bg-violet-500/5',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'p-3 rounded-xl',
              isWarning ? 'bg-amber-500/10' : 'bg-violet-500/10',
            )}
          >
            <Archive
              className={cn(
                'w-6 h-6',
                isWarning ? 'text-amber-500' : 'text-violet-500',
              )}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-mono font-semibold">{checkpoint.label}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Folder className="w-3 h-3" />
                    {checkpoint.project}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(checkpoint.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontalIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Play className="w-4 h-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-rose-500">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Context
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-2 flex-1" />
                  <span
                    className={cn(
                      'text-sm font-mono font-medium',
                      isWarning ? 'text-amber-500' : 'text-violet-500',
                    )}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Tokens
                </p>
                <p className="text-sm font-mono font-medium">
                  {Math.round(checkpoint.tokens / 1000)}k
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Memories
                </p>
                <p className="text-sm font-mono font-medium">
                  {checkpoint.memoriesCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CheckpointsPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [checkpoints, setCheckpoints] = React.useState<Array<Checkpoint>>([])
  const { fetchCheckpoints } = useRalphSSE()

  React.useEffect(() => {
    // Fetch real checkpoints from API
    fetchCheckpoints().then((data) => {
      setCheckpoints(data.checkpoints || [])
      setIsLoading(false)
    })
  }, [fetchCheckpoints])

  if (isLoading) {
    return <CheckpointsSkeleton />
  }

  const stats = {
    total: checkpoints.length,
    totalTokens: checkpoints.reduce((sum, cp) => sum + cp.tokens, 0),
    avgContext:
      checkpoints.length > 0
        ? checkpoints.reduce((sum, cp) => sum + cp.contextUsage, 0) /
          checkpoints.length
        : 0,
    totalMemories: checkpoints.reduce((sum, cp) => sum + cp.memoriesCount, 0),
  }

  return (
    <AppLayout title="Checkpoints">
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Checkpoints
                  </p>
                  <p className="text-2xl font-bold font-mono text-violet-500">
                    {stats.total}
                  </p>
                </div>
                <Archive className="w-8 h-8 text-violet-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Saved</p>
                  <p className="text-2xl font-bold font-mono text-cyan-500">
                    {Math.round(stats.totalTokens / 1000)}k
                  </p>
                </div>
                <Database className="w-8 h-8 text-cyan-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Context</p>
                  <p className="text-2xl font-bold font-mono text-amber-500">
                    {Math.round(stats.avgContext * 100)}%
                  </p>
                </div>
                <Zap className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/5 to-green-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Memories Saved
                  </p>
                  <p className="text-2xl font-bold font-mono text-emerald-500">
                    {stats.totalMemories}
                  </p>
                </div>
                <History className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checkpoints Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-mono flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-violet-500" />
                  Checkpoint Timeline
                </CardTitle>
                <CardDescription>
                  Saved session states for quick restoration
                </CardDescription>
              </div>
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                <Archive className="w-4 h-4 mr-2" />
                Create Checkpoint
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
              <div className="space-y-4 pr-4">
                {checkpoints.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-mono">No checkpoints yet</p>
                    <p className="text-xs mt-1">
                      Create checkpoints with ralph_checkpoint() to save session
                      state
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-violet-500/50 via-fuchsia-500/50 to-transparent" />

                    {/* Checkpoint cards */}
                    <div className="space-y-4">
                      {checkpoints.map((checkpoint, idx) => (
                        <div key={checkpoint.id} className="relative pl-14">
                          {/* Timeline dot */}
                          <div
                            className={cn(
                              'absolute left-[20px] top-6 w-4 h-4 rounded-full border-2 bg-background',
                              idx === 0
                                ? 'border-violet-500 bg-violet-500'
                                : 'border-violet-500/50',
                            )}
                          >
                            {idx === 0 && (
                              <span className="absolute inset-0 rounded-full animate-ping bg-violet-500/50" />
                            )}
                          </div>
                          <CheckpointCard checkpoint={checkpoint} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
