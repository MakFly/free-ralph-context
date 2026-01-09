/**
 * UI Store - Manages UI state and preferences
 * Handles theme, sidebar, view mode, and notifications
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Notification, Theme, ViewMode } from '@/types'

/**
 * UI store state interface
 */
interface UIState {
  // State
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: Theme
  viewMode: ViewMode
  notifications: Array<Notification>
  modalOpen: boolean
  activeModal: string | null

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: Theme) => void
  setViewMode: (viewMode: ViewMode) => void
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp'>,
  ) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  openModal: (modalId: string) => void
  closeModal: () => void

  // Derived getters (computed values)
  hasNotifications: () => boolean
  getNotificationCount: () => number
  getNotificationsByType: (type: Notification['type']) => Array<Notification>
}

/**
 * Generate a unique ID for notifications
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme) {
  // Only apply theme on client side
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.classList.toggle('dark', isDark)
}

/**
 * Create the UI store
 */
export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
      viewMode: 'grid',
      notifications: [],
      modalOpen: false,
      activeModal: null,

      /**
       * Toggle sidebar open/closed
       */
      toggleSidebar: () => {
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'toggleSidebar',
        )
      },

      /**
       * Set sidebar open state
       */
      setSidebarOpen: (open) => {
        set({ sidebarOpen: open }, false, 'setSidebarOpen')
      },

      /**
       * Set sidebar collapsed state
       */
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed')
      },

      /**
       * Set theme and apply to document
       */
      setTheme: (theme) => {
        set({ theme }, false, 'setTheme')
        applyTheme(theme)
      },

      /**
       * Set view mode
       */
      setViewMode: (viewMode) => {
        set({ viewMode }, false, 'setViewMode')
      },

      /**
       * Add a notification
       */
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          timestamp: new Date().toISOString(),
        }

        set(
          (state) => ({
            notifications: [newNotification, ...state.notifications],
          }),
          false,
          'addNotification',
        )

        // Auto-remove notification after duration (if specified)
        const duration = notification.duration ?? 5000
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(newNotification.id)
          }, duration)
        }
      },

      /**
       * Remove a notification by ID
       */
      removeNotification: (id) => {
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          'removeNotification',
        )
      },

      /**
       * Clear all notifications
       */
      clearNotifications: () => {
        set({ notifications: [] }, false, 'clearNotifications')
      },

      /**
       * Open a modal
       */
      openModal: (modalId) => {
        set(
          {
            modalOpen: true,
            activeModal: modalId,
          },
          false,
          'openModal',
        )
      },

      /**
       * Close the active modal
       */
      closeModal: () => {
        set(
          {
            modalOpen: false,
            activeModal: null,
          },
          false,
          'closeModal',
        )
      },

      /**
       * Check if there are any notifications
       */
      hasNotifications: () => {
        return get().notifications.length > 0
      },

      /**
       * Get the total number of notifications
       */
      getNotificationCount: () => {
        return get().notifications.length
      },

      /**
       * Get notifications filtered by type
       */
      getNotificationsByType: (type) => {
        return get().notifications.filter((n) => n.type === type)
      },
    }),
    { name: 'UIStore' }, // Devtools name
  ),
)

/**
 * Initialize theme on app load
 */
export function initializeTheme() {
  // Only initialize on client side
  if (typeof window === 'undefined') return

  const state = useUIStore.getState()
  applyTheme(state.theme)

  // Listen for system theme changes
  if (state.theme === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }
}

/**
 * Selectors for efficient state access
 */
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen
export const selectSidebarCollapsed = (state: UIState) => state.sidebarCollapsed
export const selectTheme = (state: UIState) => state.theme
export const selectViewMode = (state: UIState) => state.viewMode
export const selectNotifications = (state: UIState) => state.notifications
export const selectModalOpen = (state: UIState) => state.modalOpen
export const selectActiveModal = (state: UIState) => state.activeModal
export const selectHasNotifications = (state: UIState) =>
  state.hasNotifications()
export const selectNotificationCount = (state: UIState) =>
  state.getNotificationCount()
export const selectNotificationsByType =
  (type: Notification['type']) => (state: UIState) =>
    state.getNotificationsByType(type)

/**
 * Convenience hooks for common UI patterns
 */
export const useNotification = () => {
  const addNotification = useUIStore((state) => state.addNotification)

  return {
    showSuccess: (title: string, message: string, duration?: number) => {
      addNotification({ type: 'success', title, message, duration })
    },
    showError: (title: string, message: string, duration?: number) => {
      addNotification({ type: 'error', title, message, duration })
    },
    showWarning: (title: string, message: string, duration?: number) => {
      addNotification({ type: 'warning', title, message, duration })
    },
    showInfo: (title: string, message: string, duration?: number) => {
      addNotification({ type: 'info', title, message, duration })
    },
  }
}
