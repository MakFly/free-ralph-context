import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  CalendarIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  ClockIcon,
  LayersIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNexusStore } from '@/stores/nexusStore'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/sessions-history/')({
  component: SessionsHistoryPage,
})

// Types
interface DailyCalendarItem {
  date: string
  sessionCount: number
  totalCost: number
  totalDuration: number
  cliBreakdown: Record<string, { count: number; cost: number }>
  modelBreakdown: Record<string, { count: number; cost: number }>
  intensity: number
}

interface CalendarResponse {
  calendar: DailyCalendarItem[]
  summary: {
    totalCost: number
    totalSessions: number
    avgDailyCost: number
    trend: number
    daysTracked: number
  }
}

interface SessionHistoryItem {
  id: number
  session_id: string
  cli_type: string
  llm_model: string
  project_name: string
  started_at: number
  ended_at: number
  duration_seconds: number
  cost_usd: number
}

// Format helpers
function formatCost(cost: number): string {
  if (cost === 0) return '$0'
  if (cost < 0.01) return '<$0.01'
  if (cost < 1) return `$${cost.toFixed(2)}`
  return `$${cost.toFixed(2)}`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Intensity color mapping for heatmap
const INTENSITY_COLORS = [
  'bg-muted/30',
  'bg-green-500/20',
  'bg-green-500/40',
  'bg-green-500/60',
  'bg-green-500/80',
]

// Heatmap Calendar Component
function HeatmapCalendar({
  data,
  onDayClick,
  selectedDate,
}: {
  data: DailyCalendarItem[]
  onDayClick: (date: string) => void
  selectedDate: string | null
}) {
  // Group by weeks
  const weeks: DailyCalendarItem[][] = []
  let currentWeek: DailyCalendarItem[] = []

  // Fill in missing days
  const dataMap = new Map(data.map(d => [d.date, d]))
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 30)

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const existing = dataMap.get(dateStr)
    const dayData: DailyCalendarItem = existing || {
      date: dateStr,
      sessionCount: 0,
      totalCost: 0,
      totalDuration: 0,
      cliBreakdown: {},
      modelBreakdown: {},
      intensity: 0,
    }

    currentWeek.push(dayData)

    if (d.getDay() === 6 || d.getTime() === today.getTime()) {
      weeks.push([...currentWeek])
      currentWeek = []
    }
  }

  return (
    <div className="flex gap-1">
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="flex flex-col gap-1">
          {week.map((day) => {
            const isSelected = selectedDate === day.date
            const isToday = day.date === today.toISOString().split('T')[0]

            return (
              <button
                key={day.date}
                onClick={() => onDayClick(day.date)}
                className={cn(
                  'w-4 h-4 rounded-sm transition-all',
                  INTENSITY_COLORS[day.intensity],
                  isSelected && 'ring-2 ring-primary ring-offset-1',
                  isToday && 'ring-1 ring-yellow-500',
                  'hover:ring-1 hover:ring-muted-foreground'
                )}
                title={`${formatDate(day.date)}: ${day.sessionCount} sessions, ${formatCost(day.totalCost)}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Day Detail Card
function DayDetailCard({
  day,
  sessions,
  isLoading,
}: {
  day: DailyCalendarItem | null
  sessions: SessionHistoryItem[]
  isLoading: boolean
}) {
  if (!day) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Select a day</CardTitle>
          <CardDescription>Click on a day in the calendar to see details</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{formatDate(day.date)}</CardTitle>
            <CardDescription>
              {day.sessionCount} session{day.sessionCount !== 1 ? 's' : ''} • {formatDuration(day.totalDuration)}
            </CardDescription>
          </div>
          <div className="text-2xl font-bold text-green-500">{formatCost(day.totalCost)}</div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Model breakdown */}
        {Object.keys(day.modelBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(day.modelBreakdown).map(([model, stats]) => (
              <Badge key={model} variant="outline" className="text-xs">
                {model}: {stats.count}× ({formatCost(stats.cost)})
              </Badge>
            ))}
          </div>
        )}

        {/* Sessions list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sessions recorded</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{session.project_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {' • '}
                    {formatDuration(session.duration_seconds)}
                    {' • '}
                    {session.llm_model}
                  </span>
                </div>
                <span className="font-mono text-sm">{formatCost(session.cost_usd)}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Sparkline Chart (simple SVG)
function SparklineChart({ data, height = 40 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null

  const max = Math.max(...data, 1)
  const width = data.length * 8
  const points = data.map((v, i) => `${i * 8},${height - (v / max) * height}`).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-green-500"
      />
    </svg>
  )
}

// Main Page Component
function SessionsHistoryPage() {
  const { apiBaseUrl, isConnected } = useNexusStore()
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<DailyCalendarItem | null>(null)
  const [daySessions, setDaySessions] = useState<SessionHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/sessions/history/daily?days=30`)
      if (response.ok) {
        const data = await response.json()
        setCalendarData(data)
      }
    } catch (e) {
      console.error('Failed to fetch calendar:', e)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  // Fetch sessions for selected day
  const fetchDaySessions = useCallback(async (date: string) => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch(`${apiBaseUrl}/sessions/history/list?date=${date}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setDaySessions(data.sessions)
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [apiBaseUrl])

  // Import from JSONL
  const handleImport = async () => {
    setIsImporting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/sessions/history/import`, { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        alert(`Imported ${result.imported} sessions (${result.skipped} skipped)`)
        fetchCalendar()
      }
    } catch (e) {
      console.error('Import failed:', e)
    } finally {
      setIsImporting(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  // Handle day selection
  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    const dayData = calendarData?.calendar.find(d => d.date === date)
    setSelectedDayData(dayData || null)
    fetchDaySessions(date)
  }

  // Calculate sparkline data
  const sparklineData = calendarData?.calendar
    .slice()
    .reverse()
    .slice(0, 14)
    .map(d => d.totalCost) || []

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <CalendarIcon className="h-8 w-8" />
              Sessions History
            </h1>
            <p className="text-muted-foreground">
              Track your Claude Code usage over time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              disabled={isImporting}
            >
              <DownloadIcon className={cn('h-4 w-4 mr-2', isImporting && 'animate-spin')} />
              Import JSONL
            </Button>
            <Button onClick={fetchCalendar} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCwIcon className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCost(calendarData?.summary.totalCost || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {calendarData?.summary.daysTracked || 0} days tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <LayersIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calendarData?.summary.totalSessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                total sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              <ClockIcon className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCost(calendarData?.summary.avgDailyCost || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                per day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">7-Day Trend</CardTitle>
              {(calendarData?.summary.trend || 0) >= 0 ? (
                <TrendingUpIcon className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(calendarData?.summary.trend || 0) >= 0 ? '+' : ''}
                {calendarData?.summary.trend || 0}%
              </div>
              <div className="mt-2">
                <SparklineChart data={sparklineData} height={30} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar + Detail */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Heatmap Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Last 30 Days</CardTitle>
              <CardDescription>Click a day to see details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <HeatmapCalendar
                  data={calendarData?.calendar || []}
                  onDayClick={handleDayClick}
                  selectedDate={selectedDate}
                />
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                {INTENSITY_COLORS.map((color, i) => (
                  <div key={i} className={cn('w-3 h-3 rounded-sm', color)} />
                ))}
                <span>More</span>
              </div>
            </CardContent>
          </Card>

          {/* Day Detail */}
          <DayDetailCard
            day={selectedDayData}
            sessions={daySessions}
            isLoading={isLoadingSessions}
          />
        </div>
      </div>
    </AppLayout>
  )
}
