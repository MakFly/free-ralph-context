import { createFileRoute } from '@tanstack/react-router'
import { ProjectDetailPage } from '@/components/pages/project-detail-page'

export const Route = createFileRoute('/projects/$name')({
  component: ProjectDetailPage,
})
