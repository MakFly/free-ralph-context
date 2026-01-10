import { createFileRoute } from '@tanstack/react-router'
import {
  FolderCodeIcon,
  FileCodeIcon,
  SearchIcon,
  DatabaseIcon,
  GitBranchIcon,
  ArrowRightIcon,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/codebase/')({
  component: CodebasePlaceholder,
})

function CodebasePlaceholder() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Codebase</h1>
          <p className="text-muted-foreground">
            Index and search through your codebase
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FolderCodeIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  We're building a powerful code indexing system
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The Codebase feature will enable you to:
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              <li className="flex items-start gap-2">
                <FolderCodeIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Index your entire codebase automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <SearchIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Search code with semantic understanding</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCodeIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Find specific files and functions instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <DatabaseIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>Store code snippets as searchable memories</span>
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
                <CardTitle className="text-base">Smart Indexing</CardTitle>
                <CardDescription>
                  Automatically parse and index code files with language detection
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Code Search</CardTitle>
                <CardDescription>
                  Search through code with support for regex, symbols, and semantic queries
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Function Navigation</CardTitle>
                <CardDescription>
                  Jump to specific functions, classes, and definitions
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Git Integration</CardTitle>
                <CardDescription>
                  Track code changes and history with git blame support
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Use Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Use Cases</CardTitle>
            <CardDescription>
              Perfect for developers who want to:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-2">
              <li className="flex items-center gap-2">
                <GitBranchIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Understand legacy codebases quickly</span>
              </li>
              <li className="flex items-center gap-2">
                <FileCodeIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Find implementation patterns</span>
              </li>
              <li className="flex items-center gap-2">
                <SearchIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Locate specific functions or classes</span>
              </li>
              <li className="flex items-center gap-2">
                <DatabaseIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Create memories from code snippets</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
