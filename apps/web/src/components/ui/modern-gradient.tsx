import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * ModernGradient - MorphLLM-style gradient backgrounds
 *
 * Features:
 * - Animated gradients
 * - Mesh gradients
 * - Noise textures
 * - Glassmorphism support
 */
export function ModernGradient({
  className,
  variant = 'default',
  children,
}: {
  className?: string
  variant?: 'default' | 'mesh' | 'aurora' | 'sunset' | 'ocean' | 'forest'
  children?: React.ReactNode
}) {
  const gradients = {
    default: 'bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10',
    mesh: 'bg-gradient-to-tr from-violet-500 via-purple-500 to-fuchsia-500',
    aurora:
      'bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20',
    sunset:
      'bg-gradient-to-br from-orange-500/20 via-rose-500/20 to-purple-500/20',
    ocean:
      'bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-violet-500/20',
    forest:
      'bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20',
  }

  return (
    <div
      className={cn('relative overflow-hidden', gradients[variant], className)}
    >
      {/* Animated overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * GlassCard - Glassmorphism card with backdrop blur
 */
export function GlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * AnimatedBorder - Border with animated gradient
 */
export function AnimatedBorder({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn('relative p-[1px] rounded-lg overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 animate-gradient-x" />
      <div className="relative bg-background rounded-lg">{children}</div>
    </div>
  )
}

/**
 * ShimmerEffect - Loading skeleton with shimmer animation
 */
export function ShimmerEffect({
  className,
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'circle' | 'text'
}) {
  const variants = {
    default: 'h-4 w-full rounded',
    circle: 'h-12 w-12 rounded-full',
    text: 'h-4 w-3/4 rounded',
  }

  return (
    <div
      className={cn('animate-pulse bg-muted', variants[variant], className)}
    />
  )
}

/**
 * NoiseOverlay - Subtle noise texture for depth
 */
export function NoiseOverlay({
  opacity = 0.02,
  className,
}: {
  opacity?: number
  className?: string
}) {
  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity,
      }}
    />
  )
}

// Add custom animations to Tailwind
// Add this to tailwind.config.js:
// keyframes: {
//   shimmer: {
//     '100%': { transform: 'translateX(100%)' }
//   },
//   'gradient-x': {
//     '0%, 100%': { backgroundPosition: '0% 50%' },
//     '50%': { backgroundPosition: '100% 50%' }
//   }
// }
