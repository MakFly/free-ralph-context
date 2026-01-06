#!/bin/bash
# Install Ralph MCP server for Claude Desktop

set -e

PYTHON_BIN="/usr/bin/python3"
RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SERVER="$RALPH_DIR/mcp_server.py"

echo "🔧 Installing Ralph MCP server for Claude..."
echo "📂 MCP Server: $MCP_SERVER"
echo "🐍 Python: $PYTHON_BIN"

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install --quiet mcp httpx 2>/dev/null || pip install mcp httpx

# Find Claude installations
CLAUDE_DIRS=()
for dir in "$HOME/.claude" "$HOME/.claude-glm" "$HOME/.claude-gml"; do
    if [ -d "$dir" ]; then
        CLAUDE_DIRS+=("$dir")
    fi
done

if [ ${#CLAUDE_DIRS[@]} -eq 0 ]; then
    echo "❌ No Claude installation found!"
    exit 1
fi

# Install for each Claude installation
for claude_dir in "${CLAUDE_DIRS[@]}"; do
    CONFIG_FILE="$claude_dir/claude_desktop_config.json"
    echo "✅ Found: $claude_dir"
    
    cat > "$CONFIG_FILE" << JSONEOF
{
  "mcpServers": {
    "ralph": {
      "command": "$PYTHON_BIN",
      "args": ["$MCP_SERVER"],
      "cwd": "$RALPH_DIR",
      "env": {
        "RALPH_API_URL": "http://localhost:8000",
        "PYTHONPATH": "$RALPH_DIR"
      }
    }
  }
}
JSONEOF
    
    echo "✅ Ralph MCP added to $CONFIG_FILE"
done

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start API: cd ~/Documents/lab/brainstorming/free-ralph-context && ./start.sh"
echo "2. Restart Claude Desktop"
echo "3. Tools available: ralph_malloc, ralph_learn_pattern, etc."
