# Sprint 0 — Foundation

**Objectif** : Infrastructure monorepo et couche de données

**Durée estimée** : 1 semaine

**Packages** : `@nexus/storage`, `apps/api`

---

## User Stories

### S0.1 — Structure Monorepo

**As a** developer
**I want** une structure monorepo claire
**So that** je peux développer les packages de manière isolée

**Acceptance Criteria:**
- [ ] Structure `apps/` et `packages/` créée
- [ ] Workspace bun configuré
- [ ] Scripts communs (`build`, `test`, `lint`) fonctionnels
- [ ] TypeScript path aliases configurés

**Tâches:**
- [ ] Créer `packages/core/`
- [ ] Créer `packages/storage/`
- [ ] Créer `apps/api/`
- [ ] Créer `apps/mcp-server/`
- [ ] Configurer `package.json` workspace root
- [ ] Configurer `tsconfig` base avec paths

---

### S0.2 — SQLite + Migrations (Schéma Unifié)

**As a** developer
**I want** une base SQLite avec migrations
**So that** les données sont persistées et le schéma versionné

> 🎯 **Schéma unifié** : Voir `UNIFIED-TOKEN-EFFICIENCY.md` §3

**Acceptance Criteria:**
- [ ] Package `@nexus/storage` fonctionnel
- [ ] Schéma unifié avec toutes tables (files, chunks, observations, patterns, etc.)
- [ ] FTS5 triggers auto-sync
- [ ] xxhash64 pour hashing (mgrep pattern)
- [ ] Migrations numérotées et exécutables
- [ ] WAL mode activé pour performance
- [ ] Tests unitaires du storage

**Tables (schéma complet):**
```sql
-- Core
files (id, path, hash, mtime, size, lang, ignored, indexed_at)
chunks (id, file_id, start_line, end_line, content, symbol, kind, token_count)
chunks_fts (FTS5: content, symbol, path)
embeddings (chunk_id, vector, model)

-- Memory (claude-mem inspired)
observations (id, session_id, project, type, title, subtitle, narrative,
              facts_json, concepts_json, files_read_json, files_modified_json,
              prompt_number, discovery_tokens, created_at)
observations_fts (FTS5: title, subtitle, narrative, facts_json)
session_summaries (id, session_id, project, request, investigated, learned,
                   completed, next_steps, notes, discovery_tokens, created_at)
summaries_fts (FTS5: request, investigated, learned, completed)

-- Learning (unique)
patterns (id, intent, title, tags_json, constraints_json, variables_json,
          templates_json, checklist_json, gotchas_json, sources_json,
          usage_count, success_count, fail_count, created_at, updated_at)
patterns_fts (FTS5: intent, title, tags_json)
feedback (id, pattern_id, outcome, notes, patch_id, created_at)
```

**Tâches:**
- [ ] Installer `better-sqlite3` + `xxhash-wasm` dans storage
- [ ] Créer classe `Database` avec init/migrate
- [ ] Créer `hash.ts` wrapper xxhash64 (mgrep pattern)
- [ ] Écrire migration `001_unified_schema.sql`
- [ ] Créer FTS5 triggers pour sync automatique
- [ ] Créer helpers CRUD génériques
- [ ] Écrire tests avec base in-memory

---

### S0.3 — API Server Bootstrap

**As a** frontend developer
**I want** un serveur API HTTP
**So that** l'UI peut communiquer avec le backend

**Acceptance Criteria:**
- [ ] Package `apps/api/` avec Hono ou Fastify
- [ ] Routes health check et stats basiques
- [ ] CORS configuré pour dev local
- [ ] Hot reload fonctionnel

**Tâches:**
- [ ] Setup Hono avec bun
- [ ] Route `GET /health`
- [ ] Route `GET /stats` (mock)
- [ ] Middleware CORS + JSON
- [ ] Script `bun run dev` (optionnel - seulement sur demande)

---

## Livrables

- [ ] Monorepo fonctionnel avec 4+ packages
- [ ] SQLite initialisé avec schéma v1
- [ ] API server bootable
- [ ] Tests de base passants

---

## Dépendances

Aucune — Sprint de démarrage

## Risques

| Risque | Mitigation |
|--------|------------|
| Complexité schéma SQL | Commencer par tables core, ajouter incrementalement |
| Performance FTS5 triggers | Benchmark avec données réalistes |
