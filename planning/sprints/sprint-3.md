# Sprint 3 — Learning Core

**Objectif** : Capture + Distill + PatternCards

**Durée estimée** : 1 semaine

**Packages** : `@nexus/core`, `@nexus/parsers`, `apps/web`

**Dépendances** : Sprint 2 (memory système)

---

## User Stories

### S3.1 — Candidates Capture

**As a** user
**I want** capturer des exemples de code
**So that** je peux les transformer en patterns

**Acceptance Criteria:**
- [ ] Table `candidates` fonctionnelle
- [ ] Capture depuis: diff, chunks sélectionnés, dossier
- [ ] Status: pending, distilled, archived
- [ ] API `POST /patterns/capture`

**Tâches:**
- [ ] Créer table `candidates` dans storage
- [ ] Implémenter `learning.capture({ kind, sources, tags?, label? })`
- [ ] Route API capture
- [ ] Tests

---

### S3.2 — Pattern Distillation

**As a** user
**I want** distiller un candidat en pattern
**So that** j'ai un template réutilisable

**Acceptance Criteria:**
- [ ] Extraction de variables via regex/heuristiques
- [ ] Format PatternCard: intent, title, constraints, variables, templates, checklist, gotchas, sources
- [ ] Variables typées avec transforms
- [ ] API `POST /patterns/distill`

**Tâches:**
- [ ] Créer `packages/parsers/` (fallback regex)
- [ ] Implémenter `learning.distill({ candidateId, intent, constraints?, variablesHint? })`
- [ ] Extraction variables: classe, namespace, route, resource
- [ ] Création PatternCard draft
- [ ] Route API distill

---

### S3.3 — Patterns CRUD

**As a** user
**I want** créer/éditer des patterns
**So that** je peux affiner mes templates

**Acceptance Criteria:**
- [ ] Table `patterns` avec tous les champs
- [ ] API endpoints `/patterns` (GET, POST, PATCH, DELETE)
- [ ] Validation du format PatternCard
- [ ] Fonction `learning.upsertPattern()`

**Tâches:**
- [ ] CRUD patterns dans storage
- [ ] Implémenter upsertPattern dans core
- [ ] Routes API CRUD patterns
- [ ] Tests validation

---

### S3.4 — Pattern Recall (Progressive Disclosure)

**As a** user
**I want** rappeler des patterns en 2 étapes
**So that** je minimise les tokens (templates = gros payloads)

> 🎯 **Même pattern que Memory** : PatternCards compactes → Templates on-demand

**Acceptance Criteria:**
- [ ] **Étape 1** : `learning.recall()` retourne PatternCards compactes (id, intent, title, constraints, score)
- [ ] **Étape 2** : `learning.getTemplates({ patternId })` retourne templates + variables
- [ ] Max 3 PatternCards retournées
- [ ] Ranking par success_rate
- [ ] PatternCard ~100 tokens, templates ~2000+ tokens

**Tâches:**
- [ ] Implémenter `learning.recall()` → PatternCards sans templates
- [ ] Implémenter `learning.getTemplates()` → templates on-demand
- [ ] FTS sur intent + tags
- [ ] Filtres constraints (lang, framework, version)
- [ ] Route API `POST /patterns/recall` (compact)
- [ ] Route API `GET /patterns/:id/templates` (full)

---

### S3.5 — UI Learning Page (Liste + Editor)

**As a** user
**I want** gérer mes patterns visuellement
**So that** je peux les créer et éditer

**Acceptance Criteria:**
- [ ] Page `/learning` avec onglets: Patterns, Candidates
- [ ] Liste patterns avec intent/tags/success_rate
- [ ] Pattern editor: variables, constraints, templates, gotchas
- [ ] Candidates list avec action "Distill"
- [ ] Wizard de distillation

**Tâches:**
- [ ] Créer routes `/learning/patterns`, `/learning/candidates`
- [ ] Composant `PatternCard`
- [ ] Composant `PatternEditor`
- [ ] Wizard `DistillWizard`
- [ ] Hooks API

---

## Livrables

- [ ] Capture → Distill workflow
- [ ] CRUD patterns complet
- [ ] Recall patterns (max 3 cards)
- [ ] UI Learning basique

---

## Format PatternCard

```typescript
interface PatternCard {
  id: string;
  intent: string;           // "Create a new API endpoint"
  title: string;            // "REST Endpoint Pattern"
  constraints: {
    lang?: string;          // "typescript"
    framework?: string;     // "express"
    version?: string;       // "^4.0.0"
    pathPattern?: string;   // "src/routes/**"
  };
  variables: Array<{
    name: string;           // "ResourceName"
    type: string;           // "string" | "number" | "boolean"
    transform?: string;     // "pascalCase" | "camelCase" | "kebabCase"
    default?: string;
  }>;
  // Templates NON inclus dans recall (on-demand via getTemplates)
  templates: Array<{
    path: string;           // "src/routes/{{resourceName}}.ts"
    content: string;
  }>;
  checklist: string[];
  gotchas: string[];
  sources: Array<{
    chunkId?: string;
    fileId?: string;
  }>;
  usageCount: number;
  successRate: number;
}
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Extraction variables imprécise | Regex robustes + validation manuelle UI |
| Templates trop gros | Limite 6k chars + split en fichiers |
