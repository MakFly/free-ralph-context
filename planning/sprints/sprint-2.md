# Sprint 2 — Memory System

**Objectif** : CRUD mémoires + recall + liens sources + **Progressive Disclosure**

**Durée estimée** : 1 semaine

**Packages** : `@nexus/core`, `apps/web`

**Dépendances** : Sprint 1 (search, storage)

> ⚠️ **Gap Analysis** : Adopter le pattern 3-étapes de claude-mem pour ~10x token savings

---

## User Stories

### S2.1 — Memory CRUD

**As a** user
**I want** créer/éditer/supprimer des mémoires
**So that** je peux stocker des décisions et préférences

**Acceptance Criteria:**
- [ ] Types: decision, preference, fact, note
- [ ] Scopes: repo, branch, ticket, feature, global
- [ ] Tags JSON array
- [ ] Confidence score
- [ ] API endpoints `/memory` (GET, POST, PATCH, DELETE)

**Tâches:**
- [ ] Implémenter `memory.create/update/delete/get/list` dans core
- [ ] Routes API CRUD
- [ ] Validation des types/scopes
- [ ] Tests

---

### S2.2 — Memory Recall (Progressive Disclosure)

**As a** user
**I want** rappeler des mémoires en 3 étapes
**So that** je minimise les tokens consommés

> 🎯 **Pattern claude-mem** : Index compact → Context → Full content on-demand

**Acceptance Criteria:**
- [ ] **Étape 1** : `memory.recall()` retourne index compact (id, summary, type, score)
- [ ] **Étape 2** : `memory.timeline()` retourne contexte chronologique
- [ ] **Étape 3** : `memory.get({ ids })` retourne contenu complet batch
- [ ] Recherche FTS sur content + tags
- [ ] Filtres: type, scope, tags
- [ ] Résultats triés par pertinence
- [ ] Index ~50 tokens, full ~500+ tokens

**Tâches:**
- [ ] Ajouter table `memories_fts` ou utiliser FTS5
- [ ] Implémenter `recall()` → retourne `[{ id, summary, type, score }]`
- [ ] Implémenter `get({ ids })` → retourne full content batch
- [ ] Route API `GET /memory/recall?q=...` (compact)
- [ ] Route API `POST /memory/batch` (full by IDs)
- [ ] Tests recall 3-étapes

---

### S2.3 — Memory Links (Sources)

**As a** user
**I want** lier une mémoire à des fichiers/chunks
**So that** je vois d'où vient l'information

**Acceptance Criteria:**
- [ ] Table `memory_links` fonctionnelle
- [ ] Liens file_id et/ou chunk_id
- [ ] Affichage des sources dans l'UI
- [ ] Navigation vers le code source

**Tâches:**
- [ ] CRUD memory_links
- [ ] Include links dans memory.get
- [ ] UI: afficher sources cliquables
- [ ] Navigation vers search/open

---

### S2.4 — UI Memory Page

**As a** user
**I want** une interface de gestion des mémoires
**So that** je peux voir et éditer mes mémoires

**Acceptance Criteria:**
- [ ] Page `/memories` avec liste
- [ ] Filtres: type, scope, tags
- [ ] Modal création/édition
- [ ] Affichage sources liées
- [ ] Actions: edit, delete, merge

**Tâches:**
- [ ] Créer hooks `useMemories()`, `useMemory(id)`
- [ ] Composant `MemoryCard`
- [ ] Modal `MemoryForm`
- [ ] Filtres et recherche inline
- [ ] Connecter aux stores existants

---

### S2.5 — Memory Timeline

**As a** user
**I want** voir le contexte chronologique autour d'une mémoire
**So that** je comprends le contexte de création

> 🎯 **Inspiré claude-mem** : Timeline pour debug et contexte

**Acceptance Criteria:**
- [ ] `memory.timeline({ around: memoryId, window: 5 })`
- [ ] Retourne mémoires avant/après triées par date
- [ ] Utile pour comprendre le contexte d'une décision
- [ ] API endpoint `GET /memory/:id/timeline`

**Tâches:**
- [ ] Implémenter `timeline()` dans core
- [ ] Query SQL avec window autour de created_at
- [ ] Route API timeline
- [ ] Tests

---

## Livrables

- [ ] CRUD mémoires complet
- [ ] Recall 3-étapes (progressive disclosure)
- [ ] Batch get by IDs
- [ ] Timeline chronologique
- [ ] Sources liées
- [ ] UI Memory page

---

## Métriques de succès

| Métrique | Cible |
|----------|-------|
| Token savings | 10x vs full fetch |
| Recall latency | < 100ms |
| Index compact | ~50 tokens/item |

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Confusion 3 étapes pour users | Documentation claire + __WORKFLOW tool |
| Memory links orphelins | Cascade delete + validation |
