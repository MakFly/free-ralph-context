# Sprint 5 — MCP Server

**Objectif** : Exposition des tools via MCP

**Durée estimée** : 1 semaine

**Packages** : `apps/mcp-server`

**Dépendances** : Sprint 4 (tous les systèmes core)

---

## User Stories

### S5.1 — MCP Server Bootstrap

**As a** developer
**I want** un serveur MCP fonctionnel
**So that** Claude Code peut utiliser les tools

**Acceptance Criteria:**
- [ ] Package `apps/mcp-server/` créé
- [ ] Mode stdio supporté
- [ ] Manifest tools exposé
- [ ] Connection handshake fonctionnel

**Tâches:**
- [ ] Setup MCP SDK
- [ ] Implémenter stdio transport
- [ ] Manifest avec liste tools
- [ ] Tests connection

---

### S5.2 — MCP Tools: Search

**As a** Claude agent
**I want** utiliser code.search et code.open
**So that** je peux explorer le code

**Acceptance Criteria:**
- [ ] Tool `code.search({ query, mode, k, filters })`
- [ ] Tool `code.open({ path, startLine, endLine })`
- [ ] Respect des caps (maxSearchHits, maxOpenLines)
- [ ] Retour formaté pour LLM

**Tâches:**
- [ ] Implémenter handler code.search
- [ ] Implémenter handler code.open
- [ ] Formater output compact
- [ ] Tests MCP

---

### S5.3 — MCP Tools: Memory

**As a** Claude agent
**I want** utiliser memory.recall et memory.upsert
**So that** je peux stocker et rappeler des informations

**Acceptance Criteria:**
- [ ] Tool `memory.recall({ query, scope?, tags?, k? })`
- [ ] Tool `memory.upsert({ type, scope, content, tags, links? })`
- [ ] Format compact

**Tâches:**
- [ ] Handler memory.recall
- [ ] Handler memory.upsert
- [ ] Tests

---

### S5.4 — MCP Tools: Learning

**As a** Claude agent
**I want** utiliser les tools learning
**So that** je peux capturer et appliquer des patterns

**Acceptance Criteria:**
- [ ] Tool `learning.capture`
- [ ] Tool `learning.distill`
- [ ] Tool `learning.upsertPattern`
- [ ] Tool `learning.recall`
- [ ] Tool `learning.apply`
- [ ] Tool `learning.feedback`

**Tâches:**
- [ ] Handlers pour chaque tool
- [ ] Respect caps (maxPatternCards=3, maxTemplateChars=6k)
- [ ] Tests

---

### S5.5 — MCP Tool: repo.stats

**As a** Claude agent
**I want** voir les stats du repo
**So that** je comprends le contexte

**Acceptance Criteria:**
- [ ] Tool `repo.stats()`
- [ ] Retourne: files count, chunks count, patterns count, last index time

**Tâches:**
- [ ] Implémenter handler repo.stats
- [ ] Tests

---

### S5.6 — MCP Prompts (Context Auto-injection)

**As a** Claude agent
**I want** recevoir du contexte pertinent au démarrage
**So that** je suis productif dès le début de session

> 🎯 **Inspiré claude-mem** : Context injection sans intervention manuelle

**Acceptance Criteria:**
- [ ] MCP Prompts définis dans le manifest
- [ ] Prompt "session_start" avec contexte repo (stats, patterns fréquents, mémoires récentes)
- [ ] Prompt "onboarding" avec conventions du projet
- [ ] Prompts optionnels (activables par config)

**Tâches:**
- [ ] Définir prompts dans MCP manifest
- [ ] Implémenter génération contexte session_start
- [ ] Implémenter génération onboarding (top patterns + conventions)
- [ ] Config pour activer/désactiver prompts
- [ ] Documentation intégration Claude Code hooks

---

## Livrables

- [ ] MCP Server fonctionnel
- [ ] Tous les tools exposés
- [ ] MCP Prompts pour context injection
- [ ] Tests d'intégration MCP
- [ ] Documentation tools + hooks

---

## MCP Tools Summary

| Tool | Params | Returns | Tokens |
|------|--------|---------|--------|
| `code.search` | query, mode, k, filters | hits[] compact | ~50/hit |
| `code.open` | path, startLine, endLine | snippet | ~200 max |
| `memory.recall` | query, scope?, tags?, k? | items[] compact | ~50/item |
| `memory.timeline` | anchor, window? | before/after | ~150 |
| `memory.get` | ids[] | items[] full | ~500/item |
| `memory.upsert` | type, scope, content, tags | id | minimal |
| `learning.recall` | query, lang?, k? | patterns[] compact | ~100/pattern |
| `learning.getTemplates` | patternId | templates, variables | ~2000 |
| `learning.apply` | patternId, variables, mode | patch/files | variable |
| `learning.feedback` | patternId, outcome, notes? | success_rate | minimal |
| `repo.stats` | - | counts, timestamps | ~50 |

---

## __WORKFLOW Tool (Documentation)

```typescript
{
  name: '__WORKFLOW',
  description: `
MANDATORY 3-LAYER WORKFLOW:

1. SEARCH/RECALL → Get index with IDs (~50 tokens/result)
   code.search({ query, k: 10 })
   memory.recall({ query, k: 10 })
   learning.recall({ query, k: 3 })

2. CONTEXT/TIMELINE → Get surrounding context (optional)
   memory.timeline({ anchor: ID, window: 5 })

3. GET/FETCH → Full details ONLY for filtered IDs
   code.open({ path, startLine, endLine })
   memory.get({ ids: [...] })
   learning.getTemplates({ patternId })

⚠️ NEVER fetch full details without filtering first.
Token savings: 10-20x vs naive approach.
`
}
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| MCP SDK breaking changes | Pin version, tests régression |
| Context injection trop verbeux | Configurable + caps stricts |
