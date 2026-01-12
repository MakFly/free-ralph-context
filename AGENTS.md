# Repository Guidelines

## Project Structure

```
nexus/
├── apps/
│   ├── api/           # REST API (Hono + SQLite) - Port 3001
│   ├── mcp-server/    # MCP Server (stdio transport)
│   ├── hooks/         # Claude Code lifecycle hooks
│   ├── cli/           # CLI tool
│   └── web/           # React UI (TanStack Router + shadcn/ui)
├── packages/
│   ├── core/          # Shared types and exports
│   ├── storage/       # SQLite database + migrations
│   ├── search/        # FTS5 + semantic search (embeddings)
│   └── indexer-py/    # Python code indexer
├── scripts/           # Installation scripts
└── docs/              # Documentation (API, MCP)
```

## Commands

```bash
# Installation
./install.sh              # Full install (deps + build + hooks + MCP + service)
./install.sh --uninstall  # Remove everything

# Build
bun install               # Install dependencies
bun run build             # Build all packages and apps

# Test
bun test                  # Run all tests

# API Server
cd apps/api && bun run src/index.ts   # Manual start (port 3001)

# Database
python3 packages/indexer-py/main.py index .    # Index codebase
python3 packages/indexer-py/main.py status     # Show stats
./scripts/reset-db.sh                          # Reset database
```

## Coding Conventions

- TypeScript ESM with strict mode
- Named exports, route handlers in `apps/api/src/routes/`
- Shared types flow through `@nexus/core`
- Migrations in `packages/storage/src/migrations/`
- Test files: `*.test.ts` in `apps/api/src/tests/`

## Database

- **Path**: `apps/api/nexus.db` (never use root-level DB)
- WAL mode enabled for concurrency
- Foreign keys enforced

## Configuration

- `~/.claude/settings.json` - Claude Code hooks
- `~/.claude.json` - MCP servers
- `apps/api/.env` - API config (PORT, MISTRAL_API_KEY)

## Agent Instructions

Prefer Nexus MCP tools for repo context:
- `nexus_code` - Search code (keyword/semantic/hybrid)
- `nexus_memory` - Recall and store memories
- `nexus_learn` - Pattern recognition and templates

Fall back to direct file reads only when MCP unavailable.
