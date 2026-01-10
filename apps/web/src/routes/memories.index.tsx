import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDataStore, type Memory } from '@/stores/dataStore'
import {
  BrainIcon,
  CodeIcon,
  FileTextIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  EditIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export const Route = createFileRoute('/memories/')({
  component: MemoriesList,
})

function MemoriesList() {
  const { memories, contexts, addMemory, updateMemory, deleteMemory } =
    useDataStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterContext, setFilterContext] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'note' as Memory['type'],
    contextId: '',
    tags: [] as string[],
  })

  const filteredMemories = memories
    .filter((memory) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        memory.content.toLowerCase().includes(query) ||
        memory.title.toLowerCase().includes(query) ||
        memory.tags.some((tag) => tag.toLowerCase().includes(query))

      const matchesType = filterType === 'all' || memory.type === filterType
      const matchesContext =
        filterContext === 'all' || memory.contextId === filterContext

      return matchesSearch && matchesType && matchesContext
    })
    .sort((a, b) => b.createdAt - a.createdAt)

  const groupedMemories = filteredMemories.reduce(
    (acc, memory) => {
      const date = new Date(memory.createdAt).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(memory)
      return acc
    },
    {} as Record<string, typeof filteredMemories>,
  )

  const getMemoryIcon = (type: Memory['type']) => {
    switch (type) {
      case 'note':
        return FileTextIcon
      case 'snippet':
        return CodeIcon
      case 'reference':
        return BrainIcon
      default:
        return FileTextIcon
    }
  }

  const handleCreate = () => {
    setEditingMemory(null)
    setFormData({
      title: '',
      content: '',
      type: 'note',
      contextId: contexts.length > 0 ? contexts[0].id : '',
      tags: [],
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (memory: Memory) => {
    setEditingMemory(memory.id)
    setFormData({
      title: memory.title,
      content: memory.content,
      type: memory.type,
      contextId: memory.contextId || '',
      tags: memory.tags,
    })
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    if (editingMemory) {
      updateMemory(editingMemory, formData)
      toast.success('Memory updated')
    } else {
      addMemory(formData)
      toast.success('Memory created')
    }

    setIsDialogOpen(false)
    setFormData({
      title: '',
      content: '',
      type: 'note',
      contextId: '',
      tags: [],
    })
    setEditingMemory(null)
  }

  const handleDelete = (id: string) => {
    deleteMemory(id)
    toast.success('Memory deleted')
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Memories</h2>
            <p className="text-muted-foreground">
              Browse and manage your memories
            </p>
          </div>
          <Button onClick={handleCreate} disabled={contexts.length === 0}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Memory
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={filterType}
                onValueChange={setFilterType}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="snippet">Snippet</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterContext} onValueChange={setFilterContext}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contexts</SelectItem>
                  {contexts.map((context) => (
                    <SelectItem key={context.id} value={context.id}>
                      {context.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(filterType !== 'all' ||
                filterContext !== 'all' ||
                searchQuery) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilterType('all')
                    setFilterContext('all')
                    setSearchQuery('')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Memories Timeline */}
        {filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BrainIcon className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No memories found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' || filterContext !== 'all'
                ? 'Try adjusting your filters'
                : contexts.length === 0
                ? 'Create a context first to add memories'
                : 'Create your first memory to get started'}
            </p>
            {contexts.length > 0 && !searchQuery && (
              <Button onClick={handleCreate}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Memory
              </Button>
            )}
          </div>
        ) : (
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
                        {dayMemories.length}{' '}
                        {dayMemories.length === 1 ? 'memory' : 'memories'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-5 border-l-2 border-muted pl-8">
                  {dayMemories.map((memory) => {
                    const Icon = getMemoryIcon(memory.type)
                    const context = contexts.find(
                      (c) => c.id === memory.contextId,
                    )

                    return (
                      <Card
                        key={memory.id}
                        className="group hover:shadow-md transition-all cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                  <Icon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <Badge
                                  variant="outline"
                                  className="capitalize text-xs"
                                >
                                  {memory.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(memory)}
                                >
                                  <EditIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDelete(memory.id)}
                                >
                                  <Trash2Icon className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            {/* Title */}
                            {memory.title && (
                              <h4 className="font-semibold text-sm line-clamp-1">
                                {memory.title}
                              </h4>
                            )}

                            {/* Content Preview */}
                            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                              {memory.content}
                            </p>

                            {/* Context Badge */}
                            {context && (
                              <Badge
                                variant="secondary"
                                className="text-xs w-fit"
                              >
                                {context.title}
                              </Badge>
                            )}

                            {/* Tags */}
                            {memory.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {memory.tags.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {memory.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{memory.tags.length - 3}
                                  </Badge>
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
              <label
                htmlFor="title"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Title
              </label>
              <Input
                id="title"
                placeholder="Enter memory title..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="type"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(value: Memory['type']) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="snippet">Snippet</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contexts.length > 0 && (
              <div className="space-y-2">
                <label
                  htmlFor="context"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Context (optional)
                </label>
                <Select
                  value={formData.contextId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contextId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a context" />
                  </SelectTrigger>
                  <SelectContent>
                    {contexts.map((context) => (
                      <SelectItem key={context.id} value={context.id}>
                        {context.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label
                htmlFor="content"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Content
              </label>
              <Textarea
                id="content"
                placeholder="Enter memory content..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tags"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Tags (comma-separated)
              </label>
              <Input
                id="tags"
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
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingMemory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
