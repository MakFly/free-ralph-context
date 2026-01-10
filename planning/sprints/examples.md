# Examples — Cas d'usage concrets

Ce document décrit les scénarios d'usage réels pour valider le système.

---

## 1. Structure du projet examples/

```
examples/
├── repos/                      # Repos de test pour indexation
│   ├── express-api/            # API Express TypeScript
│   ├── nextjs-app/             # App Next.js
│   └── python-flask/           # API Flask Python
│
├── patterns/                   # Patterns pré-créés
│   ├── express-crud.json       # CRUD Express
│   ├── react-component.json    # Composant React
│   └── python-service.json     # Service Python
│
├── scenarios/                  # Scénarios de test
│   ├── 01-first-search.ts
│   ├── 02-memory-workflow.ts
│   ├── 03-pattern-apply.ts
│   ├── 04-full-agent-session.ts
│   └── 05-token-budget-test.ts
│
└── README.md
```

---

## 2. Repos de test

### express-api/

Un repo Express TypeScript réaliste pour tester l'indexation et la recherche.

```
express-api/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── auth.ts
│   ├── services/
│   │   ├── user.service.ts
│   │   ├── post.service.ts
│   │   └── auth.service.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   └── post.model.ts
│   └── utils/
│       ├── logger.ts
│       └── helpers.ts
└── tests/
    ├── routes/
    │   └── users.test.ts
    └── services/
        └── user.service.test.ts
```

**Fichiers clés pour les tests:**

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

```typescript
// src/services/user.service.ts
import { db } from '../config/database';
import { User } from '../models/user.model';

export class UserService {
  async findAll(): Promise<User[]> {
    return db.query('SELECT * FROM users');
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return user || null;
  }

  async create(data: Partial<User>): Promise<User> {
    const result = await db.query(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
      [data.email, data.name, data.passwordHash]
    );
    return this.findById(result.insertId);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await db.query(
      'UPDATE users SET email = ?, name = ? WHERE id = ?',
      [data.email, data.name, id]
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
```

---

## 3. Patterns pré-créés

### express-crud.json

```json
{
  "id": "express-crud",
  "intent": "Create a CRUD service and route for a resource",
  "title": "Express CRUD Pattern",
  "constraints": {
    "lang": "typescript",
    "framework": "express",
    "pathPattern": "src/**"
  },
  "variables": [
    {
      "name": "resource",
      "type": "string",
      "description": "Resource name (singular, lowercase)",
      "transform": "lowercase",
      "example": "user"
    },
    {
      "name": "Resource",
      "type": "string",
      "description": "Resource name (singular, PascalCase)",
      "transform": "pascalCase",
      "example": "User"
    },
    {
      "name": "resources",
      "type": "string",
      "description": "Resource name (plural, lowercase)",
      "transform": "lowercase",
      "example": "users"
    }
  ],
  "templates": [
    {
      "path": "src/services/{{resource}}.service.ts",
      "content": "import { db } from '../config/database';\nimport { {{Resource}} } from '../models/{{resource}}.model';\n\nexport class {{Resource}}Service {\n  async findAll(): Promise<{{Resource}}[]> {\n    return db.query('SELECT * FROM {{resources}}');\n  }\n\n  async findById(id: string): Promise<{{Resource}} | null> {\n    const [item] = await db.query('SELECT * FROM {{resources}} WHERE id = ?', [id]);\n    return item || null;\n  }\n\n  async create(data: Partial<{{Resource}}>): Promise<{{Resource}}> {\n    const result = await db.query(\n      'INSERT INTO {{resources}} (...) VALUES (...)',\n      [...]\n    );\n    return this.findById(result.insertId);\n  }\n\n  async update(id: string, data: Partial<{{Resource}}>): Promise<{{Resource}} | null> {\n    await db.query('UPDATE {{resources}} SET ... WHERE id = ?', [id]);\n    return this.findById(id);\n  }\n\n  async delete(id: string): Promise<boolean> {\n    const result = await db.query('DELETE FROM {{resources}} WHERE id = ?', [id]);\n    return result.affectedRows > 0;\n  }\n}\n"
    },
    {
      "path": "src/routes/{{resources}}.ts",
      "content": "import { Router } from 'express';\nimport { {{Resource}}Service } from '../services/{{resource}}.service';\n\nconst router = Router();\nconst service = new {{Resource}}Service();\n\nrouter.get('/', async (req, res) => {\n  const items = await service.findAll();\n  res.json(items);\n});\n\nrouter.get('/:id', async (req, res) => {\n  const item = await service.findById(req.params.id);\n  if (!item) return res.status(404).json({ error: 'Not found' });\n  res.json(item);\n});\n\nrouter.post('/', async (req, res) => {\n  const item = await service.create(req.body);\n  res.status(201).json(item);\n});\n\nrouter.put('/:id', async (req, res) => {\n  const item = await service.update(req.params.id, req.body);\n  if (!item) return res.status(404).json({ error: 'Not found' });\n  res.json(item);\n});\n\nrouter.delete('/:id', async (req, res) => {\n  const deleted = await service.delete(req.params.id);\n  if (!deleted) return res.status(404).json({ error: 'Not found' });\n  res.status(204).send();\n});\n\nexport default router;\n"
    }
  ],
  "checklist": [
    "Create model file if not exists",
    "Add route to src/routes/index.ts",
    "Add validation middleware",
    "Add tests"
  ],
  "gotchas": [
    "Don't forget error handling in async routes",
    "Add input validation before service calls",
    "Consider pagination for findAll"
  ],
  "sources": []
}
```

---

## 4. Scénarios de test

### Scenario 01: First Search

```typescript
// examples/scenarios/01-first-search.ts

/**
 * Scenario: Premier usage de la recherche
 *
 * Objectif: Vérifier que la recherche retourne des résultats
 * pertinents avec le format compact.
 */

import { NexusClient } from '@nexus/client';

async function run() {
  const client = new NexusClient({
    apiUrl: 'http://localhost:3000'
  });

  console.log('=== Scenario 01: First Search ===\n');

  // 1. Index the example repo
  console.log('1. Indexing express-api...');
  await client.reindex({ path: './examples/repos/express-api' });

  // 2. Search for authentication
  console.log('\n2. Searching for "authentication middleware"...');
  const results = await client.search({
    query: 'authentication middleware',
    mode: 'keyword',
    k: 5
  });

  console.log(`Found ${results.hits.length} results:\n`);
  results.hits.forEach((hit, i) => {
    console.log(`  ${i + 1}. ${hit.path}:${hit.startLine}-${hit.endLine} [${hit.score}%]`);
  });

  // 3. Open the top result
  console.log('\n3. Opening top result...');
  const snippet = await client.open({
    path: results.hits[0].path,
    startLine: results.hits[0].startLine,
    endLine: results.hits[0].endLine
  });

  console.log(`\nSnippet (${snippet.lines} lines):\n`);
  console.log(snippet.content);

  // 4. Verify token efficiency
  console.log('\n4. Token analysis:');
  console.log(`   Search results: ~${estimateTokens(results)} tokens`);
  console.log(`   Snippet: ~${estimateTokens(snippet)} tokens`);
  console.log(`   Total: ~${estimateTokens(results) + estimateTokens(snippet)} tokens`);
}

run().catch(console.error);
```

### Scenario 02: Memory Workflow

```typescript
// examples/scenarios/02-memory-workflow.ts

/**
 * Scenario: Workflow mémoire avec progressive disclosure
 *
 * Objectif: Démontrer les 3 étapes recall → timeline → get
 * et mesurer les économies de tokens.
 */

async function run() {
  const client = new NexusClient({ apiUrl: 'http://localhost:3000' });

  console.log('=== Scenario 02: Memory Workflow ===\n');

  // 1. Seed memories
  console.log('1. Creating 20 test memories...');
  for (let i = 0; i < 20; i++) {
    await client.memory.upsert({
      type: 'decision',
      scope: 'repo',
      title: `Architecture Decision ${i}`,
      content: `This is a detailed decision about component ${i}.
        We decided to use pattern X because of reasons A, B, and C.
        The implications are significant for modules Y and Z.
        Future considerations include migration path and backwards compatibility.
        Team consensus was reached after 3 discussions.`.repeat(3)  // Make it long
    });
  }

  // 2. Recall (compact index)
  console.log('\n2. Recall with query "architecture"...');
  const recall = await client.memory.recall({
    query: 'architecture',
    k: 10
  });

  console.log(`   Found ${recall.items.length} items (compact):`);
  recall.items.slice(0, 3).forEach(item => {
    console.log(`   - #${item.id}: ${item.title} [${item.score}%]`);
  });
  console.log(`   Tokens: ~${estimateTokens(recall)}`);

  // 3. Timeline around first result
  console.log('\n3. Timeline around first result...');
  const timeline = await client.memory.timeline({
    anchor: recall.items[0].id,
    window: 3
  });

  console.log(`   Before: ${timeline.before.length} items`);
  console.log(`   Anchor: ${timeline.anchor.title}`);
  console.log(`   After: ${timeline.after.length} items`);
  console.log(`   Tokens: ~${estimateTokens(timeline)}`);

  // 4. Get full content (only 2 items)
  console.log('\n4. Get full content for 2 items...');
  const full = await client.memory.get({
    ids: [recall.items[0].id, recall.items[1].id]
  });

  full.items.forEach(item => {
    console.log(`   - #${item.id}: ${item.content.substring(0, 100)}...`);
  });
  console.log(`   Tokens: ~${estimateTokens(full)}`);

  // 5. Compare tokens
  console.log('\n5. Token comparison:');
  const recallTokens = estimateTokens(recall);
  const timelineTokens = estimateTokens(timeline);
  const fullTokens = estimateTokens(full);

  console.log(`   Recall (10 items): ${recallTokens} tokens`);
  console.log(`   Timeline: ${timelineTokens} tokens`);
  console.log(`   Full (2 items): ${fullTokens} tokens`);
  console.log(`   Total used: ${recallTokens + timelineTokens + fullTokens} tokens`);

  // Compare to fetching all 10 full items
  const allFull = await client.memory.get({
    ids: recall.items.map(i => i.id)
  });
  const allFullTokens = estimateTokens(allFull);

  console.log(`\n   vs. Fetching all 10 full items: ${allFullTokens} tokens`);
  console.log(`   SAVINGS: ${Math.round((1 - (recallTokens + fullTokens) / allFullTokens) * 100)}%`);
}

run().catch(console.error);
```

### Scenario 03: Pattern Apply

```typescript
// examples/scenarios/03-pattern-apply.ts

/**
 * Scenario: Appliquer un pattern pour créer du code
 *
 * Objectif: Démontrer le workflow capture → distill → apply → feedback
 */

async function run() {
  const client = new NexusClient({ apiUrl: 'http://localhost:3000' });

  console.log('=== Scenario 03: Pattern Apply ===\n');

  // 1. Recall existing patterns
  console.log('1. Recalling patterns for "CRUD service"...');
  const patterns = await client.learning.recall({
    query: 'CRUD service',
    lang: 'typescript'
  });

  console.log(`   Found ${patterns.patterns.length} patterns:`);
  patterns.patterns.forEach(p => {
    console.log(`   - ${p.title} (success: ${p.successRate * 100}%)`);
  });

  // 2. Get templates for first pattern
  console.log('\n2. Getting templates for first pattern...');
  const templates = await client.learning.getTemplates({
    patternId: patterns.patterns[0].id
  });

  console.log(`   Variables: ${templates.variables.map(v => v.name).join(', ')}`);
  console.log(`   Templates: ${templates.templates.length} files`);
  templates.templates.forEach(t => {
    console.log(`   - ${t.path}`);
  });

  // 3. Apply dry-run
  console.log('\n3. Applying pattern (dry-run)...');
  const dryRun = await client.learning.apply({
    patternId: patterns.patterns[0].id,
    variables: {
      resource: 'product',
      Resource: 'Product',
      resources: 'products'
    },
    mode: 'dry-run'
  });

  console.log('   Files to create:');
  dryRun.patch.forEach(p => {
    console.log(`   - ${p.action}: ${p.path}`);
  });

  console.log('\n   Checklist:');
  dryRun.checklist.forEach(c => {
    console.log(`   [ ] ${c}`);
  });

  // 4. Apply write
  console.log('\n4. Applying pattern (write)...');
  const write = await client.learning.apply({
    patternId: patterns.patterns[0].id,
    variables: {
      resource: 'product',
      Resource: 'Product',
      resources: 'products'
    },
    mode: 'write'
  });

  console.log(`   Patch ID: ${write.patchId}`);
  console.log(`   Files created: ${write.filesCreated.join(', ')}`);

  // 5. Feedback
  console.log('\n5. Providing feedback...');
  const feedback = await client.learning.feedback({
    patternId: patterns.patterns[0].id,
    patchId: write.patchId,
    outcome: 'success',
    notes: 'Generated clean CRUD code, worked first try'
  });

  console.log(`   New success rate: ${feedback.successRate * 100}%`);
}

run().catch(console.error);
```

### Scenario 04: Full Agent Session

```typescript
// examples/scenarios/04-full-agent-session.ts

/**
 * Scenario: Session agent complète
 *
 * Objectif: Simuler une session Claude Code réaliste
 * et mesurer l'efficacité tokens totale.
 */

async function run() {
  const client = new NexusClient({ apiUrl: 'http://localhost:3000' });
  const tracker = new TokenTracker();

  console.log('=== Scenario 04: Full Agent Session ===\n');
  console.log('Task: "Add a new comments feature to the blog API"\n');

  // 1. Search for existing patterns
  console.log('Step 1: Search for similar patterns...');
  const patterns = await client.learning.recall({
    query: 'CRUD feature blog',
    k: 3
  });
  tracker.add('pattern.recall', patterns);

  if (patterns.patterns.length > 0) {
    console.log(`   Found pattern: ${patterns.patterns[0].title}`);
  }

  // 2. Recall relevant memories
  console.log('\nStep 2: Recall past decisions about blog...');
  const memories = await client.memory.recall({
    query: 'blog architecture posts',
    k: 5
  });
  tracker.add('memory.recall', memories);
  console.log(`   Found ${memories.items.length} relevant memories`);

  // 3. Search for existing post code
  console.log('\nStep 3: Search for post implementation...');
  const search = await client.search({
    query: 'post service CRUD',
    k: 5
  });
  tracker.add('code.search', search);
  console.log(`   Found ${search.hits.length} code matches`);

  // 4. Open top match
  console.log('\nStep 4: Open post service code...');
  const snippet = await client.open({
    path: search.hits[0].path,
    startLine: search.hits[0].startLine,
    endLine: Math.min(search.hits[0].endLine, search.hits[0].startLine + 50)
  });
  tracker.add('code.open', snippet);
  console.log(`   Loaded ${snippet.lines} lines of code`);

  // 5. Get one memory in full
  console.log('\nStep 5: Get full memory about comments...');
  const fullMemory = await client.memory.get({
    ids: [memories.items[0].id]
  });
  tracker.add('memory.get', fullMemory);
  console.log(`   Loaded: ${fullMemory.items[0].title}`);

  // 6. Apply pattern
  console.log('\nStep 6: Apply CRUD pattern for comments...');
  const apply = await client.learning.apply({
    patternId: patterns.patterns[0]?.id || 'crud-default',
    variables: {
      resource: 'comment',
      Resource: 'Comment',
      resources: 'comments'
    },
    mode: 'dry-run'
  });
  tracker.add('learning.apply', apply);
  console.log(`   Would create ${apply.patch.length} files`);

  // 7. Save new memory
  console.log('\nStep 7: Save decision memory...');
  const newMemory = await client.memory.upsert({
    type: 'decision',
    scope: 'feature',
    title: 'Comments feature implementation',
    content: 'Used CRUD pattern for comments, linked to posts via post_id',
    tags: ['comments', 'blog', 'feature']
  });
  tracker.add('memory.upsert', newMemory);
  console.log(`   Saved memory #${newMemory.id}`);

  // Final report
  console.log('\n' + '='.repeat(50));
  console.log('TOKEN USAGE REPORT');
  console.log('='.repeat(50));
  tracker.printReport();

  console.log('\nComparison to naive approach:');
  console.log(`   With progressive disclosure: ${tracker.total()} tokens`);
  console.log(`   Without (fetch all full): ~${tracker.total() * 8} tokens (estimated)`);
  console.log(`   SAVINGS: ~${Math.round((1 - 1/8) * 100)}%`);
}

run().catch(console.error);
```

### Scenario 05: Token Budget Test

```typescript
// examples/scenarios/05-token-budget-test.ts

/**
 * Scenario: Test des limites de budget
 *
 * Objectif: Vérifier que les caps sont respectés
 */

async function run() {
  const client = new NexusClient({ apiUrl: 'http://localhost:3000' });

  console.log('=== Scenario 05: Token Budget Test ===\n');

  // Test 1: Search cap (maxSearchHits=12)
  console.log('Test 1: Search cap (max 12 hits)');
  const search = await client.search({
    query: 'function',  // Should match many
    k: 100              // Request 100
  });
  console.log(`   Requested: 100, Got: ${search.hits.length}, Truncated: ${search.truncated}`);
  console.assert(search.hits.length <= 12, 'Search cap violated!');

  // Test 2: Open cap (maxOpenLines=200)
  console.log('\nTest 2: Open cap (max 200 lines)');
  const snippet = await client.open({
    path: 'src/large-file.ts',
    startLine: 1,
    endLine: 500  // Request 500 lines
  });
  console.log(`   Requested: 500 lines, Got: ${snippet.lines}, Truncated: ${snippet.truncated}`);
  console.assert(snippet.lines <= 200, 'Open cap violated!');

  // Test 3: Pattern recall cap (maxPatternCards=3)
  console.log('\nTest 3: Pattern recall cap (max 3)');
  const patterns = await client.learning.recall({
    query: 'pattern',
    k: 10  // Request 10
  });
  console.log(`   Requested: 10, Got: ${patterns.patterns.length}`);
  console.assert(patterns.patterns.length <= 3, 'Pattern cap violated!');

  // Test 4: Tool return size (maxToolReturnChars=20000)
  console.log('\nTest 4: Tool return size (max 20k chars)');
  const largeResult = await client.search({
    query: 'import',
    k: 12,
    includeContent: true  // Include full content
  });
  const chars = JSON.stringify(largeResult).length;
  console.log(`   Result size: ${chars} chars, Max: 20000`);
  console.assert(chars <= 20000, 'Return size cap violated!');

  console.log('\n✅ All budget caps respected!');
}

run().catch(console.error);
```

---

## 5. Helper: Token Tracker

```typescript
// examples/helpers/token-tracker.ts

export class TokenTracker {
  private entries: { name: string; tokens: number; data: any }[] = [];

  add(name: string, data: any) {
    const tokens = this.estimate(data);
    this.entries.push({ name, tokens, data });
  }

  estimate(data: any): number {
    const chars = JSON.stringify(data).length;
    return Math.ceil(chars / 4);  // ~4 chars per token
  }

  total(): number {
    return this.entries.reduce((sum, e) => sum + e.tokens, 0);
  }

  printReport() {
    console.log('\n| Operation | Tokens |');
    console.log('|-----------|--------|');
    this.entries.forEach(e => {
      console.log(`| ${e.name.padEnd(20)} | ${e.tokens.toString().padStart(6)} |`);
    });
    console.log('|-----------|--------|');
    console.log(`| TOTAL | ${this.total().toString().padStart(6)} |`);
  }
}
```

---

## 6. Running Examples

```bash
# Install dependencies
cd examples
bun install

# Start the API server (in another terminal)
cd ../apps/api && bun run dev

# Run scenarios
bun run scenarios/01-first-search.ts
bun run scenarios/02-memory-workflow.ts
bun run scenarios/03-pattern-apply.ts
bun run scenarios/04-full-agent-session.ts
bun run scenarios/05-token-budget-test.ts

# Run all
bun run all-scenarios
```
