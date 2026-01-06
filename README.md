# Ralph MCP - Context Management System for AI Coding Agents

**Version**: 2.0 (Auto-Init + Native Hooks)
**Status**: Production Ready ✅

---

## 🚀 What is Ralph?

Ralph is a **context management system** that makes AI coding agents **project-aware** without manual configuration.

### Problem Solved

```diff
- User: "How do I implement authentication?"
- Claude: Generic Symfony answer (ignores your BetterAuth setup)

+ User: "How do I implement authentication?"
+ Ralph Hook: → ralph_recall("authentication")
+ Claude: "Based on your BetterAuth setup with Paseto V4 tokens..."
```

### Key Features

- 🧠 **Auto-Initialization** - Creates session & learns patterns on startup
- 🔍 **Auto-Recall** - Hooks fetch context before every answer
- 💾 **Persistent Storage** - SQLite database survives restarts
- 🎯 **Zero Config** - Works out of the box
- 🔌 **Multi-LLM** - Anthropic, OpenAI, Mistral, Google support

---

## 📁 Project Structure

```
ralph-mcp/                    # Core MCP server
├── mcp_server.py            # Main server (auto-init)
├── src/
│   ├── db/                  # SQLite storage
│   │   ├── schema.sql       # Tables: sessions, patterns, memories
│   │   └── __init__.py      # Database methods
│   ├── llm.py               # Multi-provider LLM abstraction
│   └── pattern_extractor.py # Generic pattern extraction (fallback)
├── tests/
│   └── test_pattern_learning.py  # 27 tests, all passing ✅
└── requirements.txt         # Python dependencies

ralph-dashboard/              # React UI (TODO)
└── ralph-docs/               # Documentation
    ├── index.mdx            # Main docs
    ├── hooks-guide.mdx      # Hooks configuration
    └── examples.mdx         # Usage examples
```

---

## 🎯 Quick Start

### Installation

1. **Clone & Install**
```bash
cd ralph-mcp
pip install -r requirements.txt
```

2. **Configure MCP**

Edit `~/.claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "ralph": {
      "command": "/usr/bin/python3",
      "args": ["/path/to/ralph-mcp/mcp_server.py"],
      "cwd": "/path/to/ralph-mcp",
      "env": {
        "RALPH_API_URL": "http://localhost:8000",
        "PYTHONPATH": "/path/to/ralph-mcp"
      }
    }
  }
}
```

3. **Configure Hooks** (Already done in `~/.claude/settings.json`)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [{
          "type": "prompt",
          "prompt": "You are answering a user question. BEFORE answering, check if this requires Ralph context...\n\nIf question is about:\n- Implementation: how, create, implement, build, add\n- Architecture: pattern, structure, design, approach\n- Code location: what file, where is, which component\n\nThen CALL: ralph_recall(\"<extract keywords>\")"
        }]
      }
    ]
  }
}
```

4. **Restart Claude**

That's it! Ralph is now active.

---

## 🧪 Testing

```bash
cd ralph-mcp
pytest tests/test_pattern_learning.py -v
# 27 passed ✅
```

---

## 📖 Usage

### Automatic (Recommended)

Just start asking questions - hooks handle everything:

```bash
"How do I implement authentication?"
→ Hook: ralph_recall("authentication")
→ Answer: Based on your BetterAuth setup...

"Where is the User model?"
→ Hook: ralph_recall("user model")
→ Answer: In src/Model/User.php
```

### Manual (Optional)

```bash
# See what Ralph knows
ralph_list_patterns()
ralph_session_info()

# Search for specific context
ralph_search("database")

# Add custom memory
ralph_add_memory("Use PostgreSQL for auth", category="decision")

# Cleanup
ralph_cleanup_sessions(mode="delete_test", confirm=true)
```

---

## 🔧 Configuration

### LLM Provider (Optional)

For **intelligent pattern extraction**, set an API key:

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# Mistral
export MISTRAL_API_KEY=...

# Google
export GOOGLE_API_KEY=...
```

**Without LLM**: Ralph uses generic pattern extraction (still works!)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_API_URL` | `http://localhost:8000` | API endpoint (standalone mode if localhost) |
| `RALPH_DEBUG` | `false` | Enable debug logging |
| `PYTHONPATH` | - | Path to ralph-mcp |

---

## 📊 Database Schema

```sql
-- Sessions
CREATE TABLE mcp_sessions (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    task_description TEXT,
    created_at TIMESTAMP,
    last_accessed TIMESTAMP,
    max_tokens INTEGER
);

-- Patterns
CREATE TABLE patterns (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    pattern_name TEXT,
    pattern_description TEXT,
    code_example TEXT,
    tags TEXT,  -- JSON array
    source_mode TEXT,  -- 'llm' or 'generic'
    source_files TEXT,  -- JSON array
    created_at TIMESTAMP
);

-- Memories
CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    content TEXT,
    category TEXT,  -- decision, action, error, progress, context, other
    priority TEXT,  -- high, normal, low
    created_at TIMESTAMP
);
```

---

## 🎓 Examples

### Example 1: BetterAuth Integration

```bash
User: "How do I integrate BetterAuth?"
Hook: → ralph_recall("betterauth integration")
Ralph: Returns BetterAuth patterns from your project
Claude: "Your project already has BetterAuth! Here's how to use it..."
```

### Example 2: Framework Detection

```bash
cd my-symfony-project
Ralph: [AUTO] Detected: Symfony framework
Ralph: [AUTO] Learned: MVC pattern, controllers, services
User: "Create a controller"
Claude: "Based on your Symfony structure..."
```

---

## 📚 Documentation

- [Main Documentation](ralph-docs/index.mdx)
- [Hooks Guide](ralph-docs/hooks-guide.mdx)
- [Examples](ralph-docs/examples.mdx)

---

## 🧩 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Ralph MCP System                      │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
    ┌────▼────┐                      ┌─────▼─────┐
    │   MCP    │                      │  Claude   │
    │  Server  │◄─────────────────────┤   Hooks   │
    │(Python)  │    UserPromptSubmit   │(settings) │
    └────┬────┘                      └─────┬─────┘
         │                                 │
         │          ┌──────────────────────┘
         │          │
    ┌────▼─────────▼─────┐
    │                     │
    │   SQLite Storage    │
    │   ~/.ralph/ralph-mcp.db│
    │                     │
    └─────────────────────┘
```

---

## 🔍 Troubleshooting

### Ralph Returns Empty

```bash
# Check session exists
sqlite3 ~/.ralph/ralph-mcp.db "SELECT * FROM mcp_sessions;"

# Check patterns
sqlite3 ~/.ralph/ralph-mcp.db "SELECT * FROM patterns;"

# Restart Claude to reinitialize
```

### Hooks Not Firing

```bash
# Check hooks registered
# In Claude, run: /hooks

# Verify JSON syntax
cat ~/.claude/settings.json | python3 -m json.tool

# Enable debug
claude --debug
```

### Too Many Test Sessions

```bash
ralph_cleanup_sessions(mode="delete_test", confirm=true)
```

---

## 🛣️ Roadmap

- [ ] Web dashboard (ralph-dashboard)
- [ ] Semantic search (embeddings)
- [ ] Cross-project pattern sharing
- [ ] VS Code extension
- [ ] Team collaboration features

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! See `ralph-mcp/tests/` for test patterns.

```bash
cd ralph-mcp
pytest tests/ -v
```

---

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/ralph-mcp/issues)
- Docs: [ralph-docs/](ralph-docs/)
- Claude Hooks: [Official Docs](https://code.claude.com/docs/en/hooks)

---

**Made with ❤️ for context-aware AI assistance**
