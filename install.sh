#!/usr/bin/env bash
#
# Nexus Installation Script
# Memory-Powered Development System
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/user/nexus/main/install.sh | bash
#   or
#   ./install.sh [--no-service] [--no-index] [--uninstall]
#
# Options:
#   --no-service    Skip API service installation
#   --no-index      Skip initial codebase indexing
#   --uninstall     Remove Nexus completely
#   --help          Show this help message
#

set -e

# ============================================================
# CONFIGURATION
# ============================================================

NEXUS_VERSION="0.0.2"
NEXUS_DIR="${NEXUS_DIR:-$(pwd)}"
CLAUDE_DIR="$HOME/.claude"
CLAUDE_SETTINGS="$CLAUDE_DIR/settings.json"
CLAUDE_CONFIG="$HOME/.claude.json"
API_PORT=3001
API_URL="http://localhost:$API_PORT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Flags
INSTALL_SERVICE=true
RUN_INDEX=true
UNINSTALL=false

# ============================================================
# HELPER FUNCTIONS
# ============================================================

print_banner() {
    echo -e "${BOLD}${CYAN}"
    echo "███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗"
    echo "████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝"
    echo "██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗"
    echo "██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║"
    echo "██║ ╚████║███████╗██╔╝ ╚██╗╚██████╔╝███████║"
    echo "╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝ ╚═════╝ ╚══════╝"
    echo -e "${NC}"
    echo -e "${DIM}Memory-Powered Development System v${NEXUS_VERSION}${NC}"
    echo ""
}

success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }
step() { echo -e "\n${BOLD}[$1/$2]${NC} $3"; }

check_command() {
    command -v "$1" &> /dev/null
}

get_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux";;
        Darwin*) echo "macos";;
        *)       echo "unknown";;
    esac
}

# ============================================================
# PREREQUISITE CHECKS
# ============================================================

check_prerequisites() {
    step 1 7 "Checking prerequisites..."

    local all_ok=true

    # Node.js >= 22
    if check_command node; then
        local node_version=$(node --version | sed 's/v//' | cut -d. -f1)
        if [ "$node_version" -ge 22 ]; then
            success "Node.js v$(node --version | sed 's/v//') (>= 22.0.0)"
        else
            error "Node.js $(node --version) is too old (need >= 22.0.0)"
            all_ok=false
        fi
    else
        error "Node.js not found (need >= 22.0.0)"
        info "Install: https://nodejs.org/"
        all_ok=false
    fi

    # Bun >= 1.0
    if check_command bun; then
        success "Bun v$(bun --version) (>= 1.0.0)"
    else
        error "Bun not found (need >= 1.0.0)"
        info "Install: curl -fsSL https://bun.sh/install | bash"
        all_ok=false
    fi

    # Python3 (optional, for indexer)
    if check_command python3; then
        success "Python3 v$(python3 --version | cut -d' ' -f2) (for indexer)"
    else
        warning "Python3 not found (indexer will not work)"
    fi

    # Git
    if check_command git; then
        success "Git v$(git --version | cut -d' ' -f3)"
    else
        warning "Git not found (some features may not work)"
    fi

    if [ "$all_ok" = false ]; then
        echo ""
        error "Some prerequisites are missing. Please install them and try again."
        exit 1
    fi
}

# ============================================================
# INSTALLATION STEPS
# ============================================================

install_dependencies() {
    step 2 7 "Installing dependencies..."

    cd "$NEXUS_DIR"

    if [ -f "bun.lock" ] || [ -f "package.json" ]; then
        bun install --frozen-lockfile 2>/dev/null || bun install
        success "Dependencies installed"
    else
        error "package.json not found in $NEXUS_DIR"
        exit 1
    fi
}

build_project() {
    step 3 7 "Building project..."

    cd "$NEXUS_DIR"
    bun run build
    success "Project built successfully"
}

configure_hooks() {
    step 4 7 "Configuring Claude Code hooks..."

    # Create .claude directory if not exists
    mkdir -p "$CLAUDE_DIR"

    # Read existing settings or create empty
    if [ -f "$CLAUDE_SETTINGS" ]; then
        settings=$(cat "$CLAUDE_SETTINGS")
    else
        settings="{}"
    fi

    local hooks_dist="$NEXUS_DIR/apps/hooks/dist"

    # Build hooks JSON
    local hooks_json=$(cat <<EOF
{
  "SessionStart": [{"matcher": "", "hooks": [{"type": "command", "command": "bun run $hooks_dist/session-start.js", "timeout": 5000}]}],
  "UserPromptSubmit": [{"matcher": "", "hooks": [{"type": "command", "command": "bun run $hooks_dist/user-prompt-submit.js", "timeout": 5000}]}],
  "PreToolUse": [{"matcher": "", "hooks": [{"type": "command", "command": "bun run $hooks_dist/pre-tool-use.js", "timeout": 2000}]}],
  "PostToolUse": [{"matcher": "", "hooks": [{"type": "command", "command": "bun run $hooks_dist/post-tool-use.js", "timeout": 5000}]}],
  "Stop": [{"matcher": "", "hooks": [{"type": "command", "command": "bun run $hooks_dist/stop.js", "timeout": 5000}]}],
  "SessionEnd": [{"matcher": "", "hooks": [{"type": "command", "command": "bun run $hooks_dist/session-end.js", "timeout": 10000}]}]
}
EOF
)

    # Merge hooks into settings using Node.js
    local new_settings=$(node -e "
        const settings = $settings;
        const hooks = $hooks_json;
        settings.hooks = { ...settings.hooks, ...hooks };
        console.log(JSON.stringify(settings, null, 2));
    ")

    echo "$new_settings" > "$CLAUDE_SETTINGS"

    success "SessionStart hook"
    success "UserPromptSubmit hook"
    success "PreToolUse hook"
    success "PostToolUse hook"
    success "Stop hook"
    success "SessionEnd hook"
    success "Hooks configured in $CLAUDE_SETTINGS"
}

configure_mcp() {
    step 5 7 "Configuring MCP server..."

    # Read existing config or create empty
    if [ -f "$CLAUDE_CONFIG" ]; then
        config=$(cat "$CLAUDE_CONFIG")
    else
        config="{}"
    fi

    local mcp_path="$NEXUS_DIR/apps/mcp-server/dist/index.js"

    # Merge MCP server into config using Node.js
    local new_config=$(node -e "
        const config = $config;
        if (!config.mcpServers) config.mcpServers = {};
        config.mcpServers['nexus'] = {
            command: 'node',
            args: ['$mcp_path'],
            env: { NEXUS_API_URL: '$API_URL' }
        };
        console.log(JSON.stringify(config, null, 2));
    ")

    echo "$new_config" > "$CLAUDE_CONFIG"

    success "nexus MCP server configured"
    echo -e "    ${DIM}command: node $mcp_path${NC}"
    echo -e "    ${DIM}env: NEXUS_API_URL=$API_URL${NC}"
}

setup_api_service() {
    step 6 7 "Setting up API service..."

    if [ "$INSTALL_SERVICE" = false ]; then
        info "Skipping service installation (--no-service)"
        return
    fi

    local os=$(get_os)
    local api_script="$NEXUS_DIR/apps/api/src/index.ts"
    local bun_path=$(which bun)

    if [ "$os" = "linux" ]; then
        setup_systemd_service "$api_script" "$bun_path"
    elif [ "$os" = "macos" ]; then
        setup_launchd_service "$api_script" "$bun_path"
    else
        warning "Unknown OS, skipping service setup"
        info "Start API manually: cd $NEXUS_DIR/apps/api && bun run src/index.ts"
    fi
}

setup_systemd_service() {
    local api_script="$1"
    local bun_path="$2"

    local service_dir="$HOME/.config/systemd/user"
    local service_file="$service_dir/nexus-api.service"

    mkdir -p "$service_dir"

    cat > "$service_file" <<EOF
[Unit]
Description=Nexus API Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$NEXUS_DIR/apps/api
ExecStart=$bun_path run $api_script
Restart=on-failure
RestartSec=5
Environment=PORT=$API_PORT

[Install]
WantedBy=default.target
EOF

    # Reload and enable service
    systemctl --user daemon-reload
    systemctl --user enable nexus-api.service
    systemctl --user start nexus-api.service

    success "systemd service installed and started"
    echo -e "    ${DIM}Service: nexus-api.service${NC}"
    echo -e "    ${DIM}Commands: systemctl --user [start|stop|status] nexus-api${NC}"
}

setup_launchd_service() {
    local api_script="$1"
    local bun_path="$2"

    local plist_dir="$HOME/Library/LaunchAgents"
    local plist_file="$plist_dir/com.nexus.api.plist"

    mkdir -p "$plist_dir"

    cat > "$plist_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nexus.api</string>
    <key>ProgramArguments</key>
    <array>
        <string>$bun_path</string>
        <string>run</string>
        <string>$api_script</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$NEXUS_DIR/apps/api</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>$API_PORT</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/.nexus/api.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.nexus/api.error.log</string>
</dict>
</plist>
EOF

    # Create log directory
    mkdir -p "$HOME/.nexus"

    # Load the service
    launchctl unload "$plist_file" 2>/dev/null || true
    launchctl load "$plist_file"

    success "launchd service installed and started"
    echo -e "    ${DIM}Service: com.nexus.api${NC}"
    echo -e "    ${DIM}Commands: launchctl [load|unload] $plist_file${NC}"
}

verify_installation() {
    step 7 7 "Verifying installation..."

    local all_ok=true

    # Check hooks files exist
    local hooks_dist="$NEXUS_DIR/apps/hooks/dist"
    for hook in session-start user-prompt-submit pre-tool-use post-tool-use stop session-end; do
        if [ -f "$hooks_dist/$hook.js" ]; then
            success "$hook.js exists"
        else
            error "$hook.js not found"
            all_ok=false
        fi
    done

    # Check MCP server exists
    local mcp_dist="$NEXUS_DIR/apps/mcp-server/dist/index.js"
    if [ -f "$mcp_dist" ]; then
        success "MCP server built"
    else
        error "MCP server not built"
        all_ok=false
    fi

    # Check API is running (with retry)
    info "Waiting for API to start..."
    local max_attempts=10
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$API_URL/health" > /dev/null 2>&1; then
            success "API server responding on $API_URL"
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    if [ $attempt -eq $max_attempts ]; then
        warning "API server not responding yet (may still be starting)"
        info "Check manually: curl $API_URL/health"
    fi

    # Check Claude settings
    if [ -f "$CLAUDE_SETTINGS" ] && grep -q "nexus" "$CLAUDE_SETTINGS" 2>/dev/null; then
        success "Claude Code hooks configured"
    else
        error "Claude Code hooks not configured"
        all_ok=false
    fi

    # Check Claude config
    if [ -f "$CLAUDE_CONFIG" ] && grep -q "nexus" "$CLAUDE_CONFIG" 2>/dev/null; then
        success "MCP server configured in Claude"
    else
        error "MCP server not configured"
        all_ok=false
    fi

    echo ""

    if [ "$all_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# ============================================================
# UNINSTALL
# ============================================================

uninstall() {
    print_banner
    echo -e "${YELLOW}Uninstalling Nexus...${NC}\n"

    local os=$(get_os)

    # Stop and remove service
    if [ "$os" = "linux" ]; then
        systemctl --user stop nexus-api.service 2>/dev/null || true
        systemctl --user disable nexus-api.service 2>/dev/null || true
        rm -f "$HOME/.config/systemd/user/nexus-api.service"
        systemctl --user daemon-reload
        success "Removed systemd service"
    elif [ "$os" = "macos" ]; then
        launchctl unload "$HOME/Library/LaunchAgents/com.nexus.api.plist" 2>/dev/null || true
        rm -f "$HOME/Library/LaunchAgents/com.nexus.api.plist"
        success "Removed launchd service"
    fi

    # Remove hooks from Claude settings
    if [ -f "$CLAUDE_SETTINGS" ]; then
        local new_settings=$(node -e "
            const settings = JSON.parse(require('fs').readFileSync('$CLAUDE_SETTINGS', 'utf-8'));
            if (settings.hooks) {
                delete settings.hooks.SessionStart;
                delete settings.hooks.UserPromptSubmit;
                delete settings.hooks.PreToolUse;
                delete settings.hooks.PostToolUse;
                delete settings.hooks.Stop;
                delete settings.hooks.SessionEnd;
                if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
            }
            console.log(JSON.stringify(settings, null, 2));
        " 2>/dev/null)
        echo "$new_settings" > "$CLAUDE_SETTINGS"
        success "Removed hooks from Claude settings"
    fi

    # Remove MCP server from Claude config
    if [ -f "$CLAUDE_CONFIG" ]; then
        local new_config=$(node -e "
            const config = JSON.parse(require('fs').readFileSync('$CLAUDE_CONFIG', 'utf-8'));
            if (config.mcpServers) {
                delete config.mcpServers.nexus;
                if (Object.keys(config.mcpServers).length === 0) delete config.mcpServers;
            }
            console.log(JSON.stringify(config, null, 2));
        " 2>/dev/null)
        echo "$new_config" > "$CLAUDE_CONFIG"
        success "Removed MCP server from Claude config"
    fi

    # Remove log directory
    rm -rf "$HOME/.nexus"
    success "Removed log directory"

    echo ""
    success "Nexus uninstalled successfully!"
    info "Note: Project files in $NEXUS_DIR were not removed"
    echo ""
}

# ============================================================
# SUCCESS SUMMARY
# ============================================================

print_success() {
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}                    INSTALLATION COMPLETE${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}${BOLD}✓ Nexus has been installed successfully!${NC}"
    echo ""
    echo -e "${BOLD}What was installed:${NC}"
    echo "  • Claude Code hooks (session tracking, context injection)"
    echo "  • MCP server (code search + memory access)"
    echo "  • API server (running as background service)"
    echo ""
    echo -e "${BOLD}Next steps:${NC}"
    echo "  1. Restart Claude Code to activate the hooks"
    echo "  2. Index your codebase: python3 packages/indexer-py/main.py index ."
    echo "  3. Start using Nexus MCP tools in Claude Code"
    echo ""
    echo -e "${BOLD}Useful commands:${NC}"
    echo "  ./install.sh --uninstall     # Uninstall Nexus"
    echo "  curl $API_URL/health        # Check API status"
    local os=$(get_os)
    if [ "$os" = "linux" ]; then
        echo "  systemctl --user status nexus-api  # Check service status"
    elif [ "$os" = "macos" ]; then
        echo "  launchctl list | grep nexus  # Check service status"
    fi
    echo ""
    echo -e "${BOLD}MCP Tools available:${NC}"
    echo "  • nexus_code   - Search code (keyword/semantic/hybrid)"
    echo "  • nexus_memory - Recall and store memories"
    echo "  • nexus_learn  - Pattern recognition and templates"
    echo ""
    echo -e "${DIM}Thank you for using Nexus!${NC}"
    echo ""
}

# ============================================================
# MAIN
# ============================================================

show_help() {
    echo "Nexus Installation Script v$NEXUS_VERSION"
    echo ""
    echo "Usage: ./install.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --no-service    Skip API service installation"
    echo "  --no-index      Skip initial codebase indexing"
    echo "  --uninstall     Remove Nexus completely"
    echo "  --help          Show this help message"
    echo ""
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-service)
                INSTALL_SERVICE=false
                shift
                ;;
            --no-index)
                RUN_INDEX=false
                shift
                ;;
            --uninstall)
                UNINSTALL=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Handle uninstall
    if [ "$UNINSTALL" = true ]; then
        uninstall
        exit 0
    fi

    # Run installation
    print_banner

    check_prerequisites
    install_dependencies
    build_project
    configure_hooks
    configure_mcp
    setup_api_service

    if verify_installation; then
        print_success
        exit 0
    else
        echo ""
        error "Installation completed with some issues"
        warning "Please check the errors above and try again"
        exit 1
    fi
}

main "$@"
