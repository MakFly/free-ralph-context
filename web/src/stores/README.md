# Zustand State Management Stores

This directory contains all Zustand stores for the Free Context dashboard application.

## Store Overview

### 1. Context Store (`contextStore.ts`)

Manages **contexts** - containers for organizing related memories.

**State:**

- `contexts: Context[]` - Array of all contexts
- `loading: boolean` - Loading state for operations
- `error: string | null` - Error messages
- `selectedContextId: string | null` - Currently selected context

**Actions:**

- `fetchContexts()` - Fetch all contexts from API
- `createContext(data)` - Create a new context
- `updateContext(id, data)` - Update an existing context
- `deleteContext(id)` - Delete a context
- `selectContext(id)` - Select a context by ID
- `clearError()` - Clear error state

**Derived Getters:**

- `getContextById(id)` - Get context by ID
- `getContextsByTag(tag)` - Get contexts filtered by tag
- `getContextTree()` - Get hierarchical tree structure

**Usage:**

```typescript
const { contexts, loading, fetchContexts, createContext } = useContextStore()
```

---

### 2. Memory Store (`memoryStore.ts`)

Manages **memories** - individual pieces of information stored in contexts.

**State:**

- `memories: Memory[]` - Array of all memories
- `loading: boolean` - Loading state for operations
- `error: string | null` - Error messages
- `selectedMemoryId: string | null` - Currently selected memory
- `filters: MemoryFilters` - Active filters
- `totalCount: number` - Total memory count (for pagination)
- `currentPage: number` - Current page number
- `pageSize: number` - Items per page

**Actions:**

- `fetchMemories(contextId?)` - Fetch all memories
- `fetchPaginatedMemories(page, pageSize, filters?)` - Fetch paginated memories
- `addMemory(data)` - Add a new memory
- `updateMemory(id, data)` - Update an existing memory
- `deleteMemory(id)` - Delete a memory
- `bulkDeleteMemories(ids)` - Delete multiple memories
- `selectMemory(id)` - Select a memory by ID
- `setFilter(filters)` - Set memory filters
- `clearFilters()` - Clear all filters
- `clearError()` - Clear error state

**Derived Getters:**

- `getMemoriesByContext(contextId)` - Get memories by context
- `getMemoriesByType(type)` - Get memories by type
- `getFilteredMemories()` - Get memories matching current filters
- `getMemoryById(id)` - Get memory by ID

**Usage:**

```typescript
const { memories, loading, fetchMemories, addMemory } = useMemoryStore()
```

---

### 3. Search Store (`searchStore.ts`)

Manages **search** functionality with debouncing and filters.

**State:**

- `query: string` - Current search query
- `results: SearchResult[]` - Search results
- `loading: boolean` - Loading state
- `error: string | null` - Error messages
- `filters: SearchFilters` - Active search filters
- `hasSearched: boolean` - Whether search has been executed
- `recentSearches: Array<{query, timestamp}>` - Recent searches
- `searchHistory: string[]` - Search history

**Actions:**

- `setSearchQuery(query)` - Set query (triggers debounced search)
- `executeSearch(query?, filters?)` - Execute immediate search
- `clearSearch()` - Clear search state
- `setFilters(filters)` - Set search filters
- `clearFilters()` - Clear all filters
- `fetchRecentSearches()` - Fetch recent searches from API
- `addToHistory(query)` - Add query to history
- `clearError()` - Clear error state

**Derived Getters:**

- `hasResults()` - Check if there are results
- `getResultCount()` - Get total result count
- `getResultsByType(type)` - Get results by type
- `getResultsByContext(contextId)` - Get results by context

**Usage:**

```typescript
const { query, results, loading, setSearchQuery, executeSearch } =
  useSearchStore()
```

---

### 4. UI Store (`uiStore.ts`)

Manages **UI state** including theme, sidebar, view mode, and notifications.

**State:**

- `sidebarOpen: boolean` - Sidebar open state
- `sidebarCollapsed: boolean` - Sidebar collapsed state
- `theme: Theme` - Current theme ('light' | 'dark' | 'system')
- `viewMode: ViewMode` - Current view mode ('grid' | 'list' | 'tree')
- `notifications: Notification[]` - Active notifications
- `modalOpen: boolean` - Modal open state
- `activeModal: string | null` - Active modal ID

**Actions:**

- `toggleSidebar()` - Toggle sidebar open/closed
- `setSidebarOpen(open)` - Set sidebar open state
- `setSidebarCollapsed(collapsed)` - Set sidebar collapsed state
- `setTheme(theme)` - Set theme
- `setViewMode(viewMode)` - Set view mode
- `addNotification(notification)` - Add a notification
- `removeNotification(id)` - Remove a notification
- `clearNotifications()` - Clear all notifications
- `openModal(modalId)` - Open a modal
- `closeModal()` - Close the active modal

**Derived Getters:**

- `hasNotifications()` - Check if there are notifications
- `getNotificationCount()` - Get notification count
- `getNotificationsByType(type)` - Get notifications by type

**Usage:**

```typescript
const { theme, sidebarOpen, setTheme, toggleSidebar } = useUIStore()

// Use convenience hook for notifications
const { showSuccess, showError } = useNotification()
showSuccess('Success', 'Operation completed!')
```

---

## Middleware

All stores use **Zustand middleware**:

1. **Devtools** - Enables Redux DevTools integration
   - Action names are provided for better debugging
   - State changes are traceable in DevTools

2. **Persist** - Persists state to localStorage
   - Context store: Persists `selectedContextId`
   - Memory store: No persistence (data from API)
   - Search store: No persistence (search is transient)
   - UI store: Persists all preferences except notifications

## Selectors

Each store exports **selectors** for efficient state access and to prevent unnecessary re-renders:

```typescript
// Import from stores/index.ts for convenience
import { selectContexts, selectLoading } from '@/stores'

// Use in components with React hooks
const contexts = useUIStore(selectContexts)
const loading = useUIStore(selectLoading)
```

## TypeScript Types

All stores are fully typed with TypeScript. Types are defined in `/src/types/index.ts`:

- `Context` - Context data structure
- `Memory` - Memory data structure
- `SearchResult` - Search result structure
- `SearchFilters` - Search filter options
- `MemoryFilters` - Memory filter options
- `Notification` - Notification structure
- `ViewMode` - View mode options
- `Theme` - Theme options

## API Client

The API client (`/src/lib/api.ts`) provides typed methods for backend communication:

- `contextsApi` - Context CRUD operations
- `memoriesApi` - Memory CRUD operations
- `searchApi` - Search operations
- `systemApi` - System health and stats

## Best Practices

1. **Use selectors for component subscriptions**

   ```typescript
   // Good - Only re-renders when contexts change
   const contexts = useContextStore(selectContexts)

   // Avoid - Re-renders on any state change
   const { contexts } = useContextStore()
   ```

2. **Persist important state**
   - User preferences (theme, view mode, sidebar state)
   - Selections (selected context/memory)
   - Don't persist: Loading states, errors, notifications

3. **Handle errors gracefully**

   ```typescript
   try {
     await createContext(data)
   } catch (error) {
     // Error is already set in store state
   }
   ```

4. **Clear loading states**
   - All async actions set `loading: true` at start
   - Loading is cleared on success or error

5. **Use derived getters for computed values**
   - Avoid computing values in components
   - Store provides getters for common computations

## Testing

Stores can be tested easily:

```typescript
import { useContextStore } from '@/stores'

describe('ContextStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useContextStore.getState().fetchContexts()
  })

  it('should create context', async () => {
    const { createContext } = useContextStore.getState()
    const context = await createContext({
      name: 'Test',
      tags: [],
    })

    expect(context).toBeDefined()
    expect(context.name).toBe('Test')
  })
})
```
