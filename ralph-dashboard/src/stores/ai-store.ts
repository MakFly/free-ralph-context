/**
 * AI Store - Zustand state management for AI suggestions and LLM configuration
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {LlmConfig, LlmProvider, Suggestion} from '@/lib/ai-api';
import aiApi, {
  ApiError
  
  
  
} from '@/lib/ai-api'

// 5-minute cache for suggestions
const SUGGESTION_CACHE_TTL = 5 * 60 * 1000

interface AiState {
  // Suggestions
  suggestions: Array<Suggestion>
  suggestionsLoading: boolean
  suggestionsError: string | null
  lastFetched: number | null
  providerUsed: string | null

  // LLM Configs
  llmConfigs: Array<LlmConfig>
  configsLoading: boolean
  configsError: string | null

  // Config Dialog
  configDialogOpen: boolean

  // Actions - Suggestions
  generateSuggestions: (provider?: LlmProvider) => Promise<void>
  clearSuggestions: () => void

  // Actions - LLM Configs
  fetchLlmConfigs: () => Promise<void>
  saveLlmConfig: (
    provider: LlmProvider,
    apiKey: string,
    isActive?: boolean,
  ) => Promise<void>
  deleteLlmConfig: (provider: LlmProvider) => Promise<void>
  toggleLlmConfig: (provider: LlmProvider) => Promise<void>

  // Actions - Dialog
  openConfigDialog: () => void
  closeConfigDialog: () => void
}

export const useAiStore = create<AiState>()(
  devtools(
    (set, get) => ({
      // Initial state
      suggestions: [],
      suggestionsLoading: false,
      suggestionsError: null,
      lastFetched: null,
      providerUsed: null,

      llmConfigs: [],
      configsLoading: true,
      configsError: null,

      configDialogOpen: false,

      // Generate suggestions
      generateSuggestions: async (provider?: LlmProvider) => {
        const { lastFetched } = get()

        // Check cache
        if (lastFetched && Date.now() - lastFetched < SUGGESTION_CACHE_TTL) {
          return // Use cached suggestions
        }

        set({ suggestionsLoading: true, suggestionsError: null })

        try {
          const response = await aiApi.generateSuggestions(provider)
          set({
            suggestions: response.suggestions,
            providerUsed: response.provider,
            lastFetched: Date.now(),
            suggestionsLoading: false,
          })
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Failed to generate suggestions'
          set({
            suggestionsError: message,
            suggestionsLoading: false,
          })
        }
      },

      // Clear suggestions
      clearSuggestions: () => {
        set({
          suggestions: [],
          lastFetched: null,
          providerUsed: null,
          suggestionsError: null,
        })
      },

      // Fetch LLM configs
      fetchLlmConfigs: async () => {
        set({ configsLoading: true, configsError: null })

        try {
          const configs = await aiApi.getLlmConfigs()
          set({
            llmConfigs: configs,
            configsLoading: false,
          })
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Failed to fetch LLM configs'
          set({
            configsError: message,
            configsLoading: false,
          })
        }
      },

      // Save LLM config
      saveLlmConfig: async (
        provider: LlmProvider,
        apiKey: string,
        isActive = true,
      ) => {
        set({ configsLoading: true, configsError: null })

        try {
          await aiApi.saveLlmConfig(provider, apiKey, isActive)

          // If this provider is being activated, deactivate all others
          if (isActive) {
            const configs = await aiApi.getLlmConfigs()
            const otherProviders = configs
              .filter((c) => c.provider !== provider && c.is_active)
              .map((c) => c.provider)

            // Deactivate other providers in parallel
            await Promise.all(
              otherProviders.map((p) => aiApi.toggleLlmConfig(p))
            )

            // Refresh configs after deactivating others
            const updatedConfigs = await aiApi.getLlmConfigs()
            set({
              llmConfigs: updatedConfigs,
              configsLoading: false,
            })
          } else {
            // Just refresh configs
            const configs = await aiApi.getLlmConfigs()
            set({
              llmConfigs: configs,
              configsLoading: false,
            })
          }
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Failed to save LLM config'
          set({
            configsError: message,
            configsLoading: false,
          })
          throw error
        }
      },

      // Delete LLM config
      deleteLlmConfig: async (provider: LlmProvider) => {
        set({ configsLoading: true, configsError: null })

        try {
          await aiApi.deleteLlmConfig(provider)

          // Refresh configs
          const configs = await aiApi.getLlmConfigs()
          set({
            llmConfigs: configs,
            configsLoading: false,
          })
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Failed to delete LLM config'
          set({
            configsError: message,
            configsLoading: false,
          })
          throw error
        }
      },

      // Toggle LLM config
      toggleLlmConfig: async (provider: LlmProvider) => {
        set({ configsLoading: true, configsError: null })

        try {
          // Get current state to check if we're activating
          const configs = await aiApi.getLlmConfigs()
          const targetConfig = configs.find((c) => c.provider === provider)
          const isActivating = targetConfig ? !targetConfig.is_active : true

          await aiApi.toggleLlmConfig(provider)

          // If we activated this provider, deactivate all others
          if (isActivating) {
            const otherProviders = configs
              .filter((c) => c.provider !== provider && c.is_active)
              .map((c) => c.provider)

            // Deactivate other providers in parallel
            await Promise.all(
              otherProviders.map((p) => aiApi.toggleLlmConfig(p))
            )
          }

          // Refresh configs
          const updatedConfigs = await aiApi.getLlmConfigs()
          set({
            llmConfigs: updatedConfigs,
            configsLoading: false,
          })
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Failed to toggle LLM config'
          set({
            configsError: message,
            configsLoading: false,
          })
          throw error
        }
      },

      // Dialog actions
      openConfigDialog: () => set({ configDialogOpen: true }),
      closeConfigDialog: () => set({ configDialogOpen: false }),
    }),
    { name: 'AiStore' },
  ),
)

// Selectors
export const selectSuggestions = (state: AiState) => state.suggestions
export const selectSuggestionsLoading = (state: AiState) =>
  state.suggestionsLoading
export const selectSuggestionsError = (state: AiState) => state.suggestionsError
export const selectProviderUsed = (state: AiState) => state.providerUsed
export const selectActiveLlmConfigs = (state: AiState) =>
  state.llmConfigs.filter((c) => c.is_active)
