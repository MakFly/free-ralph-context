'use client'

import { Settings } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAiStore } from '@/stores/ai-store'
import { Badge } from '@/components/ui/badge'

export function LlmConfigButton() {
  const { llmConfigs } = useAiStore()

  const activeCount = llmConfigs.filter((c) => c.is_active).length

  return (
    <Link
      to="/settings"
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Settings className="w-4 h-4" />
      <span>Config LLM</span>
      {activeCount > 0 && (
        <Badge variant="secondary" className="ml-1 text-xs">
          {activeCount}
        </Badge>
      )}
    </Link>
  )
}
