import { createFileRoute } from '@tanstack/react-router'
import { MultiAgentPage } from '@/components/pages/multi-agent-page'

export const Route = createFileRoute('/multi-agent')({
  component: MultiAgentPage,
})
