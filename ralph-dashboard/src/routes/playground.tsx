import { createFileRoute } from '@tanstack/react-router'
import { PlaygroundPage } from '@/components/pages/playground-page'

export const Route = createFileRoute('/playground')({
  component: PlaygroundPage,
})
