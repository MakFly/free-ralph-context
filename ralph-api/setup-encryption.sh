#!/bin/bash
# Setup ENCRYPTION_KEY for API key encryption

set -e

ENV_FILE=".env"

# Generate key if not exists
if ! grep -q "ENCRYPTION_KEY=" "$ENV_FILE" 2>/dev/null; then
    echo "🔑 Generating new ENCRYPTION_KEY..."
    KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    echo "ENCRYPTION_KEY=$KEY" >> "$ENV_FILE"
    echo "✅ ENCRYPTION_KEY added to $ENV_FILE"
else
    echo "✅ ENCRYPTION_KEY already exists in $ENV_FILE"
    KEY=$(grep "ENCRYPTION_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    echo "   Current key: ${KEY:0:20}..."
fi

# Clear old encrypted keys (they can't be decrypted with new key)
echo ""
echo "⚠️  Clearing old LLM configs (encrypted with old key)..."
docker compose exec -T postgres psql -U ralph -d ralph -c "DELETE FROM llm_configs;" 2>/dev/null && echo "✅ llm_configs table cleared" || echo "⚠️  Could not clear table (DB not running?)"

echo ""
echo "📝 Next steps:"
echo "   1. Restart the API: docker compose restart api"
echo "   2. Reconfigure your LLM API keys in the dashboard (/settings)"
