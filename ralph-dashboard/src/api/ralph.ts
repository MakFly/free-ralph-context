/**
 * Ralph V3 API Client
 * Queries SQLite database directly
 */

import { createServerFn } from '@tanstack/react-start'
import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'

// Direct SQLite connection
const RALPH_DB_PATH = path.join(os.homedir(), '.ralph', 'ralph-mcp.db')
let db: Database.Database | null = null

function getDb(): Database.Database {
  if (!db) {
    db = new Database(RALPH_DB_PATH, { readonly: true })
  }
  return db
}

// Types for API responses
export interface RalphMemory {
  id: string
  session_id: string
  content: string
  category: string
  priority: string
  created_at: string
}

export interface RalphInsight {
  id: number
  session_id: string
  project_path: string
  timestamp: string
  type: 'pattern' | 'decision' | 'error' | 'architecture' | 'summary'
  title: string
  content: string
  category?: string
  confidence?: number
  tokens_saved?: number
}

export interface RalphSuggestion {
  title: string
  description: string
  type: 'commit' | 'add_tests' | 'add_docs' | 'compress' | 'custom'
}

export interface OptimizerState {
  last_check: string | null
  memory_count: number
  optimization_count: number
  last_compression: string | null
  last_curation: string | null
}

export interface SystemStatus {
  isActive: boolean
  totalMemories: number
  lastActivity: string | null
  optimizationCount: number
  lastOptimization: string | null
  hooksEnabled: boolean
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Server function: Get memories (GET - no params needed)
export const getMemories = createServerFn({ method: 'GET' }).handler(async () => {
  const database = getDb()

  const memories = database
    .prepare(
      `SELECT id, session_id, content, category, priority, created_at
       FROM memories
       ORDER BY created_at DESC
       LIMIT 100`,
    )
    .all() as RalphMemory[]

  return {
    memories,
    totalMemories: memories.length,
    lastActivity: memories.length > 0 ? memories[0].created_at : null,
  }
})

// Single unified server function for other operations
export const ralphApi = createServerFn({ method: 'POST' })
  .handler(async (input: { action: string; params?: any }) => {
    const { action, params } = input
    const database = getDb()

    try {
      switch (action) {
        case 'searchMemories': {
          const query = params?.query || ''
          const results = database
            .prepare(
              `SELECT id, session_id, content, category, priority, created_at
               FROM memories
               WHERE content LIKE ?
               ORDER BY created_at DESC
               LIMIT 20`,
            )
            .all(`%${query}%`) as RalphMemory[]

          return results
        }

        case 'getStats': {
          const stats = database
            .prepare(
              `SELECT category, COUNT(*) as count
               FROM memories
               GROUP BY category`,
            )
            .all() as Array<{ category: string; count: number }>

          return { stats, total: stats.reduce((sum, s) => sum + s.count, 0) }
        }

        default:
          return { error: 'Unknown action' }
      }
    } catch (error) {
      console.error('Ralph API error:', error)
      return { error: 'Database error' }
    }
  })

// Convenience wrappers
export async function searchMemories(query: string, limit = 20) {
  return ralphApi({ action: 'searchMemories', params: { query } })
}

export async function getStats() {
  return ralphApi({ action: 'getStats' })
}
