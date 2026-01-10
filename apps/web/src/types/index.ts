/**
 * Core types for the Free Context application
 * These represent the domain models used throughout the app
 */

/**
 * Represents a context - a container for related memories
 */
export interface Context {
  id: string
  name: string
  description?: string
  tags: Array<string>
  color?: string
  icon?: string
  createdAt: string
  updatedAt: string
  memoryCount?: number
}

/**
 * Represents a memory - a piece of information stored in a context
 */
export interface Memory {
  id: string
  contextId: string
  title: string
  content: string
  type: MemoryType
  tags: Array<string>
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  expiresAt?: string
  priority?: MemoryPriority
}

/**
 * Memory type classification (matches MCP server types)
 */
export type MemoryType =
  | 'note'
  | 'conversation'
  | 'snippet'
  | 'reference'
  | 'task'
  | 'idea'

/**
 * Memory priority levels
 */
export type MemoryPriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * Search-First result with compact excerpt
 * Lightweight response to minimize token usage
 */
export interface SearchFirstResult {
  memory: {
    id: string
    title: string
    type: MemoryType
    contextId: string
    stack?: string | null
    createdAt: string
    excerpt: string // Compact excerpt instead of full content
  }
  context?: {
    id: string
    name: string
  } | null
  score: number
  tokens: number
}

/**
 * Search-First response with token stats
 */
export interface SearchFirstResponse {
  results: Array<SearchFirstResult>
  total: number
  query: string
  mode: SearchMode
  totalTokens: number
  avgTokensPerResult: number
}

/**
 * Search mode for excerpt length
 */
export type SearchMode = 'compact' | 'standard' | 'detailed'

/**
 * Legacy search result with relevance score (kept for backward compatibility)
 */
export interface SearchResult {
  id: string
  type: 'context' | 'memory'
  title: string
  content: string
  contextId?: string
  contextName?: string
  score: number
  highlights: Array<string>
  memory?: Memory
  context?: Context
}

/**
 * Search filters (updated for Search-First)
 */
export interface SearchFilters {
  type?: MemoryType | 'all'
  contextId?: string
  dateFrom?: string
  dateTo?: string
  tags?: Array<string>
  priority?: MemoryPriority
  mode?: SearchMode // NEW: Search-First mode
  limit?: number // NEW: Result limit
}

/**
 * Memory filter options
 */
export interface MemoryFilters {
  contextId?: string
  type?: MemoryType
  tags?: Array<string>
  searchQuery?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: Array<T>
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Notification message
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  timestamp: string
}

/**
 * View modes for the dashboard
 */
export type ViewMode = 'grid' | 'list' | 'tree'

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system'

/**
 * Statistics for a context
 */
export interface ContextStats {
  memoryCount: number
  lastUpdated: string
  tags: Array<string>
  typeDistribution: Record<MemoryType, number>
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

/**
 * Connection status for offline detection
 */
export type ConnectionStatus = 'online' | 'offline' | 'checking'

/**
 * Connection error types
 */
export type ConnectionErrorType = 'network' | 'cors' | 'timeout' | 'unknown'

/**
 * Connection state for tracking server availability
 */
export interface ConnectionState {
  status: ConnectionStatus
  lastOnlineTime: string | null
  lastCheckTime: string | null
  errorCount: number
  consecutiveFailures: number
  errorType: ConnectionErrorType | null
}
