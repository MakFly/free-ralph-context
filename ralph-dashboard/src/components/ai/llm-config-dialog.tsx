'use client'

import * as React from 'react'
import { useState } from 'react'
import { Check, Key, LoaderCircle, Settings, Trash2 } from 'lucide-react'
import type { LlmProvider } from '@/lib/ai-api'
import { useAiStore } from '@/stores/ai-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const PROVIDER_OPTIONS: Array<{
  value: LlmProvider
  label: string
  color: string
}> = [
  { value: 'anthropic', label: 'Anthropic Claude', color: 'text-violet-500' },
  { value: 'openai', label: 'OpenAI GPT', color: 'text-emerald-500' },
  { value: 'mistral', label: 'Mistral AI', color: 'text-orange-500' },
  { value: 'google', label: 'Google Gemini', color: 'text-blue-500' },
]

export function LlmConfigDialog() {
  const {
    configDialogOpen,
    closeConfigDialog,
    llmConfigs,
    configsLoading,
    fetchLlmConfigs,
    saveLlmConfig,
    deleteLlmConfig,
    toggleLlmConfig,
  } = useAiStore()

  const [selectedProvider, setSelectedProvider] =
    useState<LlmProvider>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (configDialogOpen) {
      fetchLlmConfigs()
    }
  }, [configDialogOpen, fetchLlmConfigs])

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await saveLlmConfig(selectedProvider, apiKey.trim(), true)
      setApiKey('')
      // Don't close dialog, let user see success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (provider: LlmProvider) => {
    try {
      await deleteLlmConfig(provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete config')
    }
  }

  const handleToggle = async (provider: LlmProvider) => {
    try {
      await toggleLlmConfig(provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle config')
    }
  }

  const getConfigForProvider = (provider: LlmProvider) =>
    llmConfigs.find((c) => c.provider === provider)

  return (
    <Dialog open={configDialogOpen} onOpenChange={closeConfigDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-500" />
            Configuration LLM pour Suggestions IA
          </DialogTitle>
          <DialogDescription>
            Configurez les clés API pour générer des suggestions contextuelles
            en français. Les clés sont chiffrées avant d'être sauvegardées.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="configure" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configure">Configurer</TabsTrigger>
            <TabsTrigger value="manage">Gérer</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Fournisseur LLM</Label>
              <Select
                value={selectedProvider}
                onValueChange={(v) => setSelectedProvider(v as LlmProvider)}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>●</span> {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Clé API</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-9 font-mono text-sm"
                  disabled={saving}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                La clé sera chiffrée avec Fernet avant d'être sauvegardée en
                base de données.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-500">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeConfigDialog}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
                {saving ? (
                  <>
                    <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {configsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : llmConfigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune configuration LLM trouvée.</p>
                <p className="text-sm">Ajoutez une clé API pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {PROVIDER_OPTIONS.map((option) => {
                  const config = getConfigForProvider(option.value)
                  if (!config) return null

                  return (
                    <div
                      key={option.value}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        config.is_active
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-muted/30 border-border',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={option.color}>●</span>
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {config.key_masked}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={config.is_active ? 'default' : 'outline'}
                          className={cn(
                            'text-xs',
                            config.is_active
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : '',
                          )}
                        >
                          {config.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggle(option.value)}
                        >
                          {config.is_active ? (
                            <span className="text-xs">Pause</span>
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(option.value)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
