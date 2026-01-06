import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/memories')({
  component: MemoriesLayout,
})

function MemoriesLayout() {
  return <Outlet />
}
