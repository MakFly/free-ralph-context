// Preload functions for MDX chunks
// Each function triggers the lazy import to preload the chunk

const preloaders: Record<string, () => Promise<unknown>> = {
  '/docs': () => import('../../docs/index.mdx'),
  '/docs/installation': () => import('../../docs/installation.mdx'),
  '/docs/quickstart': () => import('../../docs/quickstart.mdx'),
  '/docs/concepts/context': () => import('../../docs/concepts/context.mdx'),
  '/docs/concepts/memory': () => import('../../docs/concepts/memory.mdx'),
  '/docs/concepts/checkpoints': () =>
    import('../../docs/concepts/checkpoints.mdx'),
  '/docs/concepts/spawning': () => import('../../docs/concepts/spawning.mdx'),
  '/docs/features/monitoring': () =>
    import('../../docs/features/monitoring.mdx'),
  '/docs/features/projects': () => import('../../docs/features/projects.mdx'),
  '/docs/features/search': () => import('../../docs/features/search.mdx'),
  '/docs/features/metrics': () => import('../../docs/features/metrics.mdx'),
  '/docs/api/mcp-tools': () => import('../../docs/api/mcp-tools.mdx'),
  '/docs/api/sse': () => import('../../docs/api/sse.mdx'),
  '/docs/api/rest': () => import('../../docs/api/rest.mdx'),
  '/docs/config/env': () => import('../../docs/config/env.mdx'),
  '/docs/config/dashboard': () => import('../../docs/config/dashboard.mdx'),
  '/docs/config/ralph': () => import('../../docs/config/ralph.mdx'),
  '/docs/advanced/architecture': () =>
    import('../../docs/advanced/architecture.mdx'),
  '/docs/advanced/performance': () =>
    import('../../docs/advanced/performance.mdx'),
  '/docs/advanced/troubleshooting': () =>
    import('../../docs/advanced/troubleshooting.mdx'),
}

// Cache to avoid duplicate preloads
const preloaded = new Set<string>()

export function preloadDoc(path: string): void {
  if (preloaded.has(path)) return

  const preloader = preloaders[path]
  if (preloader) {
    preloaded.add(path)
    preloader()
  }
}

// Preload multiple docs (e.g., prev + next)
export function preloadDocs(paths: Array<string>): void {
  paths.forEach(preloadDoc)
}
