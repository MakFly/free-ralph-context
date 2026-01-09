import { createFileRoute } from '@tanstack/react-router'
import {
  NetworkIcon,
  LinkIcon,
  GitBranchIcon,
  ArrowRightIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/relationships/')({
  component: RelationshipsPlaceholder,
})

function RelationshipsPlaceholder() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relationships</h1>
          <p className="text-muted-foreground">
            Visualize connections between your memories and contexts
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <NetworkIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  We're building an interactive relationship graph
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The Relationships feature will help you:
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              <li className="flex items-start gap-2">
                <LinkIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Visualize connections between related memories</span>
              </li>
              <li className="flex items-start gap-2">
                <GitBranchIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Explore context hierarchies and dependencies</span>
              </li>
              <li className="flex items-start gap-2">
                <NetworkIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Discover hidden patterns in your knowledge</span>
              </li>
              <li className="flex items-start gap-2">
                <LinkIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Navigate through related content seamlessly</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Mockup Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Graph Preview</CardTitle>
            <CardDescription>
              Here's a preview of what the relationship graph will look like
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <NetworkIcon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Interactive graph visualization coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Planned Features</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auto-Discovery</CardTitle>
                <CardDescription>
                  Automatically find and create relationships based on content similarity
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manual Links</CardTitle>
                <CardDescription>
                  Create custom connections between any memories or contexts
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visual Navigation</CardTitle>
                <CardDescription>
                  Click and navigate through your knowledge graph interactively
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
