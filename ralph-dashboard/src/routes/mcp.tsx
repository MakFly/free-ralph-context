import { createFileRoute, redirect } from '@tanstack/react-router'

// Redirect /mcp to /guide (consolidated page)
export const Route = createFileRoute('/mcp')({
  beforeLoad: () => {
    throw redirect({ to: '/guide' })
  },
})
