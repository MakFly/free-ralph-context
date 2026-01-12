import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  useNexusStore,
  type MemoryCompact,
  type MemoryFull,
  type MemoryType,
  type MemoryScope,
} from '@/stores/nexusStore'
import { usePageRefresh } from '@/contexts/refresh-context'
import {
  BrainIcon,
  CodeIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
  EditIcon,
  LightbulbIcon,
  CheckCircleIcon,
  SettingsIcon,
  ZapIcon,
  RefreshCwIcon,
  LinkIcon,
  GlobeIcon,
  GitBranchIcon,
  TicketIcon,
  BoxIcon,
  FolderIcon,
  ServerOffIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MemoriesFilters } from '@/components/memories-filters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MemoriesSkeleton } from '@/components/ui/skeleton'
import { Markdown } from '@/components/ui/code-block'

export const Route = createFileRoute('/memories/')({
  component: MemoriesList,
  pendingComponent: () => <AppLayout><MemoriesSkeleton /></AppLayout>,
})

const MEMORY_TYPES: { value: MemoryType; label: string; icon: typeof FileTextIcon }[] = [
  { value: 'decision', label: 'Decision', icon: CheckCircleIcon },
  { value: 'preference', label: 'Preference', icon: SettingsIcon },
  { value: 'fact', label: 'Fact', icon: LightbulbIcon },
  { value: 'note', label: 'Note', icon: FileTextIcon },
  { value: 'discovery', label: 'Discovery', icon: ZapIcon },
  { value: 'bugfix', label: 'Bugfix', icon: CodeIcon },
  { value: 'feature', label: 'Feature', icon: BoxIcon },
  { value: 'refactor', label: 'Refactor', icon: RefreshCwIcon },
  { value: 'change', label: 'Change', icon: EditIcon },
]

const MEMORY_SCOPES: { value: MemoryScope; label: string; icon: typeof GlobeIcon }[] = [
  { value: 'repo', label: 'Repository', icon: FolderIcon },
  { value: 'branch', label: 'Branch', icon: GitBranchIcon },
  { value: 'ticket', label: 'Ticket', icon: TicketIcon },
  { value: 'feature', label: 'Feature', icon: BoxIcon },
  { value: 'global', label: 'Global', icon: GlobeIcon },
]

function MemoriesList() {
  const {
    isConnected,
    recallMemories,
    batchMemories,
    createMemory,
    updateMemory,
    deleteMemory,
  } = useNexusStore()

  // State
  const [memories, setMemories] = useState<MemoryCompact[]>([])
  const [expandedMemories, setExpandedMemories] = useState<Map<number, MemoryFull>>(new Map())
  const [initialLoading, setInitialLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [total, setTotal] = useState(0)
  const hasLoadedOnce = useRef(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterScope, setFilterScope] = useState<string>('all')

  // Stable handlers for filters (prevents re-render of MemoriesFilters)
  const handleSearchChange = useCallback((value: string) => setSearchQuery(value), [])
  const handleFilterTypeChange = useCallback((value: string) => setFilterType(value), [])
  const handleFilterScopeChange = useCallback((value: string) => setFilterScope(value), [])
  const handleClearFilters = useCallback(() => {
    setFilterType('all')
    setFilterScope('all')
    setSearchQuery('')
  }, [])

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    narrative: '',
    type: 'note' as MemoryType,
    scope: 'repo' as MemoryScope,
    tags: [] as string[],
    confidence: 0.8,
  })

  // Load memories
  const loadMemories = useCallback(async () => {
    // Only show full skeleton on initial load, not during search/filter
    if (!hasLoadedOnce.current) {
      setInitialLoading(true)
    } else {
      setIsSearching(true)
    }
    try {
      const result = await recallMemories({
        q: searchQuery || undefined,
        type: filterType !== 'all' ? (filterType as MemoryType) : undefined,
        scope: filterScope !== 'all' ? (filterScope as MemoryScope) : undefined,
        limit: 50,
      })
      setMemories(result.memories)
      setTotal(result.total)
      hasLoadedOnce.current = true
    } catch (e) {
      console.error('Failed to load memories:', e)
    } finally {
      setInitialLoading(false)
      setIsSearching(false)
    }
  }, [recallMemories, searchQuery, filterType, filterScope])

  // Register refresh callback for header button
  usePageRefresh(loadMemories)

  // Initial load + filter changes (unified effect) - connection checked by root loader
  useEffect(() => {
    if (isConnected) {
      // Debounce for filter changes, immediate for initial load
      const timer = setTimeout(() => {
        loadMemories()
      }, searchQuery || filterType !== 'all' || filterScope !== 'all' ? 300 : 0)

      return () => clearTimeout(timer)
    } else {
      setInitialLoading(false)
    }
  }, [isConnected, loadMemories, searchQuery, filterType, filterScope])

  // Expand memory to get full details
  const expandMemory = async (id: number) => {
    if (expandedMemories.has(id)) {
      // Collapse
      const newMap = new Map(expandedMemories)
      newMap.delete(id)
      setExpandedMemories(newMap)
      return
    }

    try {
      const [full] = await batchMemories([id])
      if (full) {
        setExpandedMemories(new Map(expandedMemories).set(id, full))
      }
    } catch (e) {
      toast.error('Failed to load memory details')
    }
  }

  // Group by date
  const groupedMemories = memories.reduce(
    (acc, memory) => {
      const date = new Date(memory.created_at).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(memory)
      return acc
    },
    {} as Record<string, MemoryCompact[]>
  )

  const getTypeConfig = (type: MemoryType) => {
    return MEMORY_TYPES.find((t) => t.value === type) || MEMORY_TYPES[3]
  }

  const getScopeConfig = (scope: MemoryScope) => {
    return MEMORY_SCOPES.find((s) => s.value === scope) || MEMORY_SCOPES[0]
  }

  const handleCreate = () => {
    setEditingMemory(null)
    setFormData({
      title: '',
      narrative: '',
      type: 'note',
      scope: 'repo',
      tags: [],
      confidence: 0.8,
    })
    setIsDialogOpen(true)
  }

  const handleEdit = async (memory: MemoryCompact) => {
    // Load full memory
    try {
      const [full] = await batchMemories([memory.id])
      if (full) {
        setEditingMemory(memory.id)
        setFormData({
          title: full.title,
          narrative: full.narrative || '',
          type: full.type,
          scope: full.scope,
          tags: full.tags,
          confidence: full.confidence,
        })
        setIsDialogOpen(true)
      }
    } catch (e) {
      toast.error('Failed to load memory for editing')
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      if (editingMemory) {
        await updateMemory(editingMemory, {
          title: formData.title,
          narrative: formData.narrative,
          type: formData.type,
          scope: formData.scope,
          tags: formData.tags,
          confidence: formData.confidence,
        })
        toast.success('Memory updated')
      } else {
        await createMemory({
          session_id: `web-${Date.now()}`,
          project: 'nexus',
          title: formData.title,
          narrative: formData.narrative,
          type: formData.type,
          scope: formData.scope,
          tags: formData.tags,
          confidence: formData.confidence,
        })
        toast.success('Memory created')
      }

      setIsDialogOpen(false)
      loadMemories()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save memory')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteMemory(id)
      toast.success('Memory deleted')
      loadMemories()
    } catch (e) {
      toast.error('Failed to delete memory')
    }
  }

  // Initial loading state - show skeleton (only on first load, not during search)
  if (initialLoading) {
    return <AppLayout><MemoriesSkeleton /></AppLayout>
  }

  // API disconnected - show error
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
              Start the Nexus API server to manage your memories.
            </p>
          </div>
          <code className="bg-muted px-4 py-2 rounded text-sm font-mono">
            cd apps/api && bun src/index.ts
          </code>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Memories</h2>
            <p className="text-muted-foreground">
              {total} memories stored
            </p>
          </div>
          <Button onClick={handleCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Memory
          </Button>
        </div>

        {/* Filters - memoized component to prevent re-render on search */}
        <MemoriesFilters
          searchQuery={searchQuery}
          filterType={filterType}
          filterScope={filterScope}
          onSearchChange={handleSearchChange}
          onFilterTypeChange={handleFilterTypeChange}
          onFilterScopeChange={handleFilterScopeChange}
          onClearFilters={handleClearFilters}
        />

        {/* Empty State */}
        {memories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BrainIcon className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No memories found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' || filterScope !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first memory to get started'}
            </p>
            {!searchQuery && filterType === 'all' && filterScope === 'all' && (
              <Button onClick={handleCreate}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Memory
              </Button>
            )}
          </div>
        )}

        {/* Memories Timeline */}
        {memories.length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedMemories).map(([date, dayMemories]) => (
              <div key={date} className="relative">
                {/* Date Header */}
                <div className="sticky top-0 z-10 mb-4 bg-background/95 pb-2 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {new Date(date).getDate()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{date}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dayMemories.length} {dayMemories.length === 1 ? 'memory' : 'memories'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-5 border-l-2 border-muted pl-8">
                  {dayMemories.map((memory) => {
                    const typeConfig = getTypeConfig(memory.type)
                    const scopeConfig = getScopeConfig(memory.scope)
                    const TypeIcon = typeConfig.icon
                    const ScopeIcon = scopeConfig.icon
                    const expanded = expandedMemories.get(memory.id)

                    return (
                      <Card
                        key={memory.id}
                        className={cn(
                          'group hover:shadow-md transition-all cursor-pointer',
                          expanded && 'col-span-full'
                        )}
                        onClick={() => expandMemory(memory.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                  <TypeIcon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {typeConfig.label}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <ScopeIcon className="h-3 w-3 mr-1" />
                                  {scopeConfig.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(memory)
                                  }}
                                >
                                  <EditIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(memory.id)
                                  }}
                                >
                                  <Trash2Icon className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            {/* Summary */}
                            <p className="text-sm font-medium line-clamp-2">
                              {memory.summary}
                            </p>

                            {/* Confidence */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${memory.confidence * 100}%` }}
                                />
                              </div>
                              <span>{Math.round(memory.confidence * 100)}%</span>
                            </div>

                            {/* Expanded Content */}
                            {expanded && (
                              <div className="mt-4 pt-4 border-t space-y-3">
                                <div>
                                  <h4 className="font-semibold">{expanded.title}</h4>
                                  {expanded.subtitle && (
                                    <p className="text-sm text-muted-foreground">
                                      {expanded.subtitle}
                                    </p>
                                  )}
                                </div>

                                {expanded.narrative && (
                                  <div className="text-sm">
                                    <Markdown content={expanded.narrative} />
                                  </div>
                                )}

                                {expanded.facts.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                                      Facts
                                    </h5>
                                    <ul className="text-sm space-y-1">
                                      {expanded.facts.map((fact, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-primary">-</span>
                                          {fact}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {expanded.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {expanded.tags.map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {expanded.links.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                                      Sources
                                    </h5>
                                    <div className="space-y-1">
                                      {expanded.links.map((link) => (
                                        <div
                                          key={link.id}
                                          className="flex items-center gap-2 text-xs text-muted-foreground"
                                        >
                                          <LinkIcon className="h-3 w-3" />
                                          <span>
                                            {link.path}
                                            {link.start_line && `:${link.start_line}`}
                                            {link.end_line && `-${link.end_line}`}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMemory ? 'Edit Memory' : 'Create New Memory'}
            </DialogTitle>
            <DialogDescription>
              {editingMemory
                ? 'Update the memory details'
                : 'Add a new memory to store information'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter memory title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formData.type}
                  onValueChange={(value: MemoryType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Scope</label>
                <Select
                  value={formData.scope}
                  onValueChange={(value: MemoryScope) =>
                    setFormData({ ...formData, scope: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_SCOPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Confidence: {Math.round(formData.confidence * 100)}%
              </label>
              <Slider
                value={[formData.confidence * 100]}
                onValueChange={([value]) =>
                  setFormData({ ...formData, confidence: value / 100 })
                }
                min={0}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Content / Narrative</label>
              <Textarea
                placeholder="Enter memory content..."
                value={formData.narrative}
                onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                placeholder="tag1, tag2, tag3"
                value={formData.tags.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingMemory ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
