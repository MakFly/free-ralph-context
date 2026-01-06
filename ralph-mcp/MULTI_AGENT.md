# 🚀 Multi-Agent Orchestrateur - Ralph MCP

## Overview

Le système d'orchestration multi-agent permet à Ralph de détecter automatiquement quand une tâche nécessite plusieurs agents travaillant en parallèle, **sans utiliser d'LLM pour la décision**.

## Architecture

```
User Message
      ↓
ralph_orchestrate(message)
      ↓
┌─────────────────────────────────────────────────────────┐
│  Règles sans LLM                                       │
│  1. Détecte projet connu (iautos, ralph, etc.)         │
│  2. Détecte pattern trigger (explain, analyze, etc.)   │
│  3. Vérifie si hors du projet                         │
│      ↓                                                  │
│  SI conditions remplies → Génére ExecutionPlan         │
│  SINON                    → Single agent (legacy)      │
└─────────────────────────────────────────────────────────┘
      ↓
ExecutionPlan {
  parallel_tasks:   [AgentTask, AgentTask, ...]
  sequential_tasks: [AgentTask(deps), ...]
  ralph_tools:      ["warpgrep", "recall", ...]
  mode:             "parallel" | "hybrid" | "single"
}
      ↓
Claude lit le plan et lance les agents en parallèle via Task()
```

## Configuration

### Fichier : `~/.ralph/projects.json`

```json
{
  "iautos": {
    "path": "/home/kev/Documents/lab/sites/saas/iautos",
    "aliases": ["crm", "auto", "life"],
    "keywords": ["iautos", "iauto", "crm.*auto"],
    "description": "CRM automobile Symfony + Next.js"
  }
}
```

**Champs** :
- `path` : Chemin absolu (optionnel, `null` = mode découverte)
- `aliases` : Noms alternatifs pour détecter le projet
- `keywords` : Patterns regex pour matching
- `description` : Contexte pour le reasoning

## Scénarios

### 1. Analyse de projet externe (HYBRIDE)

**Entrée** : `"Explique l'auth d'iautos"`

**Plan généré** :
```json
{
  "mode": "hybrid",
  "parallelTasks": [
    {"agent": "swe-scout", "task": "Locate iautos project directory"},
    {"agent": "swe-scout", "task": "Search auth in iautos"}
  ],
  "sequentialTasks": [
    {"agent": "general-purpose", "task": "Analyze auth implementation in iautos"}
  ],
  "estimatedDuration": 45
}
```

**Exécution** :
```
swe-scout (locate) ─┐
                    ├→ 15s (parallèle)
swe-scout (search) ─┘
                    ↓
general-purpose (analyze) → 30s (séquentiel)
                    ↓
Total: 45s (au lieu de ~60s en séquentiel)
```

### 2. Simple exploration (PARALLEL)

**Entrée** : `"How does ralph handle context"`

**Plan généré** :
```json
{
  "mode": "parallel",
  "parallelTasks": [
    {"agent": "swe-scout", "task": "Locate ralph project"},
    {"agent": "swe-scout", "task": "Explore ralph structure"}
  ],
  "sequentialTasks": []
}
```

### 3. Tâche simple (SINGLE)

**Entrée** : `"Fix the typo on line 42"`

**Résultat** : Pas de plan multi-agent → Single agent (snipper)

## Patterns Trigger

### project_switch
- `explain`, `analyze`, `how does`
- `explique`, `analyse`, `comment` (FR)

### cross_project_compare
- `compare X and Y`
- `X vs Y`

### multi_aspect_analysis
- `explain.*auth`
- `analyze.*system`

## Intégration Claude

```typescript
// Dans Claude Code
const result = await mcp.ralph_orchestrate("Explique l'auth d'iautos")

if (result.executionPlan) {
  // Lancer les tâches parallèles
  const parallelResults = await Promise.all(
    result.executionPlan.parallelTasks.map(task =>
      Task({
        subagent_type: task.agent,
        prompt: task.task
      })
    )
  )

  // Puis les tâches séquentielles
  for (const task of result.executionPlan.sequentialTasks) {
    await Task({
      subagent_type: task.agent,
      prompt: task.task,
      context: parallelResults  // Résultats des parallèles
    })
  }
}
```

## Performance

| Scénario | Sans orchestrateur | Avec orchestrateur | Gain |
|----------|-------------------|-------------------|------|
| Explique auth iautos | ~60s | ~45s | **25%** |
| Compare 2 projets | ~120s | ~60s | **50%** |
| Simple fix | ~10s | ~10s | 0% |

## Extensibilité

### Ajouter un projet

```bash
# Éditer ~/.ralph/projects.json
{
  "mon-projet": {
    "path": "~/path/to/mon-projet",
    "aliases": ["monprojet", "mp"],
    "description": "Mon projet perso"
  }
}
```

### Ajouter un pattern trigger

Dans `orchestrate.py` :

```python
MULTI_AGENT_TRIGGERS = {
    "mon_trigger": [
        r"mon_pattern",
        r"autre_pattern"
    ]
}
```

## Limitations

- **Détection basée sur des patterns** : Pas de compréhension sémantique
- **Projets connus seulement** : Il faut les register dans `projects.json`
- **CWD-dependent** : Déclenche seulement si hors du projet

## Future

- [ ] Auto-détection de projets via `find ~/Documents`
- [ ] Hook Claude pour exécution automatique des plans
- [ ] Index SQLite pour recherche instantanée
- [ ] Support pour les dépendances complexes (DAG)

## Tests

```bash
cd ralph-mcp
python3 test_orchestrate.py
```

**Résultat attendu** : 5/5 tests ✅
