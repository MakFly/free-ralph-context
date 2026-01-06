import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

const CHANGELOG_ENTRIES = [
  {
    version: '3.0.0',
    date: '2026-01-06',
    title: "Token Optimization - Inspiré de claude-mem",
    type: 'feature',
    description: "Refonte majeure pour réduire la consommation de tokens de 10x. Intégration du pattern Progressive Disclosure de claude-mem, support CCS multi-provider (Anthropic + GLM), et auto-capture via hooks.",
    changes: [
      {
        category: "Progressive Disclosure (3-Layer Pattern)",
        description: "Récupération de mémoires en 3 niveaux pour économiser des tokens",
        details: [
          "Layer 1 - search_index() : ~50 tokens/résultat (ID + résumé 50 chars)",
          "Layer 2 - get_timeline() : ~150 tokens (contexte avant/après)",
          "Layer 3 - get_full() : ~500 tokens (contenu complet)",
          "10x token savings vs récupération complète systématique",
          "Nouvelle fonction progressive_search(depth=1|2|3)",
        ],
      },
      {
        category: "CCS Detection (Claude Config Switcher)",
        description: "Détection automatique du provider actif via ~/.ccs/config.json",
        details: [
          "Support GLM-4.7 via z.ai (API Anthropic-compatible)",
          "Support Anthropic OAuth natif",
          "Token estimation provider-aware (Claude: 3.5 chars/token, GLM: 2.5 chars/token)",
          "Context windows adaptés (GLM: 128k, Anthropic: 200k, Gemini: 1M)",
        ],
      },
      {
        category: "Thresholds Adaptatifs par Provider",
        description: "Seuils de compression ajustés selon le context window du provider",
        details: [
          "Anthropic : 60% checkpoint → 75% safety → 85% compress → 95% spawn",
          "GLM : 50% checkpoint → 65% safety → 75% compress → 85% spawn (plus agressif)",
          "Google Gemini : 70% → 80% → 90% → 97% (plus relaxé, 1M context)",
          "Détection automatique du provider actif",
        ],
      },
      {
        category: "Hybrid Search (BM25 + Vector)",
        description: "Recherche hybride combinant keyword et similarité sémantique",
        details: [
          "Migration pgvector : colonne embedding vector(1536)",
          "Index IVFFlat pour recherche approximative rapide",
          "Reciprocal Rank Fusion (RRF) pour combiner les scores",
          "Weights configurables : 30% keyword + 70% vector par défaut",
          "Fallback keyword-only si embeddings non disponibles",
        ],
      },
      {
        category: "Embedding Service Multi-Provider",
        description: "Service d'embeddings avec support multi-provider",
        details: [
          "OpenAI text-embedding-3-small (1536 dims)",
          "Voyage AI (partenariat Anthropic)",
          "sentence-transformers local (fallback)",
          "Batch embedding pour sessions complètes",
        ],
      },
      {
        category: "Auto-Capture Hooks (à la claude-mem)",
        description: "Capture automatique des observations via hooks Claude",
        details: [
          "PostToolUse → capture_observation.py (captures Read/Write/Bash/Search)",
          "Stop → auto_compress.py (fold automatique si context > threshold)",
          "Stockage comme mémoires 'context' avec priorité 'low'",
          "Deduplication par hash du contenu",
        ],
      },
    ],
    impact: [
      "Token savings : ~500 tokens/mémoire → ~50 tokens (10x réduction)",
      "Context usage moyen : 85% → 60-70%",
      "Search latency : ~200ms → ~50ms (hybrid avec index)",
      "Support transparent GLM via z.ai",
      "Auto-management du contexte sans intervention manuelle",
    ],
    files: [
      "ralph-mcp/src/llm.py (+200 lignes : CCS detection, estimate_tokens, ProviderConfig)",
      "ralph-api/app/services/fold_service.py (thresholds adaptatifs PROVIDER_THRESHOLDS)",
      "ralph-api/app/services/memory_service.py (+300 lignes : progressive disclosure, hybrid search)",
      "ralph-api/app/services/embedding_service.py (nouveau : multi-provider embeddings)",
      "ralph-api/app/models/memory.py (préparation colonne embedding)",
      "ralph-api/alembic/versions/20260106_0001_add_pgvector_embeddings.py (nouveau)",
      "~/.ralph/hooks/capture_observation.py (nouveau : auto-capture)",
      "~/.ralph/hooks/auto_compress.py (nouveau : auto-fold)",
      "~/.claude/settings.json (hooks PostToolUse + Stop)",
    ],
  },
  {
    version: '2.2.1',
    date: '2025-01-06',
    title: "Cortex : Corrections & Commande Raccourcie",
    type: 'fix',
    description: "Correction des bugs du Cortex et ajout de la commande /cortex pour une utilisation simplifiée",
    changes: [
      {
        category: "Correction Import Error",
        description: "Erreur d'import dans le plugin cortex corrigée",
        details: [
          "get_session_db() → get_db() (nom correct de la fonction)",
          "Plugin Cortex charge maintenant correctement",
        ],
      },
      {
        category: "Performance - Auto-learning Désactivé par Défaut",
        description: "L'auto-apprentissage depuis les transcripts est maintenant opt-in",
        details: [
          "auto_learn: false par défaut (au lieu de true)",
          "Le cortex est maintenant instantané (plus de parsing de transcripts au démarrage)",
          "Pour activer : ralph_cortex(..., auto_learn=true)",
        ],
      },
      {
        category: "Commande /cortex - Slash Command",
        description: "Nouvelle commande raccourcie pour utiliser le Cortex",
        details: [
          "/cortex <tâche> remplace @ralph ralph_cortex(\"<tâche>\")",
          "Installée dans ~/.claude/commands/ et ~/.claude-glm/commands/",
          "Exemple : /cortex où sont les tests ?",
        ],
      },
    ],
    impact: [
      "Le Cortex fonctionne maintenant correctement",
      "Performance instantanée (plus de latence)",
      "Syntaxe beaucoup plus simple avec /cortex",
    ],
    files: [
      "ralph-mcp/plugins/cortex/plugin.py (fix import + auto_learn)",
      "~/.claude/commands/cortex.md (nouveau - Slash command)",
      "~/.claude-glm/commands/cortex.md (nouveau - Slash command)",
    ],
  },
  {
    version: '2.2.0',
    date: '2025-01-06',
    title: "Ralph Cortex - Le Cerveau qui Connecte Tout",
    type: 'feature',
    description: "Implémentation du Ralph Cortex : moteur de décision qui connecte Ralph aux agents Claude et apprend automatiquement de vos transcripts",
    changes: [
      {
        category: "Cortex : Moteur de Décision Intelligent",
        description: "Analyse les tâches et route automatiquement vers le bon agent/skill/outil",
        details: [
          "Analyse le type de tâche (exploration, fix, debug, performance, refactor)",
          "Route vers l'agent approprié : swe-scout, snipper, debug-agent, perf-agent, refactor-agent",
          "Reconnaît les skills récurrents : /commit, /qa, /devops",
          "Apprend de vos transcripts pour s'améliorer continuellement",
          "Utilisation : ralph_cortex(\"trouve l'auth dans le backend\")",
        ],
      },
      {
        category: "Auto-Apprentissage depuis Transcripts",
        description: "Parse automatiquement ~/.claude/transcripts/ pour extraire vos patterns",
        details: [
          "Extraction des séquences d'actions répétitives",
          "Détection des workflows : git, tests, code fixes",
          "Création automatique de skills à partir de vos habitudes",
          "Utilisation : ralph_learn_from_transcripts()",
        ],
      },
      {
        category: "Intégration Agents Claude ↔ Ralph",
        description: "Connexion bidirectionnelle entre la mémoire Ralph et les agents",
        details: [
          "Les agents peuvent maintenant accéder à ralph_warpgrep, ralph_cross_search, ralph_get_patterns",
          "Le Cortex enrichit le contexte passé aux agents avant exécution",
          "Les décisions prises par les agents sont stockées dans Ralph",
        ],
      },
    ],
    impact: [
      "Ralph devient proactif : il suggère des actions au lieu d'attendre",
      "Les agents Claude ont maintenant une mémoire à long terme",
      "Vos habitudes de travail sont automatiquement apprises et réutilisées",
      "Plus besoin de répéter les mêmes tâches manuellement",
    ],
    files: [
      "ralph-mcp/src/cortex.py (nouveau - Moteur de décision)",
      "ralph-mcp/src/transcript_parser.py (nouveau - Parser de transcripts)",
      "ralph-mcp/plugins/cortex/plugin.py (nouveau - Plugin MCP)",
      "ralph-mcp/mcp_server.py (ajout Cortex plugin)",
    ],
  },
  {
    version: '2.1.0',
    date: '2025-01-06',
    title: 'Gestion de Contexte Multi-Projets',
    type: 'feature',
    description: 'Implémentation de 4 options puissantes pour une gestion transparente du contexte entre projets',
    changes: [
      {
        category: 'Option 1 : Registre d\'Alias de Projets',
        description: 'Auto-initialisation de ~/.ralph/projects.json avec les mappings nom → chemin',
        details: [
          'Auto-découverte des projets depuis les répertoires courants (~/Documents/lab, ~/projects, etc.)',
          'Support des alias et keywords pour une recherche flexible',
          'Utilisation : ralph_warpgrep([...], project="iautos")',
        ],
      },
      {
        category: 'Option 2 : Switcher Intelligent de CWD',
        description: 'Changement temporaire de répertoire pour chercher dans n\'importe quel projet',
        details: [
          'Change automatiquement le CWD, exécute la recherche, puis restaure le répertoire d\'origine',
          'Fonctionne avec n\'importe quel chemin absolu',
          'Utilisation : ralph_warpgrep([...], cwd="/chemin/vers/projet")',
        ],
      },
      {
        category: 'Option 3 : Index Global FTS5',
        description: 'Index de recherche full-text sur tous les projets pour des résultats instantanés',
        details: [
          'Table SQLite FTS5 avec triggers de synchronisation automatique',
          'Recherche en moins d\'une seconde sur des centaines de projets',
          'Utilisation : ralph_warpgrep([...], scope="nom-du-projet")',
        ],
      },
      {
        category: 'Option 4 : Recherche Floue de Projets',
        description: 'Recherche par approximation pour trouver des projets par leur nom',
        details: [
          'Algorithme flou basé sur SequenceMatcher avec seuil de 60% de similarité',
          'Recherche dans les noms, alias, keywords et descriptions',
          'Utilisation : ralph_warpgrep([...], find="web-analytics")',
        ],
      },
    ],
    impact: [
      'Auto-mise à jour à chaque appel MCP pour garantir que le registre reste à jour',
      '13+ projets auto-découverts depuis ~/Documents/lab au premier lancement',
      'Détection automatique du framework (Symfony, Next.js, Nuxt, Python, Go, Rust, etc.)',
      'Auto-détection des répertoires source pour chaque projet',
    ],
    files: [
      'ralph-mcp/src/project_registry.py (nouveau)',
      'ralph-mcp/src/db/schema.sql (ajout table projects + FTS5)',
      'ralph-mcp/plugins/warpgrep/plugin.py (ajout de 4 nouveaux paramètres)',
      'ralph-mcp/src/tools/orchestrate.py (intégration du registre)',
      'ralph-mcp/mcp_server.py (auto-init au démarrage)',
      'ralph-mcp/src/pattern_extractor.py (ajout de count_files())',
    ],
  },
  {
    version: '2.0.0',
    date: '2025-01-05',
    title: 'Refactorisation Architecture Plugin',
    type: 'refactor',
    description: 'Refactorisation complète vers une architecture basée sur des plugins pour une meilleure modularité',
    changes: [
      {
        category: 'Système de Plugins',
        description: 'Architecture modulaire de plugins avec séparation par domaine',
        details: [
          'SessionPlugin - gestion des sessions',
          'MemoryPlugin - opérations sur les mémoires',
          'PatternPlugin - apprentissage de patterns',
          'ContextPlugin - compression de contexte',
          'WarpGrepPlugin - recherche parallèle',
          'KillerFeaturesPlugin - fonctionnalités avancées',
        ],
      },
    ],
    impact: [
      'Ajout de nouvelles fonctionnalités simplifié',
      'Meilleure séparation des préoccupations',
      'Testabilité améliorée',
    ],
    files: [
      'ralph-mcp/plugins/* (nouveau)',
      'ralph-mcp/mcp_server.py (refactorisé)',
    ],
  },
]

function ChangelogPage() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Journal des Modifications</h1>
          <Badge variant="secondary">v3.0.0</Badge>
        </div>
        <p className="text-muted-foreground">
          Toutes les nouvelles fonctionnalités, améliorations et corrections de Ralph MCP
        </p>
      </div>

      <div className="space-y-8">
        {CHANGELOG_ENTRIES.map((entry, idx) => (
          <Card key={idx}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    {entry.version}
                    <Badge
                      variant={
                        entry.type === 'feature'
                          ? 'default'
                          : entry.type === 'refactor'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {entry.type}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {entry.date} — {entry.title}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm">{entry.description}</p>

              {entry.changes && (
                <div className="space-y-4">
                  {entry.changes.map((change, changeIdx) => (
                    <div key={changeIdx}>
                      <h4 className="font-semibold text-sm mb-2">
                        {change.category}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {change.description}
                      </p>
                      {change.details && (
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                          {change.details.map((detail, detailIdx) => (
                            <li key={detailIdx}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {entry.impact && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Impact</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                    {entry.impact.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.files && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Fichiers Modifiés</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.files.map((file, fileIdx) => (
                      <Badge key={fileIdx} variant="outline" className="text-xs">
                        {file}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              Mise à jour automatique à chaque appel MCP via <code className="bg-muted px-1 py-0.5 rounded">registry.update_on_mcp_call()</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
