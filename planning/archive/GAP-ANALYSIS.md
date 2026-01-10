# Gap Analysis — MCP Unified vs claude-mem vs mgrep

## Légende

| Statut | Signification |
|--------|---------------|
| ✅ | Couvert dans notre PRD/Sprints |
| ⚠️ | Partiellement couvert, à renforcer |
| ❌ | Gap identifié, à ajouter |
| 🚫 | Hors scope v1 (design choice) |

---

## 1. claude-mem (Memory System)

| Feature | claude-mem | Nous | Statut | Notes |
|---------|------------|------|--------|-------|
| **MCP Tools** | 4 tools (search, timeline, get_observations, __IMPORTANT) | memory.recall, memory.upsert | ⚠️ | Manque `timeline` et pattern 3-étapes |
| **Progressive Disclosure** | 3 layers (index compact → timeline → full) | Non explicite | ❌ | **GAP CRITIQUE** — économise ~10x tokens |
| **Session-based Memory** | Sessions avec observations liées | Scopes (repo/branch/ticket) | ✅ | Différente approche, mais couverte |
| **SQLite + FTS5** | Oui | Oui | ✅ | Identique |
| **Vector Search (Chroma)** | Hybride sémantique + keyword | Should have (embeddings optionnel) | ⚠️ | Prévu mais optionnel |
| **Lifecycle Hooks** | 5 hooks Claude Code | Non prévu | ❌ | **GAP** — auto-capture observations |
| **Privacy tags** | `<private>` exclusion | Secrets redaction | ⚠️ | Approche différente, à enrichir |
| **Web Viewer UI** | Port 37777 | UI Web complète | ✅ | Plus riche chez nous |
| **Context Auto-injection** | Au démarrage session | Non prévu | ❌ | **GAP** — MCP prompts? |
| **Timeline chronologique** | Contexte autour d'observations | Non prévu | ❌ | **GAP** — utile pour debug |
| **Batch get by IDs** | `get_observations(ids[])` | Non explicite | ⚠️ | À ajouter dans API |

### Gaps critiques claude-mem

1. **Progressive Disclosure Pattern** — Notre `memory.recall` retourne tout d'un coup. Il faut:
   - Étape 1: Index compact (IDs + résumé 1 ligne)
   - Étape 2: `memory.get(ids[])` pour détails

2. **Lifecycle Hooks** — Claude-mem capture automatiquement les observations via hooks. Options:
   - Documenter comment intégrer nos tools dans les hooks existants
   - Ou créer notre propre système de hooks

3. **Timeline** — Ajouter `memory.timeline({ around: memoryId, window: 5 })` pour contexte chronologique

---

## 2. mgrep (Search System)

| Feature | mgrep | Nous | Statut | Notes |
|---------|-------|------|--------|-------|
| **Semantic Search** | Natural language queries | Should have (embeddings) | ⚠️ | Prévu mais optionnel |
| **Keyword Search** | grep-compatible | FTS5 | ✅ | Équivalent |
| **Hybrid Ranking** | Semantic + keyword fusionnés | Should have | ⚠️ | Prévu |
| **Reranking** | Cross-encoder par défaut | Could have | ⚠️ | Mentionné dans PRD |
| **Multimodal** | Code, text, PDFs, images | Code only | 🚫 | Hors scope v1 |
| **Multilingual** | Oui | Non mentionné | ⚠️ | FTS5 le supporte |
| **Continuous Indexing** | `watch` command + file watchers | Watcher optionnel | ✅ | Prévu Sprint 1 |
| **.gitignore respect** | Oui | Ignore patterns | ✅ | Couvert |
| **Web Search** | `--web` flag | Non prévu | 🚫 | Hors scope v1 |
| **Answer Synthesis** | `--answer` flag | Non prévu | ❌ | **GAP INTÉRESSANT** |
| **Cloud-backed** | Team sharing | Non prévu | 🚫 | v2 (multi-user) |
| **Token efficiency** | ~2x fewer tokens | Budget mode + caps | ✅ | Notre focus principal |
| **Snippet bounds** | Implicite | Explicite (80 lines max) | ✅ | Plus strict chez nous |
| **grep-compatible flags** | `-m`, `-c`, etc. | Non prévu | ⚠️ | Nice to have |

### Gaps critiques mgrep

1. **Semantic Search par défaut** — Leur USP est le "natural language search". Notre FTS5 est keyword-only. Options:
   - Embeddings BYOK obligatoire pour v1
   - Ou hybrid ranking avec FTS5 boosted

2. **Reranking** — Ils l'ont par défaut, nous en "Could have". À prioriser en Should have.

3. **Answer Synthesis** — `--answer` génère une réponse synthétique. Très utile pour agents. À considérer.

---

## 3. Synthèse des Gaps

### Must Fix (Sprint 0-2)

| Gap | Impact | Solution proposée | Sprint |
|-----|--------|-------------------|--------|
| Progressive Disclosure | Token efficiency x10 | Refactorer `memory.recall` en 2 étapes | Sprint 2 |
| Timeline tool | Contexte debug | Ajouter `memory.timeline()` | Sprint 2 |
| Batch get by IDs | Efficiency | `memory.get({ ids: [...] })` | Sprint 2 |

### Should Fix (Sprint 3-5)

| Gap | Impact | Solution proposée | Sprint |
|-----|--------|-------------------|--------|
| Semantic search | Search quality | Embeddings non-optionnel | Sprint 1.1 |
| Reranking | Relevance | Cross-encoder local | Sprint 1.1 |
| Context auto-injection | UX agents | MCP prompts au démarrage | Sprint 5 |

### Nice to Have (v1.1+)

| Gap | Impact | Solution proposée | Sprint |
|-----|--------|-------------------|--------|
| Answer synthesis | Agent productivity | `--answer` mode | v1.1 |
| Lifecycle hooks | Auto-capture | Intégration Claude Code hooks | v1.1 |
| grep-compatible flags | DX familiarité | Mapper flags | v1.1 |

---

## 4. Notre Avantage Différentiant

Ce qu'on a et qu'ils n'ont PAS :

| Feature | Nous | claude-mem | mgrep |
|---------|------|------------|-------|
| **Learning System** | Capture → Distill → Apply → Feedback | ❌ | ❌ |
| **PatternCards** | Templates paramétrés + variables | ❌ | ❌ |
| **Apply with dry-run** | Preview patch avant écriture | ❌ | ❌ |
| **Success rate tracking** | Patterns s'améliorent avec feedback | ❌ | ❌ |
| **Unified system** | Search + Memory + Learning en 1 | Memory only | Search only |
| **Budget mode strict** | Caps explicites + truncation | Implicite | Implicite |
| **Governance UI** | Edit patterns, sources, tags | Viewer only | CLI only |

**Notre USP** : Le Learning System est unique. Aucun des deux ne fait capture → distill → apply → feedback.

---

## 5. Recommandations

### Modifications Sprints

**Sprint 2 — Memory** (ajouts) :
- [ ] Refactorer `memory.recall` en pattern 2-étapes (index compact + get full)
- [ ] Ajouter `memory.timeline({ around, window })`
- [ ] Ajouter `memory.get({ ids: [...] })` batch

**Sprint 5 — MCP** (ajouts) :
- [ ] Ajouter MCP Prompts pour context injection au démarrage
- [ ] Documenter intégration avec Claude Code lifecycle hooks

**Sprint 1.1** (nouveau — post-v1) :
- [ ] Semantic search via embeddings (BYOK ou local)
- [ ] Reranking cross-encoder
- [ ] Answer synthesis mode

### Architecture Decision

Pour la Progressive Disclosure, adopter le modèle claude-mem :

```typescript
// Étape 1 : Index compact (~50 tokens)
memory.recall({ query, k: 10 })
// Retourne: [{ id, summary, type, score }]

// Étape 2 : Full content on-demand (~500+ tokens)
memory.get({ ids: ["mem_1", "mem_3"] })
// Retourne: [{ id, content, tags, sources, ... }]
```

Cela s'applique aussi aux patterns :

```typescript
// Étape 1 : PatternCards compactes
learning.recall({ query, k: 3 })
// Retourne: [{ id, intent, title, constraints, score }]

// Étape 2 : Templates on-demand
learning.getTemplates({ patternId })
// Retourne: { templates: [...], variables: [...] }
```

---

## 6. Conclusion

| Aspect | Verdict |
|--------|---------|
| **Memory** | ⚠️ Ajuster pour progressive disclosure |
| **Search** | ✅ OK pour v1, semantic en v1.1 |
| **Learning** | ✅ Notre avantage unique |
| **Token Efficiency** | ⚠️ Renforcer avec 2-step pattern |
| **MCP Tools** | ⚠️ Ajouter context prompts |

**Bottom line** : 3 ajustements critiques à faire dans Sprint 2, le reste est solide ou différenciant.
