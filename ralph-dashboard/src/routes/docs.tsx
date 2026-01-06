import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'

export const Route = createFileRoute('/docs')({
  component: () => (
    <AppLayout title="Documentation">
      <Outlet />
    </AppLayout>
  ),
})
