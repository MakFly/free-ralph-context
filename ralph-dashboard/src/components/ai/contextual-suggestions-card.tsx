'use client'

import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { SuggestionCategory, SuggestionPriority } from '@/lib/ai-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Category icons and colors
const CATEGORY_CONFIG: Record<
  SuggestionCategory,
  {
    icon: React.ElementType
    color: string
    bg: string
    border: string
    label: string
  }
> = {
  feature: {
    icon: Sparkles,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    label: 'Nouvelle fonctionnalité',
  },
  optimization: {
    icon: Sparkles,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Optimisation',
  },
  'bug-fix': {
    icon: AlertCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Bug Fix',
  },
  refactor: {
    icon: RefreshCw,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Refactor',
  },
  architecture: {
    icon: Lightbulb,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Architecture',
  },
}

// Priority badges
const PRIORITY_CONFIG: Record<
  SuggestionPriority,
  { color: string; bg: string; border: string }
> = {
  high: {
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  medium: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  low: {
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
}

interface Suggestion {
  id: string
  title: string
  description: string
  category: SuggestionCategory
  priority: SuggestionPriority
}

interface SuggestionsResponse {
  suggestions: Suggestion[]
  provider: string
  timestamp: string
}

type ContextType = 'memory' | 'project'

interface ContextualSuggestionsCardProps {
  type: ContextType
  entityId: string
  title?: string
  className?: string
}

export function ContextualSuggestionsCard({
  type,
  entityId,
  title,
  className,
}: ContextualSuggestionsCardProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)

  // Use a ref to track if component is mounted
  const isMounted = useRef(true)
  // Use a counter to force refresh
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Default title based on type
  const defaultTitle =
    type === 'memory'
      ? 'Insights IA pour cette mémoire'
      : 'Recommandations IA pour ce projet'

  const displayTitle = title || defaultTitle

  // Fetch function with useCallback to avoid recreating on every render
  const fetchSuggestions = useCallback(async () => {
    if (!isMounted.current) return

    setLoading(true)
    setError(null)

    try {
      const API_BASE =
        import.meta.env.VITE_RALPH_API_URL || 'http://localhost:8000'
      const endpoint =
        type === 'memory'
          ? `/api/ai/suggestions/memory/${entityId}`
          : `/api/ai/suggestions/project/${encodeURIComponent(entityId)}`

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!isMounted.current) return // Component unmounted during fetch

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: response.statusText }))
        if (response.status === 404) {
          throw new Error(
            type === 'memory' ? 'Mémoire non trouvée' : 'Projet non trouvé',
          )
        }
        throw new Error(errorData.detail || 'Failed to fetch suggestions')
      }

      const data: SuggestionsResponse = await response.json()

      if (isMounted.current) {
        setSuggestions(data.suggestions)
        setProvider(data.provider)
      }
    } catch (err) {
      if (isMounted.current) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('Failed to fetch suggestions:', err)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [type, entityId])

  // Initial fetch on mount and when refreshCounter changes
  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions, refreshCounter])

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const handleRefresh = () => {
    // Increment counter to trigger refetch
    setRefreshCounter((prev) => prev + 1)
  }

  // Loading state (only show on first load, not on refresh)
  if (loading && suggestions.length === 0 && !error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <LoaderCircle className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Génération des suggestions...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state (only if no suggestions to show)
  if (error && suggestions.length === 0) {
    return (
      <Card className={cn('border-rose-500/30 bg-rose-500/5', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm text-rose-500 mb-1">Erreur de génération</p>
            <p className="text-xs text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (suggestions.length === 0 && !loading && !error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            Aucune suggestion disponible
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success state with suggestions
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            {displayTitle}
            {provider && (
              <Badge variant="outline" className="text-xs ml-2">
                {provider}
              </Badge>
            )}
            {loading && (
              <LoaderCircle className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-7 text-xs"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suggestions.map((suggestion) => {
            const config = CATEGORY_CONFIG[suggestion.category]
            const priority = PRIORITY_CONFIG[suggestion.priority]
            const Icon = config.icon

            return (
              <div
                key={suggestion.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors hover:bg-muted/30',
                  config.border,
                  config.bg,
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn('p-2 rounded-lg', config.bg, config.color)}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">
                        {suggestion.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs px-1.5 py-0',
                          priority.border,
                          priority.color,
                          priority.bg,
                        )}
                      >
                        {suggestion.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-xs shrink-0', config.color)}
                  >
                    {config.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
