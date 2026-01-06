'use client'

import * as React from 'react'
import { useEffect, useMemo } from 'react'
import {
  AlertCircle,
  Bug,
  Lightbulb,
  LoaderCircle,
  Network,
  RefreshCw,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'
import { LlmConfigButton } from './llm-config-button'
import type { SuggestionCategory, SuggestionPriority } from '@/lib/ai-api'
import { useAiStore } from '@/stores/ai-store'
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
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Optimisation',
  },
  'bug-fix': {
    icon: Bug,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Bug Fix',
  },
  refactor: {
    icon: Wrench,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Refactor',
  },
  architecture: {
    icon: Network,
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

export function SuggestionsCard() {
  const llmConfigs = useAiStore((state) => state.llmConfigs)
  const {
    suggestions,
    suggestionsLoading,
    suggestionsError,
    providerUsed,
    generateSuggestions,
    fetchLlmConfigs,
  } = useAiStore()

  // Compute active configs count (stable for comparison)
  const activeConfigsCount = llmConfigs.filter((c) => c.is_active).length

  // Fetch configs and generate suggestions on mount
  useEffect(() => {
    fetchLlmConfigs()
  }, [])

  // Auto-regenerate when active configs change
  useEffect(() => {
    if (
      activeConfigsCount > 0 &&
      suggestions.length === 0 &&
      !suggestionsLoading
    ) {
      generateSuggestions()
    }
  }, [activeConfigsCount])

  const handleRegenerate = () => {
    generateSuggestions()
  }

  // No config state
  if (activeConfigsCount === 0 && !suggestionsLoading) {
    return (
      <>
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Suggestions IA
              </CardTitle>
              <LlmConfigButton />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-1">Aucun LLM configuré</p>
              <p className="text-xs mb-3">
                Configurez un fournisseur LLM pour générer des suggestions
              </p>
              <LlmConfigButton />
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  // Loading state
  if (suggestionsLoading && suggestions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Suggestions IA
            </CardTitle>
            <LlmConfigButton />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Génération des suggestions...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (suggestionsError && suggestions.length === 0) {
    return (
      <>
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Suggestions IA
              </CardTitle>
              <LlmConfigButton />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="text-sm text-rose-500 mb-1">Erreur de génération</p>
              <p className="text-xs text-muted-foreground mb-3">
                {suggestionsError}
              </p>
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  // Success state with suggestions
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Suggestions IA
              {providerUsed && (
                <Badge variant="outline" className="text-xs ml-2">
                  {providerUsed}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={suggestionsLoading}
                className="h-7 text-xs"
              >
                {suggestionsLoading ? (
                  <LoaderCircle className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
              <LlmConfigButton />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Aucune suggestion disponible
            </div>
          ) : (
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
                        className={cn(
                          'p-2 rounded-lg',
                          config.bg,
                          config.color,
                        )}
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
          )}
        </CardContent>
      </Card>
    </>
  )
}
