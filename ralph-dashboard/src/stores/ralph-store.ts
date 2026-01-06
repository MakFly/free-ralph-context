import { create } from 'zustand'
import { useEffect } from 'react'
import type {
  LLMStatus,
  LLMUsageSummary,
  MetricsHistoryPoint,
  RalphStatus,
  SyncErrorEvent,
  SyncProgressEvent,
} from '@/hooks/use-ralph-sse'

export interface MCPStatus {
  status: string // "healthy", "unhealthy", "error", "timeout"
  connected: boolean
  tools_count: number | null
  error: string | null
  timestamp: string
}

export interface Notification {
  id: string
  type: 'error' | 'warning' | 'success' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

// Connect to ralph-api Python FastAPI server (Docker: port 8000)
const RALPH_SSE_URL =
  import.meta.env.VITE_RALPH_API_URL || 'http://localhost:8000'

interface RalphStore {
  // State
  status: RalphStatus
  sseConnected: boolean
  lastEvent: string | null
  isLoading: boolean
  metricsHistory: Array<MetricsHistoryPoint>
  llmUsage: LLMUsageSummary | null
  syncProgress: SyncProgressEvent | null
  syncErrors: Array<SyncErrorEvent>
  llmStatus: LLMStatus | null
  mcpStatus: MCPStatus | null
  notifications: Array<Notification>

  // Actions
  setStatus: (status: RalphStatus) => void
  setSSEConnected: (connected: boolean) => void
  setLastEvent: (event: string | null) => void
  setIsLoading: (loading: boolean) => void
  setMetricsHistory: (history: Array<MetricsHistoryPoint>) => void
  setLLMUsage: (usage: LLMUsageSummary | null) => void
  setSyncProgress: (progress: SyncProgressEvent | null) => void
  setSyncErrors: (errors: Array<SyncErrorEvent>) => void
  setLLMStatus: (status: LLMStatus | null) => void
  setMCPStatus: (status: MCPStatus | null) => void
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
  ) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
}

export const useRalphStore = create<RalphStore>((set) => ({
  // Initial state
  status: {
    connected: false,
    projectCount: 0,
    projects: [],
    sources: [],
    totalTokens: 0,
    timestamp: new Date().toISOString(),
  },
  sseConnected: false,
  lastEvent: null,
  isLoading: true,
  metricsHistory: [],
  llmUsage: null,
  syncProgress: null,
  syncErrors: [],
  llmStatus: null,
  mcpStatus: null,
  notifications: [],

  // Actions
  setStatus: (status) => set({ status }),
  setSSEConnected: (connected) => set({ sseConnected: connected }),
  setLastEvent: (event) => set({ lastEvent: event }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setMetricsHistory: (history) => set({ metricsHistory: history }),
  setLLMUsage: (usage) => set({ llmUsage: usage }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  setSyncErrors: (errors) => set({ syncErrors: errors }),
  setLLMStatus: (status) => set({ llmStatus: status }),
  setMCPStatus: (status) => set({ mcpStatus: status }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ].slice(0, 50), // Keep only last 50 notifications
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),
  clearNotifications: () => set({ notifications: [] }),
}))

// Global SSE connection singleton
let eventSource: EventSource | null = null
let isConnecting = false
let mountCount = 0
let llmStatusInterval: NodeJS.Timeout | null = null

// ============================================================
// Fetch functions (defined before useRalphSSEInit to avoid hoisting issues)
// ============================================================

// Refresh function
export async function refreshRalphStatus() {
  try {
    const response = await fetch(`${RALPH_SSE_URL}/status`)
    const data = await response.json()
    useRalphStore.getState().setStatus(data)
    useRalphStore
      .getState()
      .setLastEvent(`refresh:${new Date().toLocaleTimeString()}`)
  } catch (error) {
    console.error('Failed to refresh:', error)
  }
}

// Fetch MCP status
export async function fetchMCPStatus() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${RALPH_SSE_URL}/health/mcp`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    const mcpStatus: MCPStatus = {
      status: data.status,
      connected: data.connected,
      tools_count: data.tools_count,
      error: data.error,
      timestamp: new Date().toISOString(),
    }

    useRalphStore.getState().setMCPStatus(mcpStatus)
    return mcpStatus
  } catch {
    const errorStatus: MCPStatus = {
      status: 'error',
      connected: false,
      tools_count: null,
      error: 'Failed to check MCP status',
      timestamp: new Date().toISOString(),
    }
    useRalphStore.getState().setMCPStatus(errorStatus)
    return errorStatus
  }
}

// Fetch LLM status
export async function fetchLLMStatus() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${RALPH_SSE_URL}/api/llm/status`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // 404 = No LLM configured (valid state, display "0 LLM configuré")
      if (response.status === 404) {
        const noLlmStatus = {
          connected: false,
          count: 0,
          providers: [],
          lastChecked: new Date().toISOString(),
          latencyMs: null,
        }
        useRalphStore.getState().setLLMStatus(noLlmStatus)
        return noLlmStatus
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    useRalphStore.getState().setLLMStatus(data)
    return data
  } catch {
    useRalphStore.getState().setLLMStatus({
      connected: false,
      count: 0,
      providers: [],
      lastChecked: new Date().toISOString(),
      latencyMs: null,
    })
    return null
  }
}

// ============================================================
// Hooks
// ============================================================

// Hook to initialize SSE connection (call once in root)
export function useRalphSSEInit() {
  const store = useRalphStore()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Prevent duplicate connections (especially from React Strict Mode double-mount)
    if (mountCount > 0 || eventSource) {
      console.log('[SSE] Already initialized, skipping')
      return
    }

    mountCount++
    console.log('[SSE] Initializing connection', `(attempt #${mountCount})`)

    isConnecting = true
    eventSource = new EventSource(`${RALPH_SSE_URL}/events`)

    // Safety timeout: if no init event after 5s, force loading to false
    const initTimeout = setTimeout(() => {
      console.warn(
        '[SSE] No init event received after 5s, forcing loading=false',
      )
      store.setIsLoading(false)
      isConnecting = false
    }, 5000)

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened')
      store.setSSEConnected(true)
      store.setLastEvent('connected')
    }

    eventSource.onerror = () => {
      console.error('[SSE] Connection error')
      store.setSSEConnected(false)
      store.setLastEvent('error')
      store.setIsLoading(false)
      isConnecting = false
    }

    eventSource.addEventListener('init', (event) => {
      clearTimeout(initTimeout)
      isConnecting = false
      const data = JSON.parse(event.data)
      console.log('[SSE] Init event received:', data)
      store.setStatus(data)
      store.setLastEvent('init')
      store.setIsLoading(false)
    })

    eventSource.addEventListener('update', (event) => {
      const data = JSON.parse(event.data)
      store.setStatus(data)
      store.setLastEvent(`update:${new Date().toLocaleTimeString()}`)
    })

    eventSource.addEventListener('metrics:update', (event) => {
      const data = JSON.parse(event.data)
      store.setMetricsHistory((prev) => [...prev, data].slice(-100))
      store.setLastEvent(`metrics:update:${new Date().toLocaleTimeString()}`)
    })

    eventSource.addEventListener('sync:progress', (event) => {
      const data = JSON.parse(event.data)
      store.setSyncProgress(data)
      store.setLastEvent(`sync:progress:${new Date().toLocaleTimeString()}`)
    })

    eventSource.addEventListener('sync:error', (event) => {
      const data = JSON.parse(event.data)
      store.setSyncErrors((prev) => [...prev, data].slice(-20))
      console.error('Sync error:', data)
    })

    eventSource.addEventListener('llm:status', (event) => {
      const data = JSON.parse(event.data)
      store.setLLMStatus(data)
      store.setLastEvent(`llm:status:${new Date().toLocaleTimeString()}`)
    })

    eventSource.addEventListener('mcp:status', (event) => {
      const data = JSON.parse(event.data) as MCPStatus
      const prevStatus = useRalphStore.getState().mcpStatus

      useRalphStore.getState().setMCPStatus(data)
      useRalphStore
        .getState()
        .setLastEvent(`mcp:status:${new Date().toLocaleTimeString()}`)

      // Add notification if MCP goes down (was healthy, now not)
      if (prevStatus?.connected && !data.connected) {
        useRalphStore.getState().addNotification({
          type: 'error',
          title: 'MCP Server Down',
          message: data.error || 'MCP server is not responding',
        })
      }
      // Add notification if MCP comes back up
      else if (prevStatus && !prevStatus.connected && data.connected) {
        useRalphStore.getState().addNotification({
          type: 'success',
          title: 'MCP Server Online',
          message: `${data.tools_count} tools available`,
        })
      }
    })

    // Start LLM status polling (globally, only once)
    if (!llmStatusInterval) {
      console.log('[LLM] Starting status polling (every 10s)')
      fetchLLMStatus() // Initial fetch
      llmStatusInterval = setInterval(() => {
        fetchLLMStatus()
      }, 10000) // Poll every 10 seconds
    }

    // Initial MCP status fetch (SSE will handle updates after)
    console.log('[MCP] Fetching initial status')
    fetchMCPStatus()

    return () => {
      console.log('[SSE] Cleanup (should not happen in normal flow)')
    }
  }, []) // Empty deps - only run once

  return store
}

// Helper hook for components that need specific data
export function useRalphData() {
  return useRalphStore()
}
