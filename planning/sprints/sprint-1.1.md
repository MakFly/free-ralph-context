# Sprint 1.1 — Semantic Search (Post-v1)

**Objectif** : Recherche sémantique et reranking (après v1 stable)

**Durée estimée** : 1 semaine

**Packages** : `@nexus/embeddings`, `@nexus/core`

**Dépendances** : v1 stable (Sprint 0-6)

> 🎯 **Inspiré mgrep** : "Natural-language search that feels as immediate as grep"

---

## User Stories

### S1.1.1 — Embeddings Provider

**As a** user
**I want** des embeddings pour mes chunks
**So that** je peux faire de la recherche sémantique

**Acceptance Criteria:**
- [ ] Package `@nexus/embeddings` créé
- [ ] Provider local (e.g., all-MiniLM-L6-v2 via transformers.js)
- [ ] Provider BYOK (OpenAI, Mixedbread, etc.)
- [ ] Table `embeddings` avec vectors
- [ ] Indexation en background

**Tâches:**
- [ ] Créer `packages/embeddings/`
- [ ] Implémenter provider local
- [ ] Implémenter provider BYOK
- [ ] Intégrer avec indexer
- [ ] Tests

---

### S1.1.2 — Hybrid Search

**As a** user
**I want** une recherche hybride (keyword + semantic)
**So that** j'ai les meilleurs résultats

**Acceptance Criteria:**
- [ ] Mode hybrid dans `search()`
- [ ] Fusion des scores (RRF ou weighted)
- [ ] Fallback sur keyword si embeddings non dispo
- [ ] Config pour activer/désactiver

**RRF Algorithm:**
```typescript
function hybridSearch(query: string, options: HybridOptions): SearchResult[] {
  const { alpha = 0.7, k = 10, rrf_k = 60 } = options;

  // 1. BM25 search (FTS5)
  const bm25Results = fts5Search(query, k * 2);

  // 2. Vector search (if embeddings available)
  const vectorResults = embeddingsAvailable
    ? vectorSearch(embed(query), k * 2)
    : [];

  // 3. RRF fusion
  const scores = new Map<string, number>();

  for (let i = 0; i < bm25Results.length; i++) {
    const id = bm25Results[i].id;
    const rrfScore = (1 - alpha) * (1 / (rrf_k + i + 1));
    scores.set(id, (scores.get(id) || 0) + rrfScore);
  }

  for (let i = 0; i < vectorResults.length; i++) {
    const id = vectorResults[i].id;
    const rrfScore = alpha * (1 / (rrf_k + i + 1));
    scores.set(id, (scores.get(id) || 0) + rrfScore);
  }

  // 4. Sort by combined score
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id, score]) => ({ id, score }));
}
```

**Tâches:**
- [ ] Implémenter vector search (cosine similarity)
- [ ] Fusion RRF (Reciprocal Rank Fusion)
- [ ] Config embeddings on/off
- [ ] Tests hybrid

---

### S1.1.3 — Reranking

**As a** user
**I want** un reranking des résultats
**So that** les résultats sont plus pertinents

**Acceptance Criteria:**
- [ ] Cross-encoder local ou BYOK
- [ ] Rerank top-K résultats
- [ ] Désactivable via `--no-rerank`
- [ ] Latence acceptable (< 500ms)

**Tâches:**
- [ ] Intégrer cross-encoder (e.g., ms-marco-MiniLM)
- [ ] Rerank pipeline après search
- [ ] Config rerank on/off
- [ ] Benchmark latence

---

### S1.1.4 — Answer Synthesis

**As a** user
**I want** une réponse synthétique
**So that** je comprends sans lire tous les snippets

> 🎯 **Inspiré mgrep** : `--answer` flag

**Acceptance Criteria:**
- [ ] Mode `answer` dans search
- [ ] Génère résumé des hits
- [ ] Optionnel (flag `--answer` ou param)
- [ ] Utilise LLM local ou BYOK

**Tâches:**
- [ ] Implémenter answer synthesis
- [ ] Intégrer LLM (local ou API)
- [ ] Route API `POST /search?answer=true`
- [ ] Tests

---

## Livrables

- [ ] Embeddings provider (local + BYOK)
- [ ] Hybrid search fonctionnel
- [ ] Reranking par défaut
- [ ] Answer synthesis optionnel

---

## Architecture Embeddings

```
┌─────────────────────────────────────────────────────────────┐
│                    EMBEDDING PIPELINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Chunk Content]                                            │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────┐                                        │
│  │ EmbeddingProvider │                                      │
│  │  - local (transformers.js)                               │
│  │  - openai                                                │
│  │  - mixedbread                                            │
│  │  - ollama                                                │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  [Vector 384/768/1536 dims]                                 │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ SQLite embeddings │                                      │
│  │ table (BLOB)      │                                      │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Métriques de succès

| Métrique | Cible |
|----------|-------|
| Hybrid search quality | +20% relevance vs keyword-only |
| Rerank latency | < 500ms for top-20 |
| Embedding throughput | 100 chunks/sec (local) |

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Embeddings lents | Background indexing + cache |
| Modèle local trop lourd | Small model (MiniLM) par défaut |
| BYOK coûteux | Batch requests + rate limiting |
