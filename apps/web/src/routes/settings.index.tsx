import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  AlertTriangleIcon,
  AlertCircleIcon,
  DatabaseIcon,
  RefreshCwIcon,
  FileCodeIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNexusStore } from '@/stores/nexusStore'
import { logger } from '@/lib/logger'
import { SynthesisConfig } from '@/components/synthesis-config'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

interface SettingsData {
  database: {
    files: number
    chunks: number
    memories: number
    patterns: number
    projects: number
  }
}

// Get localStorage size - SSR safe
function getLocalStorageSize() {
  if (typeof window === "undefined") return 0
  let total = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length
    }
  }
  return total
}


function SettingsPage() {
  const { apiBaseUrl, isConnected, fetchProjects } = useNexusStore()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isResettingIndex, setIsResettingIndex] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showConfirmIndex, setShowConfirmIndex] = useState(false)
  const [showClearCache, setShowClearCache] = useState(false)
  const [cacheSize, setCacheSize] = useState(0)

  const fetchSettings = async () => {
    if (!isConnected) return

    setIsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/settings`)
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      logger.error('Failed to fetch settings', error, 'Settings')
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    if (!isConnected) return

    setIsResetting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/settings/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_DATABASE_CONFIRM' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset database')
      }

      toast.success('Database reset', {
        description: data.message || 'All data has been cleared'
      })
      setShowConfirm(false)

      // Clear local projects cache and refresh from API
      await fetchProjects()
      // Refresh settings after reset
      setTimeout(() => fetchSettings(), 500)
    } catch (error) {
      logger.error('Failed to reset database', error, 'Settings')
      toast.error('Failed to reset database', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleResetIndex = async () => {
    if (!isConnected) return

    setIsResettingIndex(true)
    try {
      const response = await fetch(`${apiBaseUrl}/settings/reset-index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_INDEX_CONFIRM' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset indexation')
      }

      toast.success('Indexation reset', {
        description: data.message || 'All files and chunks have been deleted'
      })
      setShowConfirmIndex(false)

      // Refresh settings after reset
      setTimeout(() => fetchSettings(), 500)
    } catch (error) {
      logger.error('Failed to reset indexation', error, 'Settings')
      toast.error('Failed to reset indexation', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsResettingIndex(false)
    }
  }

  // Fetch settings on mount - SSR safe
  useEffect(() => {
    fetchSettings()
    setCacheSize(getLocalStorageSize())
  }, [])

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      setCacheSize(0)
      setShowClearCache(false)
      toast.success('Cache cleared', {
        description: 'Refreshing page...'
      })
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your Nexus instance and database
          </p>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Card className="border-yellow-500 bg-yellow-500/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircleIcon className="h-5 w-5 text-yellow-500" />
                <div>
                  <CardTitle className="text-sm">API Not Connected</CardTitle>
                  <CardDescription className="text-sm">
                    Configure your API URL to access settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DatabaseIcon className="h-5 w-5" />
                <CardTitle>Database Statistics</CardTitle>
              </div>
              <Button
                onClick={fetchSettings}
                variant="outline"
                size="sm"
                disabled={isLoading || !isConnected}
              >
                <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <CardDescription>
              Current data stored in your Nexus database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settings?.database ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Files</p>
                  <p className="text-2xl font-bold">{(settings.database.files ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Chunks</p>
                  <p className="text-2xl font-bold">{(settings.database.chunks ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Memories</p>
                  <p className="text-2xl font-bold">{(settings.database.memories ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Patterns</p>
                  <p className="text-2xl font-bold">{(settings.database.patterns ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Projects</p>
                  <p className="text-2xl font-bold">{(settings.database.projects ?? 0).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Loading...' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browser Cache */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <DatabaseIcon className="h-5 w-5" />
              <CardTitle>Browser Cache</CardTitle>
            </div>
            <CardDescription>
              Local storage used by Nexus for offline data and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="font-medium">Local Storage Size</p>
                <p className="text-sm text-muted-foreground">
                  {(cacheSize / 1024).toFixed(1)} KB used for cached projects and data
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ℹ️ The browser stores a local copy of your projects for faster access.
                  If you see stale data after a database reset, clear this cache.
                </p>
              </div>
              <Button
                onClick={() => setShowClearCache(true)}
                variant="outline"
                size="sm"
                disabled={cacheSize === 0}
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>

            {showClearCache && (
              <div className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/10 space-y-4">
                <div className="space-y-2">
                  <p className="font-medium text-yellow-600 dark:text-yellow-500">⚠️ Clear browser cache?</p>
                  <p className="text-sm text-muted-foreground">
                    This will remove all locally stored data including:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                    <li>Cached project list</li>
                    <li>Active project selection</li>
                    <li>Connection status</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    The page will reload automatically after clearing.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleClearCache}
                    variant="default"
                    size="sm"
                  >
                    Yes, Clear Cache
                  </Button>
                  <Button
                    onClick={() => setShowClearCache(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Synthesis Provider Configuration */}
        <SynthesisConfig />

        {/* Danger Zone */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Irreversible actions that affect your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reset Indexation */}
            {!showConfirmIndex ? (
              <div className="flex items-center justify-between p-4 border border-orange-500/20 rounded-lg bg-orange-500/10">
                <div className="flex items-start gap-3">
                  <FileCodeIcon className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium">Reset Indexation</p>
                    <p className="text-sm text-muted-foreground">
                      Delete all indexed files and chunks. Memories and patterns are preserved.
                      Use this after deleting projects or fixing indexation issues.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowConfirmIndex(true)}
                  variant="outline"
                  className="border-orange-500/50 hover:bg-orange-500/20"
                  disabled={!isConnected || isResettingIndex}
                >
                  Reset Index
                </Button>
              </div>
            ) : (
              <div className="space-y-4 p-4 border border-orange-500/20 rounded-lg bg-orange-500/10">
                <div className="space-y-2">
                  <p className="font-medium text-orange-600 dark:text-orange-500">Reset indexation?</p>
                  <p className="text-sm text-muted-foreground">
                    This will delete:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                    <li>{settings?.database?.files?.toLocaleString() || 0} indexed files</li>
                    <li>{settings?.database?.chunks?.toLocaleString() || 0} code chunks</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Memories and patterns will be preserved. You can re-index your projects after this.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleResetIndex}
                    variant="default"
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={isResettingIndex}
                  >
                    {isResettingIndex ? 'Resetting...' : 'Yes, Reset Index'}
                  </Button>
                  <Button
                    onClick={() => setShowConfirmIndex(false)}
                    variant="outline"
                    disabled={isResettingIndex}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Reset Entire Database */}
            {!showConfirm ? (
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/10">
                <div className="space-y-1">
                  <p className="font-medium">Reset Entire Database</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all files, chunks, memories, patterns, and projects. This action cannot be undone.
                  </p>
                </div>
                <Button
                  onClick={() => setShowConfirm(true)}
                  variant="destructive"
                  disabled={!isConnected || isResetting}
                >
                  Reset Database
                </Button>
              </div>
            ) : (
              <div className="space-y-4 p-4 border border-destructive/20 rounded-lg bg-destructive/10">
                <div className="space-y-2">
                  <p className="font-medium text-destructive">⚠️ Are you absolutely sure?</p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete ALL data from your Nexus database including:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                    <li>{settings?.database?.files?.toLocaleString() || 0} indexed files</li>
                    <li>{settings?.database?.chunks?.toLocaleString() || 0} code chunks</li>
                    <li>{settings?.database?.memories?.toLocaleString() || 0} memories</li>
                    <li>{settings?.database?.patterns?.toLocaleString() || 0} patterns</li>
                    <li>{settings?.database?.projects?.toLocaleString() || 0} projects</li>
                  </ul>
                  <p className="text-sm text-destructive font-medium">
                    This action cannot be undone!
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleReset}
                    variant="destructive"
                    disabled={isResetting}
                  >
                    {isResetting ? 'Resetting...' : 'Yes, Reset Everything'}
                  </Button>
                  <Button
                    onClick={() => setShowConfirm(false)}
                    variant="outline"
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
