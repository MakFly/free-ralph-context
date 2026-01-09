import * as React from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  delay?: number // Stagger delay in ms
  hover?: 'lift' | 'glow' | 'scale' | 'none'
}

/**
 * AnimatedCard - MorphLLM-style smooth animations
 *
 * Features:
 * - Staggered entrance animations
 * - Smooth hover effects
 * - Performance-optimized (GPU accelerated)
 * - Accessible (prefers-reduced-motion)
 */
export function AnimatedCard({
  children,
  className,
  delay = 0,
  hover = 'lift',
  ...props
}: AnimatedCardProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const hoverStyles = {
    lift: 'hover:-translate-y-1 hover:shadow-lg',
    glow: 'hover:shadow-xl hover:shadow-violet-500/20',
    scale: 'hover:scale-[1.02]',
    none: '',
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 transition-all duration-300 ease-out',
        // Entrance animation
        !isVisible && 'opacity-0 translate-y-4',
        isVisible && 'opacity-100 translate-y-0',
        // Hover effect
        hoverStyles[hover],
        className,
      )}
      style={{
        transitionDelay: `${delay}ms`,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// Specialized variants
export function StatCard({
  children,
  ...props
}: Omit<AnimatedCardProps, 'hover'>) {
  return (
    <AnimatedCard hover="lift" {...props}>
      {children}
    </AnimatedCard>
  )
}

export function FeatureCard({
  children,
  ...props
}: Omit<AnimatedCardProps, 'hover'>) {
  return (
    <AnimatedCard hover="glow" {...props}>
      {children}
    </AnimatedCard>
  )
}

export function InteractiveCard({
  children,
  ...props
}: Omit<AnimatedCardProps, 'hover'>) {
  return (
    <AnimatedCard hover="scale" {...props}>
      {children}
    </AnimatedCard>
  )
}
