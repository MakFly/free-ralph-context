import { createFileRoute } from '@tanstack/react-router'
import {
  Brain,
  Search,
  Sparkles,
  Layers,
  Zap,
  BookOpen,
  Code,
  Lightbulb,
  CheckCircle,
  ChevronRight,
  FolderTree,
  Settings,
  Database,
  Eye,
  PlayCircle,
  PauseCircle,
  ExternalLink,
  Github,
  Shield,
  Workflow,
  Server,
  AlertCircle,
  Package,
  TrendingDown,
  BarChart3,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as React from 'react'

export const Route = createFileRoute('/help/')({
  component: HelpPage,
})

function HelpPage() {
  const [openDialog, setOpenDialog] = React.useState<string | null>(null)

  const HelpCard = ({
    id,
    icon: Icon,
    iconColor,
    title,
    subtitle,
    children,
    className = '',
  }: {
    id: string
    icon: React.ComponentType<{ className?: string }>
    iconColor: string
    title: string
    subtitle: string
    children: React.ReactNode
    className?: string
  }) => (
    <Dialog open={openDialog === id} onOpenChange={(open) => setOpenDialog(open ? id : null)}>
      <DialogTrigger asChild>
        <button
          className={`w-full border rounded-lg p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div>{title}</div>
              <p className="text-sm font-normal text-muted-foreground">{subtitle}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  )

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 pb-12">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Help & Documentation</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Guide complet pour Nexus - Memory-Powered Development System v0.0.2
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-6">
          {/* What is Nexus */}
          <HelpCard
            id="what-is-nexus"
            icon={Brain}
            iconColor="bg-primary/10 text-primary"
            title="Qu'est-ce que Nexus ?"
            subtitle="Memory-Powered Development System v0.0.2 • ISO claude-mem Complete"
            className="col-span-1 md:col-span-2 xl:col-span-3 bg-primary/5 hover:bg-primary/10 border-primary/20"
          >
            <div className="space-y-4">
              <p className="text-sm">
                Nexus est un système de gestion de connaissances pour développeurs qui combine recherche, mémoire et automation :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                  <Search className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm">Recherche</strong>
                    <p className="text-xs text-muted-foreground">FTS5 + Sémantique + Grep</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                  <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm">Mémoires</strong>
                    <p className="text-xs text-muted-foreground">Progressive Disclosure</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm">Patterns</strong>
                    <p className="text-xs text-muted-foreground">Réutilisables</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                  <Workflow className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm">Automation</strong>
                    <p className="text-xs text-muted-foreground">Hooks + Watcher</p>
                  </div>
                </div>
              </div>
            </div>
          </HelpCard>

          {/* Progressive Disclosure */}
          <HelpCard
            id="progressive"
            icon={Layers}
            iconColor="bg-blue-500/10 text-blue-500"
            title="Progressive Disclosure"
            subtitle="3 tiers • Économie 10-20x"
          >
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Système en 3 niveaux pour minimiser la consommation de tokens
              </p>
              <div className="space-y-2">
                <div className="flex gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Index Compact</h4>
                    <p className="text-xs text-muted-foreground">~50 tokens/item - IDs + scores</p>
                    <Badge variant="outline" className="mt-1 text-xs">memory recall, code search</Badge>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Contexte Riche</h4>
                    <p className="text-xs text-muted-foreground">~150 tokens - Résumés + métadonnées</p>
                    <Badge variant="outline" className="mt-1 text-xs">memory timeline</Badge>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Contenu Complet</h4>
                    <p className="text-xs text-muted-foreground">~500+ tokens/item - Narratives complètes</p>
                    <Badge variant="outline" className="mt-1 text-xs">memory get, learn templates</Badge>
                  </div>
                </div>
              </div>
            </div>
          </HelpCard>

          {/* Token Savings Benchmark */}
          <HelpCard
            id="token-savings"
            icon={TrendingDown}
            iconColor="bg-emerald-500/10 text-emerald-500"
            title="Token Savings Benchmark"
            subtitle="Preuve mesurable de l'economie • 82% verifie"
            className="col-span-1 md:col-span-2 xl:col-span-3 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
          >
            <div className="space-y-6">
              {/* Headline */}
              <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-4xl font-bold text-emerald-600 mb-1">82%</div>
                <div className="text-sm text-muted-foreground">d'economie de tokens mesuree</div>
                <div className="text-xs text-muted-foreground mt-1">3,490 → 625 tokens sur fichier reel de 509 lignes</div>
              </div>

              {/* Test A/B */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4" />
                  Test A/B Concret
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Test A */}
                  <div className="p-4 rounded-lg border bg-red-500/5 border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Test A</Badge>
                      <span className="font-semibold text-sm">Methode Traditionnelle</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2 rounded bg-muted/50">
                        <span>1. Grep (recherche)</span>
                        <span className="font-mono">~50 tokens</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-muted/50">
                        <span>2. Read (fichier complet 509 lignes)</span>
                        <span className="font-mono">~3,440 tokens</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-red-500/10 font-semibold">
                        <span>TOTAL</span>
                        <span className="font-mono text-red-600">~3,490 tokens</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Lit TOUT le fichier : types, templates, patterns, methodes non pertinentes...
                    </p>
                  </div>

                  {/* Test B */}
                  <div className="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Test B</Badge>
                      <span className="font-semibold text-sm">Methode Nexus MCP</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2 rounded bg-muted/50">
                        <span>1. nexus_code(search, semantic)</span>
                        <span className="font-mono">~80 tokens</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-muted/50">
                        <span>2. Lecture chunk cible (80 lignes)</span>
                        <span className="font-mono">~545 tokens</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-emerald-500/10 font-semibold">
                        <span>TOTAL</span>
                        <span className="font-mono text-emerald-600">~625 tokens</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Lit UNIQUEMENT le chunk pertinent avec score 80%+
                    </p>
                  </div>
                </div>
              </div>

              {/* Visualisation */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Visualisation</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Methode Traditionnelle</span>
                      <span className="font-mono text-red-600">3,490 tokens (100%)</span>
                    </div>
                    <div className="h-6 rounded bg-red-500/20 w-full flex items-center px-2">
                      <div className="h-4 rounded bg-red-500 w-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Methode Nexus MCP</span>
                      <span className="font-mono text-emerald-600">625 tokens (18%)</span>
                    </div>
                    <div className="h-6 rounded bg-muted w-full flex items-center px-2">
                      <div className="h-4 rounded bg-emerald-500" style={{ width: '18%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scenario reel */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Scenario Reel : Comprendre 5 fonctions complexes
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 rounded border bg-red-500/5">
                    <div className="font-semibold text-red-600">Traditionnel</div>
                    <div className="text-lg font-bold mt-1">17,450</div>
                    <div className="text-muted-foreground">tokens</div>
                  </div>
                  <div className="p-3 rounded border bg-emerald-500/5">
                    <div className="font-semibold text-emerald-600">Nexus MCP</div>
                    <div className="text-lg font-bold mt-1">3,125</div>
                    <div className="text-muted-foreground">tokens</div>
                  </div>
                  <div className="p-3 rounded border bg-primary/5">
                    <div className="font-semibold text-primary">Economie</div>
                    <div className="text-lg font-bold mt-1">14,325</div>
                    <div className="text-muted-foreground">tokens sauves</div>
                  </div>
                </div>
              </div>

              {/* Pourquoi ca marche */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Pourquoi ca marche ?
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded border bg-muted/30 text-center">
                    <Search className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">Recherche Semantique</div>
                    <p className="text-muted-foreground mt-1">Trouve les parties pertinentes (80%+ score)</p>
                  </div>
                  <div className="p-3 rounded border bg-muted/30 text-center">
                    <Layers className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">Chunking Intelligent</div>
                    <p className="text-muted-foreground mt-1">Code decoupe en chunks de ~80 lignes</p>
                  </div>
                  <div className="p-3 rounded border bg-muted/30 text-center">
                    <Eye className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">Progressive Disclosure</div>
                    <p className="text-muted-foreground mt-1">Charge uniquement ce qui est necessaire</p>
                  </div>
                  <div className="p-3 rounded border bg-muted/30 text-center">
                    <Database className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">Index FTS5 + Embeddings</div>
                    <p className="text-muted-foreground mt-1">Recherche hybride ultra-rapide</p>
                  </div>
                </div>
              </div>

              {/* Methodologie */}
              <div className="p-3 rounded-lg border border-dashed bg-muted/20">
                <h4 className="font-semibold text-xs flex items-center gap-2 mb-2">
                  <Code className="h-3 w-3" />
                  Methodologie de mesure
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Fichier teste :</strong> <code>packages/search/src/synthesis/algo-synthesizer.ts</code></p>
                  <p><strong>Taille reelle :</strong> 13,958 caracteres / 509 lignes</p>
                  <p><strong>Calcul tokens :</strong> caracteres / 4 (approximation standard tokenizer)</p>
                  <p><strong>Chunk cible :</strong> lignes 151-230 (classe principale AlgoSynthesizer)</p>
                </div>
              </div>
            </div>
          </HelpCard>

          {/* MCP Tools */}
          <HelpCard
            id="mcp-tools"
            icon={Sparkles}
            iconColor="bg-purple-500/10 text-purple-500"
            title="Tools MCP"
            subtitle="Outils disponibles"
          >
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_code_search</code>
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" variant="secondary">keyword</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Recherche FTS5 avec BM25</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_code_open</code>
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" variant="secondary">file</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Lire le contenu d'un fichier</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_memory_recall</code>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">compact</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Index compact des mémoires</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_memory_get</code>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">full</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Contenu complet par IDs</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_memory_upsert</code>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">créer</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Créer ou mettre à jour une mémoire</p>
              </div>
              <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold text-green-600">nexus_memory_timeline</code>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">NEW</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Chronologie contextuelle autour d'une mémoire</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_learning_recall</code>
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20" variant="secondary">patterns</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Rappeler patterns applicables (max 3)</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_learning_getTemplates</code>
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20" variant="secondary">templates</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Récupérer templates complets (~2000 tokens)</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_learning_apply</code>
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20" variant="secondary">apply</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Appliquer un pattern (dry-run ou write)</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_learning_feedback</code>
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20" variant="secondary">feedback</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Enregistrer le résultat d'un pattern</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono font-semibold">nexus_repo_stats</code>
                  <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20" variant="secondary">stats</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Statistiques de l'index</p>
              </div>
            </div>
          </HelpCard>

          {/* API Endpoints */}
          <HelpCard
            id="api-endpoints"
            icon={FolderTree}
            iconColor="bg-orange-500/10 text-orange-500"
            title="API Endpoints"
            subtitle="REST API sur port 3001"
            className="col-span-1 md:col-span-2 xl:col-span-3"
          >
            {/* Légende des badges */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b text-xs">
              <div className="flex items-center gap-1">
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                <span className="text-muted-foreground">Implémenté</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20" variant="secondary">🚧</Badge>
                <span className="text-muted-foreground">Roadmap</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-xs">
              {/* Search - Roadmap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Recherche</div>
                  </div>
                  <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20" variant="secondary">🚧 Roadmap</Badge>
                </div>
                <div className="space-y-1 opacity-60">
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /search</code> <span className="text-muted-foreground">- Recherche FTS5 + BM25</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /search/semantic</code> <span className="text-muted-foreground">- Recherche sémantique</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /search/hybrid</code> <span className="text-muted-foreground">- Hybride (70% sem + 30% kw)</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /grep</code> <span className="text-muted-foreground">- Live grep (ripgrep)</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /open</code> <span className="text-muted-foreground">- Lire fichier</span></div>
                </div>
                <p className="text-xs text-orange-500 italic">Utilisez les tools MCP pour la recherche</p>
              </div>

              {/* Memories - Implemented */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Mémoires</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /memory/recall</code> <span className="text-muted-foreground">- Index compact</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /memory/batch</code> <span className="text-muted-foreground">- Contenu par IDs</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /memory/:id/timeline</code> <span className="text-muted-foreground">- Timeline</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /memory/:id</code> <span className="text-muted-foreground">- Détails mémoire</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /memory/:id</code> <span className="text-muted-foreground">- Créer</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">PATCH /memory/:id</code> <span className="text-muted-foreground">- Modifier</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">DELETE /memory/:id</code> <span className="text-muted-foreground">- Supprimer</span></div>
                </div>
              </div>

              {/* Patterns - Implemented */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Patterns</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-xs text-muted-foreground pt-1">Workflow</div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /patterns/capture</code> <span className="text-muted-foreground">- Capturer candidat</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /patterns/distill</code> <span className="text-muted-foreground">- Distiller en pattern</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /patterns/recall</code> <span className="text-muted-foreground">- Rappeler (max 3)</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /patterns/:id/templates</code> <span className="text-muted-foreground">- Templates (~2000 tok)</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /patterns/:id/apply</code> <span className="text-muted-foreground">- Appliquer pattern</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /patterns/:id/feedback</code> <span className="text-muted-foreground">- Feedback résultat</span></div>
                  <div className="font-semibold text-xs text-muted-foreground pt-1">CRUD</div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /patterns</code> <span className="text-muted-foreground">- Liste patterns</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /patterns/:id</code> <span className="text-muted-foreground">- Détail pattern</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /patterns</code> <span className="text-muted-foreground">- Créer pattern</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">PATCH /patterns/:id</code> <span className="text-muted-foreground">- Modifier</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">DELETE /patterns/:id</code> <span className="text-muted-foreground">- Supprimer</span></div>
                  <div className="font-semibold text-xs text-muted-foreground pt-1">Candidats</div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /patterns/candidates</code> <span className="text-muted-foreground">- Liste candidats</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /patterns/candidates/:id</code> <span className="text-muted-foreground">- Détail candidat</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">DELETE /patterns/candidates/:id</code> <span className="text-muted-foreground">- Supprimer candidat</span></div>
                </div>
              </div>

              {/* Projects - Implemented */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Projets</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /projects</code> <span className="text-muted-foreground">- Lister projets</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /projects/detect</code> <span className="text-muted-foreground">- Détecter par path</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /projects</code> <span className="text-muted-foreground">- Créer projet</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /projects/:id</code> <span className="text-muted-foreground">- Détails projet</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">PATCH /projects/:id</code> <span className="text-muted-foreground">- Modifier projet</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">DELETE /projects/:id</code> <span className="text-muted-foreground">- Supprimer projet</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /projects/:id/files</code> <span className="text-muted-foreground">- Arborescence</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /projects/:id/stats</code> <span className="text-muted-foreground">- Stats détaillées</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /projects/:id/reindex</code> <span className="text-muted-foreground">- Réindexer</span></div>
                </div>
              </div>

              {/* Automation - Implemented */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Automation</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /capture</code> <span className="text-muted-foreground">- Capturer observation</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /capture/batch</code> <span className="text-muted-foreground">- Capturer batch</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /capture/distill</code> <span className="text-muted-foreground">- Déclencher distillation</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /capture/session/:id</code> <span className="text-muted-foreground">- Session observations</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /capture/queue</code> <span className="text-muted-foreground">- File d'attente</span></div>
                </div>
              </div>

              {/* Context - Implemented */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Context</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /context/inject</code> <span className="text-muted-foreground">- Injection contexte</span></div>
                </div>
              </div>

              {/* Watcher - Implemented */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">File Watcher</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /watcher/start</code> <span className="text-muted-foreground">- Démarrer watcher</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /watcher/stop</code> <span className="text-muted-foreground">- Arrêter watcher</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /watcher/pause</code> <span className="text-muted-foreground">- Mettre en pause</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /watcher/resume</code> <span className="text-muted-foreground">- Reprendre</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /watcher/status</code> <span className="text-muted-foreground">- Statut watcher</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /watcher/queue</code> <span className="text-muted-foreground">- File en attente</span></div>
                </div>
              </div>

              {/* Settings - Implemented */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Settings</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /settings</code> <span className="text-muted-foreground">- Statistiques BDD</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /settings/reset</code> <span className="text-muted-foreground">- Reset BDD ⚠️</span></div>
                </div>
              </div>

              {/* System - Implemented (NEW) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">System</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /health</code> <span className="text-muted-foreground">- Health check</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /ping</code> <span className="text-muted-foreground">- Ping simple</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /stats</code> <span className="text-muted-foreground">- Stats serveur</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /stream</code> <span className="text-muted-foreground">- SSE temps réel</span></div>
                </div>
              </div>

              {/* Sessions - Implemented (NEW v0.0.2) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-sm">Sessions</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20" variant="secondary">✓ NEW</Badge>
                </div>
                <div className="space-y-1">
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /sessions/init</code> <span className="text-muted-foreground">- Init session DB</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">POST /sessions/summarize</code> <span className="text-muted-foreground">- Générer résumé</span></div>
                  <div><code className="bg-muted px-2 py-0.5 rounded">GET /memory/:id/timeline</code> <span className="text-muted-foreground">- Timeline context</span></div>
                </div>
              </div>
            </div>

            {/* Exemple d'utilisation */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Exemples d'utilisation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="font-semibold mb-1">Rappeler des mémoires</div>
                  <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
{`curl http://localhost:3001/memory/recall?q=auth&limit=10`}
                  </pre>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="font-semibold mb-1">Créer un projet</div>
                  <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
{`curl -X POST http://localhost:3001/projects \\
  -H "Content-Type: application/json" \\
  -d '{"name":"my-app","root_path":"/path/to/project"}'`}
                  </pre>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="font-semibold mb-1">Capturer un pattern</div>
                  <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
{`curl -X POST http://localhost:3001/patterns/capture \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"chunks","sources":[{"chunkId":42}]}'`}
                  </pre>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="font-semibold mb-1">Health check</div>
                  <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
{`curl http://localhost:3001/health`}
                  </pre>
                </div>
              </div>
            </div>
          </HelpCard>

          {/* Installation Complète */}
          <HelpCard
            id="installation"
            icon={Server}
            iconColor="bg-green-500/10 text-green-500"
            title="Installation Complète"
            subtitle="Guide A à Z pour première installation"
            className="col-span-1 md:col-span-2 xl:col-span-3"
          >
            <div className="space-y-6">
              {/* Prérequis */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Prérequis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <code className="font-semibold">Bun 1.0+</code>
                    <p className="text-muted-foreground mt-1">Runtime JavaScript rapide</p>
                    <code className="block bg-muted p-1 rounded mt-2">curl -fsSL https://bun.sh/install | bash</code>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <code className="font-semibold">SQLite 3</code>
                    <p className="text-muted-foreground mt-1">Base de données (inclus dans Bun)</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <code className="font-semibold">API Key (optionnel)</code>
                    <p className="text-muted-foreground mt-1">Anthropic/Mistral/OpenAI pour compression LLM</p>
                  </div>
                </div>
              </div>

              {/* Étape 1: Clone et Install */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Cloner et installer les dépendances</h4>
                  <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
{`# Cloner le repo
git clone https://github.com/your-org/nexus.git
cd nexus

# Installer toutes les dépendances (monorepo)
bun install

# Build tous les packages
bun run build`}
                  </pre>
                </div>
              </div>

              {/* Étape 2: Configuration env */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Configurer l'environnement (optionnel)</h4>
                  <p className="text-xs text-muted-foreground mt-1">Créer <code className="bg-muted px-1 rounded">apps/api/.env</code> pour activer les features avancées</p>
                  <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
{`# apps/api/.env
PORT=3001

# Compression LLM (un seul suffit, priorité: Anthropic > Mistral > OpenAI)
ANTHROPIC_API_KEY=sk-ant-...
# ou
MISTRAL_API_KEY=...
# ou
OPENAI_API_KEY=sk-...

# Semantic Search (optionnel, même clé que compression)
EMBEDDING_PROVIDER=mistral  # mistral | openai | ollama`}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Sans API key :</strong> la compression algorithmique (30:1) est utilisée automatiquement
                  </p>
                </div>
              </div>

              {/* Étape 3: Démarrer l'API */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Démarrer le serveur API</h4>
                  <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
{`# Depuis la racine du projet
cd apps/api && bun run src/index.ts

# Vérifier que ça fonctionne
curl http://localhost:3001/health
# Réponse: { "status": "ok", "version": "0.2.0" }`}
                  </pre>
                </div>
              </div>

              {/* Étape 4: Configurer Claude Code */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Configurer Claude Code MCP</h4>
                  <p className="text-xs text-muted-foreground mt-1">Ajouter la config MCP dans <code className="bg-muted px-1 rounded">~/.claude.json</code></p>
                  <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
{`{
  "mcpServers": {
    "nexus": {
      "command": "bun",
      "args": ["run", "/chemin/absolu/vers/nexus/apps/mcp-server/src/index.ts"],
      "env": {
        "NEXUS_API_URL": "http://localhost:3001"
      }
    }
  }
}`}
                  </pre>
                  <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Remplacer <code className="bg-muted px-1 rounded">/chemin/absolu/vers/nexus</code> par le vrai chemin
                  </p>
                </div>
              </div>

              {/* Étape 5: Configurer les Hooks (optionnel) */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  5
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Configurer les Hooks (optionnel mais recommandé)</h4>
                  <p className="text-xs text-muted-foreground mt-1">Les hooks permettent la capture automatique et la compression</p>
                  <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
{`# Ajouter à ~/.claude.json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "",
      "command": "bun run /chemin/nexus/apps/hooks/dist/session-start.js"
    }],
    "PostToolUse": [{
      "matcher": "",
      "command": "bun run /chemin/nexus/apps/hooks/dist/post-tool-use.js"
    }],
    "SessionEnd": [{
      "matcher": "",
      "command": "bun run /chemin/nexus/apps/hooks/dist/session-end.js"
    }]
  }
}`}
                  </pre>
                </div>
              </div>

              {/* Étape 6: Vérification */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white font-bold text-sm">
                  ✓
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Vérifier l'installation</h4>
                  <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
{`# Dans Claude Code, tester les outils MCP
> nexus_code({ action: "stats" })
# Réponse: Files:0|Chunks:0|Emb:0

> nexus_memory({ action: "recall" })
# Réponse: No memories

# Créer une première mémoire de test
> nexus_memory({ action: "upsert", type: "note", title: "Test installation" })
# Réponse: Created:1`}
                  </pre>
                </div>
              </div>

              {/* Exemples d'utilisation */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Exemples d'utilisation réels
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">Recherche de code</div>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`nexus_code({
  action: "search",
  query: "authentication",
  mode: "hybrid",
  limit: 5
})`}
                    </pre>
                    <p className="text-muted-foreground mt-2">Retourne les 5 chunks les plus pertinents</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">Créer une mémoire de décision</div>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`nexus_memory({
  action: "upsert",
  type: "decision",
  title: "JWT pour auth",
  narrative: "Choix de JWT...",
  tags: ["auth", "security"]
})`}
                    </pre>
                    <p className="text-muted-foreground mt-2">Crée une mémoire réutilisable</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">Rappeler des patterns</div>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`nexus_learn({
  action: "recall",
  query: "React component",
  lang: "typescript"
})`}
                    </pre>
                    <p className="text-muted-foreground mt-2">Retourne max 3 patterns applicables</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">Appliquer un pattern</div>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`nexus_learn({
  action: "apply",
  patternId: 1,
  variables: { ComponentName: "UserCard" },
  mode: "dry-run"
})`}
                    </pre>
                    <p className="text-muted-foreground mt-2">Preview avant écriture</p>
                  </div>
                </div>
              </div>
            </div>
          </HelpCard>

          {/* Quick Start (version courte) */}
          <HelpCard
            id="quick-start"
            icon={Zap}
            iconColor="bg-yellow-500/10 text-yellow-500"
            title="Quick Start"
            subtitle="TL;DR en 30 secondes"
          >
            <div className="space-y-3 text-xs">
              <pre className="bg-muted p-3 rounded overflow-x-auto">
{`# 1. Install
git clone ... && cd nexus && bun install

# 2. Start API
cd apps/api && bun run src/index.ts

# 3. Add to ~/.claude.json
{
  "mcpServers": {
    "nexus": {
      "command": "bun",
      "args": ["run", "/path/to/nexus/apps/mcp-server/src/index.ts"],
      "env": { "NEXUS_API_URL": "http://localhost:3001" }
    }
  }
}

# 4. Use in Claude Code
nexus_code({ action: "stats" })`}
              </pre>
            </div>
          </HelpCard>

          {/* Memory Types */}
          <HelpCard
            id="memory-types"
            icon={Brain}
            iconColor="bg-pink-500/10 text-pink-500"
            title="Types de Mémoires"
            subtitle="9 types disponibles"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'decision', desc: 'Décisions techniques', icon: CheckCircle },
                { type: 'preference', desc: 'Préférences équipe', icon: Lightbulb },
                { type: 'fact', desc: 'Faits importants', icon: Lightbulb },
                { type: 'note', desc: 'Notes générales', icon: BookOpen },
                { type: 'discovery', desc: 'Découvertes', icon: Zap },
                { type: 'bugfix', desc: 'Solutions bugs', icon: Code },
                { type: 'feature', desc: 'Implémentations', icon: Sparkles },
                { type: 'refactor', desc: 'Refactorings', icon: Zap },
                { type: 'change', desc: 'Changements', icon: Sparkles },
              ].map(({ type, desc, icon: Icon }) => (
                <div key={type} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <code className="text-xs font-semibold">{type}</code>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </HelpCard>

          {/* Memory Scopes */}
          <HelpCard
            id="memory-scopes"
            icon={Layers}
            iconColor="bg-cyan-500/10 text-cyan-500"
            title="Scopes de Mémoires"
            subtitle="5 niveaux de portée"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { scope: 'repo', desc: 'Repository entier' },
                { scope: 'branch', desc: 'Branche Git' },
                { scope: 'ticket', desc: 'Ticket/Jira' },
                { scope: 'feature', desc: 'Fonctionnalité' },
                { scope: 'global', desc: 'Global partagé' },
              ].map(({ scope, desc }) => (
                <div key={scope} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary/20">
                    <span className="text-xs font-semibold text-primary">#</span>
                  </div>
                  <div className="min-w-0">
                    <code className="text-xs font-semibold">{scope}</code>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </HelpCard>

          {/* Automation Features */}
          <HelpCard
            id="automation"
            icon={Workflow}
            iconColor="bg-indigo-500/10 text-indigo-500"
            title="Automation Features"
            subtitle="6 Hooks + SSE Stream + Watcher"
          >
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Lifecycle Hooks (6 complets)
                </h4>
                <p className="text-xs text-muted-foreground mb-2">Capture automatique avec Claude Code - ISO claude-mem</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded border bg-muted/30 text-center">
                    <code className="text-xs">sessionStart</code>
                    <p className="text-xs text-muted-foreground mt-1">Init session + context</p>
                  </div>
                  <div className="p-2 rounded border bg-green-500/10 text-center border-green-500/30">
                    <code className="text-xs text-green-600">userPromptSubmit</code>
                    <p className="text-xs text-muted-foreground mt-1">Init DB au 1er prompt</p>
                  </div>
                  <div className="p-2 rounded border bg-muted/30 text-center">
                    <code className="text-xs">preToolUse</code>
                    <p className="text-xs text-muted-foreground mt-1">Avant chaque tool</p>
                  </div>
                  <div className="p-2 rounded border bg-green-500/10 text-center border-green-500/30">
                    <code className="text-xs text-green-600">postToolUse</code>
                    <p className="text-xs text-muted-foreground mt-1">Capture → memory</p>
                  </div>
                  <div className="p-2 rounded border bg-green-500/10 text-center border-green-500/30">
                    <code className="text-xs text-green-600">stop</code>
                    <p className="text-xs text-muted-foreground mt-1">Résumé auto</p>
                  </div>
                  <div className="p-2 rounded border bg-muted/30 text-center">
                    <code className="text-xs">sessionEnd</code>
                    <p className="text-xs text-muted-foreground mt-1">Cleanup session</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  File Watcher
                </h4>
                <p className="text-xs text-muted-foreground mb-2">Indexation incrémentale automatique</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="outline">chokidar</Badge>
                  <Badge variant="outline">debounce 500ms</Badge>
                  <Badge variant="outline">.gitignore support</Badge>
                  <Badge variant="outline">pause/resume</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Context Injection
                </h4>
                <p className="text-xs text-muted-foreground mb-2">Injection automatique de contexte pertinent</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="outline">session info</Badge>
                  <Badge variant="outline">recent memories</Badge>
                  <Badge variant="outline">&lt; 2000 tokens</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  SSE Stream (temps réel)
                </h4>
                <p className="text-xs text-muted-foreground mb-2">Observations en temps réel dans le dashboard</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="outline" className="bg-green-500/10 text-green-600">GET /stream</Badge>
                  <Badge variant="outline">heartbeat 30s</Badge>
                  <Badge variant="outline">auto-reconnect</Badge>
                  <Badge variant="outline">Live Activity panel</Badge>
                </div>
              </div>
            </div>
          </HelpCard>

          {/* Learning Patterns - COMPLET */}
          <HelpCard
            id="learning"
            icon={Sparkles}
            iconColor="bg-purple-500/10 text-purple-500"
            title="Learning Patterns"
            subtitle="Système d'apprentissage de code réutilisable"
            className="col-span-1 md:col-span-2 xl:col-span-3"
          >
            <div className="space-y-6">
              {/* Concept */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Le système <strong>Patterns</strong> permet de capturer du code, le distiller en modèle réutilisable,
                  puis l'appliquer avec des variables. C'est un système d'apprentissage qui s'améliore avec le feedback.
                </p>
              </div>

              {/* Workflow */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Workflow className="h-4 w-4" />
                  Workflow complet
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mx-auto mb-2">1</div>
                    <code className="text-xs font-semibold">Capture</code>
                    <p className="text-xs text-muted-foreground mt-1">Code brut → Candidate</p>
                    <Badge variant="outline" className="mt-2 text-xs">~100 tok</Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mx-auto mb-2">2</div>
                    <code className="text-xs font-semibold">Distill</code>
                    <p className="text-xs text-muted-foreground mt-1">Candidate → Pattern</p>
                    <Badge variant="outline" className="mt-2 text-xs">~2000 tok</Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mx-auto mb-2">3</div>
                    <code className="text-xs font-semibold">Recall</code>
                    <p className="text-xs text-muted-foreground mt-1">Recherche (max 3)</p>
                    <Badge variant="outline" className="mt-2 text-xs">~50 tok</Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mx-auto mb-2">4</div>
                    <code className="text-xs font-semibold">Apply</code>
                    <p className="text-xs text-muted-foreground mt-1">Appliquer avec vars</p>
                    <Badge variant="outline" className="mt-2 text-xs">~500 tok</Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white font-bold text-xs mx-auto mb-2">5</div>
                    <code className="text-xs font-semibold">Feedback</code>
                    <p className="text-xs text-muted-foreground mt-1">Succès/Échec</p>
                    <Badge variant="outline" className="mt-2 text-xs">~10 tok</Badge>
                  </div>
                </div>
              </div>

              {/* Structure de données */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4" />
                  Structure des données
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Pattern */}
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      Pattern
                    </div>
                    <div className="space-y-1">
                      <div><code className="text-purple-500">intent</code> <span className="text-muted-foreground">"Créer endpoint API"</span></div>
                      <div><code className="text-purple-500">tags[]</code> <span className="text-muted-foreground">array of strings</span></div>
                      <div><code className="text-purple-500">title</code> <span className="text-muted-foreground">"REST Endpoint"</span></div>
                      <div><code className="text-purple-500">variables[]</code> <span className="text-muted-foreground">array of Variable objects</span></div>
                      <div><code className="text-purple-500">templates[]</code> <span className="text-muted-foreground">array of Template objects</span></div>
                      <div><code className="text-purple-500">checklist[]</code> <span className="text-muted-foreground">array of strings</span></div>
                      <div><code className="text-purple-500">gotchas[]</code> <span className="text-muted-foreground">array of strings</span></div>
                      <div className="pt-2 border-t mt-2">
                        <div><code className="text-purple-500">success_rate</code> <span className="text-muted-foreground">0.80 (80%)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Candidate */}
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2 flex items-center gap-1">
                      <Package className="h-3 w-3 text-orange-500" />
                      Candidate
                    </div>
                    <div className="space-y-1">
                      <div><code className="text-orange-500">kind</code> <span className="text-muted-foreground">"diff" | "chunks" | "folder"</span></div>
                      <div><code className="text-orange-500">sources</code> <span className="text-muted-foreground">array of source objects</span></div>
                      <div><code className="text-orange-500">label</code> <span className="text-muted-foreground">"User auth flow"</span></div>
                      <div><code className="text-orange-500">tags</code> <span className="text-muted-foreground">array of strings</span></div>
                      <div><code className="text-orange-500">status</code> <span className="text-muted-foreground">"pending" | "distilled"</span></div>
                      <div><code className="text-orange-500">session_id</code> <span className="text-muted-foreground">"session-abc-123"</span></div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Feedback
                    </div>
                    <div className="space-y-1">
                      <div><code className="text-green-500">pattern_id</code> <span className="text-muted-foreground">foreign key to patterns</span></div>
                      <div><code className="text-green-500">outcome</code> <span className="text-muted-foreground">"success" | "fail"</span></div>
                      <div><code className="text-green-500">notes</code> <span className="text-muted-foreground">"Worked perfectly"</span></div>
                      <div><code className="text-green-500">patch_id</code> <span className="text-muted-foreground">"patch-123-456"</span></div>
                      <div className="pt-2 border-t mt-2 text-muted-foreground">
                        Met à jour counters du pattern
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Endpoints */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <FolderTree className="h-4 w-4" />
                  API Endpoints
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2 rounded border bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm">POST /patterns/capture</code>
                      <Badge className="bg-orange-500/10 text-orange-500">Capture</Badge>
                    </div>
                    <p className="text-muted-foreground">Crée un candidate avec kind, sources[], label, tags[]</p>
                  </div>
                  <div className="p-2 rounded border bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm">POST /patterns/distill</code>
                      <Badge className="bg-purple-500/10 text-purple-500">Distill</Badge>
                    </div>
                    <p className="text-muted-foreground">Transforme candidate → pattern avec intent, title</p>
                  </div>
                  <div className="p-2 rounded border bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm">GET /patterns/recall</code>
                      <Badge className="bg-blue-500/10 text-blue-500">Recall</Badge>
                    </div>
                    <p className="text-muted-foreground">Recherche FTS5 avec ?q=query, ?lang=ts, ?limit=3</p>
                  </div>
                  <div className="p-2 rounded border bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm">GET /patterns/:id/templates</code>
                      <Badge className="bg-blue-500/10 text-blue-500">Templates</Badge>
                    </div>
                    <p className="text-muted-foreground">Récupère templates complets (~2000 tokens)</p>
                  </div>
                  <div className="p-2 rounded border bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm">POST /patterns/:id/apply</code>
                      <Badge className="bg-green-500/10 text-green-500">Apply</Badge>
                    </div>
                    <p className="text-muted-foreground">Applique avec variables{}, mode (dry-run/write)</p>
                  </div>
                  <div className="p-2 rounded border bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm">POST /patterns/:id/feedback</code>
                      <Badge className="bg-green-500/10 text-green-500">Feedback</Badge>
                    </div>
                    <p className="text-muted-foreground">Enregistre outcome (success/fail), notes</p>
                  </div>
                </div>
              </div>

              {/* Exemple concret */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Exemple concret
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">1. CAPTURE</div>
                    <p className="text-muted-foreground mb-2">Tu sélectionnes du code dans <code>search.index.tsx</code></p>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`POST /patterns/capture
{
  "kind": "chunks",
  "sources": [{"chunkId": 42}],
  "label": "Search filters"
}`}
                    </pre>
                    <p className="text-muted-foreground mt-2">→ Crée un <strong>CANDIDATE</strong></p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">2. DISTILL</div>
                    <p className="text-muted-foreground mb-2">Transforme en pattern réutilisable</p>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`POST /patterns/distill
{
  "candidateId": 1,
  "intent": "Search page with filters",
  "title": "Search Filters Pattern"
}`}
                    </pre>
                    <p className="text-muted-foreground mt-2">→ Crée un <strong>PATTERN</strong> avec variables/templates</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">3. APPLY</div>
                    <p className="text-muted-foreground mb-2">Génère du code avec variables</p>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`POST /patterns/1/apply
{
  "variables": {
    "ResourceName": "Orders"
  },
  "mode": "dry-run"
}`}
                    </pre>
                    <p className="text-muted-foreground mt-2">→ Génère <code>routes/Orders.index.tsx</code></p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="font-semibold mb-2">4. FEEDBACK</div>
                    <p className="text-muted-foreground mb-2">Améliore le success_rate</p>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
{`POST /patterns/1/feedback
{
  "outcome": "success",
  "notes": "Worked perfectly!"
}`}
                    </pre>
                    <p className="text-muted-foreground mt-2">→ <strong>success_rate</strong> augmente</p>
                  </div>
                </div>
              </div>

              {/* Progressive Disclosure */}
              <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-purple-500" />
                  Progressive Disclosure
                </h4>
                <p className="text-xs text-muted-foreground">
                  Le système suit le principe de <strong>Progressive Disclosure</strong> : d'abord compact (recall ~50 tokens),
                  puis détail (templates ~2000 tokens) à la demande. Cela permet d'économiser 10-20x de tokens.
                </p>
              </div>
            </div>
          </HelpCard>

          {/* Links */}
          <div className="col-span-1 md:col-span-2 xl:col-span-3 border border-dashed rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Documentation complémentaire</h3>
                <p className="text-sm text-muted-foreground">
                  Explorez la documentation détaillée et le code source
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/your-org/nexus" target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
                <Button size="sm" asChild>
                  <a href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
