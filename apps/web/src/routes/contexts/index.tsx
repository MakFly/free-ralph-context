import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDataStore } from '@/stores/dataStore'
import {
  FolderKanbanIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  EditIcon,
  XIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/contexts/')({
  component: ContextsList,
})

function ContextsList() {
  const { contexts, addContext, updateContext, deleteContext, getMemoriesByContext } =
    useDataStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContext, setEditingContext] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '' })

  const filteredContexts = contexts.filter((context) => {
    const query = searchQuery.toLowerCase()
    return (
      context.title.toLowerCase().includes(query) ||
      context.content.toLowerCase().includes(query)
    )
  })

  const handleCreate = () => {
    setEditingContext(null)
    setFormData({ title: '', content: '' })
    setIsDialogOpen(true)
  }

  const handleEdit = (context: typeof contexts[0]) => {
    setEditingContext(context.id)
    setFormData({ title: context.title, content: context.content })
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (editingContext) {
      updateContext(editingContext, {
        title: formData.title,
        content: formData.content,
      })
      toast.success('Context updated')
    } else {
      addContext({
        title: formData.title,
        content: formData.content,
      })
      toast.success('Context created')
    }

    setIsDialogOpen(false)
    setFormData({ title: '', content: '' })
    setEditingContext(null)
  }

  const handleDelete = (id: string) => {
    deleteContext(id)
    toast.success('Context deleted')
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Contexts</h2>
            <p className="text-muted-foreground">
              Manage and organize your contexts
            </p>
          </div>
          <Button onClick={handleCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Context
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contexts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <GridIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contexts Grid/List */}
        {filteredContexts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanbanIcon className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No contexts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first context to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Context
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'gap-4',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col',
            )}
          >
            {filteredContexts.map((context) => {
              const memoryCount = getMemoriesByContext(context.id).length
              return (
                <Card
                  key={context.id}
                  className="group hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FolderKanbanIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {context.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-1">
                            {context.content || 'No description'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(context)}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(context.id)}
                        >
                          <Trash2Icon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{memoryCount} memories</span>
                        <span>
                          Updated {new Date(context.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingContext ? 'Edit Context' : 'Create New Context'}
            </DialogTitle>
            <DialogDescription>
              {editingContext
                ? 'Update the context details'
                : 'Add a new context to organize your memories'}
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
                placeholder="Enter context title..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="content"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Description
              </label>
              <Textarea
                id="content"
                placeholder="Enter context description..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={4}
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
              {editingContext ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
