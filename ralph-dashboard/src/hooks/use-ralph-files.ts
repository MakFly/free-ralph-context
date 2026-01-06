import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMemories,
  type RalphMemory,
} from '@/api/ralph'

export interface SystemStatus {
  isActive: boolean
  totalMemories: number
  lastActivity: string | null
}

// Calculate token savings estimate
function calculateTokenSavings(memories: RalphMemory[]): {
  savedTokens: number
  savedPercent: number
} {
  const count = memories.length
  // Each memory saves ~500 tokens (estimated)
  const savedTokens = count * 500
  // Base cost would be ~2000 tokens per memory without Ralph
  const baseCost = count * 2000
  const savedPercent = Math.round((savedTokens / (savedTokens + baseCost)) * 100)

  return { savedTokens, savedPercent }
}

// Format timestamp to relative time
function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Main hook
export function useRalphFiles() {
  const [memories, setMemories] = useState<RalphMemory[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isActive: true,
    totalMemories: 0,
    lastActivity: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  // Fetch data from Ralph files using server functions
  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true)
      }
      setError(null)

      // Get memories
      const memoriesData = await getMemories()

      setMemories(memoriesData.memories)
      setSystemStatus({
        isActive: true,
        totalMemories: memoriesData.totalMemories,
        lastActivity: memoriesData.lastActivity,
      })
    } catch (err) {
      console.error('Failed to fetch Ralph data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      if (isInitial) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initial fetch only - no polling (SSE handles real-time updates)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      fetchData(true)
    }
  }, [fetchData])

  // Calculate derived stats
  const tokenSavings = calculateTokenSavings(memories)
  const recentMemories = memories.slice(0, 10)
  const categoryCounts = memories.reduce(
    (acc, mem) => {
      acc[mem.category] = (acc[mem.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return {
    memories,
    systemStatus,
    recentMemories,
    categoryCounts,
    tokenSavings,
    formatRelativeTime,
    isLoading,
    error,
    refresh: () => fetchData(false),
  }
}
