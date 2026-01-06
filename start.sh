#!/bin/bash
# Ralph Stack - Start All Services with Docker
# Usage: ./start.sh

set -e

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Ralph Stack..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Start Docker services
echo -e "${BLUE}1/2 Starting Docker services...${NC}"
cd "$RALPH_DIR/ralph-api"
docker-compose up -d

echo ""
echo "⏳ Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if ! curl -s http://localhost:8000/health/ > /dev/null 2>&1; then
    echo -e "${RED}❌ API failed to start${NC}"
    echo "Check logs: cd ralph-api && docker-compose logs -f api"
    exit 1
fi

# 2. Show status
echo ""
echo -e "${BLUE}2/2 Checking services...${NC}"
echo ""
docker-compose ps

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Ralph is ready!${NC}"
echo ""
echo "📝 Next steps:"
echo "   1. Start Claude Desktop (MCP tools will be available)"
echo "   2. Start Dashboard (optional): cd ralph-dashboard && bun dev"
echo ""
echo "🔗 Endpoints:"
echo "   - API:       http://localhost:8000"
echo "   - Health:    http://localhost:8000/health/"
echo "   - Docs:      http://localhost:8000/docs"
echo "   - Patterns:  POST http://localhost:8000/api/patterns/learn"
echo ""
echo "🔧 MCP Configuration:"
echo "   - 13 tools available (ralph_malloc, ralph_learn_pattern, etc.)"
echo "   - Hooks installed in: ~/.claude, ~/.claude-glm, ~/.claude-gml"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f api"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
echo "════════════════════════════════════════════════════════════"
