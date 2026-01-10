import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDataStore } from '@/stores/dataStore'
import {
  SearchIcon,
  FileTextIcon,
  FolderKanbanIcon,
  XIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/search/')({
  component: SearchPage,
})

function SearchPage() {
  const { search } = useDataStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ contexts: any[]; memories: any[] }>({
    contexts: [],
    memories: [],
  })
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = () => {
    if (!query.trim()) return

    const searchResults = search(query)
    setResults(searchResults)
    setHasSearched(true)
  }

  const handleClear = () => {
    setQuery('')
    setResults({ contexts: [], memories: [] })
    setHasSearched(false)
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi',
    )
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Search</h2>
          <p className="text-muted-foreground">
            Find memories and contexts
          </p>
        </div>

        {/* Search Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search in contexts and memories..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={!query.trim()}>
                <SearchIcon className="mr-2 h-4 w-4" />
                Search
              </Button>
              {query && (
                <Button variant="ghost" onClick={handleClear}>
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {!hasSearched ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">Ready to search</h3>
                <p className="text-muted-foreground">
                  Enter a query above to search through your data
                </p>
              </div>
            </CardContent>
          </Card>
        ) : results.contexts.length === 0 && results.memories.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search query
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Contexts Results */}
            {results.contexts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FolderKanbanIcon className="h-5 w-5" />
                  Contexts ({results.contexts.length})
                </h3>
                <div className="grid gap-3">
                  {results.contexts.map((context) => (
                    <Card
                      key={context.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FolderKanbanIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base mb-1">
                              {highlightText(context.title, query)}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {highlightText(
                                context.content || 'No description',
                                query,
                              )}
                            </p>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Updated {new Date(context.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Memories Results */}
            {results.memories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5" />
                  Memories ({results.memories.length})
                </h3>
                <div className="grid gap-3">
                  {results.memories.map((memory) => (
                    <Card
                      key={memory.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileTextIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize text-xs">
                                {memory.type}
                              </Badge>
                              {memory.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {memory.tags.slice(0, 3).map((tag: string) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {memory.title && (
                              <h4 className="font-semibold text-base mb-1">
                                {highlightText(memory.title, query)}
                              </h4>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                              {highlightText(memory.content, query)}
                            </p>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Created {new Date(memory.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
