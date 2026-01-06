import { createFileRoute } from '@tanstack/react-router'
import { CheckpointsPage } from '@/components/pages/checkpoints-page'

export const Route = createFileRoute('/checkpoints')({
  component: CheckpointsPage,
})
