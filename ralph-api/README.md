# Ralph MCP - Python Implementation

**Context management system for AI coding agents - Python implementation with MCP protocol**

## What Changed (v2.0.0)

### ❌ Removed
- **ralph-mcp/** (Node.js MCP server) - Deleted and replaced with Python implementation
- Old hooks in `~/.claude*` - Cleaned up

### ✅ New
- **ralph-api/app/mcp/** - Python MCP server (Model Context Protocol)
- **9 MCP tools** exposed for Claude integration
- Dashboard adapted to connect to Python API (port 8000)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ralph-mcp (Python)                    │
│   - MCP Server: app/mcp/server.py                      │
│   - FastAPI Backend: app/main.py (port 8000)            │
│   - PostgreSQL + Redis + Embeddings                     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 ralph-dashboard (React)                 │
│   - TanStack Start + shadcn/ui                         │
│   - SSE connection to Python API                       │
│   - Port 5173 (Vite dev server)                         │
└─────────────────────────────────────────────────────────┘
```

## MCP Tools Available

| Tool | Description |
|------|-------------|
| `ralph_malloc` | Initialize a new Ralph session |
| `ralph_get_status` | Get session status (token usage, etc) |
| `ralph_compress` | Compress trajectory (3-5x token reduction) |
| `ralph_add_memory` | Store a decision/action/context |
| `ralph_search` | Semantic search across memories |
| `ralph_checkpoint` | Create named checkpoint |
| `ralph_should_fold` | Evaluate if context should be folded |
| `ralph_fold` | Execute context folding |
| `ralph_curate` | Curate memories (keep high-value) |

## Quick Start

### 1. Start Services

```bash
# Option A: Using Docker Compose (recommended for development)
docker-compose up -d

# Option B: Manual setup
# Start PostgreSQL and Redis
sudo systemctl start postgresql
sudo systemctl start redis

# Start the FastAPI server
cd ralph-api
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Dashboard

```bash
cd ralph-dashboard
bun dev
# Dashboard: http://localhost:5173
```

### 3. Test MCP Connection

```bash
# Test MCP server directly
cd ralph-api
python3 -c "from app.mcp.server import list_tools; import asyncio; tools = asyncio.run(list_tools()); print(f'{len(tools)} tools available')"
```

### 4. Install Claude Hooks (Optional)

```bash
cd ralph-api
./install-hooks.sh
```

This installs the MCP configuration in `~/.claude*/` so Claude can use Ralph tools directly.

## Endpoints

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| SSE Stream | http://localhost:8000/events |
| Dashboard | http://localhost:5173 |

## Development

### Running Tests

```bash
cd ralph-api
pytest tests/
```

### Code Style

```bash
# Python
black app/
ruff check app/

# Dashboard
cd ralph-dashboard
bun check
```

## Configuration

Environment variables in `.env`:

```bash
DATABASE_URL=postgresql+asyncpg://ralph:ralph@localhost:5432/ralph
REDIS_URL=redis://localhost:6379
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Version

2.0.0 - Python MCP Implementation
