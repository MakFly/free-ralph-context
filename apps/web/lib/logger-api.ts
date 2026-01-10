/**
 * Logger API - Beautiful tslog-inspired design
 * Clean, aligned, color-coded API logging for development
 *
 * Copied from iautos/frontend-life-v3
 */

const isDev = import.meta.env.DEV

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

type LogApiContext = {
  method: HttpMethod
  url: string
  status: number
  duration: number
  hasAuth?: boolean
  error?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// ANSI Color Palette - Modern terminal aesthetics
// ═══════════════════════════════════════════════════════════════════════════

const c = {
  // Reset
  reset: '\x1b[0m',

  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

  // Semantic colors
  success: '\x1b[38;5;78m', // Soft green
  warning: '\x1b[38;5;214m', // Warm orange
  error: '\x1b[38;5;196m', // Vibrant red
  info: '\x1b[38;5;75m', // Sky blue

  // Method colors
  get: '\x1b[38;5;114m', // Fresh green
  post: '\x1b[38;5;215m', // Golden yellow
  put: '\x1b[38;5;111m', // Calm blue
  patch: '\x1b[38;5;183m', // Soft purple
  delete: '\x1b[38;5;203m', // Coral red

  // Utility colors
  path: '\x1b[38;5;252m', // Light gray
  time: '\x1b[38;5;243m', // Medium gray
  fast: '\x1b[38;5;78m', // Green for fast
  medium: '\x1b[38;5;214m', // Orange for medium
  slow: '\x1b[38;5;196m', // Red for slow
  auth: '\x1b[38;5;220m', // Gold for auth
  noAuth: '\x1b[38;5;245m', // Gray for no auth
} as const

// ═══════════════════════════════════════════════════════════════════════════
// Formatting Helpers
// ═══════════════════════════════════════════════════════════════════════════

const getTimestamp = (): string => {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const s = now.getSeconds().toString().padStart(2, '0')
  const ms = now.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

const getMethodColor = (method: HttpMethod): string => {
  const colors: Record<HttpMethod, string> = {
    GET: c.get,
    POST: c.post,
    PUT: c.put,
    PATCH: c.patch,
    DELETE: c.delete,
  }
  return colors[method]
}

const getStatusIndicator = (
  status: number,
): { icon: string; color: string } => {
  if (status >= 500) return { icon: '●', color: c.error }
  if (status >= 400) return { icon: '●', color: c.warning }
  if (status >= 300) return { icon: '●', color: c.info }
  return { icon: '●', color: c.success }
}

const getDurationStyle = (ms: number): { color: string; label: string } => {
  if (ms < 100) return { color: c.fast, label: `${ms}ms` }
  if (ms < 300) return { color: c.medium, label: `${ms}ms` }
  return { color: c.slow, label: `${ms}ms` }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main API Logger
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log an API call with beautiful formatting
 *
 * Output format:
 * 14:32:45.123  ● GET    /api/v1/auth/me              200   45ms
 */
export function logApi(ctx: LogApiContext): void {
  if (!isDev) return

  const { method, url, status, duration, hasAuth = false, error } = ctx

  // Extract path only
  const path = url.replace(/^https?:\/\/[^/]+/, '')

  // Build components
  const time = `${c.time}${getTimestamp()}${c.reset}`
  const statusInfo = getStatusIndicator(status)
  const indicator = `${statusInfo.color}${statusInfo.icon}${c.reset}`
  const methodColor = getMethodColor(method)
  const methodStr = `${methodColor}${c.bold}${method.padEnd(6)}${c.reset}`
  const authIcon = hasAuth ? `${c.auth}◆${c.reset}` : `${c.noAuth}◇${c.reset}`
  const pathStr = `${c.path}${path}${c.reset}`
  const statusStr = `${statusInfo.color}${status}${c.reset}`
  const durationInfo = getDurationStyle(duration)
  const durationStr = `${durationInfo.color}${durationInfo.label.padStart(6)}${c.reset}`

  // Compose the log line
  let line = `${time}  ${indicator} ${authIcon} ${methodStr} ${pathStr}`

  // Add padding for alignment (target: 55 chars for path column)
  const pathLength = path.length
  const padding = Math.max(0, 45 - pathLength)
  line += ' '.repeat(padding)

  // Add status and duration
  line += `  ${statusStr}  ${durationStr}`

  // Add error message if present
  if (error) {
    line += `  ${c.error}${c.italic}${error}${c.reset}`
  }

  console.log(line)
}

/**
 * Log API error with enhanced visibility
 */
export function logApiError(
  ctx: Omit<LogApiContext, 'status'> & { status?: number },
): void {
  logApi({ ...ctx, status: ctx.status ?? 500 })
}

/**
 * Helper to measure request duration
 */
export function createApiTimer(): () => number {
  const start = performance.now()
  return () => Math.round(performance.now() - start)
}
