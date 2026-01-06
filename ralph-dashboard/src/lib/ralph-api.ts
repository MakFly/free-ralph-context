/**
 * Ralph API Client - Centralized, type-safe API interface
 *
 * All API calls to ralph-api backend should go through this client.
 * This ensures consistent error handling, typing, and URL management.
 */

const API_BASE = import.meta.env.VITE_RALPH_API_URL || 'http://localhost:8000'

// === Type Definitions ===

export interface Pattern {
  type: 'literal' | 'regex' | 'glob' | 'semantic'
  value: string
}

export interface WarpGrepResult {
  matches: Array<{
    file: string
    line: number
    content: string
    pattern: string
  }>
  filesScanned: number
  timeMs: number
  patternsMatched: number
}

export interface FastApplyResult {
  success: boolean
  diff: string
  backupPath?: string
  linesChanged: number
  error?: string
}

export interface OrchestrateResult {
  taskType: string
  recommendedAgent: string
  suggestedTools: Array<string>
  contextEstimate: number
  complexity: 'low' | 'medium' | 'high'
}

export interface CrossSearchResult {
  memories: Array<{
    id: string
    sessionId: string
    content: string
    category: string
    score: number
    createdAt: string
  }>
  sessionsSearched: number
}

export interface TokenSavings {
  totalSaved: number
  compressionRatio: number
  sessionsOptimized: number
  totalSessions: number
  avgSavingsPerSession: number
  topSessions: Array<{
    id: string
    name: string
    saved: number
    usagePercent: number
  }>
  timestamp: string
}

export interface Session {
  id: string
  taskDescription: string
  maxTokens: number
  currentTokens: number
  contextUsage: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface Memory {
  id: string
  sessionId: string
  content: string
  category: string
  priority: string
  accessCount: number
  createdAt: string
}

export interface HealthStatus {
  active: boolean
  activeSessions: number
  avgContextUsage: number
  health: 'healthy' | 'warning' | 'critical'
  lastChecked: string
}

// === HTTP Helpers ===

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function get<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`)
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `GET ${endpoint} failed: ${response.statusText}`,
    )
  }
  return response.json()
}

async function post<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `POST ${endpoint} failed: ${response.statusText}`,
    )
  }
  return response.json()
}

async function del<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `DELETE ${endpoint} failed: ${response.statusText}`,
    )
  }
  return response.json()
}

// === Ralph API Client ===

export const ralphApi = {
  // === Sessions ===
  malloc: (taskDescription: string, maxTokens = 200000) =>
    post<Session>('/api/sessions/malloc', {
      task_description: taskDescription,
      max_tokens: maxTokens,
    }),

  free: (sessionId: string) =>
    post<{ success: boolean; learningsExtracted: number }>(
      '/api/sessions/free',
      { session_id: sessionId },
    ),

  getSessionStatus: (sessionId: string) =>
    get<Session>(`/api/sessions/${sessionId}/status`),

  // === Memories ===
  addMemory: (
    sessionId: string,
    content: string,
    category = 'other',
    priority = 'normal',
  ) =>
    post<Memory>('/api/memories', {
      session_id: sessionId,
      content,
      category,
      priority,
    }),

  getMemories: (sessionId: string, category?: string) =>
    get<Array<Memory>>(
      `/api/memories/${sessionId}${category ? `?category=${category}` : ''}`,
    ),

  searchMemories: (sessionId: string, query: string, topK = 5) =>
    post<{ query: string; results: Array<Memory>; count: number }>(
      '/api/search',
      {
        session_id: sessionId,
        query,
        top_k: topK,
      },
    ),

  crossSearch: (query: string, topK = 10) =>
    post<CrossSearchResult>('/api/cross-search', { query, top_k: topK }),

  inheritMemories: (sessionId: string, sourceQuery: string) =>
    post<{ importedCount: number }>('/api/inherit-memories', {
      session_id: sessionId,
      source_query: sourceQuery,
    }),

  curateMemories: (
    sessionId: string,
    keepTop = 50,
    preserveCategories?: Array<string>,
  ) =>
    post<{ removed: number; kept: number }>('/api/memories/curate', {
      session_id: sessionId,
      keep_top: keepTop,
      preserve_categories: preserveCategories,
    }),

  // === Context Management ===
  compress: (trajectory: string, ratio = 0.25) =>
    post<{
      compressed: string
      originalLength: number
      compressedLength: number
    }>('/api/compress', {
      trajectory,
      ratio,
    }),

  shouldFold: (contextUsage: number, memoryCount = 0) =>
    post<{ shouldFold: boolean; reason: string; urgency: string }>(
      '/api/should-fold',
      {
        context_usage: contextUsage,
        memory_count: memoryCount,
      },
    ),

  fold: (sessionId: string, trajectory: string, label = 'auto-fold') =>
    post<{ checkpointId: string; compressionRatio: number }>('/api/fold', {
      session_id: sessionId,
      trajectory,
      label,
    }),

  // === Checkpoints ===
  createCheckpoint: (
    sessionId: string,
    label: string,
    metadata?: Record<string, unknown>,
  ) =>
    post<{ checkpointId: string; label: string; createdAt: string }>(
      '/api/checkpoints',
      {
        session_id: sessionId,
        label,
        metadata,
      },
    ),

  listCheckpoints: (sessionId: string) =>
    get<
      Array<{
        id: string
        label: string
        contextUsage: number
        createdAt: string
      }>
    >(`/api/checkpoints/${sessionId}`),

  restoreCheckpoint: (checkpointId: string) =>
    post<{ restored: boolean; sessionId: string }>(
      `/api/checkpoints/${checkpointId}/restore`,
      {},
    ),

  // === Tools (New Killer Features) ===
  warpgrep: (
    patterns: Array<Pattern>,
    paths: Array<string> = ['.'],
    maxResults = 100,
  ) =>
    post<WarpGrepResult>('/api/tools/warpgrep', {
      patterns,
      paths,
      max_results: maxResults,
    }),

  fastApply: (filePath: string, intent: string, context = '') =>
    post<FastApplyResult>('/api/tools/fast-apply', {
      file_path: filePath,
      intent,
      context,
    }),

  orchestrate: (taskDescription: string) =>
    post<OrchestrateResult>('/api/tools/orchestrate', {
      task_description: taskDescription,
    }),

  // === Spawn ===
  shouldSpawn: (contextUsage: number, taskProgress = 50, errorCount = 0) =>
    post<{ shouldSpawn: boolean; reason: string }>('/api/should-spawn', {
      context_usage: contextUsage,
      task_progress: taskProgress,
      error_count: errorCount,
    }),

  spawn: (sessionId: string, handoffReason: string, taskDescription?: string) =>
    post<{ childSessionId: string; handoffContext: string }>('/api/spawn', {
      session_id: sessionId,
      handoff_reason: handoffReason,
      task_description: taskDescription,
    }),

  // === Dashboard / Metrics ===
  getStatus: () =>
    get<{
      connected: boolean
      projectCount: number
      projects: Array<{
        id: string
        name: string
        currentTokens: number
        maxTokens: number
        contextUsage: number
        pct: number
        lastUpdated: string
        status: string
      }>
      totalTokens: number
      timestamp: string
    }>('/api/status'),

  getTokenSavings: () => get<TokenSavings>('/api/token-savings'),

  getMetricsHistory: (filters?: {
    sessionId?: string
    type?: string
    limit?: number
  }) => {
    const params = new URLSearchParams()
    if (filters?.sessionId) params.set('session_id', filters.sessionId)
    if (filters?.type) params.set('metric_type', filters.type)
    if (filters?.limit) params.set('limit', String(filters.limit))
    return get<{
      count: number
      metrics: Array<{
        id: string
        sessionId: string
        metricType: string
        value: number
        timestamp: string
      }>
    }>(`/api/metrics/history?${params}`)
  },

  getMonitorStatus: () => get<HealthStatus>('/api/monitor/status'),

  getLLMStatus: () =>
    get<{
      connected: boolean
      provider: string
      model: string
      apiKeySet: boolean
      apiKeyMasked: string
      lastChecked: string
      latencyMs?: number
    }>('/api/llm/status'),

  getCheckpoints: (sessionId?: string) =>
    get<{
      checkpoints: Array<{ id: string; label: string; timestamp: string }>
      totalCount: number
    }>(`/api/checkpoints${sessionId ? `?session_id=${sessionId}` : ''}`),

  // === Analysis ===
  analyzeAndRecommend: (sessionId: string) =>
    post<{
      contextHealth: 'healthy' | 'warning' | 'critical'
      recommendations: Array<string>
      suggestedActions: Array<{ action: string; priority: string }>
    }>('/api/analyze-and-recommend', { session_id: sessionId }),
}

// Export types for consumers
export type { ApiError }
export default ralphApi
