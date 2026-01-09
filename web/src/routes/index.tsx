import { createFileRoute, Link } from '@tanstack/react-router'
import { useDataStore } from '@/stores/dataStore'
import {
  BrainIcon,
  FolderKanbanIcon,
  SearchIcon,
  BarChart3Icon,
  ArrowRightIcon,
  PlusIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/app-layout'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { getStats, contexts, memories } = useDataStore()
  const stats = getStats()

  const quickActions = [
    {
      title: 'View Contexts',
      description: 'Browse and manage your contexts',
      icon: FolderKanbanIcon,
      href: '/contexts',
      color: 'text-blue-500',
    },
    {
      title: 'View Memories',
      description: 'Browse and manage your memories',
      icon: BrainIcon,
      href: '/memories',
      color: 'text-purple-500',
    },
    {
      title: 'Search',
      description: 'Search through your data',
      icon: SearchIcon,
      href: '/search',
      color: 'text-green-500',
    },
    {
      title: 'Statistics',
      description: 'View detailed statistics',
      icon: BarChart3Icon,
      href: '/stats',
      color: 'text-orange-500',
    },
  ]

  // Recent memories (last 5)
  const recentMemories = [...memories]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your local context manager
            </p>
          </div>
          <Button asChild>
            <Link to="/contexts">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Context
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contexts</CardTitle>
              <FolderKanbanIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContexts}</div>
              <p className="text-xs text-muted-foreground">
                Contexts stored locally
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
              <BrainIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMemories}</div>
              <p className="text-xs text-muted-foreground">
                Memories stored locally
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage</CardTitle>
              <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Local</div>
              <p className="text-xs text-muted-foreground">
                Browser localStorage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-xs text-muted-foreground">
                System operational
              </p>
            </CardContent>
          </Card>
        </div>

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
                  <Link to="/contexts">Create your first context</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMemories.map((memory) => {
                  const context = contexts.find((c) => c.id === memory.contextId)
                  return (
                    <div
                      key={memory.id}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <BrainIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-2 text-sm font-medium">
                          {memory.content}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
                          {context && (
                            <>
                              <span>•</span>
                              <span className="rounded-full bg-secondary px-1.5 py-0.5">
                                {context.title}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
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
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map((action) => (
              <Card key={action.href} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to={action.href}>
                    <Button variant="ghost" className="w-full justify-start">
                      Go to {action.title}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        {stats.totalContexts === 0 && stats.totalMemories === 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Create your first context or memory to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link to="/contexts">
                <Button>Create Context</Button>
              </Link>
              <Link to="/memories">
                <Button variant="outline">View Memories</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
