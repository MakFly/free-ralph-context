import { createFileRoute } from '@tanstack/react-router'
import { GuidePage } from '@/components/pages/guide-page'

export const Route = createFileRoute('/guide')({
  component: GuidePage,
})
