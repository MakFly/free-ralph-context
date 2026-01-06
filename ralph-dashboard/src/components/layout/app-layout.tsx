'use client'

import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  ChevronDown,
  Database,
  FolderOpen,
  GitBranch,
  HelpCircle,
  History,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  RefreshCw,
  Settings,
  WifiOff,
  Zap,
} from 'lucide-react'
import { NotificationBell } from './notification-bell'
import { refreshRalphStatus, useRalphData } from '@/stores/ralph-store'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { llmStatus } = useRalphData()

  const navMain = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Guide', url: '/guide', icon: BookOpen },
    { title: 'Multi-Agent', url: '/multi-agent', icon: GitBranch },
    { title: 'Projects', url: '/projects', icon: FolderOpen },
    { title: 'Playground', url: '/playground', icon: Activity },
    { title: 'Memories', url: '/memories', icon: Database },
    { title: 'Checkpoints', url: '/checkpoints', icon: Archive },
    { title: 'Metrics', url: '/metrics', icon: BarChart3 },
    { title: 'Changelog', url: '/changelog', icon: History },
  ]

  const docSections = [
    {
      title: 'Reference',
      items: [
        { title: 'API Reference', url: '/docs/api/rest' },
        { title: 'SSE Events', url: '/docs/api/sse' },
        { title: 'Architecture', url: '/docs/advanced/architecture' },
        { title: 'Troubleshooting', url: '/docs/advanced/troubleshooting' },
      ],
    },
  ]

  const navSecondary = [
    { title: 'Settings', url: '/settings', icon: Settings },
    { title: 'Help', url: '/help', icon: HelpCircle },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <Brain className="!size-5 text-violet-500" />
                <span className="text-base font-bold font-mono bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  RALPH
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-1">
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={currentPath === item.url}
                  >
                    <Link to={item.url} className="relative">
                      <item.icon
                        className={cn(
                          currentPath === item.url && 'text-violet-500',
                        )}
                      />
                      <span>{item.title}</span>
                      {(item as any).badge && (
                        <Badge className="ml-auto h-5 px-1.5 text-xs bg-amber-500 text-white hover:bg-amber-600">
                          {(item as any).badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Documentation Dropdown */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Documentation"
                      isActive={currentPath.startsWith('/docs')}
                    >
                      <BookOpen
                        className={cn(
                          currentPath.startsWith('/docs') && 'text-violet-500',
                        )}
                      />
                      <span>Documentation</span>
                      <ChevronDown className="ml-auto opacity-50" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    align="start"
                    className="min-w-56"
                  >
                    {docSections.map((section) => (
                      <React.Fragment key={section.title}>
                        <DropdownMenuLabel>{section.title}</DropdownMenuLabel>
                        {section.items.map((item) => (
                          <DropdownMenuItem key={item.url} asChild>
                            <Link
                              to={item.url}
                              className={cn(
                                currentPath === item.url &&
                                  'bg-violet-500/10 text-violet-500',
                              )}
                            >
                              {item.title}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                      </React.Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-mono font-bold">
                      R
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium font-mono">
                      Ralph v2
                    </span>
                    <span
                      className={cn(
                        'truncate text-xs flex items-center gap-1',
                        llmStatus?.connected
                          ? 'text-emerald-500'
                          : 'text-muted-foreground',
                      )}
                    >
                      {llmStatus?.connected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                      {llmStatus?.model || 'Loading...'}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-mono font-bold">
                        R
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Ralph MCP</span>
                      <span className="text-muted-foreground truncate text-xs">
                        Context Memory Manager
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Bell />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

// ═══════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════

function SiteHeader({ title }: { title: string }) {
  const { sseConnected, llmStatus } = useRalphData()
  const refresh = refreshRalphStatus

  // DISABLED: LLM status fetch causing issues
  // // Fetch LLM status on mount
  // React.useEffect(() => {
  //   fetchLLMStatus()
  //   // Refresh every 60 seconds
  //   const interval = setInterval(fetchLLMStatus, 60000)
  //   return () => clearInterval(interval)
  // }, [])

  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <h1 className="text-base font-medium font-mono">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {sseConnected ? (
            <Badge
              variant="outline"
              className="gap-1.5 px-2 py-1 border-emerald-500/50 text-emerald-500"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="w-3 h-3" />
              OFFLINE
            </Badge>
          )}
          <NotificationBell />
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            className="h-8 w-8"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

// ═══════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════

function SiteFooter() {
  const { llmStatus } = useRalphData()

  // LLM status polling is now handled globally in the store

  return (
    <footer className="border-t py-2 px-4 lg:px-6 bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500">
            <Brain className="w-3 h-3" />
            Ralph v2
          </span>
          {llmStatus ? (
            <span
              className={cn(
                'flex items-center gap-1.5',
                llmStatus.connected
                  ? 'text-emerald-500'
                  : 'text-muted-foreground/60',
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  llmStatus.connected
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground',
                )}
              />
              {llmStatus.connected ? (
                // New format with providers array
                'providers' in llmStatus ? (
                  <>
                    {llmStatus.count} LLM{llmStatus.count > 1 ? 's' : ''}{' '}
                    configuré{llmStatus.count > 1 ? 's' : ''}
                  </>
                ) : (
                  // Old format fallback
                  <>
                    {llmStatus.provider}/{llmStatus.model}
                  </>
                )
              ) : (
                // Not connected (404 or error)
                <>0 LLM configuré</>
              )}
              {llmStatus.latencyMs && (
                <span className="text-muted-foreground/60 ml-1">
                  ({llmStatus.latencyMs}ms)
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground/60">
              Loading LLM status...
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-500" />
          Polling 10s
        </span>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════

export function AppLayout({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 64)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
