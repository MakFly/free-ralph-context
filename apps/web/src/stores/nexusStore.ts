/**
 * Nexus Store - Connect to Nexus API
 * Sprint 1.4: UI Search Page
 * Sprint 2: Memory System
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { logger } from '@/lib/logger'
import { getSafeStorage } from '@/lib/storage'

// Nexus API types
export interface NexusSearchOptions {
  query: string
  mode?: 'keyword'
  k?: number
  offset?: number
  filters?: {
    pathGlob?: string
    lang?: string
    kind?: string
  }
}

export interface NexusSearchHit {
  path: string
  startLine: number
  endLine: number
  score: number
  lang?: string
  symbol?: string
  kind?: string
  snippet: string
}

export interface NexusSearchResult {
  hits: NexusSearchHit[]
  totalCount: number
  duration: number
}

export interface NexusOpenResult {
  path: string
  startLine: number
  endLine: number
  content: string
  lang?: string
  symbol?: string
  adjacentSymbols: string[]
  totalLines: number
}

export interface NexusStats {
  files: number
  chunks: number
  embeddings?: number
}

// Project types (Sprint 7)
export interface Project {
  id: number
  name: string
  root_path: string
  description?: string
  created_at: string
  updated_at: string
  last_indexed_at?: string
  file_count: number
  chunk_count: number
  memory_count: number
  pattern_count: number
}

export interface ProjectTreeNode {
  name: string
  path: string
  type: 'directory' | 'file'
  children?: ProjectTreeNode[]
  id?: number
  language?: string
  size?: number
  chunk_count?: number
  file_count?: number
}

// Memory types (Sprint 2)
export type MemoryType = 'decision' | 'bugfix' | 'feature' | 'refactor' | 'discovery' | 'change' | 'preference' | 'fact' | 'note'
export type MemoryScope = 'repo' | 'branch' | 'ticket' | 'feature' | 'global'

export interface MemoryCompact {
  id: number
  summary: string
  type: MemoryType
  scope: MemoryScope
  confidence: number
  score?: number
  created_at: number
}

export interface MemoryLink {
  id: number
  observation_id: number
  file_id?: number
  chunk_id?: number
  link_type: 'reference' | 'origin' | 'example'
  path?: string
  start_line?: number
  end_line?: number
  created_at: number
}

export interface MemoryFull {
  id: number
  session_id: string
  project: string
  type: MemoryType
  scope: MemoryScope
  title: string
  subtitle?: string
  summary?: string
  narrative?: string
  facts: string[]
  concepts: string[]
  tags: string[]
  files_read: string[]
  files_modified: string[]
  confidence: number
  prompt_number?: number
  discovery_tokens: number
  created_at: number
  links: MemoryLink[]
}

export interface MemoryRecallOptions {
  q?: string
  type?: MemoryType
  scope?: MemoryScope
  limit?: number
  offset?: number
  // Sprint 6: Budget Mode
  maxTokens?: number
  compact?: boolean
}

export interface MemoryRecallResult {
  memories: MemoryCompact[]
  total: number
  limit: number
  offset: number
}

export interface MemoryCreateInput {
  session_id: string
  project: string
  type: MemoryType
  scope?: MemoryScope
  title: string
  subtitle?: string
  summary?: string
  narrative?: string
  facts?: string[]
  concepts?: string[]
  tags?: string[]
  files_read?: string[]
  files_modified?: string[]
  confidence?: number
  prompt_number?: number
  discovery_tokens?: number
}

export interface MemoryUpdateInput {
  type?: MemoryType
  scope?: MemoryScope
  title?: string
  subtitle?: string
  summary?: string
  narrative?: string
  facts?: string[]
  concepts?: string[]
  tags?: string[]
  confidence?: number
}

export interface MemoryTimelineResult {
  target_id: number
  session_id: string
  before: MemoryCompact[]
  after: MemoryCompact[]
}

// Pattern types (Sprint 3)
export interface PatternConstraints {
  lang?: string
  framework?: string
  version?: string
  pathPattern?: string
}

export interface PatternVariable {
  name: string
  type: 'string' | 'number' | 'boolean'
  transform?: 'pascalCase' | 'camelCase' | 'kebabCase' | 'snakeCase' | 'none'
  default?: string
}

export interface PatternTemplate {
  path: string
  content: string
}

export interface PatternCompact {
  id: number
  intent: string
  title: string
  tags: string[]
  constraints: PatternConstraints
  success_rate: number
  usage_count: number
  score?: number
}

export interface PatternFull extends PatternCompact {
  variables: PatternVariable[]
  templates: PatternTemplate[]
  checklist: string[]
  gotchas: string[]
  sources: { chunkId?: number; fileId?: number }[]
  success_count: number
  fail_count: number
  created_at: number
  updated_at: number
}

export interface CandidateCompact {
  id: number
  kind: 'diff' | 'chunks' | 'folder'
  label?: string
  tags: string[]
  status: 'pending' | 'distilled' | 'archived'
  sources: { chunkId?: number; fileId?: number }[]
  created_at: number
}

// Synthesis types (Sprint 8)
export type SynthesisMode = 'auto' | 'algorithmic' | 'llm'
export type SynthesisProvider = 'anthropic' | 'mistral' | 'openai'

export interface SynthesisStatus {
  mode: SynthesisMode
  provider?: SynthesisProvider
  confidence: number
  model?: string
  configured: boolean
  apiKeyMasked?: string
}

export interface PatternCreateInput {
  intent: string
  title: string
  tags?: string[]
  constraints?: PatternConstraints
  variables?: PatternVariable[]
  templates?: PatternTemplate[]
  checklist?: string[]
  gotchas?: string[]
}

export interface CaptureInput {
  kind: 'diff' | 'chunks' | 'folder'
  sources: { chunkId?: number; fileId?: number }[]
  label?: string
  tags?: string[]
}

export interface DistillInput {
  candidateId: number
  intent: string
  title: string
  constraints?: PatternConstraints
  variablesHint?: PatternVariable[]
}

interface NexusStore {
  // State
  apiBaseUrl: string
  isConnected: boolean
  stats: NexusStats | null
  lastError: string | null
  projects: Project[]
  activeProject: Project | null
  lastConnectionCheck: number | null  // Timestamp of last connection check
  synthesisStatus: SynthesisStatus | null  // Sprint 8: Synthesis configuration status

  // Actions - Core
  setApiBaseUrl: (url: string) => void
  checkConnection: () => Promise<boolean>
  fetchStats: () => Promise<void>
  fetchSynthesisStatus: () => Promise<void>  // Sprint 8: Fetch synthesis configuration
  search: (options: NexusSearchOptions) => Promise<NexusSearchResult>
  open: (path: string, startLine: number, endLine?: number) => Promise<NexusOpenResult | null>
  clearError: () => void

  // Actions - Projects (Sprint 7)
  fetchProjects: () => Promise<void>
  setActiveProject: (project: Project | null) => void
  getProjectTree: (projectId: number) => Promise<ProjectTreeNode>
  createProject: (name: string, rootPath: string, description?: string) => Promise<{ id: number }>
  deleteProject: (id: number) => Promise<void>

  // Actions - Memory (Sprint 2)
  recallMemories: (options?: MemoryRecallOptions) => Promise<MemoryRecallResult>
  batchMemories: (ids: number[]) => Promise<MemoryFull[]>
  getMemory: (id: number) => Promise<MemoryFull | null>
  createMemory: (input: MemoryCreateInput) => Promise<{ id: number }>
  updateMemory: (id: number, input: MemoryUpdateInput) => Promise<void>
  deleteMemory: (id: number) => Promise<void>
  getMemoryTimeline: (id: number, window?: number) => Promise<MemoryTimelineResult>

  // Actions - Patterns (Sprint 3)
  recallPatterns: (q?: string, lang?: string, framework?: string, budgetOpts?: { maxTokens?: number; compact?: boolean }) => Promise<PatternCompact[]>
  getPattern: (id: number) => Promise<PatternFull | null>
  getPatternTemplates: (id: number) => Promise<{ variables: PatternVariable[]; templates: PatternTemplate[]; checklist: string[]; gotchas: string[] }>
  createPattern: (input: PatternCreateInput) => Promise<{ id: number }>
  updatePattern: (id: number, input: Partial<PatternCreateInput>) => Promise<void>
  deletePattern: (id: number) => Promise<void>
  captureCandidate: (input: CaptureInput) => Promise<{ id: number }>
  listCandidates: (status?: string) => Promise<CandidateCompact[]>
  distillCandidate: (input: DistillInput) => Promise<{ id: number }>
  recordFeedback: (patternId: number, outcome: 'success' | 'fail', notes?: string) => Promise<void>
  applyPattern: (patternId: number, variables: Record<string, string>, mode?: 'dry-run' | 'write') => Promise<{
    mode: string
    patternId: number
    patchId?: string
    variables: Record<string, string>
    files: Array<{ path: string; content?: string; action: string }>
    checklist: string[]
    gotchas?: string[]
    preview?: boolean
    applied?: boolean
  }>
}

const DEFAULT_API_URL = 'http://localhost:3001'

export const useNexusStore = create<NexusStore>()(
  persist(
    (set, get) => ({
      // Initial state
      apiBaseUrl: DEFAULT_API_URL,
      isConnected: false,
      stats: null,
      lastError: null,
      projects: [],
      activeProject: null,
      lastConnectionCheck: null,
      synthesisStatus: null,

      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),

      checkConnection: async (forceCheck = false) => {
        try {
          const { lastConnectionCheck, isConnected } = get()
          const CACHE_DURATION = 30 * 1000 // 30 seconds - connection status changes rarely

          // If recently checked and connected, skip the API call (unless forced)
          if (!forceCheck && lastConnectionCheck && (Date.now() - lastConnectionCheck) < CACHE_DURATION) {
            logger.debug('Using cached connection status', { isConnected, age: Date.now() - lastConnectionCheck }, 'API Connection')
            return isConnected
          }

          logger.debug('Checking API connection', { url: get().apiBaseUrl }, 'API Connection')
          const response = await fetch(`${get().apiBaseUrl}/health`)
          const isOk = response.ok
          if (isOk) {
            logger.info('API connection successful', { url: get().apiBaseUrl }, 'API Connection')
          } else {
            logger.warn('API connection failed', { status: response.status }, 'API Connection')
          }
          set({ isConnected: isOk, lastError: isOk ? null : 'API not reachable', lastConnectionCheck: Date.now() })
          return isOk
        } catch (e) {
          logger.error('API connection error', e instanceof Error ? e.message : e, 'API Connection')
          set({ isConnected: false, lastError: e instanceof Error ? e.message : 'Connection failed', lastConnectionCheck: Date.now() })
          return false
        }
      },

      fetchStats: async () => {
        try {
          logger.debug('Fetching stats', { url: `${get().apiBaseUrl}/stats` }, 'API Stats')
          const response = await fetch(`${get().apiBaseUrl}/stats`)
          if (!response.ok) {
            logger.error('Failed to fetch stats', { status: response.status }, 'API Stats')
            throw new Error('Failed to fetch stats')
          }
          const stats = await response.json()
          logger.info('Stats fetched', stats, 'API Stats')
          set({ stats })
        } catch (e) {
          logger.error('Stats fetch error', e instanceof Error ? e.message : e, 'API Stats')
          set({ lastError: e instanceof Error ? e.message : 'Failed to fetch stats' })
          throw e
        }
      },

      fetchSynthesisStatus: async () => {
        try {
          logger.debug('Fetching synthesis status', { url: `${get().apiBaseUrl}/settings/synthesis` }, 'API Synthesis')
          const response = await fetch(`${get().apiBaseUrl}/settings/synthesis`)
          if (!response.ok) {
            logger.error('Failed to fetch synthesis status', { status: response.status }, 'API Synthesis')
            throw new Error('Failed to fetch synthesis status')
          }
          const status = await response.json()
          logger.info('Synthesis status fetched', status, 'API Synthesis')
          set({ synthesisStatus: status })
        } catch (e) {
          logger.error('Synthesis status fetch error', e instanceof Error ? e.message : e, 'API Synthesis')
          set({ lastError: e instanceof Error ? e.message : 'Failed to fetch synthesis status' })
          throw e
        }
      },

      search: async (options) => {
        try {
          const { activeProject } = get()
          logger.debug('Executing search', { query: options.query, mode: options.mode, projectId: activeProject?.id }, 'API Search')
          // API expects 'q' instead of 'query', 'limit' instead of 'k'
          const apiPayload: Record<string, any> = {
            q: options.query,
            limit: options.k || 20,
            offset: options.offset || 0,
          }
          // Add project_id filter if a project is active
          if (activeProject?.id) {
            apiPayload.project_id = activeProject.id
          }
          const response = await fetch(`${get().apiBaseUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload),
          })

          if (!response.ok) {
            logger.error('Search failed', { status: response.status, query: options.query }, 'API Search')
            throw new Error('Search failed')
          }

          const result = await response.json()
          logger.info('Search completed', { hits: result.hits?.length || 0, duration: result.processingTimeMs }, 'API Search')
          // Transform API response to match frontend types
          const transformed: NexusSearchResult = {
            hits: (result.hits || []).map((h: { path: string; startLine: number; endLine: number; content: string; symbol?: string; score: number }) => ({
              path: h.path,
              startLine: h.startLine,
              endLine: h.endLine,
              score: h.score,
              symbol: h.symbol,
              snippet: h.content || '',
            })),
            totalCount: result.totalHits || 0,
            duration: result.processingTimeMs || 0,
          }
          return transformed
        } catch (e) {
          logger.error('Search error', { error: e instanceof Error ? e.message : e, query: options.query }, 'API Search')
          set({ lastError: e instanceof Error ? e.message : 'Search failed' })
          throw e
        }
      },

      open: async (path, startLine, endLine) => {
        try {
          const { activeProject } = get()
          const response = await fetch(`${get().apiBaseUrl}/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path,
              startLine,
              endLine,
              project_id: activeProject?.id
            }),
          })

          if (!response.ok) {
            if (response.status === 404) return null
            throw new Error('Open failed')
          }

          const result = await response.json()
          return result
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Open failed' })
          throw e
        }
      },

      clearError: () => set({ lastError: null }),

      // Project methods (Sprint 7)
      fetchProjects: async () => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/projects`)
          if (!response.ok) throw new Error('Fetch projects failed')
          const result = await response.json()
          set({ projects: result.projects || [] })
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Fetch projects failed' })
          throw e
        }
      },

      setActiveProject: (project) => set({ activeProject: project }),

      getProjectTree: async (projectId) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/projects/${projectId}/files`)
          if (!response.ok) throw new Error('Get project tree failed')
          const result = await response.json()
          return result.tree
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Get project tree failed' })
          throw e
        }
      },

      createProject: async (name, rootPath, description) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, root_path: rootPath, description }),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Create project failed')
          }
          const result = await response.json()
          // Refresh projects list
          await get().fetchProjects()
          return result
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Create project failed' })
          throw e
        }
      },

      deleteProject: async (id) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/projects/${id}`, {
            method: 'DELETE',
          })
          if (!response.ok && response.status !== 404) {
            throw new Error('Delete project failed')
          }
          // Clear active project if it was deleted
          if (get().activeProject?.id === id) {
            set({ activeProject: null })
          }
          // Refresh projects list
          await get().fetchProjects()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Delete project failed' })
          throw e
        }
      },

      // Memory methods (Sprint 2)
      recallMemories: async (options = {}) => {
        try {
          const params = new URLSearchParams()
          if (options.q) params.set('q', options.q)
          if (options.type) params.set('type', options.type)
          if (options.scope) params.set('scope', options.scope)
          if (options.limit) params.set('limit', String(options.limit))
          if (options.offset) params.set('offset', String(options.offset))
          // Sprint 6: Budget Mode
          if (options.maxTokens) params.set('maxTokens', String(options.maxTokens))
          if (options.compact) params.set('compact', 'true')

          const url = `${get().apiBaseUrl}/memory/recall?${params}`
          logger.debug('Recalling memories', { options, url }, 'API Memory')

          const response = await fetch(url)
          if (!response.ok) {
            logger.error('Recall memories failed', { status: response.status, options }, 'API Memory')
            throw new Error('Recall failed')
          }

          const result = await response.json()
          logger.info('Memories recalled', { count: result.memories?.length || 0, total: result.total }, 'API Memory')
          return result
        } catch (e) {
          logger.error('Recall memories error', { error: e instanceof Error ? e.message : e, options }, 'API Memory')
          set({ lastError: e instanceof Error ? e.message : 'Recall failed' })
          throw e
        }
      },

      batchMemories: async (ids) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/memory/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          })
          if (!response.ok) throw new Error('Batch failed')
          const result = await response.json()
          return result.memories
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Batch failed' })
          throw e
        }
      },

      getMemory: async (id) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/memory/${id}`)
          if (!response.ok) {
            if (response.status === 404) return null
            throw new Error('Get memory failed')
          }
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Get memory failed' })
          throw e
        }
      },

      createMemory: async (input) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Create memory failed')
          }
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Create memory failed' })
          throw e
        }
      },

      updateMemory: async (id, input) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/memory/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Update memory failed')
          }
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Update memory failed' })
          throw e
        }
      },

      deleteMemory: async (id) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/memory/${id}`, {
            method: 'DELETE',
          })
          if (!response.ok) {
            if (response.status === 404) return
            throw new Error('Delete memory failed')
          }
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Delete memory failed' })
          throw e
        }
      },

      getMemoryTimeline: async (id, window = 5) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/memory/${id}/timeline?window=${window}`)
          if (!response.ok) throw new Error('Timeline failed')
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Timeline failed' })
          throw e
        }
      },

      // Pattern methods (Sprint 3)
      recallPatterns: async (q, lang, framework, budgetOpts) => {
        try {
          const params = new URLSearchParams()
          if (q) params.set('q', q)
          if (lang) params.set('lang', lang)
          if (framework) params.set('framework', framework)
          // Sprint 6: Budget Mode
          if (budgetOpts?.maxTokens) params.set('maxTokens', String(budgetOpts.maxTokens))
          if (budgetOpts?.compact) params.set('compact', 'true')

          const response = await fetch(`${get().apiBaseUrl}/patterns/recall?${params}`)
          if (!response.ok) throw new Error('Pattern recall failed')
          const result = await response.json()
          return result.patterns
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Pattern recall failed' })
          throw e
        }
      },

      getPattern: async (id) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/${id}`)
          if (!response.ok) {
            if (response.status === 404) return null
            throw new Error('Get pattern failed')
          }
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Get pattern failed' })
          throw e
        }
      },

      getPatternTemplates: async (id) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/${id}/templates`)
          if (!response.ok) throw new Error('Get templates failed')
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Get templates failed' })
          throw e
        }
      },

      createPattern: async (input) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Create pattern failed')
          }
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Create pattern failed' })
          throw e
        }
      },

      updatePattern: async (id, input) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Update pattern failed')
          }
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Update pattern failed' })
          throw e
        }
      },

      deletePattern: async (id) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/${id}`, {
            method: 'DELETE',
          })
          if (!response.ok && response.status !== 404) {
            throw new Error('Delete pattern failed')
          }
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Delete pattern failed' })
          throw e
        }
      },

      captureCandidate: async (input) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/capture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Capture failed')
          }
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Capture failed' })
          throw e
        }
      },

      listCandidates: async (status) => {
        try {
          const params = status ? `?status=${status}` : ''
          const response = await fetch(`${get().apiBaseUrl}/patterns/candidates${params}`)
          if (!response.ok) throw new Error('List candidates failed')
          const result = await response.json()
          return result.candidates
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'List candidates failed' })
          throw e
        }
      },

      distillCandidate: async (input) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/distill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Distill failed')
          }
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Distill failed' })
          throw e
        }
      },

      recordFeedback: async (patternId, outcome, notes) => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/${patternId}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outcome, notes }),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Feedback failed')
          }
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Feedback failed' })
          throw e
        }
      },

      applyPattern: async (patternId, variables, mode = 'dry-run') => {
        try {
          const response = await fetch(`${get().apiBaseUrl}/patterns/${patternId}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variables, mode }),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Apply failed')
          }
          return await response.json()
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : 'Apply failed' })
          throw e
        }
      },
    }),
    {
      name: 'nexus-storage',
      version: 0, // Force cache invalidation - always start fresh
      storage: createJSONStorage(() => getSafeStorage()),
      // Exclude volatile data from persistence - stats should always be fresh
      partialize: (state) => ({
        apiBaseUrl: state.apiBaseUrl,
        activeProject: state.activeProject,
        // Exclude: stats, isConnected, lastError, projects, lastConnectionCheck
      }),
    }
  )
)
