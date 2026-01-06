#!/bin/bash
# Demo du Cortex Agent - Mode 100% Automatique

echo "🧠 Ralph Cortex - Mode AUTONOME"
echo "================================="
echo ""
echo "Simulation d'une session complète :"
echo ""

# Créer un fichier transcript de test pour simuler une session
TRANSCRIPT_DIR="$HOME/.claude/transcripts"
mkdir -p "$TRANSCRIPT_DIR"

# Simuler une session avec des tool uses
cat > "$TRANSCRIPT_DIR/test_cortex_session.json" << 'EOF'
{
  "result": {
    "conversation": [
      {
        "role": "user",
        "content": "Crée une fonction d'auth avec JWT"
      },
      {
        "role": "assistant",
        "content": "Je vais créer la fonction d'authentification",
        "tool_uses": [
          {
            "name": "Write",
            "input": {
              "file_path": "/home/kev/project/src/auth.ts",
              "content": "export function authenticate(token: string) { ... }"
            }
          }
        ]
      },
      {
        "role": "user",
        "content": "Maintenant ajoute le refresh token"
      },
      {
        "role": "assistant",
        "content": "J'ajoute le refresh token",
        "tool_uses": [
          {
            "name": "Edit",
            "input": {
              "file_path": "/home/kev/project/src/auth.ts",
              "old_string": "...",
              "new_string": "...with refresh token support..."
            }
          }
        ]
      },
      {
        "role": "user",
        "content": "Il y a une erreur avec les tokens"
      },
      {
        "role": "assistant",
        "content": "Je corrige l'erreur",
        "tool_uses": [
          {
            "name": "Bash",
            "input": {
              "command": "npm test"
            },
            "result": {
              "stdout": "",
              "stderr": "Error: Token validation failed"
            }
          }
        ]
      }
    ]
  }
}
EOF

echo "📂 Session simulée créée"
echo ""

# Exécuter le Cortex Agent
echo "🤖 Exécution du Cortex Agent..."
echo "───────────────────────────────────"
python3 ~/.ralph/hooks/cortex_agent.py 2>&1 | head -20
echo ""

echo "✅ Analyse terminée"
echo ""
echo "📊 Ce que le Cortex a détecté :"
echo "  • Projet détecté: project"
echo "  • Session Ralph auto-initialisée"
echo "  • Décision capturée: JWT auth"
echo "  • Action capturée: Refresh token ajouté"
echo "  • Erreur capturée: Token validation failed"
echo ""

echo "🎯 Avantages du mode AUTO :"
echo "  ✓ Aucune commande ralph_* à taper"
echo "  ✓ Capture automatique des décisions"
echo "  ✓ Détection automatique des erreurs"
echo "  ✓ Context optimisé automatiquement"
echo ""

# Nettoyer
rm -f "$TRANSCRIPT_DIR/test_cortex_session.json"

echo "💡 Pour activer le mode AUTO dans Claude Code :"
echo "   1. Les hooks sont déjà configurés dans ~/.claude/settings.json"
echo "   2. Ouvre une nouvelle session Claude"
echo "   3. Code normalement, le Cortex fait le reste"
echo ""

echo "📚 Documentation complète :"
echo "   cat ~/Documents/lab/brainstorming/free-ralph-context/CORTEX_AUTO_MODE.md"
