#!/bin/bash
# Test script for Ralph v3.0 Progressive Disclosure
# This creates memories via ralph-api (PostgreSQL) which the dashboard can see

API_URL="http://localhost:8000"

echo "🧪 Testing Ralph v3.0 Progressive Disclosure"
echo "=========================================="

# 1. Create a new session
echo ""
echo "📝 Step 1: Creating session..."
SESSION_RESPONSE=$(curl -s "$API_URL/api/sessions/malloc" \
  -H "Content-Type: application/json" \
  -d '{
    "task_description": "Test v3.0 progressive disclosure",
    "max_tokens": 200000
  }')

SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.session_id')
echo "Session created: $SESSION_ID"

# 2. Add test memories
echo ""
echo "💾 Step 2: Adding 20 memories..."

MEMORIES=(
  "Using JWT with httpOnly cookies for authentication"
  "PostgreSQL for primary data, Redis for cache layer"
  "Fixed memory leak in useEffect cleanup function"
  "Token limit exceeded in production environment"
  "Progressive disclosure saves 10x tokens on retrieval"
  "React 19 with TanStack Start for routing"
  "Docker Compose for local development stack"
  "FastAPI with async/await for backend API"
  "SSE connection for real-time dashboard updates"
  "Tailwind CSS v4 with custom design tokens"
  "Zod for runtime validation at boundaries"
  "pgvector for semantic search with embeddings"
  "Provider-aware thresholds: GLM 50%/65%/75%/85%"
  "Anthropic provider: 60%/75%/85%/95% thresholds"
  "Gemini provider: 70%/80%/90%/97% (relaxed)"
  "CCS detection for automatic provider switching"
  "Auto-capture hooks via PostToolUse event"
  "Hybrid search: BM25 keywords + vector similarity"
  "Reciprocal Rank Fusion for score combination"
  "Checkpoint system for session state snapshots"
)

for i in "${!MEMORIES[@]}"; do
  CONTENT="${MEMORIES[$i]}"
  # Generate unique memory_id using timestamp and index
  MEMORY_ID="mem-$(date +%s)-$i"
  curl -s "$API_URL/memories/" \
    -H "Content-Type: application/json" \
    -d "{
      \"session_id\": \"$SESSION_ID\",
      \"memory_id\": \"$MEMORY_ID\",
      \"content\": \"$CONTENT\",
      \"metadata\": {\"category\": \"context\"}
    }" > /dev/null
  echo "  [$((i+1))/20] Added: ${CONTENT:0:50}..."
done

# 3. Test progressive disclosure - Layer 1 (index only)
echo ""
echo "🔍 Step 3: Testing Progressive Disclosure..."
echo ""
echo "📊 Layer 1 - All Memories (via API):"
curl -s "$API_URL/memories/session/$SESSION_ID?limit=3" | jq '.'

echo ""
echo "📊 Layer 2 - Dashboard View:"
curl -s "$API_URL/api/memories?session_id=$SESSION_ID&limit=3" | jq '.'

echo ""
echo "🎯 Open in dashboard:"
echo "   http://localhost:3000/memories?session=$SESSION_ID"
echo ""
echo "✅ Test complete! Check dashboard to see the memories."
