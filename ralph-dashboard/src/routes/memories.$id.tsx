import { createFileRoute } from '@tanstack/react-router'
import { MemoryDetailPage } from '@/components/pages/memory-detail-page'

export const Route = createFileRoute('/memories/$id')({
  component: () => {
    const { id } = Route.useParams()
    return <MemoryDetailPage memoryId={id} />
  },
})
