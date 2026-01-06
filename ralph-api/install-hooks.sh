#!/bin/bash
# Installation script for Ralph MCP hooks in Claude

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔧 Installing Ralph MCP hooks..."

# Detect Claude installation paths
CLAUDE_PATHS=(
    "$HOME/.config/claude"
    "$HOME/.claude"
    "$HOME/.claude-glm"
    "$HOME/.claude-gml"
)

CLAUDE_CONFIG_FOUND=false
for CLAUDE_PATH in "${CLAUDE_PATHS[@]}"; do
    if [ -d "$CLAUDE_PATH" ]; then
        echo "✅ Found Claude installation: $CLAUDE_PATH"
        CLAUDE_CONFIG_FOUND=true

        # Create MCP servers config directory
        MCP_CONFIG_DIR="$CLAUDE_PATH/claude_desktop_config.json"
        MCP_DIR="$CLAUDE_PATH/mcp_servers"

        # For Claude Desktop, we need to add to the config file
        if [ -f "$MCP_CONFIG_DIR" ]; then
            echo "📝 Adding Ralph MCP to Claude Desktop config..."
            # Backup existing config
            cp "$MCP_CONFIG_DIR" "$MCP_CONFIG_DIR.backup"
            # Merge config using python
            python3 <<EOF
import json
import os

config_path = "$MCP_CONFIG_DIR"
with open(config_path, 'r') as f:
    config = json.load(f)

# Add Ralph MCP server
if "mcpServers" not in config:
    config["mcpServers"] = {}

config["mcpServers"]["ralph"] = {
    "command": "python",
    "args": ["-m", "app.mcp.server"],
    "cwd": "$PROJECT_ROOT",
    "env": {
        "PYTHONPATH": "$PROJECT_ROOT"
    }
}

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Ralph MCP added to config")
EOF
        else
            echo "⚠️  Claude Desktop config not found at $MCP_CONFIG_DIR"
        fi

        # Create standalone mcp_servers directory
        mkdir -p "$MCP_DIR"
        cp "$PROJECT_ROOT/mcp-config.json" "$MCP_DIR/ralph.json"
        echo "✅ Ralph MCP config copied to $MCP_DIR/ralph.json"
    fi
done

if [ "$CLAUDE_CONFIG_FOUND" = false ]; then
    echo "❌ No Claude installation found. Please install Claude first."
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Install Python dependencies: cd $PROJECT_ROOT && pip install -e ."
echo "2. Ensure PostgreSQL and Redis are running"
echo "3. Restart Claude Desktop"
echo "4. Ralph tools will be available as ralph_*"
echo ""
