# PRD — MCP Unified + Learning System

**Produit** : `mcp-unified`
**Date** : 2026-01-10
**Owner** : (toi)
**Statut** : Draft v1.0

---

## 0) Résumé (1 page)

Construire un outil local-first qui combine :

1. **Search** (mgrep++) : keyword (FTS5/ripgrep), symbolique (AST), sémantique (embeddings), **hybrid ranking**
2. **Memory** (claude-mem++) : mémoire persistante gouvernée (decisions/preferences/facts/notes), sourcée
3. **Learning System** : capture → distillation → patterns/recipes/playbooks → apply (patch) avec budget tokens minimal
4. **UI Web** : gouvernance + productivité (search, memory, learning, index/policies)
5. **MCP Server** : exposer tools & prompts à Claude Code / agents, sans dupliquer la logique (core partagé)

**Objectif business/usage** :
- Augmenter l'"utilisation utile" avant limite (Max/usage) via réduction des tokens et du nombre d'itérations
- Rendre le dev "agentic" reproductible : **Recall → Apply → (Search si besoin)**

---

## 1) Problème

Les agents consomment trop :
- Ils relisent trop large (fichiers entiers / logs)
- Ils itèrent (search→open→search→open) faute de ranking/hints
- Ils répètent l'onboarding (archi, conventions) à chaque session

**Résultat** :
- Coût tokens + limites atteintes vite
- Latence + fatigue
- Incohérences (patterns non respectés)

---

## 2) Objectifs

### O1 — Token Efficiency

Réduire le "context payload" par action utile de **50%+** via :
- Snippets bornés
- Patterns compacts (PatternCards)
- Recall mémoire/patterns avant exploration

### O2 — "Learning"

Faire apprendre au système des patterns concrets (framework/libs/conventions) et les ré-appliquer de manière fiable :
- Capture depuis diffs validés / chunks / dossiers
- Distillation en templates paramétrés + checklist + gotchas + sources
- Apply en patch (diff) minimal

### O3 — Gouvernance

Tout ce qui est "retenu" doit être :
- Éditable
- Taggé/scope
- Sourcé (links vers fichiers/chunks)
- Dédoublonnable

### O4 — Local-first

Par défaut :
- Aucune donnée sortante
- Embeddings BYOK optionnel (ou local)
- DB portable (SQLite)

---

## 3) Non-objectifs (v1)

- Remplacer un IDE
- "Auto-commit autonome" (v2)
- Multi-user cloud obligatoire (v2)

---

## 4) Personas

| Persona | Besoins |
|---------|---------|
| Dev senior (toi) | Vitesse + cohérence + très peu de tokens |
| Team (v2) | Patterns partagés, RBAC, audit |
| Agent LLM | Consomme MCP tools, applique patterns |

---

## 5) Scope v1

### Must have

**Core**
- SQLite + WAL + migrations
- Index files + chunking + incremental reindex
- Search keyword (FTS5) + open snippet (borné)
- Memory CRUD + recall (FTS) + liens sources
- Learning :
  - capture (diff|chunks|folder)
  - distill (PatternCard + templates paramétrés)
  - recall patterns (topK)
  - apply (dry-run + write) => patch
  - feedback success/fail

**MCP**
- Tools : code.search, code.open, memory.recall/upsert, learning.recall/apply/capture/distill/upsert/feedback, repo.stats

**UI**
- Search + preview
- Memory (CRUD, tags, scopes)
- Learning (patterns list, edit, test apply)
- Index/policies

### Should have

- Symbol index via tree-sitter (defs basiques)
- Hybrid ranking (keyword + semantic si embeddings activés)
- Dédup patterns & score de succès

### Could have

- Rerank (cross-encoder local ou BYOK)
- Playbooks debug
- Multi-workspace

---

## 6) Architecture

### 6.1 Monorepo

```
apps/
  mcp-server/        # MCP adapter (stdio + streamable http option)
  api/               # HTTP API (UI)
  web/               # UI web
packages/
  core/              # Search/Memory/Learning (pure)
  storage/           # SQLite schema + migrations
  indexer/           # file watcher + chunker
  parsers/           # tree-sitter + fallback
  embeddings/        # providers (local/BYOK)
  policies/          # ignore rules, secrets redaction, budgets
```

### 6.2 Data flow

```
Indexer => (files, chunks, fts, embeddings)
Learning capture => candidates => distill => patterns
MCP + API => core (mêmes fonctions)
```

### 6.3 "Budget Mode" (mécanique du x2)

Le core applique des caps **STRICTS** :

| Cap | Valeur |
|-----|--------|
| maxSearchHits | 12 |
| maxSnippetLines | 80 |
| maxOpenLines | 200 |
| maxToolReturnChars | 20k |
| maxPatternCards | 3 |
| maxTemplateChars | 6k |

Si dépassement :
- Truncate + message "refine query / specify symbol / choose template subset"

---

## 7) Modèle de données (SQLite)

### files
| Colonne | Description |
|---------|-------------|
| id | PK |
| path | Chemin relatif |
| mtime | Timestamp modification |
| size | Taille fichier |
| hash | Hash contenu |
| lang | Langage détecté |
| ignored | Boolean |

### chunks
| Colonne | Description |
|---------|-------------|
| id | PK |
| file_id | FK files |
| start_line | Ligne début |
| end_line | Ligne fin |
| content | Contenu du chunk |
| symbol | Nom symbole (si applicable) |
| kind | Type (function, class, etc.) |

### chunks_fts (FTS5)
- content, symbol, path

### embeddings (option)
| Colonne | Description |
|---------|-------------|
| chunk_id | FK chunks |
| vector | Embedding vector |

### memories
| Colonne | Description |
|---------|-------------|
| id | PK |
| type | decision\|preference\|fact\|note |
| scope | repo\|branch\|ticket\|feature\|global |
| content | Contenu mémoire |
| tags_json | Tags JSON array |
| confidence | Score confiance |
| created_at | Timestamp |
| updated_at | Timestamp |

### memory_links
| Colonne | Description |
|---------|-------------|
| memory_id | FK memories |
| chunk_id | FK chunks (nullable) |
| file_id | FK files (nullable) |

### candidates
| Colonne | Description |
|---------|-------------|
| id | PK |
| kind | diff\|chunks\|folder |
| sources_json | Sources JSON |
| status | Statut |
| created_at | Timestamp |

### patterns
| Colonne | Description |
|---------|-------------|
| id | PK |
| intent | Intention du pattern |
| title | Titre |
| tags_json | Tags |
| constraints_json | Contraintes (lang/framework/version/path) |
| variables_json | Variables typées |
| templates_json | Templates (path + content OR ref) |
| checklist_json | Checklist |
| gotchas_json | Pièges à éviter |
| sources_json | Sources |
| usage_count | Nombre utilisations |
| success_rate | Taux de succès |
| created_at | Timestamp |
| updated_at | Timestamp |

### feedback
| Colonne | Description |
|---------|-------------|
| id | PK |
| pattern_id | FK patterns |
| outcome | success\|fail |
| notes | Notes optionnelles |
| created_at | Timestamp |

---

## 8) APIs

### 8.1 HTTP API (UI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /search | POST | `{ query, mode, k, filters }` → `{ hits[] }` |
| /open | POST | `{ path, startLine, endLine }` → `{ snippet }` |
| /memory | GET | `?q=&type=&scope=&tag=` |
| /memory | POST | Créer mémoire |
| /memory/:id | PATCH | Modifier mémoire |
| /memory/:id | DELETE | Supprimer mémoire |
| /patterns | GET | `?q=&tag=&intent=` |
| /patterns/capture | POST | Capturer candidat |
| /patterns/distill | POST | Distiller pattern |
| /patterns/upsert | POST | Créer/modifier pattern |
| /patterns/recall | POST | Rappeler patterns |
| /patterns/apply | POST | Appliquer pattern |
| /patterns/feedback | POST | Feedback pattern |
| /stats | GET | Statistiques repo |
| /reindex | POST | Réindexer |
| /policies | GET/PUT | Politiques |

### 8.2 MCP Tools (contract)

```typescript
// Search
code.search({ query, mode, k, filters })
code.open({ path, startLine, endLine })

// Memory
memory.recall({ query, scope?, tags?, k? })
memory.upsert({ type, scope, content, tags, links? })

// Learning
learning.capture({ kind, sources, tags?, label? })
learning.distill({ candidateId, intent, constraints?, variablesHint? })
learning.upsertPattern({ patternDraft, publish })
learning.recall({ query, lang?, framework?, version?, k? })
learning.apply({ patternId, variables, mode: "dry-run" | "write" })
learning.feedback({ patternId, outcome, notes?, patchId? })

// Utils
repo.stats()
```

---

## 9) Learning System (spécifications)

### 9.1 PatternCard v1 (format LLM ultra compact)

Le modèle ne doit jamais recevoir des templates énormes si inutile.

**PatternCard** = métadonnées compactes + chemins templates + checklist + gotchas + sources (sans contenu complet par défaut).

**Règle** :
- `recall` => max 3 PatternCards
- `apply` => fetch templates "on demand" si nécessaire

### 9.2 Capture

**Entrées possibles** :
- Diff accepté (id session / patch)
- Sélection de chunks (hits search)
- Dossier "golden path" (src/Module/…)

**Sortie** :
- `candidateId`

### 9.3 Distill (paramétrisation)

**Objectif** : convertir le candidat en template(s) + variables typées.

- Extraction variables via AST (tree-sitter) + fallback heuristique/regex
- Remplacement occurrences (classe, namespace, route, resource, etc.) => `{{Var|transform}}`

### 9.4 Apply

| Mode | Action |
|------|--------|
| dry-run | Produire patch + liste fichiers touchés + checklist |
| write | Appliquer patch (via tool d'édition/écriture) + enregistrer patchId |

Puis `feedback`.

### 9.5 Feedback & ranking

- `success` / `fail` + notes
- `success_rate` influe sur ranking lors de `recall`

---

## 10) UI Web (écrans v1)

### Search
- Query + filters + mode
- Résultats : path + lignes + snippet + actions :
  - Open
  - Promote → Memory
  - Capture → Candidate (Learning)

### Memory
- Liste + filtres (type/scope/tags)
- Detail : content + sources + edit/merge

### Learning
- Patterns list (intent/tags/success rate)
- Pattern editor (vars, constraints, templates, gotchas)
- Test apply (dry-run) + Apply (write)
- Candidates list + Distill wizard

### Index/Policies
- Stats : files/chunks/db size/last index
- Config : ignore paths, extensions, budgets, redaction, embeddings on/off
- Reindex actions

---

## 11) Sécurité / Privacy

- Workspace sandbox (no read/write hors root)
- Secrets redaction (regex + heuristiques)
- Taille max file + skip binaries
- Timeouts (search/open/distill)
- Journaux locaux (opt-in pour debug)

---

## 12) Observabilité

**Logs JSON** : level, event, latency, payload chars

**Metrics** :
| Metric | Description |
|--------|-------------|
| search_latency_ms | p50/p95 |
| open_latency_ms | Latence open |
| tool_return_chars | Chars retournés |
| patterns_apply_success_rate | Taux succès patterns |
| index_duration_ms | Durée indexation |

**UI "Token Dashboard"** :
- Chars returned par tool (estimation tokens)
- Top offenders (calls trop gros)

---

## 13) Critères d'acceptation (DoD)

### Sur un repo réaliste :
- [ ] Index complet OK (sans crash)
- [ ] Search keyword p95 < 250ms (baseline)
- [ ] Open snippet borné (200 lignes max)

### Learning :
- [ ] Création de 10 patterns
- [ ] Demande "nouvelle feature X" => recall <= 3 cards, open <= 2 snippets, patch produit

### Gouvernance :
- [ ] Pattern éditable + sources attachées
- [ ] Memory recall fonctionne

### Budget mode :
- [ ] Tool call payload <= cap (20k chars), sinon truncate+refine

---

## 14) Roadmap

### v1
- Core sqlite + index + search + memory + learning minimal
- MCP tools + UI essential

### v1.1
- Tree-sitter (symbols) + hybrid semantic
- Dédup patterns + score success

### v2
- Multi-user self-hosted + RBAC + audit
- Playbooks debug + rerank
