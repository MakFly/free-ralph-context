# Sprint Plan — MCP Unified v1

**Basé sur** : PRD-mcp-unified.md
**État initial** : UI Web initialisée (TanStack Router + Zustand + shadcn/ui)
**Méthodologie** : Sprints de 1 semaine, focus vertical (feature complète end-to-end)

---

## Vue d'ensemble

```
Sprint 0   │ Foundation         │ Monorepo + Storage + Migrations
Sprint 1   │ Indexer + Search   │ File indexing + FTS5 search
Sprint 2   │ Memory System      │ CRUD + Progressive Disclosure + Timeline
Sprint 3   │ Learning Core      │ Capture + Distill + Patterns (2-étapes)
Sprint 4   │ Learning Apply     │ Apply + Feedback + Ranking
Sprint 5   │ MCP Server         │ Tools + Prompts (context injection)
Sprint 6   │ Polish + Hardening │ Budget mode + Sécurité + Observabilité
Sprint 1.1 │ Semantic (post-v1) │ Embeddings + Hybrid + Rerank + Answer
```

---

## Gap Analysis (vs claude-mem & mgrep)

> Voir `GAP-ANALYSIS.md` pour le détail complet
> Voir `UNIFIED-TOKEN-EFFICIENCY.md` pour l'architecture détaillée

### Corrections intégrées

| Gap | Source | Solution | Sprint |
|-----|--------|----------|--------|
| Progressive Disclosure | claude-mem | Recall 3-étapes (index → context → full) | 2, 3 |
| Timeline | claude-mem | `memory.timeline()` | 2 |
| Batch get by IDs | claude-mem | `memory.get({ ids })` | 2 |
| Token Economics | claude-mem | Discovery tokens ROI tracking | 2 |
| Session Summaries | claude-mem | Compression 100:1 | 2 |
| Observations Types | claude-mem | decision/bugfix/feature/discovery | 2 |
| Context auto-injection | claude-mem | MCP Prompts + Lifecycle Hooks | 5 |
| Compact Output | mgrep | `path:lines [score%]` format | 1 |
| xxhash64 | mgrep | Dédup rapide pour skip reindex | 0 |
| gitignore hiérarchique | mgrep | Filtrage intelligent | 1 |
| Hybrid Search | mgrep | BM25 + Vector RRF fusion | 1.1 |
| Reranking | mgrep | Cross-encoder top-k | 1.1 |
| Answer synthesis | mgrep | `--answer` mode | 1.1 |

### Token Savings combinés

| Source | Mécanisme | Savings |
|--------|-----------|---------|
| claude-mem | 3-Layer Disclosure | 10x |
| mgrep | Compact + Semantic | 2x |
| Nexus | PatternCards 2-step | 5x |
| **Total** | **Combiné** | **~20x** |

### Notre avantage unique

**Learning System** — Aucun concurrent ne fait :
- Capture → Distill → Apply → Feedback
- PatternCards avec templates paramétrés
- Success rate tracking et amélioration continue

---

## Récapitulatif

| Sprint | Focus | Packages touchés | Fichier |
|--------|-------|------------------|---------|
| 0 | Foundation | storage, api | [sprint-0.md](sprint-0.md) |
| 1 | Indexer + Search | indexer, core, web | [sprint-1.md](sprint-1.md) |
| 2 | Memory | core, web | [sprint-2.md](sprint-2.md) |
| 3 | Learning Core | core, parsers, web | [sprint-3.md](sprint-3.md) |
| 4 | Learning Apply | core, web | [sprint-4.md](sprint-4.md) |
| 5 | MCP Server | mcp-server | [sprint-5.md](sprint-5.md) |
| 6 | Polish | policies, all | [sprint-6.md](sprint-6.md) |
| 1.1 | Semantic Search (post-v1) | embeddings, core | [sprint-1.1.md](sprint-1.1.md) |

---

## Documentation complémentaire

| Document | Description |
|----------|-------------|
| [testing-strategy.md](testing-strategy.md) | Stratégie de tests (unit, integration, E2E) |
| [examples.md](examples.md) | Scénarios d'usage concrets + repos de test |

---

## Critères de succès v1 (rappel PRD)

- [ ] Index complet OK (sans crash)
- [ ] Search keyword p95 < 250ms
- [ ] Open snippet borné (200 lignes max)
- [ ] 10 patterns créés et utilisables
- [ ] Recall ≤ 3 cards, patch produit
- [ ] Pattern éditable + sources attachées
- [ ] Tool call payload ≤ 20k chars

---

## Notes

- Les sprints sont estimés à ~1 semaine chacun
- Priorisation: **Must have** d'abord, **Should have** ensuite
- Tree-sitter (symbols) → Sprint 1.1 (post-v1)
- Semantic search (embeddings) → Sprint 1.1 (post-v1)
- Multi-workspace → v2
