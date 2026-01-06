import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LlmSettingsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 4 provider skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-lg border border-dashed"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}

        {/* Help text skeleton */}
        <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
          <Skeleton className="h-4 w-56 mb-2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6 mt-2" />
        </div>
      </CardContent>
    </Card>
  )
}
