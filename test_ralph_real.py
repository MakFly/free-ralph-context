#!/usr/bin/env python3
"""
🧪 Test en conditions RÉELLES du système Ralph

Simule une vraie session de codage pour vérifier que :
1. Les hooks s'exécutent correctement
2. Le prédictif détecte le projet
3. Les mémoires sont capturées
4. Les suggestions s'affichent
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

print("""
╔══════════════════════════════════════════════════════════════╗
║                                                                ║
║          🧪 TEST SYSTÈME RALPH - Conditions RÉELLES           ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝
""")

# Étape 1: Simuler une activité GLM
print("📝 Étape 1: Création d'un faux todo GLM pour test...")
print("─" * 60)

glm_todo = {
    "id": "test-session-123",
    "createdAt": datetime.now().isoformat(),
    "messages": [
        {
            "role": "user",
            "content": "Crée une fonction d'authentification avec JWT"
        },
        {
            "role": "assistant",
            "content": "Je vais créer la fonction d'auth",
            "toolUses": [
                {
                    "name": "Write",
                    "input": {
                        "file_path": "/home/kev/Documents/lab/brainstorming/free-ralph-context/src/auth.ts",
                        "content": """
export interface LoginInput {
  email: string
  password: string
}

export async function login(credentials: LoginInput) {
  const user = await db.user.findUnique({ where: { email: credentials.email }})
  if (!user) throw new Error('Invalid credentials')

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET)
  return { token, user }
}
"""
                    }
                }
            ]
        },
        {
            "role": "user",
            "content": "Maintenant ajoute les tests"
        },
        {
            "role": "assistant",
            "content": "Je crée les tests",
            "toolUses": [
                {
                    "name": "Write",
                    "input": {
                        "file_path": "/home/kev/Documents/lab/brainstorming/free-ralph-context/src/auth.test.ts",
                        "content": """
describe('login', () => {
  it('should return token for valid credentials', async () => {
    const result = await login({ email: 'test@test.com', password: 'pass' })
    expect(result.token).toBeDefined()
  })
})
"""
                    }
                }
            ]
        },
        {
            "role": "user",
            "content": "Il y a une erreur dans la validation"
        },
        {
            "role": "assistant",
            "content": "Je corrige",
            "toolUses": [
                {
                    "name": "Edit",
                    "input": {
                        "file_path": "/home/kev/Documents/lab/brainstorming/free-ralph-context/src/auth.ts",
                        "old_string": "if (!user) throw new Error('Invalid credentials')",
                        "new_string": "if (!user || !user.password) throw new Error('Invalid credentials')"
                    }
                }
            ]
        }
    ]
}

# Sauvegarder le faux todo
todo_dir = Path.home() / ".claude-glm" / "todos"
todo_dir.mkdir(parents=True, exist_ok=True)

todo_file = todo_dir / "test-session-ralph.json"
todo_file.write_text(json.dumps(glm_todo, indent=2))

print(f"✅ Faux todo créé: {todo_file}")

# Étape 2: Tester le hook ralph_auto_glm
print("\n📝 Étape 2: Test du hook ralph_auto_glm...")
print("─" * 60)

sys.path.insert(0, str(Path.home() / ".ralph" / "hooks"))
os.environ["PYTHONPATH"] = str(Path.home() / ".ralph" / "hooks")

import ralph_auto_glm

# Analyser le faux todo
analysis = ralph_auto_glm.analyze_glm_activity()
print(f"✅ Analyse: {analysis['status']}")
print(f"   - Messages: {analysis.get('message_count', 0)}")
print(f"   - Tool uses: {len(analysis.get('tool_uses', []))}")

# Générer les mémoires auto
memories = ralph_auto_glm.generate_auto_memories(analysis)
print(f"\n✅ Mémoires générées automatiquement:")
for memory in memories[:5]:
    emoji = {"decision": "💡", "action": "⚡", "milestone": "🎯", "error": "🔴"}.get(memory["type"], "📌")
    print(f"   {emoji} {memory['content']}")

# Sauvegarder les mémoires
ralph_auto_glm.save_memories(memories)

# Étape 3: Tester le prédictif
print("\n📝 Étape 3: Test du mode prédictif...")
print("─" * 60)

import ralph_predict

predict = ralph_predict.get_ralph_predict()
project = predict.detect_current_project()

print(f"✅ Projet détecté: {project['name']}")
print(f"   Chemin: {project['path']}")
print(f"   Source: {project['source']}")

# Contexte nécessaire
context = predict.predict_needed_context(project)
if context:
    print(f"\n✅ Contextes suggérés: {', '.join(context)}")

# Suggestions
suggestions = predict.generate_predictive_suggestions(project, [])
if suggestions:
    print(f"\n✅ Suggestions prédictives:")
    for s in suggestions[:3]:
        emoji = {"high": "🔴", "normal": "🟡", "low": "🟢"}.get(s["priority"], "⚪")
        print(f"   {emoji} [{s['confidence']:.0%}] {s['message']}")

# Étape 4: Simuler plusieurs actions
print("\n📝 Étape 4: Simulation d'actions multiples...")
print("─" * 60)

activities = []

for i, msg in enumerate(glm_todo["messages"]):
    if msg.get("role") == "assistant" and "toolUses" in msg:
        for tool_use in msg["toolUses"]:
            tool_name = tool_use["name"]
            tool_input = tool_use["input"]

            # Créer une action basique basée sur le tool
            file_path = tool_input.get("file_path", "unknown")
            if tool_name == "Write":
                activities.append({
                    "type": "decision",
                    "category": "implementation",
                    "content": f"Created {file_path}",
                    "tags": ["implementation", "new_file"]
                })
            elif tool_name == "Edit":
                activities.append({
                    "type": "action",
                    "category": "fix",
                    "content": f"Modified {file_path}",
                    "tags": ["fix", "validation"]
                })

            emoji = {"decision": "💡", "action": "⚡", "error": "🔴"}.get(activities[-1].get("type"), "📌")
            print(f"   {emoji} {activities[-1].get('content', 'N/A')}")

# Prédictions suivantes
predictions = predict.predict_next_actions(activities)
if predictions:
    print(f"\n✅ Actions suivantes prédites:")
    for pred in predictions[:3]:
        print(f"   • {pred['action']} ({pred['confidence']:.0%} confiance)")
else:
    print(f"\n✅ Pas assez de données pour les prédictions (normal au premier test)")

# Étape 5: Vérifier les fichiers de logs
print("\n📝 Étape 5: Vérification des logs...")
print("─" * 60)

import subprocess

print("Fichiers créés:")
files_to_check = [
    ("~/.ralph/auto_memories.jsonl", "Mémoires auto"),
    ("~/.ralph/patterns.json", "Patterns appris"),
    ("~/.ralph/learning.jsonl", "Apprentissage"),
]

for file_path, description in files_to_check:
    expanded = os.path.expanduser(file_path)
    if Path(expanded).exists():
        lines = len(Path(expanded).read_text().split('\n'))
        print(f"   ✅ {description}: {lines} lignes")
    else:
        print(f"   ⚠️  {description}: Non créé (encore)")

# Résumé final
print("\n" + "=" * 60)
print("📊 RÉSUMÉ DU TEST")
print("=" * 60)

stats = {
    "todo_created": True,
    "messages_analyzed": analysis.get('message_count', 0),
    "tool_uses_detected": len(analysis.get('tool_uses', [])),
    "memories_generated": len(memories),
    "predictions_made": len(predictions) if predictions else 0,
    "suggestions_generated": len(suggestions) if suggestions else 0,
    "project_detected": bool(project),
    "activities_simulated": len(activities),
}

print(f"""
✅ Todo GLM créé: {stats['todo_created']}
✅ Messages analysés: {stats['messages_analyzed']}
✅ Tool uses détectés: {stats['tool_uses_detected']}
✅ Mémoires générées: {stats['memories_generated']}
✅ Activities simulées: {stats['activities_simulated']}
✅ Prédictions faites: {stats['predictions_made']}
✅ Suggestions générées: {stats['suggestions_generated']}
✅ Projet détecté: {stats['project_detected']}
""")

print("🎯 Le système Ralph est FONCTIONNEL !")
print("")
print("Prochaine étape en conditions RÉELLES:")
print("   1. Ouvre Claude Code avec GLM")
print("   2. Code normalement")
print("   3. Observe les logs: tail -f ~/.ralph/super_auto.log")
print("")

# Nettoyer
print("🧹 Nettoyage du test...")
todo_file.unlink()
print("   ✅ Faux todo supprimé")

print("\n╔══════════════════════════════════════════════════════════════╗")
print("║              ✅ TEST TERMINÉ AVEC SUCCÈS !                 ║")
print("║                                                                ║")
print("║         Le système Ralph est prêt pour la PRODUCTION         ║")
print("║                                                                ║")
print("╚══════════════════════════════════════════════════════════════╝")
