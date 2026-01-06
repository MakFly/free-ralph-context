#!/bin/bash
# Ralph Stack - Stop All Services
# Usage: ./stop.sh

echo "🛑 Stopping Ralph Stack..."

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RALPH_DIR/ralph-api"

docker-compose down

echo ""
echo "✅ All services stopped."
echo ""
echo "📝 To restart:"
echo "   ./start.sh"
