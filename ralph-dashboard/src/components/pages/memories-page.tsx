'use client'

import * as React from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Database,
  FileCode,
  Filter,
  Folder,
  Lightbulb,
  Loader2,
  Search,
  Star,
  StarOff,
  Tag,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
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
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { MemoriesSkeleton } from '@/components/skeletons/memories-skeleton'

// Toast notification component
function Toast({
  message,
  type = 'success',
  onClose,
}: {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 2000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm',
        'animate-in slide-in-from-bottom-2 fade-in duration-300',
        type === 'success'
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white',
      )}
    >
      {type === 'success' ? (
        <Check className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span className="font-medium">{message}</span>
    </div>
  )
}

const RALPH_API = import.meta.env.VITE_RALPH_API_URL || ''

// Memory interface matching the backend
interface Memory {
  id: string
  sessionId: string
  content: string
  category: string
  priority: string
  metadata?: Record<string, unknown>
  createdAt: string
  accessCount: number
  lastAccessedAt?: string
}

interface Session {
  id: string
  taskDescription: string
  status: string
  createdAt: string
}

const categoryConfig = {
  decision: {
    icon: Lightbulb,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    label: 'Decision',
  },
  action: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    label: 'Action',
  },
  error: {
    icon: AlertCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    label: 'Error',
  },
  progress: {
    icon: FileCode,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    label: 'Progress',
  },
  context: {
    icon: Database,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    label: 'Context',
  },
  other: {
    icon: Tag,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    label: 'Other',
  },
}

function MemoryCard({
  memory,
  sessions,
  onStar,
  onDelete,
}: {
  memory: Memory
  sessions: Array<Session>
  onStar: (id: string, current: boolean) => void
  onDelete: (id: string) => void
}) {
  const config =
    categoryConfig[memory.category as keyof typeof categoryConfig] ||
    categoryConfig.other
  const Icon = config.icon
  const [starred, setStarred] = React.useState(memory.priority === 'high')

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newState = !starred
    setStarred(newState)
    onStar(memory.id, newState)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(memory.id)
  }

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        'w-full justify-start h-auto p-4 rounded-xl transition-all hover:shadow-md hover:scale-[1.01]',
        config.bg,
        'border-0 cursor-pointer',
      )}
    >
      <Link
        to="/memories/$id"
        params={{ id: memory.id }}
        className="cursor-pointer"
      >
        <div className="flex items-start gap-3 w-full">
          <div className={cn('p-2 rounded-lg', config.bg)}>
            <Icon className={cn('w-4 h-4', config.color)} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm leading-relaxed">{memory.content}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-xs', config.color)}>
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Folder className="w-3 h-3" />
                {sessions
                  .find((s) => s.id === memory.sessionId)
                  ?.taskDescription?.slice(0, 30) ||
                  memory.sessionId.slice(0, 8)}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(memory.createdAt).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {memory.accessCount} accesses
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-amber-500/10 cursor-pointer"
              onClick={handleStar}
            >
              {starred ? (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              ) : (
                <StarOff className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Link>
    </Button>
  )
}

export function MemoriesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [memories, setMemories] = React.useState<Array<Memory>>([])
  const [sessions, setSessions] = React.useState<Array<Session>>([])
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    const fetchMemories = async () => {
      try {
        const res = await fetch(`${RALPH_API}/api/memories`)
        if (!res.ok) throw new Error('Failed to fetch memories')
        const data = await res.json()
        setMemories(data.memories || [])
        setSessions(data.sessions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMemories()
  }, [])

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setToast({ message, type })
  }

  const handleStar = async (id: string, isStarred: boolean) => {
    try {
      const res = await fetch(`${RALPH_API}/api/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: isStarred ? 'high' : 'normal' }),
      })
      if (!res.ok) throw new Error('Failed to update memory')
      setMemories(
        memories.map((m) =>
          m.id === id ? { ...m, priority: isStarred ? 'high' : 'normal' } : m,
        ),
      )
      showToast(isStarred ? 'Added to starred' : 'Removed from starred')
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update',
        'error',
      )
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${RALPH_API}/api/memories/${deleteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete memory')
      setMemories(memories.filter((m) => m.id !== deleteId))
      setDeleteId(null)
      showToast('Memory deleted')
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to delete',
        'error',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <MemoriesSkeleton />
  }

  if (error) {
    return (
      <AppLayout title="Memories">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <p className="text-lg font-mono text-rose-500">
            Failed to load memories
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </AppLayout>
    )
  }

  const filteredMemories = memories.filter((m) => {
    const sessionTask =
      sessions.find((s) => s.id === m.sessionId)?.taskDescription || ''
    const matchesSearch =
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      sessionTask.toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' || m.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const stats = {
    total: memories.length,
    decisions: memories.filter((m) => m.category === 'decision').length,
    actions: memories.filter((m) => m.category === 'action').length,
    errors: memories.filter((m) => m.category === 'error').length,
  }

  return (
    <AppLayout title="Memories">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Memories
                  </p>
                  <p className="text-2xl font-bold font-mono text-violet-500">
                    {stats.total}
                  </p>
                </div>
                <Database className="w-8 h-8 text-violet-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Decisions</p>
                  <p className="text-2xl font-bold font-mono text-violet-500">
                    {stats.decisions}
                  </p>
                </div>
                <Lightbulb className="w-8 h-8 text-violet-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/5 to-green-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actions</p>
                  <p className="text-2xl font-bold font-mono text-emerald-500">
                    {stats.actions}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500/5 to-red-500/5 border-rose-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Errors Fixed</p>
                  <p className="text-2xl font-bold font-mono text-rose-500">
                    {stats.errors}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-rose-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Memories List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-mono">Memory Bank</CardTitle>
                <CardDescription>
                  Stored decisions, actions, and context from all sessions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search memories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="decision">Decisions</SelectItem>
                    <SelectItem value="action">Actions</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="context">Context</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
              <div className="space-y-3 pr-4">
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-mono">No memories found</p>
                    <p className="text-xs mt-1">
                      Memories are stored when working with Ralph MCP
                    </p>
                  </div>
                ) : (
                  filteredMemories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      sessions={sessions}
                      onStar={handleStar}
                      onDelete={setDeleteId}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
