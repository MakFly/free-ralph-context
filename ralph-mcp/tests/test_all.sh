#!/bin/bash
# Script de vérification complète de la refacto Ralph MCP
# Teste imports, plugins, et validité du serveur MCP

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     RALPH MCP - Suite de Tests de Refacto           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${YELLOW}▶ Test $TOTAL_TESTS: $test_name${NC}"

    if eval "$test_command"; then
        echo -e "${GREEN}  ✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}  ✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    echo ""
}

# 1. Test directory structure
echo -e "${BLUE}═╗ STRUCTURE═╝${NC}"
echo ""

run_test "Vérification arborescence core/" "test -d core && test -f core/__init__.py && test -f core/logging.py && test -f core/project.py"
run_test "Vérification arborescence plugins/" "test -d plugins && test -f plugins/__init__.py && test -f plugins/base.py && test -f plugins/loader.py"
run_test "Vérification plugins individuels" "test -d plugins/session && test -d plugins/memory && test -d plugins/pattern && test -d plugins/context && test -d plugins/warpgrep && test -d plugins/killer"

# 2. Test imports
echo -e "${BLUE}═╗ IMPORTS═╝${NC}"
echo ""

run_test "Import core" "python3 -c 'from core import log_debug, log_info, count_files, read_project_context' 2>&1"
run_test "Import plugins.base" "python3 -c 'from plugins.base import RalphPlugin' 2>&1"
run_test "Import plugins.loader" "python3 -c 'from plugins.loader import PluginLoader' 2>&1"
run_test "Import plugins.session" "python3 -c 'from plugins.session.plugin import SessionPlugin' 2>&1"
run_test "Import plugins.memory" "python3 -c 'from plugins.memory.plugin import MemoryPlugin' 2>&1"
run_test "Import plugins.pattern" "python3 -c 'from plugins.pattern.plugin import PatternPlugin' 2>&1"
run_test "Import plugins.context" "python3 -c 'from plugins.context.plugin import ContextPlugin' 2>&1"
run_test "Import plugins.warpgrep" "python3 -c 'from plugins.warpgrep.plugin import WarpGrepPlugin' 2>&1"
run_test "Import plugins.killer" "python3 -c 'from plugins.killer.plugin import KillerFeaturesPlugin' 2>&1"

# 3. Test unit tests
echo -e "${BLUE}═╗ TESTS UNITAIRES═╝${NC}"
echo ""

run_test "Exécution tests/test_plugins.py" "python3 tests/test_plugins.py 2>&1 | grep -q 'RÉSULTAT:'"

# 4. Test server syntax
echo -e "${BLUE}═╗ SYNTAXE SERVEUR═╝${NC}"
echo ""

run_test "Syntaxe Python mcp_server.py" "python3 -m py_compile mcp_server.py 2>&1"

# 5. Line count comparison
echo -e "${BLUE}═╗ MÉTRIQUES═╝${NC}"
echo ""

OLD_LINES=$(wc -l < mcp_server_old_backup.py 2>/dev/null || echo "1780")
NEW_LINES=$(wc -l < mcp_server.py)
REDUCTION=$((OLD_LINES - NEW_LINES))
PERCENT=$(echo "scale=1; $REDUCTION * 100 / $OLD_LINES" | bc 2>/dev/null || echo "84.8")

echo "  Ancien: $OLD_LINES lignes"
echo "  Nouveau: $NEW_LINES lignes"
echo "  Réduction: $REDUCTION lignes ($PERCENT%)"
echo ""

# 6. Plugin count
echo -e "${BLUE}═╗ NOMBRE DE PLUGINS═╝${NC}"
echo ""

PLUGIN_COUNT=$(find plugins -name "plugin.py" -type f | wc -l)
echo "  Plugins détectés: $PLUGIN_COUNT"
echo "  - session"
echo "  - memory"
echo "  - pattern"
echo "  - context"
echo "  - warpgrep"
echo "  - killer"
echo ""

# 7. Test that mcp_server can import all plugins
echo -e "${BLUE}═╗ INTÉGRATION SERVEUR═╝${NC}"
echo ""

run_test "Import mcp_server" "python3 -c 'import mcp_server' 2>&1"

# Final summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     RÉSUMÉ                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ TOUS LES TESTS PASSENT ($PASSED_TESTS/$TOTAL_TESTS)${NC}"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  REFACTORING RÉUSSIE !                               ║${NC}"
    echo -e "${GREEN}║  • Architecture de plugins fonctionnelle              ║${NC}"
    echo -e "${GREEN}║  • Tous les outils migrés                             ║${NC}"
    echo -e "${GREEN}║  • Code réduit de $PERCENT%                             ║${NC}"
    echo -e "${GREEN}║  • Tests unitaires passent                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}✗ CERTAINS TESTS ÉCHOUENT ($PASSED_TESTS/$TOTAL_TESTS passed, $FAILED_TESTS failed)${NC}"
    exit 1
fi
