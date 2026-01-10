import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MemoryType =
  | "note"
  | "conversation"
  | "snippet"
  | "reference"
  | "task"
  | "idea";

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  contextId: string;
  tags: Array<string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Context {
  id: string;
  name: string;
  description: string;
  tags: Array<string>;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  memoryCount: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: {
    type?: MemoryType;
    contextId?: string;
    tags?: Array<string>;
    dateFrom?: Date;
    dateTo?: Date;
  };
  createdAt: Date;
}

interface StoreState {
  contexts: Array<Context>;
  memories: Array<Memory>;
  savedSearches: Array<SavedSearch>;
  isSidebarOpen: boolean;

  // Context actions
  addContext: (
    context: Omit<Context, "id" | "createdAt" | "updatedAt" | "memoryCount">,
  ) => void;
  updateContext: (id: string, updates: Partial<Context>) => void;
  deleteContext: (id: string) => void;
  getContextById: (id: string) => Context | undefined;

  // Memory actions
  addMemory: (memory: Omit<Memory, "id" | "createdAt" | "updatedAt">) => void;
  updateMemory: (id: string, updates: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  getMemoriesByContext: (contextId: string) => Array<Memory>;
  searchMemories: (
    query: string,
    filters?: Partial<SavedSearch["filters"]>,
  ) => Array<Memory>;

  // Search actions
  addSavedSearch: (search: Omit<SavedSearch, "id" | "createdAt">) => void;
  deleteSavedSearch: (id: string) => void;

  // UI actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      contexts: [],
      memories: [],
      savedSearches: [],
      isSidebarOpen: true,

      addContext: (contextData) => {
        const newContext: Context = {
          ...contextData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          memoryCount: 0,
        };
        set((state) => ({ contexts: [...state.contexts, newContext] }));
      },

      updateContext: (id, updates) => {
        set((state) => ({
          contexts: state.contexts.map((ctx) =>
            ctx.id === id ? { ...ctx, ...updates, updatedAt: new Date() } : ctx,
          ),
        }));
      },

      deleteContext: (id) => {
        set((state) => ({
          contexts: state.contexts.filter((ctx) => ctx.id !== id),
          memories: state.memories.filter((mem) => mem.contextId !== id),
        }));
      },

      getContextById: (id) => {
        return get().contexts.find((ctx) => ctx.id === id);
      },

      addMemory: (memoryData) => {
        const newMemory: Memory = {
          ...memoryData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => {
          const updatedMemories = [...state.memories, newMemory];
          const updatedContexts = state.contexts.map((ctx) =>
            ctx.id === memoryData.contextId
              ? {
                  ...ctx,
                  memoryCount: ctx.memoryCount + 1,
                  updatedAt: new Date(),
                }
              : ctx,
          );
          return { memories: updatedMemories, contexts: updatedContexts };
        });
      },

      updateMemory: (id, updates) => {
        set((state) => ({
          memories: state.memories.map((mem) =>
            mem.id === id ? { ...mem, ...updates, updatedAt: new Date() } : mem,
          ),
        }));
      },

      deleteMemory: (id) => {
        const memory = get().memories.find((mem) => mem.id === id);
        set((state) => {
          const updatedMemories = state.memories.filter((mem) => mem.id !== id);
          const updatedContexts = memory
            ? state.contexts.map((ctx) =>
                ctx.id === memory.contextId
                  ? {
                      ...ctx,
                      memoryCount: Math.max(0, ctx.memoryCount - 1),
                      updatedAt: new Date(),
                    }
                  : ctx,
              )
            : state.contexts;
          return { memories: updatedMemories, contexts: updatedContexts };
        });
      },

      getMemoriesByContext: (contextId) => {
        return get()
          .memories.filter((mem) => mem.contextId === contextId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },

      searchMemories: (query, filters) => {
        let results = get().memories;

        // Text search
        if (query) {
          const lowerQuery = query.toLowerCase();
          results = results.filter(
            (mem) =>
              mem.content.toLowerCase().includes(lowerQuery) ||
              mem.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
          );
        }

        // Apply filters
        if (filters?.type) {
          results = results.filter((mem) => mem.type === filters.type);
        }
        if (filters?.contextId) {
          results = results.filter(
            (mem) => mem.contextId === filters.contextId,
          );
        }
        if (filters?.tags && filters.tags.length > 0) {
          results = results.filter((mem) =>
            filters.tags!.some((tag) => mem.tags.includes(tag)),
          );
        }
        if (filters?.dateFrom) {
          results = results.filter((mem) => mem.createdAt >= filters.dateFrom!);
        }
        if (filters?.dateTo) {
          results = results.filter((mem) => mem.createdAt <= filters.dateTo!);
        }

        return results.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
      },

      addSavedSearch: (searchData) => {
        const newSearch: SavedSearch = {
          ...searchData,
          id: generateId(),
          createdAt: new Date(),
        };
        set((state) => ({
          savedSearches: [...state.savedSearches, newSearch],
        }));
      },

      deleteSavedSearch: (id) => {
        set((state) => ({
          savedSearches: state.savedSearches.filter(
            (search) => search.id !== id,
          ),
        }));
      },

      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      setSidebarOpen: (open) => {
        set({ isSidebarOpen: open });
      },
    }),
    {
      name: "free-context-storage",
      partialize: (state) => ({
        contexts: state.contexts,
        memories: state.memories,
        savedSearches: state.savedSearches,
        isSidebarOpen: state.isSidebarOpen,
      }),
    },
  ),
);
