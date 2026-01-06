import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const RALPH_API = import.meta.env.VITE_RALPH_API_URL || ''

interface ToolCall {
  id: number
  tool: string
  status: 'pending' | 'success' | 'error'
  latencyMs?: number
  timestamp: Date
}

interface ToolResult {
  data: unknown
  success: boolean
  latencyMs: number
}

interface PlaygroundContextValue {
  loading: string | null
  callHistory: Array<ToolCall>
  callTool: (
    tool: string,
    endpoint: string,
    params?: Record<string, unknown>,
  ) => Promise<ToolResult>
}

const PlaygroundContext = createContext<PlaygroundContextValue | null>(null)

export function PlaygroundProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [callHistory, setCallHistory] = useState<Array<ToolCall>>([])
  const callIdRef = useRef(0)

  const callTool = useCallback(
    async (
      tool: string,
      endpoint: string,
      params?: Record<string, unknown>,
    ) => {
      setLoading(tool)
      const callId = ++callIdRef.current
      const start = Date.now()

      const newCall: ToolCall = {
        id: callId,
        tool,
        status: 'pending',
        timestamp: new Date(),
      }
      setCallHistory((prev) => [newCall, ...prev].slice(0, 30))

      try {
        const isGet = !params
        const response = await fetch(`${RALPH_API}${endpoint}`, {
          method: isGet ? 'GET' : 'POST',
          headers: isGet ? {} : { 'Content-Type': 'application/json' },
          body: isGet ? undefined : JSON.stringify(params),
        })

        const data = await response.json()
        const latencyMs = Date.now() - start
        const success = !data.error && response.ok

        setCallHistory((prev) =>
          prev.map((c) =>
            c.id === callId
              ? { ...c, status: success ? 'success' : 'error', latencyMs }
              : c,
          ),
        )

        return { data, success, latencyMs }
      } catch {
        const latencyMs = Date.now() - start
        setCallHistory((prev) =>
          prev.map((c) =>
            c.id === callId ? { ...c, status: 'error', latencyMs } : c,
          ),
        )
        return { data: null, success: false, latencyMs }
      } finally {
        setLoading(null)
      }
    },
    [],
  )

  return (
    <PlaygroundContext.Provider value={{ loading, callHistory, callTool }}>
      {children}
    </PlaygroundContext.Provider>
  )
}

export function usePlayground() {
  const ctx = useContext(PlaygroundContext)
  if (!ctx)
    throw new Error('usePlayground must be used within PlaygroundProvider')
  return ctx
}
