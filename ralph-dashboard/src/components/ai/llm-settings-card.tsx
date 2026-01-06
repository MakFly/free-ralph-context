'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  Key,
  LoaderCircle,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { useAiStore } from '@/stores/ai-store'
import { fetchLLMStatus } from '@/stores/ralph-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { LlmSettingsCardSkeleton } from '@/components/skeletons/llm-settings-skeleton'

// LLM Provider configurations
const LLM_PROVIDERS: Array<{
  id: 'anthropic' | 'openai' | 'mistral' | 'google'
  name: string
  icon: React.ElementType
  color: string
  placeholder: string
  description: string
  docsUrl: string
}> = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: Settings,
    color: 'text-violet-500',
    placeholder: 'sk-ant-...',
    description: 'Modèles Claude Haiku, Sonnet, Opus',
    docsUrl: 'https://docs.anthropic.com/',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    icon: Key,
    color: 'text-emerald-500',
    placeholder: 'sk-...',
    description: 'Modèles GPT-4, GPT-4 Turbo',
    docsUrl: 'https://platform.openai.com/',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    icon: Settings,
    color: 'text-orange-500',
    placeholder: 'Mistral API Key',
    description: 'Modèles Mistral Large, Mixtral',
    docsUrl: 'https://docs.mistral.ai/',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    icon: Key,
    color: 'text-blue-500',
    placeholder: 'AIza...',
    description: 'Modèles Gemini Pro, Flash',
    docsUrl: 'https://ai.google.dev/',
  },
]

export function LlmSettingsCard() {
  const {
    llmConfigs,
    configsLoading,
    configsError,
    saveLlmConfig,
    deleteLlmConfig,
    toggleLlmConfig,
    fetchLlmConfigs,
  } = useAiStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<
    (typeof LLM_PROVIDERS)[number]['id'] | null
  >(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch LLM configs on component mount
  useEffect(() => {
    fetchLlmConfigs()
  }, [fetchLlmConfigs])

  const activeConfigs = llmConfigs.filter((c) => c.is_active)

  const handleOpenDialog = (
    providerId: (typeof LLM_PROVIDERS)[number]['id'],
  ) => {
    const existingConfig = llmConfigs.find((c) => c.provider === providerId)
    setSelectedProvider(providerId)
    setApiKey('') // Always start empty for security
    setShowKey(false)
    setIsEditing(!!existingConfig?.has_key)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedProvider(null)
    setApiKey('')
    setShowKey(false)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!selectedProvider || !apiKey.trim()) return

    setSaving(true)
    try {
      await saveLlmConfig(selectedProvider, apiKey.trim(), true)
      // Refresh LLM status in footer immediately
      fetchLLMStatus()
      handleCloseDialog()
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (
    provider: (typeof LLM_PROVIDERS)[number]['id'],
  ) => {
    try {
      await deleteLlmConfig(provider)
      // Refresh LLM status in footer immediately
      fetchLLMStatus()
    } catch (error) {
      console.error('Failed to delete config:', error)
    }
  }

  const handleToggle = async (
    provider: (typeof LLM_PROVIDERS)[number]['id'],
  ) => {
    try {
      await toggleLlmConfig(provider)
      // Refresh LLM status in footer immediately
      fetchLLMStatus()
    } catch (error) {
      console.error('Failed to toggle config:', error)
    }
  }

  return (
    <>
      {/* Loading skeleton */}
      {configsLoading && <LlmSettingsCardSkeleton />}

      {/* Main content */}
      {!configsLoading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Configuration LLM
              </CardTitle>
              <Badge variant="outline">
                {activeConfigs.length} actif
                {activeConfigs.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error state */}
            {configsError && (
              <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/5">
                <p className="text-sm text-rose-500">{configsError}</p>
              </div>
            )}

            {/* Configured providers list */}
            <div className="space-y-3">
              {LLM_PROVIDERS.map((provider) => {
                const config = llmConfigs.find(
                  (c) => c.provider === provider.id,
                )
                const isActive = config?.is_active

                return (
                  <div
                    key={provider.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-colors',
                      isActive
                        ? 'border-primary/20 bg-primary/5'
                        : 'border-dashed',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          provider.color,
                          'bg-muted',
                        )}
                      >
                        <provider.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{provider.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {provider.description}
                        </p>
                        {config && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Clé configurée: {config.key_masked}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(provider.id)}
                            className="h-8"
                          >
                            {isActive ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Actif
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                Inactif
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(provider.id)}
                            className="h-8"
                            title="Modifier la clé API"
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(provider.id)}
                            className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(provider.id)}
                          className="h-8"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Configurer
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Help text */}
            <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
              <p className="text-xs text-muted-foreground mb-2">
                <strong>Pourquoi configurer des LLM ?</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Les fournisseurs LLM permettent de générer des suggestions IA
                personnalisées pour améliorer votre codebase. Vos clés API sont
                chiffrées avant stockage.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {/* End main content */}

      {/* Config Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProvider && (
                <span className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  {LLM_PROVIDERS.find((p) => p.id === selectedProvider)?.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Entrez une nouvelle clé API pour remplacer celle existante.'
                : 'Entrez votre clé API pour activer ce fournisseur.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isEditing && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Une clé API est déjà configurée. Entrez une nouvelle clé
                  pour la remplacer.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key">
                {isEditing ? 'Nouvelle clé API' : 'Clé API'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder={
                    selectedProvider
                      ? LLM_PROVIDERS.find((p) => p.id === selectedProvider)
                          ?.placeholder
                      : 'Entrez votre clé API'
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                  className="shrink-0"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtenez votre clé sur{' '}
                {selectedProvider && (
                  <a
                    href={
                      LLM_PROVIDERS.find((p) => p.id === selectedProvider)
                        ?.docsUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {LLM_PROVIDERS.find((p) => p.id === selectedProvider)?.name}{' '}
                    docs
                  </a>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleCloseDialog}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!apiKey.trim() || saving}>
              {saving ? (
                <>
                  <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Remplacement...' : 'Enregistrement...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {isEditing ? 'Remplacer' : 'Enregistrer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
