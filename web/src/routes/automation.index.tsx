import { createFileRoute } from '@tanstack/react-router'
import {
  SparklesIcon,
  ZapIcon,
  ClockIcon,
  ArrowRightIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/automation/')({
  component: AutomationPlaceholder,
})

function AutomationPlaceholder() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">
            Automate repetitive tasks and workflows
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <SparklesIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  We're working on powerful automation features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Automation will help you save time by automatically:
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              <li className="flex items-start gap-2">
                <ZapIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Auto-saving important conversations</span>
              </li>
              <li className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Scheduling regular context maintenance</span>
              </li>
              <li className="flex items-start gap-2">
                <SparklesIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Detecting relationships between memories</span>
              </li>
              <li className="flex items-start gap-2">
                <ZapIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Smart search with query expansion</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* What to expect */}
        <div>
          <h2 className="text-xl font-semibold mb-4">What to Expect</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auto-Context</CardTitle>
                <CardDescription>
                  Automatically detect and create contexts from conversations
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auto-Save</CardTitle>
                <CardDescription>
                  Intelligently save important information without manual input
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Smart Search</CardTitle>
                <CardDescription>
                  Enhanced search with query expansion and semantic matching
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auto-Relationships</CardTitle>
                <CardDescription>
                  Automatically discover and create links between related memories
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Want to help shape the future?</h3>
                <p className="text-sm text-muted-foreground">
                  We're actively developing these features. Your feedback matters!
                </p>
              </div>
              <Button variant="outline">
                Give Feedback
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
