import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import * as React from 'react'

export function SiteHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentPath, setCurrentPath] = React.useState<string[]>([])

  React.useEffect(() => {
    // Get current path and create breadcrumbs
    const path = location.pathname
    if (path === '/' || path === '/dashboard') {
      setCurrentPath([])
    } else {
      const segments = path.split('/').filter(Boolean)
      setCurrentPath(segments)
    }
  }, [location.pathname])

  const formatBreadcrumbName = (segment: string): string => {
    const names: Record<string, string> = {
      // 'formations': 'Formations',
      // 'dashboard': 'Tableau de bord',
      // 'settings': 'Paramètres',
      // 'abonnements': 'Abonnements',
      // 'facturation': 'Facturation',
      // 'help': 'Aide',
      // 'sonner': 'Sonner',
    }
    return names[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  const getBreadcrumbPath = (index: number) => {
    const segments = currentPath.slice(0, index + 1)
    return '/' + segments.join('/')
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
        />

        {/* Breadcrumbs */}
        {currentPath.length > 0 ? (
          <nav className="flex items-center gap-1 text-sm">
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Tableau de bord
            </button>
            {currentPath.map((segment, index) => (
              <React.Fragment key={segment}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                {index === currentPath.length - 1 ? (
                  <span className="font-medium text-foreground">
                    {formatBreadcrumbName(segment)}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate({ to: getBreadcrumbPath(index) })}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {formatBreadcrumbName(segment)}
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <h1 className="text-base font-medium">ContextFree</h1>
        )}

        <div className="ml-auto flex items-center gap-2">
        </div>
      </div>
    </header>
  )
}
