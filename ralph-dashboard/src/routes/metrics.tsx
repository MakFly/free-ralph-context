import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useRalphData } from '@/stores/ralph-store'

export const Route = createFileRoute('/metrics')({
  component: MetricsPage,
})

function MetricsPage() {
  const { status } = useRalphData()
  const [metricsHistory, setMetricsHistory] = useState<Array<any>>([])
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetricsData() {
      try {
        setIsLoading(true)

        // Fetch metrics history
        const metricsRes = await fetch('/api/metrics/history')
        if (metricsRes.ok) {
          const data = await metricsRes.json()
          setMetricsHistory(data.metrics || [])
        }

        // Fetch sync status
        const syncRes = await fetch('/api/sync/status')
        if (syncRes.ok) {
          const data = await syncRes.json()
          setSyncStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetricsData()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
        <p className="text-muted-foreground">
          Historical metrics, LLM usage, and system performance
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.projectCount}</div>
            <p className="text-xs text-muted-foreground">
              Total projects tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">LLM Calls</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20" />
              <path d="m17 5-5-3-5 3" />
              <path d="m17 10-5-3-5 3" />
              <path d="m12 15-5 3 5 3 5-3" />
              <path d="m17 19-5 3-5-3" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {llmUsage?.totalCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M2 12h20" />
              <path d="M12 2v20" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus ? Math.round(syncStatus.cacheHitRate * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {syncStatus?.cachedFiles || 0} of {syncStatus?.totalFiles || 0}{' '}
              files cached
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>
            File synchronization performance and cache statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : syncStatus ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-xl font-bold">
                  {syncStatus.totalFiles || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cached Files</p>
                <p className="text-xl font-bold">
                  {syncStatus.cachedFiles || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Synced Files</p>
                <p className="text-xl font-bold">
                  {syncStatus.syncedFiles || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                <p className="text-xl font-bold">
                  {Math.round((syncStatus.cacheHitRate || 0) * 100)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sync data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics History */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics History</CardTitle>
          <CardDescription>
            Recent metrics data points ({metricsHistory.length} records)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : metricsHistory.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {metricsHistory
                .slice(-20)
                .reverse()
                .map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between text-sm border-b py-2"
                  >
                    <div className="flex-1">
                      <span className="font-medium capitalize">
                        {metric.metricType}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {new Date(metric.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono">
                        {metric.metricValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No metrics history available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">About Metrics</h3>
        <p className="text-sm text-muted-foreground">
          The metrics page shows historical data about your AI agent sessions.
          Metrics include context usage over time, LLM API calls and costs, and
          sync performance data. Data is stored in SQLite and persists across
          sessions.
        </p>
      </div>
    </div>
  )
}
