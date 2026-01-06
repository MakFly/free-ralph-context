/**
 * AI Suggestions API Client
 *
 * Handles API calls for AI-powered suggestions and LLM configuration.
 */

const API_BASE = import.meta.env.VITE_RALPH_API_URL || 'http://localhost:8000'

// === Type Definitions ===

export type SuggestionCategory =
  | 'feature'
  | 'optimization'
  | 'bug-fix'
  | 'refactor'
  | 'architecture'
export type SuggestionPriority = 'high' | 'medium' | 'low'
export type LlmProvider = 'anthropic' | 'openai' | 'mistral' | 'google'

export interface Suggestion {
  id: string
  title: string
  description: string
  category: SuggestionCategory
  priority: SuggestionPriority
}

export interface LlmConfig {
  id: string
  provider: LlmProvider
  is_active: boolean
  has_key: boolean
  key_masked: string
  created_at: string
  updated_at: string
}

export interface SuggestionsResponse {
  suggestions: Array<Suggestion>
  provider: LlmProvider
  timestamp: string
}

// === HTTP Helpers ===

export class ApiError extends Error {
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
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }))
    throw new ApiError(
      response.status,
      error.detail || `POST ${endpoint} failed`,
    )
  }
  return response.json()
}

async function del<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' })
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }))
    throw new ApiError(
      response.status,
      error.detail || `DELETE ${endpoint} failed`,
    )
  }
  return response.json()
}

// === AI API Client ===

export const aiApi = {
  // Generate AI suggestions
  generateSuggestions: async (
    provider?: LlmProvider,
  ): Promise<SuggestionsResponse> => {
    return post<SuggestionsResponse>('/api/ai/suggestions', {
      provider: provider || undefined,
    })
  },

  // Get all LLM configurations
  getLlmConfigs: async (): Promise<Array<LlmConfig>> => {
    return get<Array<LlmConfig>>('/api/ai/llm-config')
  },

  // Save or update LLM configuration
  saveLlmConfig: async (
    provider: LlmProvider,
    apiKey: string,
    isActive = true,
  ): Promise<{
    success: boolean
    message: string
    provider: string
    has_key: boolean
  }> => {
    return post('/api/ai/config', {
      provider,
      api_key: apiKey,
      is_active: isActive,
    })
  },

  // Delete LLM configuration
  deleteLlmConfig: async (
    provider: LlmProvider,
  ): Promise<{
    success: boolean
    message: string
  }> => {
    return del<{ success: boolean; message: string }>(
      `/api/ai/config/${provider}`,
    )
  },

  // Toggle LLM configuration active status
  toggleLlmConfig: async (
    provider: LlmProvider,
  ): Promise<{
    success: boolean
    message: string
    is_active: boolean
  }> => {
    return post<{ success: boolean; message: string; is_active: boolean }>(
      `/api/ai/config/${provider}/toggle`,
      {},
    )
  },
}

// Export types
export type { ApiError }
export default aiApi
