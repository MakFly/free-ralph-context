"use client"

import * as React from "react"
import { Link } from "@tanstack/react-router"
import { IconInnerShadowTop } from "@tabler/icons-react"
import type { Icon } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavDocuments } from "@/components/nav-documents"
import { NavUser } from "@/components/nav-user"
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
  FolderKanbanIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SparklesIcon,
  NetworkIcon,
  FolderCodeIcon,
} from "lucide-react"

const data = {
  user: {
    name: "ContextFree",
    email: "contact@m7academy.com",
    avatar: "/avatars/m7.jpg",
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
      name: "Contexts",
      url: "/contexts",
      icon: FolderKanbanIcon,
    },
    {
      name: "Memories",
      url: "/memories",
      icon: BrainIcon,
    },
    {
      name: "Relationships",
      url: "/relationships",
      icon: NetworkIcon,
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
      name: "Stats",
      url: "/stats",
      icon: BarChart3Icon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                <span className="text-base font-semibold">ContextFree</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.content} title="Content" />
        <NavDocuments items={data.tools} title="Tools" />
        <NavDocuments items={data.analytics} title="Analytics" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
