'use client'

import * as React from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  FileCode,
  Folder,
  Lightbulb,
  Loader2,
  Pencil,
  Star,
  Tag,
  Trash2,
  X,
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { MemoryDetailSkeleton } from '@/components/skeletons/memory-detail-skeleton'
import { ContextualSuggestionsCard } from '@/components/ai/contextual-suggestions-card'

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

const categoryConfig = {
  decision: {
    icon: Lightbulb,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    label: 'Decision',
  },
  action: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Action',
  },
  error: {
    icon: AlertCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    label: 'Error',
  },
  progress: {
    icon: FileCode,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    label: 'Progress',
  },
  context: {
    icon: Database,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Context',
  },
  other: {
    icon: Tag,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    label: 'Other',
  },
}

interface MemoryDetail {
  id: string
  sessionId: string
  content: string
  category: string
  priority: string
  createdAt: string
  metadata?: {
    taskDescription?: string
    projectPath?: string
  }
}

interface SessionInfo {
  id: string
  taskDescription: string
  projectPath: string
  status: string
  createdAt: string
  memoriesCount: number
}

interface RelatedMemory {
  id: string
  content: string
  category: string
  priority: string
  createdAt: string
}

interface MemoryDetailResponse {
  memory: MemoryDetail
  session: SessionInfo
  relatedMemories: Array<RelatedMemory>
}

export function MemoryDetailPage({ memoryId }: { memoryId: string }) {
  const navigate = useNavigate()
  const [data, setData] = React.useState<MemoryDetailResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Action states
  const [toast, setToast] = React.useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [isStarring, setIsStarring] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    const fetchMemory = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`${RALPH_API}/api/memories/${memoryId}`)
        if (!res.ok) throw new Error('Memory not found')
        const json = await res.json()
        setData(json)
        setEditContent(json.memory.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMemory()
  }, [memoryId])

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setToast({ message, type })
  }

  const handleCopy = () => {
    if (data?.memory.content) {
      navigator.clipboard.writeText(data.memory.content)
      showToast('Copied to clipboard')
    }
  }

  const handleSaveEdit = async () => {
    if (!data) return
    setIsSaving(true)
    try {
      const res = await fetch(`${RALPH_API}/api/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (!res.ok) throw new Error('Failed to update memory')
      const updated = await res.json()
      setData({ ...data, memory: { ...data.memory, ...updated } })
      setIsEditing(false)
      showToast('Memory updated')
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update',
        'error',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(data?.memory.content || '')
    setIsEditing(false)
  }

  const handleToggleStar = async () => {
    if (!data) return
    setIsStarring(true)
    try {
      const newPriority = data.memory.priority === 'high' ? 'normal' : 'high'
      const res = await fetch(`${RALPH_API}/api/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to update priority')
      setData({
        ...data,
        memory: { ...data.memory, priority: newPriority },
      })
      showToast(
        newPriority === 'high' ? 'Added to starred' : 'Removed from starred',
      )
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update',
        'error',
      )
    } finally {
      setIsStarring(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`${RALPH_API}/api/memories/${memoryId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete memory')
      showToast('Memory deleted')
      navigate({ to: '/memories' })
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to delete',
        'error',
      )
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <MemoryDetailSkeleton />
  }

  if (error || !data) {
    return (
      <AppLayout title="Memory Not Found">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <p className="text-lg font-mono text-rose-500">Memory not found</p>
          <Link to="/memories">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Memories
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const config =
    categoryConfig[data.memory.category as keyof typeof categoryConfig] ||
    categoryConfig.other
  const Icon = config.icon

  return (
    <AppLayout title={`Memory - ${data.memory.content.slice(0, 50)}...`}>
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col gap-6 p-4 lg:p-6">
        {/* Header - Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/memories">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Memories
            </Button>
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px]">
            {data.memory.metadata?.taskDescription ||
              data.session.taskDescription}
          </span>
          <span>/</span>
          <span className="text-foreground font-medium">{config.label}</span>
          {data.memory.priority === 'high' && (
            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
              HIGH PRIORITY
            </Badge>
          )}
        </div>

        {/* Action Bar */}
        <Card className={cn('border-2', config.borderColor)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="cursor-pointer hover:bg-accent"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="cursor-pointer hover:bg-accent"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isSaving || editContent === data.memory.content}
                    className={cn(
                      'cursor-pointer',
                      (isSaving || editContent === data.memory.content) &&
                        'cursor-not-allowed opacity-50',
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="cursor-pointer hover:bg-accent"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStar}
                disabled={isStarring || isEditing}
                className={cn(
                  'cursor-pointer hover:bg-accent transition-all',
                  data.memory.priority === 'high' &&
                    'bg-amber-500/10 text-amber-500 border-amber-500/30',
                  (isStarring || isEditing) && 'cursor-not-allowed opacity-50',
                )}
              >
                {isStarring ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Star
                    className={cn(
                      'w-4 h-4 mr-2',
                      data.memory.priority === 'high' && 'fill-amber-500',
                    )}
                  />
                )}
                {data.memory.priority === 'high' ? 'Starred' : 'Star'}
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isEditing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Memory Content */}
        <Card className={cn('border-2', config.borderColor, config.bg)}>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className={cn('p-3 rounded-xl', config.bg)}>
                <Icon className={cn('w-6 h-6', config.color)} />
              </div>
              <div className="flex-1">
                <CardTitle className="font-mono text-lg">
                  {config.label.toUpperCase()}
                </CardTitle>
                <CardDescription>
                  Created {new Date(data.memory.createdAt).toLocaleString()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                autoFocus
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                {data.memory.content}
              </pre>
            )}
          </CardContent>
        </Card>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-1">ID</p>
              <p className="text-sm font-mono truncate">
                {data.memory.sessionId.slice(0, 8)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 mb-1">Task</p>
              <p className="text-sm line-clamp-2">
                {data.session.taskDescription}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {data.session.memoriesCount} memories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {new Date(data.memory.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(data.memory.createdAt).toLocaleTimeString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.floor(
                  (Date.now() - new Date(data.memory.createdAt).getTime()) /
                    (1000 * 60 * 60 * 24),
                )}{' '}
                days ago
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4" />
                Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className={cn(
                  'text-sm',
                  data.memory.priority === 'high'
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                    : 'bg-gray-500/10 text-gray-500',
                )}
              >
                {data.memory.priority.toUpperCase()}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Project Path */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Project Path</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block overflow-hidden text-ellipsis">
                {data.memory.metadata?.projectPath || data.session.projectPath}
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Memory ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {data.memory.id}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Related Memories */}
        {data.relatedMemories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Related Memories (from this session)
              </CardTitle>
              <CardDescription>
                Other memories from the same session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.relatedMemories.map((related) => {
                  const relConfig =
                    categoryConfig[
                      related.category as keyof typeof categoryConfig
                    ] || categoryConfig.other
                  const RelIcon = relConfig.icon
                  return (
                    <Link
                      key={related.id}
                      to="/memories/$id"
                      params={{ id: related.id }}
                      className={cn(
                        'block w-full text-left p-4 rounded-lg border transition-all hover:shadow-md',
                        relConfig.bg,
                        relConfig.borderColor,
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg', relConfig.bg)}>
                          <RelIcon className={cn('w-4 h-4', relConfig.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed line-clamp-2">
                            {related.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={cn('text-xs', relConfig.color)}
                            >
                              {relConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(related.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Insights for this Memory */}
        <ContextualSuggestionsCard type="memory" entityId={memoryId} />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
    </AppLayout>
  )
}
