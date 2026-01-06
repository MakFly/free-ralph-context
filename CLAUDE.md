# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Ralph is a **context management system for AI coding agents** - a malloc/free pattern for LLM context windows. This monorepo contains:

- **ralph-mcp/** - Backend MCP server (Node.js TypeScript)
- **ralph-dashboard/** - React monitoring dashboard (TanStack Start)

The system enables agents to work on complex projects without context overflow through semantic compression, memory folding, and session checkpointing.

## Development Commands

> **IMPORTANT:** Always use `bun` instead of `npm` in this project.
>
> **⚠️ CRITICAL - ralph-api runs in Docker ONLY!**
> The backend API (FastAPI/Python) MUST be run with Docker Compose.
> Never use `uv run` or `python` directly - it won't work due to DB/Redis dependencies.
>
> Use `./start.sh` or `cd ralph-api && docker-compose up -d`

### ralph-api (Python Backend - Docker ONLY!)
```bash
# Start all services (PostgreSQL, Redis, API, Adminer, Dozzle)
./start.sh

# Or manually:
cd ralph-api
docker-compose up -d          # Start all
docker-compose logs -f api    # Follow API logs
docker-compose ps             # Check status
docker-compose down           # Stop all
```

**Services included:**
- PostgreSQL 16 + pgvector (port 5432)
- Redis 7 cache (port 6379)
- FastAPI (port 8000)
- Adminer DB UI (port 8080)
- Dozzle logs viewer (port 9999)

### ralph-mcp (MCP Server)
```bash
cd ralph-mcp
bun install
bun run build          # Compile TypeScript
bun dev                # Watch mode
bun dashboard          # Start SSE server (port 3847)
bun inspect            # Debug with Node inspector
bun migrate            # Run database migrations
```

### ralph-dashboard (Frontend)
```bash
cd ralph-dashboard
bun install
bun dev                # Vite dev server
bun run build          # Production build
bun check              # Format + lint fix
```

### Running Full Stack
```bash
# Terminal 1: Docker Stack (PostgreSQL, Redis, API)
cd ralph-api && docker-compose up -d

# Terminal 2: Dashboard
cd ralph-dashboard && bun dev
```

## Architecture

### Ralph = Infrastructure Layer

```
┌─────────────────────────────────────────────────────────┐
│                  ralph_orchestrate                       │
│   Analyse tâche → recommande AGENT + outils Ralph       │
└─────────────────────────────────────────────────────────┘
                           ↓
         ┌─────────────────┼─────────────────┐
         ↓                 ↓                 ↓
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │swe-scout │      │  Plan    │      │ snipper  │
   │(discover)│      │(architect)│     │(fix fast)│
   └──────────┘      └──────────┘      └──────────┘
         │                                   │
         └───────────────┬───────────────────┘
                         ↓
   ┌──────────────────────────────────────────────┐
   │           Ralph MCP Infrastructure            │
   │  warpgrep | fast_apply | compress | memory   │
   └──────────────────────────────────────────────┘
```

**Principle**:
- **Agents** = Intelligence (decide WHAT to do)
- **Ralph** = Infrastructure (do operations FAST)
- **ralph_orchestrate** = Coordinator (recommends which agent + which tools)

### MCP Tool Suite

Ralph exposes 19 tools via Model Context Protocol:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `ralph_malloc` | Initialize session | Start of task |
| `ralph_free` | Terminate session | End of task |
| `ralph_compress` | Semantic compression | Context > 70% |
| `ralph_checkpoint` | Create snapshot | Before/after milestones |
| `ralph_restore_checkpoint` | Restore state | Resume work |
| `ralph_should_fold` | Evaluate fold need | Context > 60% |
| `ralph_fold` | Execute folding | After should_fold=true |
| `ralph_should_spawn` | Check subprocess need | Context > 95% |
| `ralph_curate` | Prune memories | After many operations |
| `ralph_search` | Semantic search | Recall past decisions |
| `ralph_cross_search` | Cross-session search | Reuse past knowledge |
| `ralph_add_memory` | Store memory | Important decisions |
| `ralph_inherit_memories` | Import past memories | Start of related task |
| `ralph_warpgrep` | Parallel search (8x) | 3+ search patterns |
| `ralph_fast_apply` | Semantic code edit | Complex refactors |
| `ralph_orchestrate` | Task analysis | Start of non-trivial task |
| `ralph_analyze_and_recommend` | Context health | Every ~100 operations |
| `ralph_token_savings` | Get savings stats | Monitor efficiency |
| `ralph_get_status` | Session status | Check context usage |

### Agent + Tool Selection Matrix

| Task Type | Recommended Agent | Ralph Tools | Speedup |
|-----------|-------------------|-------------|---------|
| Code exploration | swe-scout | ralph_warpgrep | 10-20x |
| Complex refactor | Plan | warpgrep + fast_apply | 5-10x |
| Quick fix | snipper | ralph_fast_apply | 2-3x |
| Debugging | swe-scout | warpgrep + cross_search | 5-15x |
| New feature | brainstorming | ralph_warpgrep | 3-5x |

### 🚨 Auto-Debug Trigger (IMPORTANT)

**When user mentions keywords: `bug`, `fix`, `debug`, `error`, `issue`**

ALWAYS automatically use the debug agent:
```
Task(debug, "Analyze and fix the issue described by the user")
```

**This applies to:**
- User says "fix the X bug"
- User says "debug this error"
- User says "there's an issue with Y"
- User says "X is broken/not working"
- User mentions any error message

**How to invoke:**
```python
Task(debug, "Fix the issue described by user")
```

The debug agent will:
1. Detect the framework automatically
2. Analyze the problem
3. Classify fixes (simple vs complex)
4. Apply solutions or ask for confirmation

### Usage Patterns

**Pattern 1: Start of Task**
```
ralph_orchestrate({ taskDescription: "..." })
→ Follow recommended agent + tools
```

**Pattern 2: Codebase Exploration**
```
# ⚠️ CRITICAL: NEVER use paths: ["."] - specify source directories!
ralph_warpgrep({
  patterns: [
    { type: "literal", value: "X" },
    { type: "regex", value: "function.*X" },
    { type: "glob", value: "**/*X*" }
  ],
  paths: ["src/", "app/", "lib/"]  # ← ALWAYS specify source dirs!
})

# Or omit paths for auto-detection (src/, app/, lib/, etc.)
ralph_warpgrep({
  patterns: [...]
  # No paths = auto-detect source directories
})
```

**Pattern 3: Context Management**
```
Every ~100 operations:
→ ralph_analyze_and_recommend()

Context > 70%:
→ ralph_compress() or ralph_checkpoint()

Context > 95%:
→ ralph_should_spawn() → new agent instance
```

### Key Data Flow

```
MCP Client → ralph-mcp (tools) → SQLite (persistence)
                  ↓
           SSE (port 3847)
                  ↓
           ralph-dashboard (React)
```

### Storage Layer

SQLite tables in `ralph-mcp/src/storage/`:
- `sessions` - Task sessions with token tracking
- `memories` - Semantic memory store by category
- `checkpoints` - Session snapshots
- `metrics` - Token usage history

### LLM Provider Abstraction

Set via `RALPH_LLM` env var. Supports:
- `claude-3-5-sonnet` (default)
- `gpt-4`, `gpt-4-turbo`
- `gemini-2.0-flash`
- `mistral-large`

## Key Files

### Backend
- `src/index.ts` - MCP server entry + tool handlers
- `src/dashboard-server.ts` - SSE server, transcript polling
- `src/tools/*.ts` - Individual tool implementations
- `src/storage/schemas.ts` - Zod schemas for all types
- `src/providers/unified.ts` - LLM provider factory

### Frontend
- `src/routes/` - TanStack file-based routes
- `src/hooks/use-ralph-sse.ts` - Real-time SSE connection
- `src/components/ui/` - shadcn/ui primitives
- `src/components/pages/` - Page-level components

## Code Standards

### TypeScript
- Strict mode enabled
- Path aliases: `@/` for internal imports (frontend)
- Zod for runtime validation at boundaries

### Formatting
- No semicolons
- Single quotes
- Trailing commas

Run `bun check` in ralph-dashboard before committing.

## Environment Variables

```bash
# ralph-mcp/.env
RALPH_LLM=claude-3-5-sonnet
RALPH_DASHBOARD_PORT=3847
RALPH_DB_PATH=./ralph.db
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
```

## Adding New Features

### New MCP Tool
1. Create `ralph-mcp/src/tools/yourTool.ts`
2. Add Zod schema to `src/storage/schemas.ts`
3. Register in `src/index.ts` (ListToolsRequestSchema + CallToolRequestSchema)

### New Dashboard Route
1. Create `ralph-dashboard/src/routes/yourRoute.tsx`
2. Create page component in `src/components/pages/`
3. Add navigation link in `src/components/layout/app-layout.tsx`

## Multi-Source Detection

Ralph auto-detects Claude installations:
- `~/.claude` (official)
- `~/.claude-glm`, `~/.claude-gml` (variants)
- `~/.opencode` (custom)

Each source gets a distinct color badge on the dashboard.

## Dashboard Features

### Playground (`/playground`)
Two-column layout for testing MCP tools:
- **Left**: Tool tabs (Fast Apply, WarpGrep, Cross Search, Token Savings)
- **Right**: Live history panel with real-time call tracking

### Memories (`/memories`)
Real-time memory viewer connected to `/api/memories` endpoint.

### API Endpoints
| Endpoint | Description |
|----------|-------------|
| `/events` | SSE stream for real-time updates |
| `/status` | Current project status (cached 2s) |
| `/api/llm/status` | LLM connection status |
| `/api/memories` | All memories across sessions |
| `/api/sessions` | Session list |
| `/api/token-savings` | Token compression stats |
| `/api/tools/fast-apply` | Semantic code editing |
| `/api/tools/warpgrep` | Parallel search |
| `/api/tools/cross-search` | Cross-session memory search |

## Known Issues & Fixes

### Path Decoding (Fixed)
**Problem**: Hyphenated folder names were incorrectly decoded:
- `symfony-inertia-react` → `symfony/inertia/react` ❌

**Solution**: Extract real `cwd` from transcript JSON instead of naive hyphen decode.
Located in `dashboard-server.ts:extractCwdFromTranscript()`.

### Empty Transcripts
Empty transcript files (0 bytes) fall back to naive path decoding. This is expected for newly created sessions.

## Performance Notes

- SSE polling: 5 seconds interval
- Status cache TTL: 2 seconds
- Transcript read: First 50KB only (for cwd extraction)
- Hash-based change detection for efficient updates

### ralph_warpgrep Performance

**⚠️ CRITICAL: Path selection determines speed!**

| Path Configuration | Speed | Use Case |
|--------------------|-------|----------|
| `paths: ["src/", "app/"]` | ⚡ 2-5s | Always preferred |
| `paths` omitted | ⚡ 2-5s | Auto-detects src/, app/, lib/ |
| `paths: ["."]` | ⚠️ 30s+ | Triggers auto-detection (safer now) |

**Auto-excluded directories:**
- `node_modules`, `vendor`, `.pnpm`, `bower_components`
- `.git`, `.svn`, `.hg`
- `dist`, `build`, `.next`, `.nuxt`, `.output`
- `__pycache__`, `.venv`, `coverage`, `.cache`

**Timeout:** 30 seconds default. Returns partial results on timeout.

**Auto-detected source directories:**
`src/`, `app/`, `lib/`, `packages/`, `modules/`, `components/`, `pages/`, `routes/`, `api/`
