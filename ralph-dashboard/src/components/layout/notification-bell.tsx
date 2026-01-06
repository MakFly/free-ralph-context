'use client'

import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Info,
  Trash2,
  X,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'

import type { MCPStatus, Notification } from '@/stores/ralph-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRalphStore } from '@/stores/ralph-store'
import { cn } from '@/lib/utils'

const notificationIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
}

const notificationColors = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  success: 'text-emerald-500',
  info: 'text-blue-500',
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const Icon = notificationIcons[notification.type]
  const colorClass = notificationColors[notification.type]

  const timeAgo = React.useMemo(() => {
    const date = new Date(notification.timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }, [notification.timestamp])

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50',
        !notification.read && 'bg-muted/30',
      )}
      onClick={() => onRead(notification.id)}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', colorClass)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'font-medium text-sm',
              !notification.read && 'text-foreground',
            )}
          >
            {notification.title}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {timeAgo}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />
      )}
    </div>
  )
}

export function NotificationBell() {
  const { notifications, mcpStatus, markNotificationRead, clearNotifications } =
    useRalphStore()
  const [open, setOpen] = React.useState(false)
  const prevMcpStatusRef = React.useRef<MCPStatus | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Show toast when new notification arrives
  React.useEffect(() => {
    if (notifications.length === 0) return

    const latestNotification = notifications[0]
    // Only show toast for unread notifications that just arrived
    if (!latestNotification.read) {
      const timeSinceCreation =
        Date.now() - new Date(latestNotification.timestamp).getTime()
      // Only toast if created within the last 2 seconds (new notification)
      if (timeSinceCreation < 2000) {
        const toastFn =
          latestNotification.type === 'error'
            ? toast.error
            : latestNotification.type === 'success'
              ? toast.success
              : latestNotification.type === 'warning'
                ? toast.warning
                : toast.info

        toastFn(latestNotification.title, {
          description: latestNotification.message,
          duration: 5000,
        })
      }
    }
  }, [notifications])

  // Show toast for MCP status changes
  React.useEffect(() => {
    if (!mcpStatus) return

    const prevStatus = prevMcpStatusRef.current
    prevMcpStatusRef.current = mcpStatus

    // Only show toast if this is a status change, not initial load
    if (prevStatus === null) return

    if (prevStatus.connected && !mcpStatus.connected) {
      toast.error('MCP Server Down', {
        description: mcpStatus.error || 'MCP server is not responding',
        duration: 10000,
      })
    } else if (!prevStatus.connected && mcpStatus.connected) {
      toast.success('MCP Server Online', {
        description: `${mcpStatus.tools_count} tools available`,
        duration: 5000,
      })
    }
  }, [mcpStatus])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'bg-background border border-border shadow-lg',
            title: 'text-foreground',
            description: 'text-muted-foreground',
            error: 'border-red-500/50',
            success: 'border-emerald-500/50',
            warning: 'border-amber-500/50',
            info: 'border-blue-500/50',
          },
        }}
      />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative h-8 w-8">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-red-500 hover:bg-red-500 text-white border-0">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault()
                  clearNotifications()
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col gap-1 p-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markNotificationRead}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* MCP Status Footer */}
          <DropdownMenuSeparator />
          <div className="p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">MCP Server</span>
              <span
                className={cn(
                  'flex items-center gap-1.5 font-medium',
                  mcpStatus?.connected ? 'text-emerald-500' : 'text-red-500',
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    mcpStatus?.connected ? 'bg-emerald-500' : 'bg-red-500',
                  )}
                />
                {mcpStatus?.connected
                  ? `Online (${mcpStatus.tools_count} tools)`
                  : 'Offline'}
              </span>
            </div>
            {mcpStatus?.error && (
              <p
                className="text-xs text-red-500 mt-1 truncate"
                title={mcpStatus.error}
              >
                {mcpStatus.error}
              </p>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
