import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNexusStore } from '@/stores/nexusStore'
import {
  BrainIcon,
  FolderKanbanIcon,
  SearchIcon,
  BarChart3Icon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerOffIcon,
  RefreshCwIcon,
  InfoIcon,
  RadioIcon,
  WifiOffIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/app-layout'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

// SSE Stream types
interface StreamObservation {
  id: number
  type: string
  title: string
  summary?: string
  project: string
  created_at: number
}

function Dashboard() {
  const {
    isConnected,
    stats,
    recallMemories,
    fetchStats,
    apiBaseUrl,
  } = useNexusStore()

  const [loading, setLoading] = useState(true)
  const [recentMemories, setRecentMemories] = useState<any[]>([])
  const [totalMemories, setTotalMemories] = useState(0)
  const [refreshingStats, setRefreshingStats] = useState(false)

  // SSE Stream state
  const [streamConnected, setStreamConnected] = useState(false)
  const [liveObservations, setLiveObservations] = useState<StreamObservation[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  // Setup SSE stream for real-time observations
  useEffect(() => {
    if (!isConnected) return

    const connectStream = () => {
      try {
        const es = new EventSource(`${apiBaseUrl}/stream`)

        es.addEventListener('connected', () => {
          setStreamConnected(true)
        })

        es.addEventListener('observation', (event) => {
          const observation = JSON.parse(event.data) as StreamObservation
          setLiveObservations(prev => [observation, ...prev].slice(0, 10))
          setTotalMemories(prev => prev + 1)
        })

        es.addEventListener('error', () => {
          setStreamConnected(false)
        })

        es.onerror = () => {
          setStreamConnected(false)
          // Reconnect after 5 seconds
          setTimeout(connectStream, 5000)
        }

        eventSourceRef.current = es
      } catch {
        setStreamConnected(false)
      }
    }

    connectStream()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [isConnected, apiBaseUrl])

  useEffect(() => {
    // Load stats and memories on mount
    const loadData = async () => {
      try {
        await fetchStats()
        const result = await recallMemories({ limit: 5 })
        setRecentMemories(result.memories)
        setTotalMemories(result.total)
      } catch (e) {
        console.error('Failed to load data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quickActions = [
    { title: 'Memories', description: 'Browse and manage', icon: BrainIcon, href: '/memories', color: 'text-purple-500' },
    { title: 'Search', description: 'Search your code', icon: SearchIcon, href: '/search', color: 'text-green-500' },
    { title: 'Statistics', description: 'View stats', icon: BarChart3Icon, href: '/stats', color: 'text-blue-500' },
  ]

  const handleRefreshStats = async () => {
    setRefreshingStats(true)
    try {
      await fetchStats()
    } finally {
      setRefreshingStats(false)
    }
  }

  // Loading state - show skeleton
  if (loading) {
    return <AppLayout><DashboardSkeleton /></AppLayout>
  }

  // API disconnected - show error state
  if (!isConnected) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ServerOffIcon className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">API Server Not Running</h1>
            <p className="text-muted-foreground max-w-md">
              Start the Nexus API server to access your memories, search code, and use all features.
            </p>
          </div>
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Run this command:</p>
              <code className="bg-muted px-4 py-2 rounded text-sm block font-mono">
                cd apps/api && bun src/index.ts
              </code>
            </CardContent>
          </Card>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Connected - show dashboard
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to Nexus</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {streamConnected ? (
                <>
                  <RadioIcon className="h-3 w-3 text-green-500 animate-pulse" />
                  Live
                </>
              ) : (
                <>
                  <WifiOffIcon className="h-3 w-3 text-muted-foreground" />
                  Stream Off
                </>
              )}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CheckCircleIcon className="h-3 w-3 text-green-500" />
              Connected
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">Indexed Files</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Source code files scanned and stored in the database. Use `nexus sync` to index your project.
                  </TooltipContent>
                </Tooltip>
              </div>
              <FolderKanbanIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.files || 0}</div>
              <p className="text-xs text-muted-foreground">Files in database</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">Code Chunks</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Searchable code fragments (functions, classes, blocks). Each file is split into chunks for precise search results.
                  </TooltipContent>
                </Tooltip>
              </div>
              <SearchIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.chunks || 0}</div>
              <p className="text-xs text-muted-foreground">Chunks indexed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Stored knowledge: decisions, discoveries, bugfixes, and patterns captured during your work sessions.
                  </TooltipContent>
                </Tooltip>
              </div>
              <BrainIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMemories}</div>
              <p className="text-xs text-muted-foreground">Memories stored</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshStats}
                disabled={refreshingStats}
                className="h-6 w-6"
                title="Refresh stats"
              >
                <RefreshCwIcon className={`h-3.5 w-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-xs text-muted-foreground">System operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Live Stream - Only show if we have live observations */}
        {liveObservations.length > 0 && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RadioIcon className="h-4 w-4 text-green-500 animate-pulse" />
                  <CardTitle className="text-sm">Live Activity</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">{liveObservations.length} new</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {liveObservations.slice(0, 5).map((obs) => (
                  <div
                    key={obs.id}
                    className="flex items-center gap-2 text-sm animate-in slide-in-from-top-2 duration-300"
                  >
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">
                      {obs.type}
                    </Badge>
                    <span className="truncate text-muted-foreground">{obs.summary || obs.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(obs.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Memories */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Memories</CardTitle>
            <CardDescription>Your latest stored memories</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BrainIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No memories yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/memories">Create your first memory</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <BrainIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2 text-sm font-medium">{memory.summary}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(memory.created_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-xs capitalize">{memory.type}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentMemories.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/memories">View All Memories</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="group hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="text-xs">{action.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
