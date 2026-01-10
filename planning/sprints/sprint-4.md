# Sprint 4 — Learning Apply

**Objectif** : Apply patterns + Feedback + Ranking

**Durée estimée** : 1 semaine

**Packages** : `@nexus/core`, `apps/web`

**Dépendances** : Sprint 3 (learning core)

---

## User Stories

### S4.1 — Apply Dry-Run

**As a** user
**I want** prévisualiser l'application d'un pattern
**So that** je vois le résultat avant de l'écrire

**Acceptance Criteria:**
- [ ] Mode dry-run: génère patch sans écrire
- [ ] Résolution des variables
- [ ] Liste fichiers touchés
- [ ] Checklist affichée
- [ ] API `POST /patterns/apply` avec mode=dry-run

**Tâches:**
- [ ] Implémenter `learning.apply({ patternId, variables, mode: "dry-run" })`
- [ ] Résoudre templates avec variables
- [ ] Générer diff/patch
- [ ] Retourner preview
- [ ] Route API apply

---

### S4.2 — Apply Write

**As a** user
**I want** appliquer un pattern pour créer/modifier des fichiers
**So that** je génère du code automatiquement

**Acceptance Criteria:**
- [ ] Mode write: applique le patch
- [ ] Création/modification de fichiers
- [ ] Retourne patchId pour feedback
- [ ] API `POST /patterns/apply` avec mode=write

**Tâches:**
- [ ] Implémenter mode write
- [ ] Écriture fichiers (fs)
- [ ] Enregistrer patch dans table `patches`
- [ ] Retourner patchId + files created/modified

---

### S4.3 — Feedback Loop

**As a** user
**I want** donner du feedback sur l'application
**So that** les patterns s'améliorent

**Acceptance Criteria:**
- [ ] Table `feedback` fonctionnelle
- [ ] Outcomes: success, fail
- [ ] Notes optionnelles
- [ ] Update success_rate du pattern
- [ ] API `POST /patterns/feedback`

**Tâches:**
- [ ] CRUD feedback dans storage
- [ ] Implémenter `learning.feedback({ patternId, outcome, notes?, patchId? })`
- [ ] Recalculer success_rate
- [ ] Route API feedback

---

### S4.4 — UI Apply Flow

**As a** user
**I want** appliquer des patterns depuis l'UI
**So that** je génère du code visuellement

**Acceptance Criteria:**
- [ ] Modal "Apply Pattern"
- [ ] Formulaire variables
- [ ] Preview dry-run avec diff
- [ ] Boutons: Apply, Cancel
- [ ] Feedback modal après apply

**Tâches:**
- [ ] Composant `ApplyModal`
- [ ] Formulaire dynamique pour variables
- [ ] Affichage diff (react-diff-viewer ou custom)
- [ ] Composant `FeedbackModal`
- [ ] Intégration page Learning

---

## Livrables

- [ ] Apply dry-run + write
- [ ] Feedback loop fonctionnel
- [ ] Success rate dynamique
- [ ] UI Apply complète

---

## Apply Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      APPLY FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Recall Pattern                                          │
│     └── learning.recall({ query }) → PatternCards           │
│                                                             │
│  2. Select Pattern                                          │
│     └── User choisit un pattern                             │
│                                                             │
│  3. Get Templates (on-demand)                               │
│     └── learning.getTemplates({ patternId })                │
│                                                             │
│  4. Fill Variables                                          │
│     └── UI formulaire avec validation                       │
│                                                             │
│  5. Dry-Run Preview                                         │
│     └── learning.apply({ mode: "dry-run" })                 │
│     └── Affiche diff + checklist                            │
│                                                             │
│  6. Apply Write                                             │
│     └── learning.apply({ mode: "write" })                   │
│     └── Crée/modifie fichiers                               │
│     └── Retourne patchId                                    │
│                                                             │
│  7. Feedback                                                │
│     └── learning.feedback({ outcome: "success" | "fail" })  │
│     └── Update success_rate                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Rate Calculation

```typescript
function calculateSuccessRate(pattern: Pattern): number {
  const total = pattern.successCount + pattern.failCount;
  if (total === 0) return 0.5; // Neutral starting point
  return pattern.successCount / total;
}

// Ranking: patterns triés par success_rate DESC
// Tie-breaker: usageCount DESC
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Conflits fichiers existants | Dry-run obligatoire + confirmation |
| Feedback biaisé | Notes obligatoires sur fail |
