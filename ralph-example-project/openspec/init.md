# HonoJS Microservice API Architecture

> Production-ready, scalable microservice architecture for HonoJS.

---

## Project Structure

```
src/
├── index.ts                 # Entry point - Bun.serve() bootstrap
├── app.ts                   # Hono app instance + global middleware
│
├── routes/                  # Route modules (feature-based)
│   ├── index.ts             # Route aggregator
│   ├── health.routes.ts     # Health checks & readiness
│   ├── auth.routes.ts       # Authentication endpoints
│   ├── users.routes.ts      # User CRUD
│   └── [feature].routes.ts  # One file per feature
│
├── handlers/                # Request handlers (business logic)
│   ├── auth.handler.ts
│   ├── users.handler.ts
│   └── [feature].handler.ts
│
├── services/                # External integrations & business services
│   ├── database.ts          # DB connection (Bun.sql / bun:sqlite)
│   ├── cache.ts             # Redis cache (Bun.redis)
│   ├── queue.ts             # Message queue client
│   ├── storage.ts           # S3/Object storage
│   └── [service].ts         # Third-party APIs
│
├── middleware/              # Custom Hono middleware
│   ├── auth.ts              # JWT/API key validation
│   ├── rate-limit.ts        # Rate limiting
│   ├── cors.ts              # CORS configuration
│   ├── logger.ts            # Request logging
│   ├── error-handler.ts     # Global error handling
│   └── validator.ts         # Request validation wrapper
│
├── schemas/                 # Zod schemas (validation + types)
│   ├── common.ts            # Shared schemas (pagination, errors)
│   ├── auth.schema.ts
│   ├── users.schema.ts
│   └── [feature].schema.ts
│
├── utils/                   # Pure utility functions
│   ├── crypto.ts            # Hashing, encryption
│   ├── date.ts              # Date formatting
│   ├── string.ts            # String manipulation
│   └── response.ts          # Response helpers
│
├── config/                  # Configuration
│   ├── env.ts               # Environment variables (typed)
│   ├── constants.ts         # App constants
│   └── features.ts          # Feature flags
│
├── types/                   # TypeScript types (non-Zod)
│   ├── context.ts           # Hono context extensions
│   ├── env.d.ts             # Environment declarations
│   └── [feature].types.ts
│
└── jobs/                    # Background jobs (optional)
    ├── scheduler.ts         # Job scheduler
    └── [job-name].job.ts
```

---

## Core Files

### `src/index.ts` - Entry Point

```typescript
import { app } from "./app"
import { env } from "./config/env"

Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  // WebSocket support (optional)
  websocket: {
    open(ws) { /* ... */ },
    message(ws, msg) { /* ... */ },
    close(ws) { /* ... */ },
  },
})

console.log(`[API] Running on port ${env.PORT}`)
```

### `src/app.ts` - Hono App

```typescript
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"
import { timing } from "hono/timing"

import { errorHandler } from "./middleware/error-handler"
import { rateLimiter } from "./middleware/rate-limit"
import { routes } from "./routes"
import type { AppEnv } from "./types/context"

const app = new Hono<AppEnv>()

// Global middleware (order matters)
app.use("*", timing())
app.use("*", logger())
app.use("*", secureHeaders())
app.use("*", cors())
app.use("*", rateLimiter())

// Error handling
app.onError(errorHandler)

// Mount routes
app.route("/", routes)

// 404 fallback
app.notFound((c) => c.json({ error: "Not Found" }, 404))

export { app }
```

### `src/routes/index.ts` - Route Aggregator

```typescript
import { Hono } from "hono"
import type { AppEnv } from "../types/context"

import { healthRoutes } from "./health.routes"
import { authRoutes } from "./auth.routes"
import { usersRoutes } from "./users.routes"

const routes = new Hono<AppEnv>()

routes.route("/health", healthRoutes)
routes.route("/auth", authRoutes)
routes.route("/v1/users", usersRoutes)

export { routes }
```

---

## Key Patterns

### 1. Route → Handler Separation

```typescript
// routes/users.routes.ts
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createUserSchema, getUserSchema } from "../schemas/users.schema"
import * as handler from "../handlers/users.handler"

const usersRoutes = new Hono()

usersRoutes.get("/", handler.list)
usersRoutes.get("/:id", zValidator("param", getUserSchema), handler.getById)
usersRoutes.post("/", zValidator("json", createUserSchema), handler.create)

export { usersRoutes }
```

```typescript
// handlers/users.handler.ts
import type { Context } from "hono"
import { db } from "../services/database"
import { ok, created } from "../utils/response"

export const list = async (c: Context) => {
  const users = await db.query.users.findMany()
  return ok(c, users)
}

export const getById = async (c: Context) => {
  const { id } = c.req.valid("param")
  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) return c.json({ error: "User not found" }, 404)
  return ok(c, user)
}

export const create = async (c: Context) => {
  const data = c.req.valid("json")
  const user = await db.insert(users).values(data).returning()
  return created(c, user[0])
}
```

### 2. Typed Environment

```typescript
// config/env.ts
import { z } from "zod"

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  API_KEY_SALT: z.string(),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```

### 3. Context Extension

```typescript
// types/context.ts
import type { Context } from "hono"

export type AppEnv = {
  Variables: {
    userId: string
    requestId: string
  }
  Bindings: {
    // Cloudflare Workers bindings (if applicable)
  }
}

export type AppContext = Context<AppEnv>
```

### 4. Error Handler

```typescript
// middleware/error-handler.ts
import type { ErrorHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { ZodError } from "zod"

export const errorHandler: ErrorHandler = (err, c) => {
  // Validation errors
  if (err instanceof ZodError) {
    return c.json({
      error: "Validation Error",
      details: err.flatten().fieldErrors,
    }, 400)
  }

  // HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }

  // Unknown errors
  console.error("[ERROR]", err)
  return c.json({ error: "Internal Server Error" }, 500)
}
```

---

## Database Layer

### Option A: SQLite (bun:sqlite)

```typescript
// services/database.ts
import { Database } from "bun:sqlite"

export const db = new Database("app.db", { create: true })

// Migrations
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)
```

### Option B: PostgreSQL (Bun.sql)

```typescript
// services/database.ts
import { env } from "../config/env"

export const sql = Bun.sql(env.DATABASE_URL)

// Usage
const users = await sql`SELECT * FROM users WHERE id = ${id}`
```

### Option C: Drizzle ORM

```typescript
// services/database.ts
import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import * as schema from "./schema"

const sqlite = new Database("app.db")
export const db = drizzle(sqlite, { schema })
```

---

## Response Helpers

```typescript
// utils/response.ts
import type { Context } from "hono"

export const ok = <T>(c: Context, data: T) =>
  c.json({ success: true, data }, 200)

export const created = <T>(c: Context, data: T) =>
  c.json({ success: true, data }, 201)

export const paginated = <T>(c: Context, data: T[], meta: {
  page: number
  limit: number
  total: number
}) => c.json({
  success: true,
  data,
  meta: {
    ...meta,
    totalPages: Math.ceil(meta.total / meta.limit),
  },
}, 200)
```

---

## Middleware Examples

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import { createMiddleware } from "hono/factory"

const requests = new Map<string, { count: number; resetAt: number }>()

export const rateLimiter = (limit = 100, windowMs = 60_000) =>
  createMiddleware(async (c, next) => {
    const ip = c.req.header("x-forwarded-for") ?? "unknown"
    const now = Date.now()
    const record = requests.get(ip)

    if (!record || now > record.resetAt) {
      requests.set(ip, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (record.count >= limit) {
      return c.json({ error: "Too Many Requests" }, 429)
    }

    record.count++
    return next()
  })
```

### JWT Auth

```typescript
// middleware/auth.ts
import { createMiddleware } from "hono/factory"
import { verify } from "hono/jwt"
import { env } from "../config/env"

export const authMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "")

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const payload = await verify(token, env.JWT_SECRET)
    c.set("userId", payload.sub as string)
    return next()
  } catch {
    return c.json({ error: "Invalid Token" }, 401)
  }
})
```

---

## Production Checklist

### Health Endpoints

```typescript
// routes/health.routes.ts
import { Hono } from "hono"

const healthRoutes = new Hono()

// Liveness - is the process running?
healthRoutes.get("/live", (c) => c.json({ status: "ok" }))

// Readiness - can we serve traffic?
healthRoutes.get("/ready", async (c) => {
  try {
    await db.query.users.findFirst() // DB check
    return c.json({ status: "ready", db: "connected" })
  } catch {
    return c.json({ status: "not ready", db: "disconnected" }, 503)
  }
})

export { healthRoutes }
```

### Observability

```
GET /health/live    → Kubernetes liveness probe
GET /health/ready   → Kubernetes readiness probe
GET /metrics        → Prometheus metrics (optional)
```

### Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HTTPS only)

### Graceful Shutdown

```typescript
// index.ts
process.on("SIGTERM", async () => {
  console.log("[API] Shutting down...")
  // Close DB connections
  // Drain queue connections
  process.exit(0)
})
```

---

## Dependencies

```json
{
  "dependencies": {
    "hono": "^4.x",
    "@hono/zod-validator": "^0.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.x"
  }
}
```

---

## Scaling Patterns

### Horizontal Scaling

```
Load Balancer
     │
     ├── API Instance 1
     ├── API Instance 2
     └── API Instance 3
            │
      ┌─────┴─────┐
      │           │
   Database    Redis
   (Primary)   (Cache)
```

### Feature-Based Split (Future)

```
/auth/*     → auth-service
/users/*    → users-service
/orders/*   → orders-service
```

Each service follows this same structure, enabling easy migration from monolith to microservices.

---

## Summary

| Layer | Responsibility |
|-------|----------------|
| `routes/` | URL mapping + validation |
| `handlers/` | Request → Response logic |
| `services/` | External systems (DB, cache, APIs) |
| `middleware/` | Cross-cutting concerns |
| `schemas/` | Validation + TypeScript types |
| `utils/` | Pure helper functions |
| `config/` | Environment + constants |

**Principes clés:**
1. **Flat structure** - Pas de nesting profond, tout accessible en 1-2 niveaux
2. **Feature-based routes** - Un fichier par domaine métier
3. **Separation of concerns** - Routes, handlers, services clairement séparés
4. **Type safety** - Zod partout pour validation + inférence de types
5. **Production-ready** - Health checks, error handling, graceful shutdown
