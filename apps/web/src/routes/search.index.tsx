import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useNexusStore, type NexusSearchResult } from '@/stores/nexusStore'
import {
  SearchIcon,
  XIcon,
  CodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerOffIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRightDoubleIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

export const Route = createFileRoute('/search/')({
  component: SearchPage,
})

function SearchPage() {
  const {
    isConnected,
    stats,
    search,
    clearError,
    lastError,
  } = useNexusStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NexusSearchResult | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const totalPages = results ? Math.ceil(results.totalCount / pageSize) : 0
  const startResult = (currentPage - 1) * pageSize + 1
  const endResult = Math.min(currentPage * pageSize, results?.totalCount || 0)

  const handleSearch = async (page: number = 1) => {
    if (!query.trim() || !isConnected) return
    setSearching(true)
    setCurrentPage(page)
    try {
      const offset = (page - 1) * pageSize
      const searchResults = await search({ query, mode: 'keyword', k: pageSize, offset })
      setResults(searchResults)
      setHasSearched(true)
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setSearching(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setHasSearched(false)
    setCurrentPage(1)
  }

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
              Start the Nexus API server to search your codebase.
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Search</h2>
            <p className="text-muted-foreground">Search code with Nexus FTS5</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircleIcon className="h-3 w-3 text-green-500" />
              Connected
            </Badge>
            {stats && (
              <span className="text-sm text-muted-foreground">
                {stats.files} files
              </span>
            )}
          </div>
        </div>

        {/* Search Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search code..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={!query.trim() || searching}>
                <SearchIcon className="mr-2 h-4 w-4" />
                {searching ? 'Searching...' : 'Search'}
              </Button>
              {query && (
                <Button variant="ghost" onClick={handleClear}>
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            {lastError && (
              <div className="mt-3 text-sm text-destructive flex items-center gap-1">
                <XCircleIcon className="h-4 w-4" />
                {lastError}
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            )}
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
                  Enter a query to search through your codebase
                </p>
              </div>
            </CardContent>
          </Card>
        ) : !results || results.hits.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-muted-foreground">Try adjusting your query</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CodeIcon className="h-5 w-5" />
                Results ({startResult}-{endResult} of {results.totalCount})
              </h3>
              <span className="text-sm text-muted-foreground">{results.duration}ms</span>
            </div>

            {/* Results List */}
            <div className="grid gap-3">
              {results.hits.map((hit, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index
                return (
                  <Collapsible key={globalIndex} defaultOpen={false} className="border-0">
                    <Card className="hover:shadow-md transition-shadow">
                      <CollapsibleTrigger className="p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <CodeIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <code className="text-sm font-mono text-primary">{hit.snippet.slice(0, 60)}{hit.snippet.length > 60 ? '...' : ''}</code>
                              {hit.symbol && <Badge variant="outline" className="text-xs">{hit.symbol}</Badge>}
                              <span className="text-xs text-muted-foreground">{hit.startLine}:{hit.endLine}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{hit.path}</div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="border-t">
                        <div className="ml-13 mt-2 p-3 bg-muted rounded-lg">
                          <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                            <code>{hit.snippet}</code>
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={currentPage === 1 || searching}
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-9 h-9"
                              onClick={() => handleSearch(pageNum)}
                              disabled={searching}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={currentPage === totalPages || searching}
                      >
                        Next
                        <ChevronRightDoubleIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
