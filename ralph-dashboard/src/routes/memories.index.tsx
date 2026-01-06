import { createFileRoute } from '@tanstack/react-router'
import { MemoriesPage } from '@/components/pages/memories-page'

export const Route = createFileRoute('/memories/')({ component: MemoriesPage })
