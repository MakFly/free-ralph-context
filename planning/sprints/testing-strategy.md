# Stratégie de Tests — MCP Unified

## Vue d'ensemble

```
tests/
├── unit/                    # Tests unitaires par package
│   ├── storage/
│   ├── core/
│   ├── indexer/
│   └── parsers/
├── integration/             # Tests d'intégration API
│   ├── search.test.ts
│   ├── memory.test.ts
│   └── learning.test.ts
├── e2e/                     # Tests end-to-end MCP
│   ├── mcp-tools.test.ts
│   └── workflow.test.ts
├── fixtures/                # Données de test
│   ├── repos/
│   │   ├── typescript-project/
│   │   ├── python-project/
│   │   └── mixed-project/
│   ├── patterns/
│   │   └── sample-patterns.json
│   └── memories/
│       └── sample-memories.json
└── helpers/
    ├── db.ts                # Setup/teardown DB
    ├── fixtures.ts          # Loaders
    └── mcp-client.ts        # MCP test client
```

---

## 1. Tests Unitaires

### Storage (`packages/storage`)

```typescript
// tests/unit/storage/database.test.ts
describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
  });

  afterEach(() => {
    db.close();
  });

  describe('migrations', () => {
    it('should create all tables', () => {
      const tables = db.listTables();
      expect(tables).toContain('files');
      expect(tables).toContain('chunks');
      expect(tables).toContain('observations');
      expect(tables).toContain('patterns');
    });

    it('should create FTS5 virtual tables', () => {
      const tables = db.listTables();
      expect(tables).toContain('chunks_fts');
      expect(tables).toContain('observations_fts');
    });

    it('should enable WAL mode', () => {
      const mode = db.pragma('journal_mode');
      expect(mode).toBe('wal');
    });
  });

  describe('files CRUD', () => {
    it('should insert and retrieve file', () => {
      const file = { path: 'src/index.ts', hash: 'xxh64:abc123', mtime: Date.now() };
      const id = db.insertFile(file);
      const retrieved = db.getFile(id);
      expect(retrieved.path).toBe(file.path);
    });

    it('should skip insert if hash unchanged', () => {
      const file = { path: 'src/index.ts', hash: 'xxh64:abc123', mtime: Date.now() };
      db.insertFile(file);
      const result = db.upsertFile(file);
      expect(result.updated).toBe(false);
    });
  });
});
```

### Hash (`packages/storage`)

```typescript
// tests/unit/storage/hash.test.ts
describe('xxhash64', () => {
  it('should compute consistent hash', async () => {
    const content = Buffer.from('Hello, World!');
    const hash1 = await computeHash(content);
    const hash2 = await computeHash(content);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^xxh64:[a-f0-9]{16}$/);
  });

  it('should detect content changes', async () => {
    const hash1 = await computeHash(Buffer.from('version 1'));
    const hash2 = await computeHash(Buffer.from('version 2'));
    expect(hash1).not.toBe(hash2);
  });
});
```

### Core Search (`packages/core`)

```typescript
// tests/unit/core/search.test.ts
describe('search', () => {
  let db: Database;
  let searchService: SearchService;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.migrate();
    await seedTestData(db);
    searchService = new SearchService(db);
  });

  describe('keyword search', () => {
    it('should find exact matches', async () => {
      const results = await searchService.search({
        query: 'authentication',
        mode: 'keyword',
        k: 10
      });
      expect(results.hits.length).toBeGreaterThan(0);
      expect(results.hits[0].path).toContain('auth');
    });

    it('should respect maxSearchHits cap', async () => {
      const results = await searchService.search({
        query: 'function',
        mode: 'keyword',
        k: 100  // Demande 100
      });
      expect(results.hits.length).toBeLessThanOrEqual(12);  // Cap à 12
      expect(results.truncated).toBe(true);
    });

    it('should format compact output', async () => {
      const results = await searchService.search({
        query: 'test',
        mode: 'keyword',
        k: 1
      });
      const formatted = formatCompact(results.hits[0]);
      expect(formatted).toMatch(/^\.\/.+:\d+-\d+ \[\d+%\]$/);
    });
  });

  describe('filters', () => {
    it('should filter by language', async () => {
      const results = await searchService.search({
        query: 'class',
        filters: { lang: 'typescript' }
      });
      results.hits.forEach(hit => {
        expect(hit.lang).toBe('typescript');
      });
    });

    it('should filter by path glob', async () => {
      const results = await searchService.search({
        query: 'test',
        filters: { path: 'src/components/**' }
      });
      results.hits.forEach(hit => {
        expect(hit.path).toMatch(/^src\/components\//);
      });
    });
  });
});
```

### Core Memory (`packages/core`)

```typescript
// tests/unit/core/memory.test.ts
describe('memory', () => {
  let memoryService: MemoryService;

  beforeEach(async () => {
    const db = new Database(':memory:');
    db.migrate();
    memoryService = new MemoryService(db);
  });

  describe('progressive disclosure', () => {
    beforeEach(async () => {
      // Seed 50 memories
      for (let i = 0; i < 50; i++) {
        await memoryService.upsert({
          type: 'decision',
          scope: 'repo',
          title: `Decision ${i}`,
          content: `This is the full content of decision ${i} with lots of details...`
        });
      }
    });

    it('recall should return compact index', async () => {
      const results = await memoryService.recall({ query: 'decision', k: 10 });

      // Should have compact fields
      expect(results.items[0]).toHaveProperty('id');
      expect(results.items[0]).toHaveProperty('title');
      expect(results.items[0]).toHaveProperty('type');
      expect(results.items[0]).toHaveProperty('score');

      // Should NOT have full content
      expect(results.items[0]).not.toHaveProperty('content');
      expect(results.items[0]).not.toHaveProperty('narrative');
    });

    it('get should return full content for IDs', async () => {
      const recall = await memoryService.recall({ query: 'decision', k: 3 });
      const ids = recall.items.map(i => i.id);

      const full = await memoryService.get({ ids });

      // Should have full content
      expect(full.items[0]).toHaveProperty('content');
      expect(full.items[0].content).toContain('full content');
    });

    it('token estimation should show ~10x savings', async () => {
      const recall = await memoryService.recall({ query: 'decision', k: 10 });
      const recallTokens = estimateTokens(JSON.stringify(recall));

      const full = await memoryService.get({
        ids: recall.items.map(i => i.id)
      });
      const fullTokens = estimateTokens(JSON.stringify(full));

      const ratio = fullTokens / recallTokens;
      expect(ratio).toBeGreaterThan(5);  // Au moins 5x savings
    });
  });

  describe('timeline', () => {
    it('should return context around anchor', async () => {
      const anchor = await memoryService.upsert({
        type: 'decision',
        title: 'Anchor decision'
      });

      const timeline = await memoryService.timeline({
        anchor: anchor.id,
        window: 3
      });

      expect(timeline.before).toHaveLength(3);
      expect(timeline.anchor.id).toBe(anchor.id);
      expect(timeline.after).toHaveLength(3);
    });
  });
});
```

### Core Learning (`packages/core`)

```typescript
// tests/unit/core/learning.test.ts
describe('learning', () => {
  let learningService: LearningService;

  describe('pattern recall (progressive disclosure)', () => {
    beforeEach(async () => {
      // Seed patterns with large templates
      await learningService.upsertPattern({
        intent: 'Create REST endpoint',
        title: 'Express REST Pattern',
        templates: [
          { path: 'src/routes/{{resource}}.ts', content: '/* 500 lines of code */' }
        ]
      });
    });

    it('recall should return PatternCards without templates', async () => {
      const results = await learningService.recall({ query: 'REST endpoint' });

      expect(results.patterns[0]).toHaveProperty('id');
      expect(results.patterns[0]).toHaveProperty('intent');
      expect(results.patterns[0]).toHaveProperty('title');
      expect(results.patterns[0]).toHaveProperty('successRate');

      // Templates NOT included
      expect(results.patterns[0]).not.toHaveProperty('templates');
    });

    it('getTemplates should return full templates', async () => {
      const recall = await learningService.recall({ query: 'REST' });
      const templates = await learningService.getTemplates({
        patternId: recall.patterns[0].id
      });

      expect(templates.templates).toHaveLength(1);
      expect(templates.templates[0].content).toContain('500 lines');
    });

    it('should cap at 3 PatternCards', async () => {
      // Add 10 patterns
      for (let i = 0; i < 10; i++) {
        await learningService.upsertPattern({
          intent: `Pattern ${i}`,
          title: `Title ${i}`
        });
      }

      const results = await learningService.recall({ query: 'Pattern', k: 10 });
      expect(results.patterns.length).toBeLessThanOrEqual(3);
    });
  });

  describe('apply', () => {
    it('dry-run should return patch without writing', async () => {
      const result = await learningService.apply({
        patternId: 'pattern-1',
        variables: { resource: 'users' },
        mode: 'dry-run'
      });

      expect(result.patch).toHaveLength(1);
      expect(result.patch[0].path).toBe('src/routes/users.ts');
      expect(result.patch[0].action).toBe('create');

      // File should NOT exist
      expect(fs.existsSync('src/routes/users.ts')).toBe(false);
    });

    it('write should create files and return patchId', async () => {
      const result = await learningService.apply({
        patternId: 'pattern-1',
        variables: { resource: 'users' },
        mode: 'write'
      });

      expect(result.patchId).toBeDefined();
      expect(fs.existsSync('src/routes/users.ts')).toBe(true);
    });
  });

  describe('feedback', () => {
    it('should update success_rate', async () => {
      const pattern = await learningService.upsertPattern({
        intent: 'Test pattern'
      });

      // Initial rate
      expect(pattern.successRate).toBe(0.5);

      // Add success
      await learningService.feedback({
        patternId: pattern.id,
        outcome: 'success'
      });

      const updated = await learningService.getPattern(pattern.id);
      expect(updated.successRate).toBeGreaterThan(0.5);
    });
  });
});
```

---

## 2. Tests d'Intégration

### API Search

```typescript
// tests/integration/search.test.ts
describe('API /search', () => {
  let app: Hono;

  beforeAll(async () => {
    app = await createApp({ dbPath: ':memory:' });
    await indexFixtureRepo(app, 'fixtures/repos/typescript-project');
  });

  it('POST /search returns results', async () => {
    const res = await app.request('/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'function', k: 5 }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hits).toHaveLength(5);
  });

  it('POST /open returns snippet', async () => {
    const res = await app.request('/open', {
      method: 'POST',
      body: JSON.stringify({
        path: 'src/index.ts',
        startLine: 1,
        endLine: 50
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBeDefined();
    expect(data.content.split('\n').length).toBeLessThanOrEqual(50);
  });

  it('should enforce maxOpenLines=200', async () => {
    const res = await app.request('/open', {
      method: 'POST',
      body: JSON.stringify({
        path: 'src/large-file.ts',
        startLine: 1,
        endLine: 500  // Request 500 lines
      })
    });

    const data = await res.json();
    expect(data.content.split('\n').length).toBeLessThanOrEqual(200);
    expect(data.truncated).toBe(true);
  });
});
```

### API Memory

```typescript
// tests/integration/memory.test.ts
describe('API /memory', () => {
  it('full 3-step workflow', async () => {
    // 1. Create memories
    for (let i = 0; i < 20; i++) {
      await app.request('/memory', {
        method: 'POST',
        body: JSON.stringify({
          type: 'decision',
          scope: 'repo',
          title: `Decision ${i}`,
          content: `Detailed content for decision ${i}...`
        })
      });
    }

    // 2. Recall (compact)
    const recallRes = await app.request('/memory/recall?q=decision&k=5');
    const recall = await recallRes.json();
    expect(recall.items).toHaveLength(5);
    expect(recall.items[0]).not.toHaveProperty('content');

    // 3. Get full (by IDs)
    const ids = recall.items.slice(0, 2).map(i => i.id);
    const fullRes = await app.request('/memory/batch', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
    const full = await fullRes.json();
    expect(full.items).toHaveLength(2);
    expect(full.items[0]).toHaveProperty('content');
  });
});
```

---

## 3. Tests E2E (MCP)

### MCP Tools

```typescript
// tests/e2e/mcp-tools.test.ts
describe('MCP Tools', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = await MCPTestClient.connect({
      command: 'bun',
      args: ['run', 'apps/mcp-server/src/index.ts']
    });
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('code.search', () => {
    it('should return compact results', async () => {
      const result = await client.callTool('code.search', {
        query: 'authentication',
        k: 5
      });

      expect(result.hits).toHaveLength(5);
      expect(result.hits[0]).toMatch(/^\.\/.+:\d+-\d+ \[\d+%\]$/);
    });
  });

  describe('memory.recall + memory.get workflow', () => {
    it('should demonstrate token savings', async () => {
      // Step 1: Recall
      const recall = await client.callTool('memory.recall', {
        query: 'authentication',
        k: 10
      });
      const recallChars = JSON.stringify(recall).length;

      // Step 2: Get (2 items only)
      const full = await client.callTool('memory.get', {
        ids: recall.items.slice(0, 2).map(i => i.id)
      });
      const fullChars = JSON.stringify(full).length;

      // Verify savings
      console.log(`Recall: ${recallChars} chars, Full 2 items: ${fullChars} chars`);
      expect(recallChars).toBeLessThan(fullChars);
    });
  });

  describe('learning workflow', () => {
    it('capture → distill → apply → feedback', async () => {
      // 1. Capture
      const capture = await client.callTool('learning.capture', {
        kind: 'chunks',
        sources: ['chunk-1', 'chunk-2']
      });
      expect(capture.candidateId).toBeDefined();

      // 2. Distill
      const distill = await client.callTool('learning.distill', {
        candidateId: capture.candidateId,
        intent: 'Create a service class'
      });
      expect(distill.patternId).toBeDefined();

      // 3. Apply (dry-run)
      const apply = await client.callTool('learning.apply', {
        patternId: distill.patternId,
        variables: { ServiceName: 'UserService' },
        mode: 'dry-run'
      });
      expect(apply.patch).toBeDefined();

      // 4. Feedback
      const feedback = await client.callTool('learning.feedback', {
        patternId: distill.patternId,
        outcome: 'success'
      });
      expect(feedback.successRate).toBeGreaterThan(0.5);
    });
  });
});
```

### Workflow E2E

```typescript
// tests/e2e/workflow.test.ts
describe('Full Agent Workflow', () => {
  it('should complete task with minimal tokens', async () => {
    const tokenTracker = new TokenTracker();

    // Simulate agent workflow
    // 1. Search for relevant code
    const search = await client.callTool('code.search', {
      query: 'user authentication'
    });
    tokenTracker.add('search', search);

    // 2. Open specific file (from search)
    const open = await client.callTool('code.open', {
      path: search.hits[0].path,
      startLine: search.hits[0].startLine,
      endLine: search.hits[0].endLine
    });
    tokenTracker.add('open', open);

    // 3. Recall relevant memories
    const recall = await client.callTool('memory.recall', {
      query: 'authentication decisions'
    });
    tokenTracker.add('recall', recall);

    // 4. Get only needed memories
    const get = await client.callTool('memory.get', {
      ids: [recall.items[0].id]
    });
    tokenTracker.add('get', get);

    // Report
    console.log(tokenTracker.report());
    expect(tokenTracker.total()).toBeLessThan(5000);  // < 5k tokens total
  });
});
```

---

## 4. Fixtures

### Repo Fixtures

```
fixtures/repos/
├── typescript-project/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── auth/
│   │   │   ├── middleware.ts
│   │   │   └── utils.ts
│   │   ├── routes/
│   │   │   ├── users.ts
│   │   │   └── posts.ts
│   │   └── services/
│   │       └── database.ts
│   └── tests/
│       └── auth.test.ts
│
├── python-project/
│   ├── requirements.txt
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── utils.py
│   └── tests/
│       └── test_main.py
│
└── mixed-project/
    ├── backend/        # Python
    └── frontend/       # TypeScript
```

### Pattern Fixtures

```json
// fixtures/patterns/sample-patterns.json
[
  {
    "id": "pattern-express-route",
    "intent": "Create Express REST endpoint",
    "title": "Express Route Pattern",
    "constraints": {
      "lang": "typescript",
      "framework": "express"
    },
    "variables": [
      { "name": "resource", "type": "string", "transform": "kebabCase" },
      { "name": "Resource", "type": "string", "transform": "pascalCase" }
    ],
    "templates": [
      {
        "path": "src/routes/{{resource}}.ts",
        "content": "import { Router } from 'express';\n\nconst router = Router();\n\nrouter.get('/', (req, res) => {\n  res.json({ message: 'List {{Resource}}' });\n});\n\nexport default router;"
      }
    ],
    "checklist": [
      "Add route to app.ts",
      "Add validation middleware",
      "Add tests"
    ],
    "gotchas": [
      "Don't forget to handle errors",
      "Add rate limiting for public endpoints"
    ]
  }
]
```

---

## 5. Coverage Goals

| Package | Target | Critical Paths |
|---------|--------|----------------|
| `@nexus/storage` | 90% | migrations, CRUD, FTS5 |
| `@nexus/core` | 85% | search, memory.recall, learning.apply |
| `@nexus/indexer` | 80% | scan, chunk, hash |
| `apps/api` | 75% | all endpoints |
| `apps/mcp-server` | 80% | all tools |

---

## 6. CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun test:unit

      - name: Run integration tests
        run: bun test:integration

      - name: Run E2E tests
        run: bun test:e2e

      - name: Coverage report
        run: bun test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 7. Scripts package.json

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "bun test tests/e2e",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch"
  }
}
```
