import * as React from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnimatedMetricProps {
  value: number
  label: string
  unit?: string
  previousValue?: number
  format?: 'number' | 'percent' | 'currency' | 'bytes'
  trend?: 'up' | 'down' | 'neutral' | 'auto'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'violet' | 'blue' | 'green' | 'amber' | 'red'
  delay?: number
}

/**
 * AnimatedMetric - Animated number display with trend indicator
 *
 * Features:
 * - Smooth number counting animation
 * - Trend indicators (up/down/neutral)
 * - Auto-trend detection
 * - Multiple formatting options
 */
export function AnimatedMetric({
  value,
  label,
  unit,
  previousValue,
  format = 'number',
  trend = 'auto',
  size = 'lg',
  color = 'violet',
  delay = 0,
}: AnimatedMetricProps) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [isVisible, setIsVisible] = React.useState(false)

  // Detect trend if auto
  const actualTrend = React.useMemo(() => {
    if (trend !== 'auto' || previousValue === undefined) return trend
    if (value > previousValue) return 'up'
    if (value < previousValue) return 'down'
    return 'neutral'
  }, [value, previousValue, trend])

  // Animate value on mount
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  React.useEffect(() => {
    if (!isVisible) return

    const duration = 1000
    const steps = 60
    const stepDuration = duration / steps
    const increment = (value - displayValue) / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayValue(value)
        clearInterval(interval)
      } else {
        setDisplayValue((prev) => prev + increment)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [value, isVisible])

  // Format value
  const formattedValue = React.useMemo(() => {
    const v = Math.round(displayValue * 100) / 100

    switch (format) {
      case 'percent':
        return `${v}%`
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(v)
      case 'bytes':
        if (v >= 1024 * 1024 * 1024)
          return `${(v / (1024 * 1024 * 1024)).toFixed(1)}GB`
        if (v >= 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)}MB`
        if (v >= 1024) return `${(v / 1024).toFixed(1)}KB`
        return `${v}B`
      default:
        return new Intl.NumberFormat('en-US').format(v)
    }
  }, [displayValue, format])

  // Size styles
  const sizeStyles = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  // Color styles
  const colorStyles = {
    violet: 'text-violet-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-rose-500',
  }

  // Trend icon
  const TrendIcon =
    actualTrend === 'up'
      ? TrendingUp
      : actualTrend === 'down'
        ? TrendingDown
        : Minus
  const trendColor =
    actualTrend === 'up'
      ? 'text-green-500'
      : actualTrend === 'down'
        ? 'text-rose-500'
        : 'text-muted-foreground'

  // Calculate percent change
  const percentChange = previousValue
    ? Math.round(((value - previousValue) / previousValue) * 100)
    : null

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-bold font-mono',
            sizeStyles[size],
            colorStyles[color],
          )}
        >
          {formattedValue}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>

        {previousValue && (
          <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            <span className="font-medium">
              {percentChange && percentChange !== 0
                ? `${Math.abs(percentChange)}%`
                : '0%'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * MetricCard - Card wrapper for AnimatedMetric
 */
export function MetricCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-all hover:shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
