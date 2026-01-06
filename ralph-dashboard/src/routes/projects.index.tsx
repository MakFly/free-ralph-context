import { createFileRoute } from '@tanstack/react-router'
import { ProjectsPage } from '@/components/pages/projects-page'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})
