/**
 * Simple Collapsible component
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export function Collapsible({
  open,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open !== undefined ? open : internalOpen

  const handleToggle = () => {
    const newState = !isOpen
    setInternalOpen(newState)
    onOpenChange?.(newState)
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen,
            onToggle: handleToggle,
          })
        }
        return child
      })}
    </div>
  )
}

interface CollapsibleTriggerProps {
  isOpen?: boolean
  onToggle?: () => void
  children: React.ReactNode
  className?: string
}

export function CollapsibleTrigger({
  isOpen,
  onToggle,
  children,
  className,
}: CollapsibleTriggerProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors',
        className,
      )}
    >
      {children}
      <svg
        className={cn(
          'size-4 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180',
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  )
}

interface CollapsibleContentProps {
  isOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleContent({
  isOpen,
  children,
  className,
}: CollapsibleContentProps) {
  if (!isOpen) return null

  return <div className={cn('p-4 pt-0 border-t', className)}>{children}</div>
}
