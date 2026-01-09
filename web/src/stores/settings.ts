import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConnectionSettings {
  apiBaseUrl: string
  healthCheckInterval: number
  maxRetryAttempts: number
  retryDelay: number
}

interface DataSettings {
  defaultContextId: string | null
  memoryRetentionDays: number
  autoPurgeEnabled: boolean
}

interface DisplaySettings {
  searchResultsPerPage: number
  defaultSearchMode: 'smart' | 'fts' | 'semantic'
  theme: 'light' | 'dark' | 'system'
  compactView: boolean
}

interface AdvancedSettings {
  debugMode: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  performanceMonitoring: boolean
}

interface SettingsState {
  connection: ConnectionSettings
  data: DataSettings
  display: DisplaySettings
  advanced: AdvancedSettings
  isLoading: boolean
  error: string | null

  // Actions
  updateConnection: (settings: Partial<ConnectionSettings>) => void
  updateData: (settings: Partial<DataSettings>) => void
  updateDisplay: (settings: Partial<DisplaySettings>) => void
  updateAdvanced: (settings: Partial<AdvancedSettings>) => void
  resetSettings: () => void
}

const defaultConnection: ConnectionSettings = {
  apiBaseUrl: '/api',
  healthCheckInterval: 15000,
  maxRetryAttempts: 3,
  retryDelay: 2000,
}

const defaultData: DataSettings = {
  defaultContextId: null,
  memoryRetentionDays: 365,
  autoPurgeEnabled: false,
}

const defaultDisplay: DisplaySettings = {
  searchResultsPerPage: 20,
  defaultSearchMode: 'smart',
  theme: 'system',
  compactView: false,
}

const defaultAdvanced: AdvancedSettings = {
  debugMode: false,
  logLevel: 'info',
  performanceMonitoring: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      connection: defaultConnection,
      data: defaultData,
      display: defaultDisplay,
      advanced: defaultAdvanced,
      isLoading: false,
      error: null,

      updateConnection: (settings) =>
        set((state) => ({
          connection: { ...state.connection, ...settings },
        })),

      updateData: (settings) =>
        set((state) => ({
          data: { ...state.data, ...settings },
        })),

      updateDisplay: (settings) =>
        set((state) => ({
          display: { ...state.display, ...settings },
        })),

      updateAdvanced: (settings) =>
        set((state) => ({
          advanced: { ...state.advanced, ...settings },
        })),

      resetSettings: () =>
        set({
          connection: defaultConnection,
          data: defaultData,
          display: defaultDisplay,
          advanced: defaultAdvanced,
        }),
    }),
    {
      name: 'free-context-settings',
    },
  ),
)
