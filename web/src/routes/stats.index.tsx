import { createFileRoute } from '@tanstack/react-router'
import {
  BarChart3Icon,
  TrendingUpIcon,
  PieChartIcon,
  CalendarIcon,
  BrainIcon,
  ActivityIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/stats/')({
  component: StatsPlaceholder,
})

function StatsPlaceholder() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground">
            Track your usage and activity patterns
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <BarChart3Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  We're building detailed analytics and insights
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Statistics will help you understand your usage patterns:
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              <li className="flex items-start gap-2">
                <ActivityIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Track search activity and most used queries</span>
              </li>
              <li className="flex items-start gap-2">
                <BrainIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Monitor memory creation and growth over time</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUpIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Visualize context usage and engagement</span>
              </li>
              <li className="flex items-start gap-2">
                <CalendarIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Daily, weekly, and monthly activity reports</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* What to expect */}
        <div>
          <h2 className="text-xl font-semibold mb-4">What to Expect</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <PieChartIcon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Usage Overview</CardTitle>
                <CardDescription>
                  See how you're using Free Context with intuitive charts
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUpIcon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Activity Trends</CardTitle>
                <CardDescription>
                  Track your activity patterns over time
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3Icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Detailed Reports</CardTitle>
                <CardDescription>
                  Export and share detailed usage reports
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Metrics Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Metrics Preview</CardTitle>
            <CardDescription>
              Here's a preview of the metrics we'll track
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Total Memories</div>
                <div className="text-2xl font-bold">-</div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Total Contexts</div>
                <div className="text-2xl font-bold">-</div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Searches Today</div>
                <div className="text-2xl font-bold">-</div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Active Streak</div>
                <div className="text-2xl font-bold">-</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
