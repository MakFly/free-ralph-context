'use client'

import * as React from 'react'
import { Prose } from '@/components/ui/prose'

// Re-export mdxComponents from mdx-components.tsx
export { mdxComponents } from './mdx-components'

interface DocWrapperProps {
  children: React.ReactNode
  currentPath?: string
}

export function DocWrapper({ children, currentPath }: DocWrapperProps) {
  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <Prose>{children}</Prose>
      </div>
    </div>
  )
}
