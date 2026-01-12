"use client"

import * as React from "react"
import { Link } from "@tanstack/react-router"
import { IconInnerShadowTop } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavDocuments } from "@/components/nav-documents"
import { NavUser } from "@/components/nav-user"
import { StatusCard } from "@/components/status-card"
import { SynthesisProviderBadge } from "@/components/synthesis-badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BarChart3Icon,
  BrainIcon,
  CalendarIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SparklesIcon,
  FolderCodeIcon,
  HelpCircleIcon,
  SettingsIcon,
  GitCompareArrowsIcon,
  MonitorIcon,
  FlaskConicalIcon,
} from "lucide-react"
import { useNexusStore } from "@/stores/nexusStore"

const data = {
  user: {
    name: "nexus",
    email: "contact@acme.fr",
    avatar: "/avatars/nexus-github.png",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Search",
      url: "/search",
      icon: SearchIcon,
    },
  ],
  content: [
    {
      name: "Memories",
      url: "/memories",
      icon: BrainIcon,
    },
  ],
  tools: [
    {
      name: "Automation",
      url: "/automation",
      icon: SparklesIcon,
    },
    {
      name: "Codebase",
      url: "/codebase",
      icon: FolderCodeIcon,
    },
  ],
  analytics: [
    {
      name: "Sessions",
      url: "/sessions",
      icon: MonitorIcon,
    },
    {
      name: "History",
      url: "/sessions-history",
      icon: CalendarIcon,
    },
    {
      name: "Stats",
      url: "/stats",
      icon: BarChart3Icon,
    },
    {
      name: "Playground",
      url: "/playground",
      icon: FlaskConicalIcon,
    },
  ],
  footer: [
    {
      name: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
    {
      name: "Help",
      url: "/help",
      icon: HelpCircleIcon,
    },
    {
      name: "Changelog",
      url: "/changelog",
      icon: GitCompareArrowsIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { projects, fetchProjects } = useNexusStore()

  // Load projects on mount
  React.useEffect(() => {
    fetchProjects()
  }, [])

  // Build tools with project count badge on Codebase
  const toolsWithBadge = React.useMemo(() => {
    return data.tools.map((item) => {
      if (item.name === 'Codebase') {
        return { ...item, badge: projects.length }
      }
      return item
    })
  }, [projects.length])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">nexus</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.content} title="Content" />
        <NavDocuments items={toolsWithBadge} title="Tools" />
        <NavDocuments items={data.analytics} title="Analytics" />
      </SidebarContent>
      <SidebarFooter>
        <NavDocuments items={data.footer} title="" />
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">Synthesis</span>
          <SynthesisProviderBadge />
        </div>
        <StatusCard />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
