# Ralph MCP Server

**Model Context Protocol server for Claude Code integration**

## What is this?

This is a **standalone MCP server** that exposes Ralph tools directly to Claude Code. It communicates with the Ralph API (FastAPI backend) for all operations.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Claude Code    │ ───► │  Ralph MCP      │ ───► │  Ralph API      │
│  (MCP Client)   │      │  (stdio)        │      │  (FastAPI)      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                              ↓                         ↓
                        mcp_server.py          Docker Compose
                        (this folder)          (ralph-api/)
```

## Quick Start

### 1. Start Ralph API (with Docker)

```bash
cd ../ralph-api
docker-compose up -d
```

### 2. Install Ralph MCP

```bash
cd ralph-mcp
pip install -e .
```

### 3. Configure Claude

```bash
./install.sh
```

This installs the MCP configuration in `~/.claude*/` so Claude can use Ralph tools.

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

## Configuration

Environment variables:

```bash
RALPH_API_URL=http://localhost:8000  # Ralph API URL
RALPH_API_TIMEOUT=30                   # Request timeout (seconds)
```

## Usage in Claude

Once installed, you can use Ralph tools directly in Claude:

```
You: ralph_malloc with task description "Build a REST API"

Claude: [Calls ralph_malloc tool]
✅ Session initialized: abc-123-def

You: ralph_add_memory "Using FastAPI for this project"

Claude: [Calls ralph_add_memory tool]
✅ Memory stored: decision/high priority

You: ralph_get_status

Claude: [Calls ralph_get_status tool]
Session: abc-123-def
Token usage: 15,234 / 200,000 (7.6%)
Memories: 1
```

## Development

### Test MCP Server

```bash
# Test directly (requires Ralph API running)
python mcp_server.py

# Test tools list
python -c "
import asyncio
from mcp_server import list_tools
tools = asyncio.run(list_tools())
print(f'{len(tools)} tools available')
for tool in tools:
    print(f'  - {tool.name}')
"
```

### Install Hooks Manually

```bash
# For Claude Desktop
mkdir -p ~/.config/claude
cat > ~/.config/claude/claude_desktop_config.json <<EOF
{
  "mcpServers": {
    "ralph": {
      "command": "python",
      "args": ["$PWD/mcp_server.py"],
      "cwd": "$PWD",
      "env": {
        "RALPH_API_URL": "http://localhost:8000"
      }
    }
  }
}
EOF
```

## Troubleshooting

### MCP not found in Claude

1. Check API is running: `curl http://localhost:8000/`
2. Check hooks are installed: `ls ~/.config/claude/`
3. Restart Claude Desktop

### Tools return errors

1. Check Ralph API logs: `cd ../ralph-api && docker-compose logs -f api`
2. Verify API URL: `echo $RALPH_API_URL`
3. Test API directly: `curl http://localhost:8000/api/sessions/malloc`

## Version

2.0.0 - Standalone MCP server
