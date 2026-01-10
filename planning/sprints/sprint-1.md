# Sprint 1 — Indexer + Search

**Objectif** : Indexation de fichiers et recherche keyword

**Durée estimée** : 1 semaine

**Packages** : `@nexus/indexer`, `@nexus/core`, `apps/web`

**Dépendances** : Sprint 0 (storage, api)

---

## User Stories

### S1.1 — File Watcher + Indexer

**As a** user
**I want** mes fichiers indexés automatiquement
**So that** je peux les rechercher instantanément

**Acceptance Criteria:**
- [ ] Package `@nexus/indexer` créé
- [ ] Scan initial du workspace
- [ ] Chunking intelligent (par fonction/classe ou lignes)
- [ ] Ignore patterns respectés (.gitignore + custom)
- [ ] Hash-based skip pour fichiers non modifiés
- [ ] Index FTS5 alimenté

**Tâches:**
- [ ] Créer `packages/indexer/`
- [ ] Implémenter `scanWorkspace(root, ignorePatterns)`
- [ ] Implémenter `chunkFile(path, content, lang)`
- [ ] Intégrer avec storage (insert files + chunks)
- [ ] Trigger FTS rebuild
- [ ] Watcher optionnel (chokidar) pour incremental

---

### S1.2 — Search Keyword (FTS5 + Compact Output)

**As a** user
**I want** chercher dans mon code par mots-clés
**So that** je trouve rapidement les snippets pertinents

> 🎯 **Format mgrep** : `path:lines [score%]` pour économie tokens

**Acceptance Criteria:**
- [ ] Package `@nexus/core` avec fonction `search()`
- [ ] Mode keyword (FTS5) fonctionnel
- [ ] **Format compact** : `./path/file.ts:42-58 [87%]` (~50 tokens/hit)
- [ ] Résultats triés par score BM25
- [ ] Snippets bornés (max 80 lignes)
- [ ] Filtres: path glob, lang, kind
- [ ] API endpoint `POST /search`

**Tâches:**
- [ ] Créer `packages/core/`
- [ ] Implémenter `search({ query, mode, k, filters })`
- [ ] Créer `formatCompact()` (mgrep style: path:lines [score%])
- [ ] Ajouter ranking BM25 natif FTS5
- [ ] Respecter `maxSearchHits=12`, `maxSnippetLines=80`
- [ ] Créer route API `/search`
- [ ] Tests avec fixtures

---

### S1.3 — Open Snippet

**As a** user
**I want** ouvrir un snippet avec contexte
**So that** je comprends le code environnant

**Acceptance Criteria:**
- [ ] Fonction `open(path, startLine, endLine)`
- [ ] Borné à `maxOpenLines=200`
- [ ] Retourne metadata (lang, symbols adjacents)
- [ ] API endpoint `POST /open`

**Tâches:**
- [ ] Implémenter `open()` dans core
- [ ] Lire fichier et extraire lignes
- [ ] Enrichir avec metadata
- [ ] Route API `/open`

---

### S1.4 — UI Search Page

**As a** user
**I want** une interface de recherche
**So that** je peux chercher visuellement

**Acceptance Criteria:**
- [ ] Page `/search` connectée à l'API
- [ ] Input query + filtres (mode, lang)
- [ ] Résultats avec highlighting
- [ ] Actions: Open, Promote → Memory, Capture → Learning
- [ ] État de chargement + erreurs gérés

**Tâches:**
- [ ] Créer hook `useSearch()`
- [ ] Connecter à `POST /search`
- [ ] Afficher résultats avec CodeBlock
- [ ] Ajouter filtres dropdown
- [ ] Boutons d'action sur chaque hit

---

## Livrables

- [ ] Indexation complète du workspace
- [ ] Recherche keyword p95 < 250ms
- [ ] UI Search fonctionnelle
- [ ] Tests d'intégration search

---

## Métriques de succès

| Métrique | Cible |
|----------|-------|
| Search latency p95 | < 250ms |
| Index time (1000 files) | < 10s |
| Token/hit (compact) | ~50 tokens |

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Chunking trop naïf | Fallback ligne-par-ligne, tree-sitter en v1.1 |
| Performance FTS5 sur gros repos | Index incrémental + limites |
