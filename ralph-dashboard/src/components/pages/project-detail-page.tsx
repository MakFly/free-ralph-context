'use client'

import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Brain,
  CheckCircle,
  Clock,
  Database,
  FileCode,
  FolderOpen,
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Terminal,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useRalphData } from '@/stores/ralph-store'
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
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ProjectDetailSkeleton } from '@/components/skeletons/project-detail-skeleton'
import { ContextualSuggestionsCard } from '@/components/ai/contextual-suggestions-card'

function getStatusConfig(pct: number) {
  if (pct >= 85)
    return {
      label: 'CRITICAL',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-500',
      description: 'Context is critically high. Compress or spawn new session.',
    }
  if (pct >= 70)
    return {
      label: 'COMPRESS',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-500',
      description: 'Consider compressing context to free up space.',
    }
  if (pct >= 60)
    return {
      label: 'CHECKPOINT',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-500',
      description: 'Good time to create a checkpoint.',
    }
  return {
    label: 'HEALTHY',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    description: 'Context usage is healthy.',
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  colorClass,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  colorClass?: string
}) {
  return (
    <Card
      className={cn(
        'bg-gradient-to-br from-background to-muted/20',
        colorClass,
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl bg-muted/50')}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-xl font-bold font-mono">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ContextGauge({
  pct,
  tokens,
  maxTokens,
}: {
  pct: number
  tokens: number
  maxTokens: number
}) {
  const config = getStatusConfig(pct)
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <Card className={cn('border-2', config.border, config.bg)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-8">
          {/* Circular Gauge */}
          <div className="relative">
            <svg width="200" height="200" className="-rotate-90">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  'transition-all duration-500',
                  pct >= 85
                    ? 'text-rose-500'
                    : pct >= 70
                      ? 'text-amber-500'
                      : pct >= 60
                        ? 'text-yellow-500'
                        : 'text-emerald-500',
                )}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
              <span className={cn('text-4xl font-bold font-mono', config.text)}>
                {pct}%
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Context
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div>
              <Badge
                variant="outline"
                className={cn(
                  'text-sm px-3 py-1',
                  config.bg,
                  config.text,
                  'border-0',
                )}
              >
                {pct >= 85 ? (
                  <AlertTriangle className="w-4 h-4 mr-1" />
                ) : pct >= 70 ? (
                  <Zap className="w-4 h-4 mr-1" />
                ) : pct >= 60 ? (
                  <Activity className="w-4 h-4 mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                {config.label}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {config.description}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Current
                </p>
                <p className="text-lg font-mono font-semibold">
                  {tokens.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Maximum
                </p>
                <p className="text-lg font-mono font-semibold">
                  {maxTokens.toLocaleString()}
                </p>
              </div>
            </div>

            <Progress value={pct} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default',
}: {
  icon: React.ElementType
  title: string
  description: string
  onClick?: () => void
  variant?: 'default' | 'warning' | 'danger'
}) {
  const variantClasses = {
    default: 'hover:border-violet-500/50 hover:bg-violet-500/5',
    warning: 'hover:border-amber-500/50 hover:bg-amber-500/5',
    danger: 'hover:border-rose-500/50 hover:bg-rose-500/5',
  }

  return (
    <Card
      className={cn('cursor-pointer transition-all', variantClasses[variant])}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              variant === 'danger'
                ? 'bg-rose-500/10 text-rose-500'
                : variant === 'warning'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-violet-500/10 text-violet-500',
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProjectDetailPage() {
  const { name } = useParams({ from: '/projects/$name' })
  const { status, lastEvent, isLoading, sseConnected } = useRalphData()

  // TanStack Router auto-decodes URL params, no need for decodeURIComponent
  const project = status.projects.find((p) => p.name === name)

  // Show skeleton while:
  // 1. Initial loading is in progress
  // 2. SSE is disconnected/reconnecting
  // 3. Project data hasn't arrived yet (!project)
  // 4. Project exists but data is not real yet (isRealData !== true)
  if (isLoading || !sseConnected || !project || project.isRealData !== true) {
    return <ProjectDetailSkeleton />
  }

  const config = getStatusConfig(project.pct)
  const tokensK = Math.round(project.currentTokens / 1000)

  return (
    <AppLayout title={project.name}>
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/projects">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className={cn('p-3 rounded-xl', config.bg)}>
              <FolderOpen className={cn('w-8 h-8', config.text)} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{project.name}</h1>
                <Badge
                  variant="outline"
                  className={cn(config.bg, config.text, 'border-0')}
                >
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                {project.projectPath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {lastEvent}
            </Badge>
            {project.isRealData !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs gap-1',
                        project.isRealData
                          ? 'border-emerald-500/50 text-emerald-500'
                          : 'border-violet-500/50 text-violet-500',
                      )}
                    >
                      {project.isRealData ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> API Data
                        </>
                      ) : (
                        <>
                          <LoaderCircle className="w-3 h-3 animate-spin" />{' '}
                          Loading...
                        </>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {project.isRealData
                      ? 'Token count from Claude API usage data'
                      : 'Fetching actual token count from transcript...'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    LIVE
                  </div>
                </TooltipTrigger>
                <TooltipContent>Real-time updates every 500ms</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Main Gauge */}
        <ContextGauge
          pct={project.pct}
          tokens={project.currentTokens}
          maxTokens={project.maxTokens}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Database}
            label="Tokens Used"
            value={`${tokensK}k`}
            subValue={`of 200k maximum`}
            colorClass="border-cyan-500/20"
          />
          <StatCard
            icon={Gauge}
            label="Context Usage"
            value={`${project.pct}%`}
            subValue={
              project.pct >= 70 ? 'Consider compressing' : 'Healthy range'
            }
            colorClass={
              project.pct >= 70
                ? 'border-amber-500/20'
                : 'border-emerald-500/20'
            }
          />
          <StatCard
            icon={Clock}
            label="Last Updated"
            value={new Date(project.lastUpdated).toLocaleTimeString()}
            subValue={new Date(project.lastUpdated).toLocaleDateString()}
            colorClass="border-violet-500/20"
          />
          <StatCard
            icon={TrendingUp}
            label="Status"
            value={config.label}
            subValue="Real-time monitoring"
            colorClass={config.border.replace('border-', 'border-')}
          />
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Terminal className="w-5 h-5 text-violet-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Ralph MCP tools for context management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionCard
                icon={Archive}
                title="Create Checkpoint"
                description="Save current session state"
                onClick={() => console.log('checkpoint')}
              />
              <ActionCard
                icon={Brain}
                title="Compress Context"
                description="Reduce token usage with AI"
                onClick={() => console.log('compress')}
                variant={project.pct >= 70 ? 'warning' : 'default'}
              />
              <ActionCard
                icon={RefreshCw}
                title="Spawn New Session"
                description="Continue with fresh context"
                onClick={() => console.log('spawn')}
                variant={project.pct >= 85 ? 'warning' : 'default'}
              />
              <ActionCard
                icon={Trash2}
                title="Clear Session"
                description="Delete session data"
                onClick={() => console.log('clear')}
                variant="danger"
              />
            </div>
          </CardContent>
        </Card>

        {/* Live Console / Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-mono flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Live Activity
                </CardTitle>
                <CardDescription>Real-time context changes</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Auto-refresh: 500ms
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm space-y-2">
              <div className="flex items-center gap-2 text-emerald-500">
                <span className="text-muted-foreground">
                  [{new Date().toLocaleTimeString()}]
                </span>
                <span>
                  Context: {project.pct}% (
                  {project.currentTokens.toLocaleString()} tokens)
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  [{new Date(project.lastUpdated).toLocaleTimeString()}]
                </span>
                <span>Last transcript update</span>
              </div>
              {project.pct >= 70 && (
                <div className="flex items-center gap-2 text-amber-500">
                  <span className="text-muted-foreground">[WARN]</span>
                  <span>
                    Consider using ralph_compress() or ralph_checkpoint()
                  </span>
                </div>
              )}
              {project.pct >= 85 && (
                <div className="flex items-center gap-2 text-rose-500">
                  <span className="text-muted-foreground">[CRITICAL]</span>
                  <span>
                    Context nearly full - ralph_should_spawn() recommended
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations for this Project */}
        <ContextualSuggestionsCard type="project" entityId={project.name} />
      </div>
    </AppLayout>
  )
}
