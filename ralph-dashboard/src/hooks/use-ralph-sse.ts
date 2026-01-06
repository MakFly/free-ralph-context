import { useCallback, useEffect, useRef, useState } from 'react'

export interface Project {
  name: string
  projectPath: string
  currentTokens: number
  maxTokens: number
  contextUsage: number
  pct: number
  lastUpdated: string
  isRealData?: boolean // true = from API usage, false = estimated from file size
  source: {
    name: string
    color: string
  }
  transcriptPath: string
}

export interface RalphStatus {
  connected: boolean
  projectCount: number
  projects: Array<Project>
  sources: Array<{ name: string; color: string }>
  totalTokens: number
  timestamp: string
  syncStatus?: SyncStatus
}

export interface SyncStatus {
  totalFiles: number
  cachedFiles: number
  syncedFiles: number
  pendingFiles: number
  errorFiles: number
  cacheHitRate: number
  avgSyncTime?: number
}

export interface MetricsHistoryPoint {
  id: string
  sessionId: string
  timestamp: string
  metricType: string
  metricValue: number
  metadata?: any
}

export interface SyncProgressEvent {
  transcriptPath: string
  status: string
  progress: number
  total: number
  current: number
}

export interface SyncErrorEvent {
  transcriptPath: string
  error: string
  retryCount: number
}

export interface LLMStatus {
  connected: boolean
  // New format (multiple providers)
  providers?: Array<{
    provider: string
    model: string
    apiKeySet: boolean
    apiKeyMasked: string
  }>
  count?: number
  // Old format (single provider) - kept for compatibility
  provider?: string
  model?: string
  apiKeySet?: boolean
  apiKeyMasked?: string
  // Common fields
  lastChecked: string
  latencyMs?: number
  error?: string
}

// Connect to ralph-api Python FastAPI server (Docker: port 8000)
const RALPH_SSE_URL =
  import.meta.env.VITE_RALPH_API_URL || 'http://localhost:8000'

export function useRalphSSE() {
  const [status, setStatus] = useState<RalphStatus>({
    connected: false,
    projectCount: 0,
    projects: [],
    sources: [],
    totalTokens: 0,
    timestamp: new Date().toISOString(),
  })
  const [sseConnected, setSSEConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // State for enhanced features
  const [metricsHistory, setMetricsHistory] = useState<
    Array<MetricsHistoryPoint>
  >([])
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(
    null,
  )
  const [syncErrors, setSyncErrors] = useState<Array<SyncErrorEvent>>([])
  const [llmStatus, setLLMStatus] = useState<LLMStatus | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const llmStatusFetchInProgressRef = useRef(false)
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectingRef = useRef(false)
  const mountCountRef = useRef(0)

  // Connect to SSE - using function ref to avoid stale closures
  const connect = useCallback(() => {
    // Prevent duplicate connections (especially from React Strict Mode double-mount)
    // Only allow first connection attempt, ignore subsequent ones
    if (mountCountRef.current > 0) {
      console.log('[SSE] Already attempted connection, skipping')
      return
    }

    if (eventSourceRef.current) {
      console.log('[SSE] Already has EventSource, closing and reconnecting')
      eventSourceRef.current.close()
    }

    mountCountRef.current++
    console.log(
      '[SSE] Connecting to',
      `${RALPH_SSE_URL}/events`,
      `(attempt #${mountCountRef.current})`,
    )

    isConnectingRef.current = true
    const eventSource = new EventSource(`${RALPH_SSE_URL}/events`)
    eventSourceRef.current = eventSource

    // Safety timeout: if no init event after 5s, force loading to false
    initTimeoutRef.current = setTimeout(() => {
      console.warn(
        '[SSE] No init event received after 5s, forcing loading=false',
      )
      setIsLoading(false)
      isConnectingRef.current = false
    }, 5000)

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened')
      setSSEConnected(true)
      setLastEvent('connected')
    }

    eventSource.onerror = () => {
      console.error('[SSE] Connection error')
      setSSEConnected(false)
      setLastEvent('error')
      setIsLoading(false)
      isConnectingRef.current = false
    }

    eventSource.addEventListener('init', (event) => {
      // Clear the safety timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
        initTimeoutRef.current = null
      }
      isConnectingRef.current = false
      const data = JSON.parse(event.data)
      console.log('[SSE] Init event received:', data)
      setStatus(data)
      setLastEvent('init')
      setIsLoading(false)
    })

    eventSource.addEventListener('update', (event) => {
      const data = JSON.parse(event.data)
      setStatus(data)
      setLastEvent(`update:${new Date().toLocaleTimeString()}`)
    })

    eventSource.addEventListener('metrics:update', (event) => {
      const data = JSON.parse(event.data)
      setMetricsHistory((prev) => [...prev, data].slice(-100))
      setLastEvent(`metrics:update:${new Date().toLocaleTimeString()}`)
    })

    eventSource.addEventListener('sync:progress', (event) => {
      const data = JSON.parse(event.data)
      setSyncProgress(data)
      setLastEvent(`sync:progress:${new Date().toLocaleTimeString()}`)
    })

    eventSource.addEventListener('sync:error', (event) => {
      const data = JSON.parse(event.data)
      setSyncErrors((prev) => [...prev, data].slice(-20))
      console.error('Sync error:', data)
    })

    eventSource.addEventListener('llm:status', (event) => {
      const data = JSON.parse(event.data)
      setLLMStatus(data)
      setLastEvent(`llm:status:${new Date().toLocaleTimeString()}`)
    })
  }, []) // Empty deps - connect is stable

  const disconnect = useCallback(() => {
    console.log('[SSE] Disconnecting')
    isConnectingRef.current = false
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current)
      initTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setSSEConnected(false)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${RALPH_SSE_URL}/status`)
      const data = await response.json()
      setStatus(data)
      setLastEvent(`refresh:${new Date().toLocaleTimeString()}`)
    } catch (error) {
      console.error('Failed to refresh:', error)
    }
  }, [])

  // NEW: Fetch metrics history
  const fetchMetricsHistory = useCallback(
    async (filters?: {
      sessionId?: string
      type?: string
      start?: string
      end?: string
    }) => {
      try {
        const params = new URLSearchParams()
        if (filters?.sessionId) params.set('sessionId', filters.sessionId)
        if (filters?.type) params.set('type', filters.type)
        if (filters?.start) params.set('start', filters.start)
        if (filters?.end) params.set('end', filters.end)

        const response = await fetch(
          `${RALPH_SSE_URL}/api/metrics/history?${params}`,
        )
        const data = await response.json()
        setMetricsHistory(data.metrics || [])
        return data
      } catch (error) {
        console.error('Failed to fetch metrics history:', error)
        return null
      }
    },
    [],
  )

  // Fetch checkpoints
  const fetchCheckpoints = useCallback(async (sessionId?: string) => {
    try {
      const params = sessionId ? `?sessionId=${sessionId}` : ''
      const response = await fetch(`${RALPH_SSE_URL}/api/checkpoints${params}`)
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch checkpoints:', error)
      return { checkpoints: [], totalCount: 0 }
    }
  }, [])

  // NEW: Fetch monitor status (context health)
  const fetchMonitorStatus = useCallback(async () => {
    try {
      const response = await fetch(`${RALPH_SSE_URL}/api/monitor/status`)
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch monitor status:', error)
      return { active: false }
    }
  }, [])

  // NEW: Fetch LLM status (provider connection check) - memoized with useCallback
  const fetchLLMStatus = useCallback(async () => {
    // Prevent duplicate concurrent requests
    if (llmStatusFetchInProgressRef.current) {
      return null
    }

    try {
      llmStatusFetchInProgressRef.current = true
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${RALPH_SSE_URL}/api/llm/status`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setLLMStatus(data)
      return data
    } catch {
      // Silent fail - set offline status without console.error spam
      setLLMStatus({
        connected: false,
        provider: 'unknown',
        model: 'unknown',
        apiKeySet: false,
        apiKeyMasked: '(offline)',
        lastChecked: new Date().toISOString(),
      })
      return null
    } finally {
      llmStatusFetchInProgressRef.current = false
    }
  }, [])

  useEffect(() => {
    // IMPORTANT: Only run on client-side after mount
    if (typeof window === 'undefined') return

    connect()

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - connect/disconnect are stable with useCallback

  return {
    status,
    sseConnected,
    lastEvent,
    isLoading,
    refresh,
    // Enhanced features
    metricsHistory,
    llmStatus,
    syncProgress,
    syncErrors,
    fetchMetricsHistory,
    fetchLLMStatus,
    fetchCheckpoints,
    fetchMonitorStatus,
  }
}
