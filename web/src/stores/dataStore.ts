import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export interface Context {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface Memory {
  id: string
  contextId?: string
  title: string
  content: string
  type: 'snippet' | 'note' | 'reference'
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface SearchResult {
  contexts: Context[]
  memories: Memory[]
}

interface DataStore {
  // Data
  contexts: Context[]
  memories: Memory[]

  // Context CRUD
  addContext: (context: Omit<Context, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateContext: (id: string, updates: Partial<Context>) => void
  deleteContext: (id: string) => void
  getContext: (id: string) => Context | undefined
  getAllContexts: () => Context[]

  // Memory CRUD
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateMemory: (id: string, updates: Partial<Memory>) => void
  deleteMemory: (id: string) => void
  getMemory: (id: string) => Memory | undefined
  getAllMemories: () => Memory[]
  getMemoriesByContext: (contextId: string) => Memory[]

  // Search
  search: (query: string) => SearchResult

  // Stats
  getStats: () => { totalContexts: number; totalMemories: number }
}

// Helper functions
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

const now = (): number => Date.now()

export const useDataStore = create<DataStore>()(
  persist(
    (set, get) => ({
      // Initial state
      contexts: [],
      memories: [],

      // Context CRUD
      addContext: (context) => {
        const newContext: Context = {
          ...context,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        }
        set((state) => ({ contexts: [...state.contexts, newContext] }))
      },

      updateContext: (id, updates) => {
        set((state) => ({
          contexts: state.contexts.map((ctx) =>
            ctx.id === id ? { ...ctx, ...updates, updatedAt: now() } : ctx
          ),
        }))
      },

      deleteContext: (id) => {
        set((state) => ({
          contexts: state.contexts.filter((ctx) => ctx.id !== id),
          // Also delete associated memories
          memories: state.memories.filter((mem) => mem.contextId !== id),
        }))
      },

      getContext: (id) => {
        return get().contexts.find((ctx) => ctx.id === id)
      },

      getAllContexts: () => {
        return get().contexts
      },

      // Memory CRUD
      addMemory: (memory) => {
        const newMemory: Memory = {
          ...memory,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        }
        set((state) => ({ memories: [...state.memories, newMemory] }))
      },

      updateMemory: (id, updates) => {
        set((state) => ({
          memories: state.memories.map((mem) =>
            mem.id === id ? { ...mem, ...updates, updatedAt: now() } : mem
          ),
        }))
      },

      deleteMemory: (id) => {
        set((state) => ({
          memories: state.memories.filter((mem) => mem.id !== id),
        }))
      },

      getMemory: (id) => {
        return get().memories.find((mem) => mem.id === id)
      },

      getAllMemories: () => {
        return get().memories
      },

      getMemoriesByContext: (contextId) => {
        return get().memories.filter((mem) => mem.contextId === contextId)
      },

      // Search
      search: (query) => {
        const q = query.toLowerCase().trim()
        if (!q) {
          return { contexts: [], memories: [] }
        }

        const contexts = get().contexts.filter(
          (ctx) =>
            ctx.title.toLowerCase().includes(q) ||
            ctx.content.toLowerCase().includes(q)
        )

        const memories = get().memories.filter(
          (mem) =>
            mem.title.toLowerCase().includes(q) ||
            mem.content.toLowerCase().includes(q) ||
            mem.tags.some((tag) => tag.toLowerCase().includes(q))
        )

        return { contexts, memories }
      },

      // Stats
      getStats: () => {
        const state = get()
        return {
          totalContexts: state.contexts.length,
          totalMemories: state.memories.length,
        }
      },
    }),
    {
      name: 'free-context-storage',
      // Version for migrations if needed
      version: 1,
    }
  )
)
