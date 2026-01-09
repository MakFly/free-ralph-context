/**
 * Central export point for all Zustand stores
 * Provides convenient imports for store hooks and selectors
 */

// Data store (unified local store with localStorage)
export { useDataStore } from './dataStore'
export type { Context, Memory, SearchResult } from './dataStore'

// UI store (local UI state)
export {
  useUIStore,
  initializeTheme,
  selectSidebarOpen,
  selectSidebarCollapsed,
  selectTheme,
  selectViewMode,
  selectNotifications,
  selectModalOpen,
  selectActiveModal,
  selectHasNotifications,
  selectNotificationCount,
  selectNotificationsByType,
  useNotification,
} from './uiStore'

// Settings store (local preferences)
export { useSettingsStore } from './settings'
