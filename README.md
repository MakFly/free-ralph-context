# Nexus

> **Memory-Powered Development System for Claude Code**

Nexus remplace `claude-mem` + `mgrep` avec une solution unifiée : recherche de code, mémoires contextuelles, et patterns réutilisables via MCP.

## Pourquoi Nexus ?

| Problème | Solution Nexus |
|----------|----------------|
| Tokens gaspillés (tout le codebase chargé) | **Progressive Disclosure** : 3 couches pour 10-20x économie |
| Contexte perdu entre sessions | **Memory System** : décisions, préférences, découvertes persistées |
| Patterns de code répétés | **Learning System** : capture et réapplique les templates |

## Installation

### Prérequis

- Node.js >= 22.0.0
- Bun >= 1.0.0
- Python 3 (pour l'indexeur)

### Installation Automatique

```bash
git clone https://github.com/votre-org/nexus.git
cd nexus
./install.sh
```

Le script :
1. Vérifie les prérequis
2. Installe les dépendances (`bun install`)
3. Build le projet (`bun run build`)
4. Configure les hooks Claude Code
5. Configure le serveur MCP
6. Installe l'API comme service système
7. Vérifie que tout fonctionne

### Options d'Installation

```bash
./install.sh              # Installation complète
./install.sh --no-service # Sans service système (API manuelle)
./install.sh --uninstall  # Désinstallation complète
./install.sh --help       # Aide
```

### Indexer votre Codebase

```bash
python3 packages/indexer-py/main.py index .
```

## Utilisation avec Claude Code

Après installation, Nexus est automatiquement disponible via MCP.

### Outils MCP Disponibles

| Tool | Description | Tokens |
|------|-------------|--------|
| `nexus_code` | Recherche code (keyword/semantic/hybrid) | ~50/hit |
| `nexus_memory` | Mémoires (recall/get/upsert) | ~50-500/item |
| `nexus_learn` | Patterns (recall/templates/apply) | ~100-2000 |

### Progressive Disclosure (3 Couches)

```
1. RECALL    → Index compact avec IDs        (~50 tokens/item)
2. TIMELINE  → Contexte chronologique        (optionnel)
3. GET       → Contenu complet filtré        (~500 tokens/item)
```

**Exemple :**

```typescript
// Étape 1: Rappeler les mémoires pertinentes
nexus_memory({ action: "recall", query: "auth", limit: 5 })
// → [{id: 42, summary: "JWT choisi pour auth", type: "decision"}]

// Étape 2: Contenu complet si nécessaire
nexus_memory({ action: "get", ids: [42] })
// → Narrative complète avec facts/tags
```

## Architecture

```
nexus/
├── apps/
│   ├── api/           # REST API (Hono + SQLite) - Port 3001
│   ├── mcp-server/    # Serveur MCP (stdio)
│   ├── hooks/         # Hooks Claude Code
│   └── web/           # UI Web (React + shadcn/ui)
├── packages/
│   ├── core/          # Types partagés
│   ├── storage/       # SQLite + migrations
│   ├── search/        # FTS5 + embeddings
│   └── indexer-py/    # Indexeur Python
├── scripts/           # Scripts d'installation
└── docs/              # Documentation
```

## Configuration

### Variables d'Environnement (optionnel)

```bash
# apps/api/.env
PORT=3001
MISTRAL_API_KEY=votre_clé    # Pour recherche sémantique
EMBEDDING_PROVIDER=mistral   # ou 'openai' | 'ollama'
```

### Fichiers de Configuration Claude

- `~/.claude/settings.json` - Hooks
- `~/.claude.json` - Serveurs MCP

## Commandes

```bash
# Build
bun run build              # Build tout
bun run build:packages     # Build packages seulement
bun run build:apps         # Build apps seulement

# Test
bun test                   # Tous les tests

# Développement
cd apps/api && bun run src/index.ts    # API server
cd apps/web && bun run dev             # UI Web (dev)

# Base de données
python3 packages/indexer-py/main.py index .    # Indexer
python3 packages/indexer-py/main.py status     # Stats
./scripts/reset-db.sh                          # Reset
```

## Documentation

- [API Reference](docs/API.md) - Endpoints REST
- [MCP Usage](docs/MCP_USAGE.md) - Guide MCP détaillé
- [CLAUDE.md](CLAUDE.md) - Instructions pour Claude Code

## Types de Mémoires

| Type | Usage |
|------|-------|
| `decision` | Choix architecturaux |
| `preference` | Préférences utilisateur |
| `fact` | Informations factuelles |
| `discovery` | Découvertes techniques |
| `bugfix` | Bugs résolus |
| `feature` | Features implémentées |
| `refactor` | Refactorings effectués |

## Scopes

| Scope | Portée |
|-------|--------|
| `repo` | Repository entier |
| `branch` | Branche spécifique |
| `ticket` | Ticket/Issue |
| `feature` | Feature spécifique |
| `global` | Tous les projets |

## Licence

MIT

---

**Nexus** - *Memory-Powered Development*
