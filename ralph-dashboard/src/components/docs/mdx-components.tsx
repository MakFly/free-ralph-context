'use client'

import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
} from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'
import { cn } from '@/lib/utils'

// Custom callout component
function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'error' | 'success' | 'tip'
  children: React.ReactNode
}) {
  const configs = {
    info: {
      icon: Info,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-500',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-500',
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-500',
    },
    tip: {
      icon: Lightbulb,
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
      text: 'text-violet-500',
    },
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg border my-4',
        config.bg,
        config.border,
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.text)} />
      <div className="flex-1 text-sm text-foreground">{children}</div>
    </div>
  )
}

// Helper to generate heading ID from text
function generateId(children: React.ReactNode): string {
  const text = String(children)
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}

// MDX components mapping
export const mdxComponents = {
  // Custom code block rendering
  pre: ({ children }: { children: React.ReactElement }) => {
    // Check if this is a code element with className
    if (React.isValidElement(children) && children.type === 'code') {
      const { className, children: code } = children.props as {
        className?: string
        children: string
      }
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : 'text'
      const codeValue = String(code).replace(/\n$/, '')

      if (match) {
        return <CodeBlock code={codeValue} language={language} />
      }
    }
    return <pre>{children}</pre>
  },

  // Inline code
  code: ({
    className,
    children,
    ...props
  }: {
    className?: string
    children: React.ReactNode
  }) => {
    const match = /language-(\w+)/.exec(className || '')
    // If it's a language-specific code block, let the parent pre handle it
    if (match) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
    // Inline code
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    )
  },

  // Custom heading rendering with anchor links
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateId(children)
    return (
      <h1 id={id} className="group relative scroll-mt-20" {...props}>
        {children}
        <a
          href={`#${id}`}
          className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500 no-underline"
          aria-label="Anchor link"
        >
          #
        </a>
      </h1>
    )
  },

  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateId(children)
    return (
      <h2 id={id} className="group relative scroll-mt-20" {...props}>
        {children}
        <a
          href={`#${id}`}
          className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500 no-underline"
          aria-label="Anchor link"
        >
          #
        </a>
      </h2>
    )
  },

  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateId(children)
    return (
      <h3 id={id} className="group relative scroll-mt-20" {...props}>
        {children}
        <a
          href={`#${id}`}
          className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500 no-underline"
          aria-label="Anchor link"
        >
          #
        </a>
      </h3>
    )
  },

  // Enhanced blockquote rendering for callouts
  blockquote: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLQuoteElement>) => {
    const content = React.Children.toArray(children).join('').toLowerCase()

    // Check if this is a callout
    if (content.includes('[!info]')) {
      return <Callout type="info">{children}</Callout>
    }
    if (content.includes('[!warning]')) {
      return <Callout type="warning">{children}</Callout>
    }
    if (content.includes('[!error]')) {
      return <Callout type="error">{children}</Callout>
    }
    if (content.includes('[!success]')) {
      return <Callout type="success">{children}</Callout>
    }
    if (content.includes('[!tip]')) {
      return <Callout type="tip">{children}</Callout>
    }

    return (
      <blockquote
        className="border-l-4 border-muted-foreground/20 pl-4 italic"
        {...props}
      >
        {children}
      </blockquote>
    )
  },

  // Enhanced table components
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),

  thead: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-muted/50 border-b border-border" {...props}>
      {children}
    </thead>
  ),

  tbody: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-border" {...props}>
      {children}
    </tbody>
  ),

  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-muted/30 transition-colors" {...props}>
      {children}
    </tr>
  ),

  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap"
      {...props}
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3 text-muted-foreground" {...props}>
      {children}
    </td>
  ),
}
