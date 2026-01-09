/**
 * Logger unifié - Beautiful tslog-inspired design
 * Server + Client with automatic environment detection
 *
 * Server (dev): Pretty colored output
 * Server (prod): JSON structured for log aggregators
 * Client: Console + beacon to /api/log for errors
 *
 * Copied from iautos/frontend-life-v3
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LoggerInterface = {
  debug: (obj: Record<string, unknown>, msg?: string) => void
  info: (obj: Record<string, unknown>, msg?: string) => void
  warn: (obj: Record<string, unknown>, msg?: string) => void
  error: (obj: Record<string, unknown>, msg?: string) => void
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const isServer = typeof window === 'undefined'

// ═══════════════════════════════════════════════════════════════════════════
// ANSI Color Palette - Modern terminal aesthetics
// ═══════════════════════════════════════════════════════════════════════════

const c = {
  // Reset & Styles
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

  // Level colors (256-color mode for richer palette)
  debug: '\x1b[38;5;243m', // Subtle gray
  info: '\x1b[38;5;75m', // Sky blue
  warn: '\x1b[38;5;214m', // Warm orange
  error: '\x1b[38;5;196m', // Vibrant red

  // Level backgrounds for badges
  debugBg: '\x1b[48;5;236m', // Dark gray bg
  infoBg: '\x1b[48;5;24m', // Dark blue bg
  warnBg: '\x1b[48;5;130m', // Dark orange bg
  errorBg: '\x1b[48;5;52m', // Dark red bg

  // Utility
  time: '\x1b[38;5;243m', // Medium gray
  message: '\x1b[38;5;252m', // Light gray
  scope: '\x1b[38;5;141m', // Soft purple
  data: '\x1b[38;5;243m', // Dim for data
} as const

// Level configuration with icons and styles
const levelConfig: Record<
  LogLevel,
  { icon: string; label: string; color: string; bg: string }
> = {
  debug: { icon: '◦', label: 'DBG', color: c.debug, bg: c.debugBg },
  info: { icon: '●', label: 'INF', color: c.info, bg: c.infoBg },
  warn: { icon: '▲', label: 'WRN', color: c.warn, bg: c.warnBg },
  error: { icon: '✖', label: 'ERR', color: c.error, bg: c.errorBg },
}

// ═══════════════════════════════════════════════════════════════════════════
// Environment & Configuration
// ═══════════════════════════════════════════════════════════════════════════

const getLogLevel = (): LogLevel => {
  if (isServer) {
    const level = process.env.LOG_LEVEL
    if (
      level === 'debug' ||
      level === 'info' ||
      level === 'warn' ||
      level === 'error'
    ) {
      return level
    }
    return process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  }
  // Client-side - use localStorage or default to info
  try {
    const level = localStorage.getItem('log_level')
    if (
      level === 'debug' ||
      level === 'info' ||
      level === 'warn' ||
      level === 'error'
    ) {
      return level
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'info'
}

const currentLevel = getLogLevel()
const isDev = process.env.NODE_ENV === 'development'

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel]
}

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

const formatMessage = (obj: Record<string, unknown>, msg?: string): string => {
  if (msg) return msg
  if (obj.msg && typeof obj.msg === 'string') return obj.msg
  if (obj.err instanceof Error) return obj.err.message
  return ''
}

const formatData = (obj: Record<string, unknown>): string => {
  // Filter out internal keys
  const filtered = Object.entries(obj).filter(
    ([key]) => !['msg', 'err', 'error', 'scope'].includes(key),
  )

  if (filtered.length === 0) return ''

  const pairs = filtered
    .slice(0, 4) // Limit to 4 key-value pairs for readability
    .map(([key, value]) => {
      const v = typeof value === 'string' ? value : JSON.stringify(value)
      const truncated = v && v.length > 30 ? v.slice(0, 27) + '...' : v
      return `${key}=${truncated}`
    })

  return pairs.join(' ')
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER-SIDE LOGGING - Pretty Format
// ═══════════════════════════════════════════════════════════════════════════

const formatPrettyLog = (
  level: LogLevel,
  obj: Record<string, unknown>,
  msg?: string,
): string => {
  const config = levelConfig[level]
  const time = `${c.time}${getTimestamp()}${c.reset}`
  const badge = `${config.color}${config.icon} ${config.label}${c.reset}`
  const message = `${c.message}${formatMessage(obj, msg)}${c.reset}`

  // Extract scope if present
  const scopeValue = obj.scope as string | undefined
  const scope = scopeValue ? `${c.scope}[${scopeValue}]${c.reset} ` : ''

  // Format additional data
  const data = formatData(obj)
  const dataStr = data ? `  ${c.data}${data}${c.reset}` : ''

  return `${time}  ${badge}  ${scope}${message}${dataStr}`
}

const formatJsonLog = (
  level: LogLevel,
  obj: Record<string, unknown>,
  msg?: string,
): string => {
  return JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: formatMessage(obj, msg),
    env: process.env.NODE_ENV,
    service: 'free-context',
    ...obj,
  })
}

const serverLogger: LoggerInterface = {
  debug: (obj, msg) => {
    if (shouldLog('debug')) {
      const output = isDev
        ? formatPrettyLog('debug', obj, msg)
        : formatJsonLog('debug', obj, msg)
      console.debug(output)
    }
  },
  info: (obj, msg) => {
    if (shouldLog('info')) {
      const output = isDev
        ? formatPrettyLog('info', obj, msg)
        : formatJsonLog('info', obj, msg)
      console.info(output)
    }
  },
  warn: (obj, msg) => {
    if (shouldLog('warn')) {
      const output = isDev
        ? formatPrettyLog('warn', obj, msg)
        : formatJsonLog('warn', obj, msg)
      console.warn(output)
    }
  },
  error: (obj, msg) => {
    if (shouldLog('error')) {
      const output = isDev
        ? formatPrettyLog('error', obj, msg)
        : formatJsonLog('error', obj, msg)
      console.error(output)
    }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE LOGGING
// ═══════════════════════════════════════════════════════════════════════════

// Client-side uses CSS styling for browser console
const clientStyles = {
  debug: 'color: #888; font-weight: normal;',
  info: 'color: #3b82f6; font-weight: bold;',
  warn: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
}

const clientLogger: LoggerInterface = {
  debug: (obj, msg) => {
    if (shouldLog('debug')) {
      const time = getTimestamp()
      console.debug(
        `%c${time}  ◦ DBG  ${formatMessage(obj, msg)}`,
        clientStyles.debug,
        obj,
      )
    }
  },
  info: (obj, msg) => {
    if (shouldLog('info')) {
      const time = getTimestamp()
      console.info(
        `%c${time}  ● INF  ${formatMessage(obj, msg)}`,
        clientStyles.info,
        obj,
      )
    }
  },
  warn: (obj, msg) => {
    if (shouldLog('warn')) {
      const time = getTimestamp()
      console.warn(
        `%c${time}  ▲ WRN  ${formatMessage(obj, msg)}`,
        clientStyles.warn,
        obj,
      )
    }
  },
  error: (obj, msg) => {
    if (shouldLog('error')) {
      const time = getTimestamp()
      console.error(
        `%c${time}  ✖ ERR  ${formatMessage(obj, msg)}`,
        clientStyles.error,
        obj,
      )

      // En prod, envoyer vers /api/log pour Discord webhook
      if (process.env.NODE_ENV === 'production') {
        try {
          navigator.sendBeacon(
            '/api/log',
            JSON.stringify({
              level: 'error',
              msg: formatMessage(obj, msg),
              ...obj,
              url: window.location.href,
              userAgent: navigator.userAgent,
            }),
          )
        } catch {
          // Ignore sendBeacon errors
        }
      }
    }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT - Automatic environment detection
// ═══════════════════════════════════════════════════════════════════════════

export const logger: LoggerInterface = isServer ? serverLogger : clientLogger
