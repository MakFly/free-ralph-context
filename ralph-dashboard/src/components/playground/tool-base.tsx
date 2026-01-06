import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ToolCardProps {
  icon: LucideIcon
  title: string
  description: string
  isLoading: boolean
  loadingTool: string | null
  toolName: string
  onRun: () => void
  children: ReactNode
}

export function ToolCard({
  icon: Icon,
  title,
  description,
  isLoading,
  loadingTool,
  toolName,
  onRun,
  children,
}: ToolCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Button onClick={onRun} disabled={isLoading} size="sm">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}
