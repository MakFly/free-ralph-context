'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { LlmSettingsCard } from '@/components/ai/llm-settings-card'
import { SettingsCardSkeleton } from '@/components/skeletons/settings-skeleton'

export function SettingsPage() {
  return (
    <AppLayout title="Paramètres">
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground mt-2">
            Configurez les fournisseurs LLM et les préférences du dashboard
          </p>
        </div>

        <React.Suspense fallback={<SettingsCardSkeleton />}>
          <LlmSettingsCard />
        </React.Suspense>
      </div>
    </AppLayout>
  )
}
