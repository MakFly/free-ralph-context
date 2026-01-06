'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  FileJson,
  GitBranch,
  Terminal,
  Users,
  Zap,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MultiAgentPage() {
  return (
    <AppLayout title="Multi-Agent Orchestration">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Multi-Agent Orchestration
            </h1>
            <p className="text-muted-foreground mt-2">
              Exécution parallèle d'agents sans LLM - Détection intelligente de
              tâches complexes
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <GitBranch className="h-4 w-4" />
            v2.0
          </Badge>
        </div>

        <Separator />

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mode</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Hybride</div>
              <p className="text-xs text-muted-foreground mt-1">
                Parallèle + Séquentiel
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground mt-1">
                swe-scout × 2 + general-purpose
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Durée estimée
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45s</div>
              <p className="text-xs text-muted-foreground mt-1">
                vs ~60s séquentiel (25% gain)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comment ça marche ?</CardTitle>
                <CardDescription>
                  Le système détecte automatiquement quand lancer plusieurs
                  agents en parallèle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Détection sans LLM</p>
                      <p className="text-sm text-muted-foreground">
                        Patterns regex + registre de projets connus = décision
                        en &lt;10ms
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Exécution parallèle</p>
                      <p className="text-sm text-muted-foreground">
                        Plusieurs agents travaillent simultanément sur des
                        sous-tâches
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Agrégation intelligente</p>
                      <p className="text-sm text-muted-foreground">
                        Les résultats sont combinés pour une réponse cohérente
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Exemple de flux</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
                    <p className="text-green-600">
                      $ User: "Explique l'auth d'iautos"
                    </p>
                    <p className="text-blue-600">
                      → ralph_orchestrate détecte: projet "iautos" + trigger
                      "explique"
                    </p>
                    <p className="text-purple-600">
                      → Plan généré: 2 parallèles + 1 séquentiel
                    </p>
                    <p className="text-yellow-600">
                      → Claude lance les agents...
                    </p>
                    <p className="text-orange-600">
                      {' '}
                      ├─ swe-scout: Locate iautos
                    </p>
                    <p className="text-orange-600">
                      {' '}
                      ├─ swe-scout: Search auth
                    </p>
                    <p className="text-orange-600">
                      {' '}
                      └─ general-purpose: Analyze auth (après les 2 premiers)
                    </p>
                    <p className="text-green-600">→ Résultat agrégé en 45s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Architecture du système</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="h-4 w-4" />
                      <h4 className="font-semibold">1. Détection</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Le moteur analyse le message avec 3 règles :
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Projet connu détecté ? (iautos, ralph, etc.)</li>
                      <li>Pattern trigger match ? (explain, analyze, etc.)</li>
                      <li>Hors du projet actuel ?</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Code2 className="h-4 w-4" />
                      <h4 className="font-semibold">2. Planification</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Génération de l'ExecutionPlan :
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>
                        <code>parallel_tasks</code>: agents indépendants
                      </li>
                      <li>
                        <code>sequential_tasks</code>: agents avec dépendances
                      </li>
                      <li>
                        <code>ralph_tools</code>: outils MCP à utiliser
                      </li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      <h4 className="font-semibold">3. Exécution</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Claude lit le plan et lance les agents :
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>
                        Parallèle: <code>Promise.all()</code> des tâches
                      </li>
                      <li>
                        Séquentiel: <code>for await</code> avec dépendances
                      </li>
                      <li>Agrégation: résultats combinés</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scénarios d'utilisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge>HYBRIDE</Badge>
                      <code className="text-xs">Explique l'auth d'iautos</code>
                    </div>
                    <p className="text-sm mt-2">
                      <strong>2 parallèles:</strong> locate project + search
                      auth
                      <br />
                      <strong>1 séquentiel:</strong> analyze auth (dépend des 2
                      premiers)
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge>PARALLEL</Badge>
                      <code className="text-xs">
                        How does ralph handle context
                      </code>
                    </div>
                    <p className="text-sm mt-2">
                      <strong>2 parallèles:</strong> locate + explore
                      <br />
                      <strong>0 séquentiel:</strong> exploration pure
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">SINGLE</Badge>
                      <code className="text-xs">Fix typo on line 42</code>
                    </div>
                    <p className="text-sm mt-2">
                      <strong>Pas de multi-agent:</strong> tâche simple = 1
                      agent (snipper)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Configuration: ~/.ralph/projects.json
                </CardTitle>
                <CardDescription>
                  Définissez vos projets connus pour la détection automatique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`{
  "iautos": {
    "path": "/path/to/iautos",
    "aliases": ["crm", "auto"],
    "description": "CRM automobile"
  },
  "ralph": {
    "path": "/path/to/ralph",
    "aliases": ["context", "mcp"],
    "description": "Context management"
  }
}`}</pre>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <strong>Champs :</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      <code>path</code>: Chemin absolu (optionnel)
                    </li>
                    <li>
                      <code>aliases</code>: Noms alternatifs
                    </li>
                    <li>
                      <code>keywords</code>: Patterns regex
                    </li>
                    <li>
                      <code>description</code>: Contexte
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patterns Trigger</CardTitle>
                <CardDescription>
                  Ces patterns déclenchent le mode multi-agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-mono">explain</span>
                    <span className="text-muted-foreground">
                      project_switch
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-mono">analyze</span>
                    <span className="text-muted-foreground">
                      project_switch
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-mono">explique (FR)</span>
                    <span className="text-muted-foreground">
                      project_switch
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-mono">compare X and Y</span>
                    <span className="text-muted-foreground">
                      cross_project_compare
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono">explain.*auth</span>
                    <span className="text-muted-foreground">
                      multi_aspect_analysis
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
