# Sprint 6 — Polish + Hardening

**Objectif** : Budget mode, sécurité, observabilité

**Durée estimée** : 1 semaine

**Packages** : `@nexus/policies`, tous

**Dépendances** : Sprint 5 (MCP server)

---

## User Stories

### S6.1 — Budget Mode Enforcement

**As a** user
**I want** que les réponses respectent les caps
**So that** je ne dépasse pas mes limites de tokens

**Acceptance Criteria:**
- [ ] Tous les caps appliqués (voir PRD §6.3)
- [ ] Truncation + message "refine query"
- [ ] UI Token Dashboard

**Budget Caps:**
```typescript
const BUDGET_CAPS = {
  maxSearchHits: 12,
  maxSnippetLines: 80,
  maxOpenLines: 200,
  maxRecallItems: 20,
  maxTimelineWindow: 10,
  maxFullItems: 5,
  maxPatternCards: 3,
  maxTemplateChars: 6000,
  maxToolReturnChars: 20000,
};
```

**Tâches:**
- [ ] Middleware validation payload size
- [ ] Truncation helpers
- [ ] Messages d'erreur explicites
- [ ] Dashboard chars/tokens dans UI

---

### S6.2 — Security Hardening

**As a** user
**I want** que mes données soient protégées
**So that** aucun secret n'est exposé

**Acceptance Criteria:**
- [ ] Sandbox workspace (no read/write hors root)
- [ ] Secrets redaction (regex patterns)
- [ ] Skip binaries + taille max
- [ ] Timeouts sur toutes les opérations

**Tâches:**
- [ ] Package `@nexus/policies`
- [ ] Implémenter secrets redaction
- [ ] Path validation (sandbox)
- [ ] Timeouts configurables

---

### S6.3 — Observability

**As a** developer
**I want** des logs et métriques
**So that** je peux debugger et optimiser

**Acceptance Criteria:**
- [ ] Logs JSON structurés
- [ ] Métriques: latency, payload size, success rate
- [ ] UI logs viewer (opt-in)

**Tâches:**
- [ ] Logger JSON dans core
- [ ] Métriques Prometheus-style (opt)
- [ ] Page `/stats` enrichie
- [ ] Performance monitoring

---

### S6.4 — UI Index/Policies Page

**As a** user
**I want** configurer l'indexation et les policies
**So that** je contrôle ce qui est indexé

**Acceptance Criteria:**
- [ ] Page `/settings` ou `/policies`
- [ ] Config: ignore paths, extensions, budgets
- [ ] Stats: files/chunks/db size/last index
- [ ] Actions: Reindex, Clear cache

**Tâches:**
- [ ] Routes settings/policies
- [ ] Composants de configuration
- [ ] Boutons d'action avec confirmation
- [ ] Affichage stats storage

---

### S6.5 — Testing & Documentation

**As a** developer
**I want** une couverture de tests et docs
**So that** le projet est maintenable

**Acceptance Criteria:**
- [ ] Couverture tests > 70%
- [ ] README par package
- [ ] API documentation (OpenAPI ou markdown)
- [ ] Guide d'installation

**Tâches:**
- [ ] Compléter tests unitaires
- [ ] Tests d'intégration E2E
- [ ] Générer docs API
- [ ] README root + packages

---

## Livrables

- [ ] Budget mode actif
- [ ] Sécurité renforcée
- [ ] Observabilité fonctionnelle
- [ ] Docs et tests complets

---

## Secrets Redaction Patterns

```typescript
const SECRET_PATTERNS = [
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
  /secret\s*[:=]\s*['"][^'"]+['"]/gi,
  /token\s*[:=]\s*['"][^'"]+['"]/gi,
  /bearer\s+[a-zA-Z0-9_-]+/gi,
  /-----BEGIN.*PRIVATE KEY-----/g,
  /ghp_[a-zA-Z0-9]{36}/g,  // GitHub tokens
  /sk-[a-zA-Z0-9]{48}/g,   // OpenAI keys
];

function redact(content: string): string {
  let result = content;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
```

---

## Token Dashboard Metrics

```typescript
interface TokenMetrics {
  search_calls: number;
  search_tokens_returned: number;
  memory_recall_calls: number;
  memory_get_calls: number;
  memory_tokens_saved: number;
  learning_recall_calls: number;
  learning_apply_calls: number;
  total_discovery_tokens: number;
  total_read_tokens: number;
  savings_percent: number;
}
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Secrets non détectés | Patterns exhaustifs + review manuel |
| Tests flaky | Fixtures stables + retry logic |
