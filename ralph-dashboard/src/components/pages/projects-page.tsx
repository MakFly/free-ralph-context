'use client'

import * as React from 'react'
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  MoreHorizontalIcon,
  Trash2,
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ProjectsSkeleton } from '@/components/skeletons/projects-skeleton'

function getStatusConfig(pct: number) {
  if (pct >= 85)
    return {
      label: 'CRITICAL',
      bg: 'bg-rose-500/10',
      text: 'text-rose-500',
      badgeVariant: 'destructive' as const,
    }
  if (pct >= 70)
    return {
      label: 'COMPRESS',
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      badgeVariant: 'secondary' as const,
    }
  if (pct >= 60)
    return {
      label: 'CHECKPOINT',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-500',
      badgeVariant: 'outline' as const,
    }
  return {
    label: 'OK',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    badgeVariant: 'outline' as const,
  }
}

const columns: Array<ColumnDef<Project>> = [
  {
    accessorKey: 'name',
    header: 'Project',
    cell: ({ row }) => {
      const config = getStatusConfig(row.original.pct)
      return (
        <Link
          to="/projects/$name"
          params={{ name: row.original.name }}
          className="flex items-center gap-3 group"
        >
          <div
            className={cn(
              'p-2.5 rounded-xl transition-all group-hover:scale-105',
              config.bg,
            )}
          >
            <FolderOpen className={cn('w-5 h-5', config.text)} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono font-semibold text-base group-hover:text-violet-500 transition-colors">
              {row.original.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
              {row.original.projectPath}
            </span>
          </div>
        </Link>
      )
    },
  },
  {
    accessorKey: 'pct',
    header: 'Context Usage',
    cell: ({ row }) => {
      const config = getStatusConfig(row.original.pct)
      return (
        <div className="space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {Math.round(row.original.currentTokens / 1000)}k / 200k tokens
            </span>
            <Badge variant={config.badgeVariant} className="font-mono">
              {row.original.pct}%
            </Badge>
          </div>
          <Progress value={row.original.pct} className="h-2" />
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const config = getStatusConfig(row.original.pct)
      const Icon =
        row.original.pct >= 85
          ? AlertTriangle
          : row.original.pct >= 70
            ? Zap
            : row.original.pct >= 60
              ? Activity
              : CheckCircle
      return (
        <Badge
          variant={config.badgeVariant}
          className={cn(
            'gap-1.5 px-3 py-1',
            config.bg,
            config.text,
            'border-0',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'lastUpdated',
    header: 'Last Activity',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="font-mono">
          {new Date(row.original.lastUpdated).toLocaleString()}
        </span>
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/projects/$name" params={{ name: row.original.name }}>
            <ExternalLink className="w-3 h-3" />
            View
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/projects/$name" params={{ name: row.original.name }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="w-4 h-4 mr-2" />
              View Transcript
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="w-4 h-4 mr-2" />
              Create Checkpoint
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

export function ProjectsPage() {
  const { status, isLoading } = useRalphData()

  if (isLoading) {
    return <ProjectsSkeleton />
  }

  const sortedProjects = [...status.projects].sort((a, b) => b.pct - a.pct)

  return (
    <AppLayout title="Projects">
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Projects
                  </p>
                  <p className="text-2xl font-bold font-mono text-violet-500">
                    {status.projectCount}
                  </p>
                </div>
                <FolderOpen className="w-8 h-8 text-violet-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/5 to-green-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Healthy</p>
                  <p className="text-2xl font-bold font-mono text-emerald-500">
                    {sortedProjects.filter((p) => p.pct < 60).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Warning</p>
                  <p className="text-2xl font-bold font-mono text-amber-500">
                    {
                      sortedProjects.filter((p) => p.pct >= 60 && p.pct < 85)
                        .length
                    }
                  </p>
                </div>
                <Zap className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500/5 to-red-500/5 border-rose-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold font-mono text-rose-500">
                    {sortedProjects.filter((p) => p.pct >= 85).length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-rose-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">All Projects</CardTitle>
            <CardDescription>
              Manage and monitor all Claude Code project sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={sortedProjects}
              searchKey="name"
              searchPlaceholder="Search projects..."
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
