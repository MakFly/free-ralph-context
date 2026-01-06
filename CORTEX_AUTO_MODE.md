# 🧠 Ralph Cortex - Mode AUTONOME

**PLUS BESOIN de commandes Ralph manuelles !**

Le Cortex Agent rend Ralph **100% transparent et automatique**.

---

## 🎯 Ce que fait le Cortex AUTOMATIQUEMENT

### 1. Auto-Start (au début de chaque session)
```
Tu ouvres Claude Code
  ↓
Cortex détecte le projet
  ↓
Session Ralph auto-initialisée
  ↓
Mémoires pertinentes chargées
```

### 2. Auto-Capture (pendant que tu codes)
```
Tu codes / débuggues
  ↓
Cortex analyse chaque action
  ↓
Détecte les décisions importantes
  ↓
Capture automatiquement
  ↓
Tu ne fais RIEN
```

### 3. Auto-Fold (quand le context monte)
```
Context atteint 75% (GLM)
  ↓
Cortex détecte automatiquement
  ↓
Recommande fold/compress
  ↓
Tu continues à coder
```

### 4. Auto-Recall (quand tu cherches)
```
Tu demandes : "Comment on gère l'auth ?"
  ↓
Cortex détecte la requête
  ↓
Récupère les mémoires pertinentes
  ↓
Context injecté automatiquement
```

---

## 📊 Avant vs Après

### AVANT (Manuel)
```bash
# Toi à chaque session :
ralph_malloc("fix checkout bug")
ralph_add_memory("Stripe for payments", category="decision")
ralph_add_memory("Fix: webhook verification", category="action")
# ... tu codes ...
ralph_recall("payment errors")  # Tu dois t'en souvenir
ralph_should_fold()             # Tu dois vérifier
```

### APRÈS (Auto)
```bash
# Tu codes, c'est tout. Le Cortex fait le reste.

# Tu ne tapes JAMAIS ralph_*
# Le Cortex détecte, capture, fold, recall automatiquement
```

---

## 🚀 Comment ça marche

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Claude Code Session                    │
└─────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────────────────────┐
         │  Hooks (settings.json)         │
         │  - UserPromptSubmit            │
         │  - PostToolUse                 │
         │  - Stop                        │
         └────────────────────────────────┘
                          ↓
         ┌────────────────────────────────┐
         │  Cortex Agent (Python)         │
         │  - Analyse transcripts         │
         │  - Détecte patterns            │
         │  - Décide actions              │
         └────────────────────────────────┘
                          ↓
         ┌────────────────────────────────┐
         │  Ralph MCP (Infrastructure)    │
         │  - malloc (auto-init)          │
         │  - add_memory (auto-capture)   │
         │  - recall (auto-search)        │
         │  - fold (auto-compress)        │
         └────────────────────────────────┘
                          ↓
         ┌────────────────────────────────┐
         │  Stockage                      │
         │  - SQLite (~/.ralph/)          │
         │  - PostgreSQL (ralph-api)      │
         │  - Redis (search)              │
         └────────────────────────────────┘
```

### Flux de données

```
Nouvelle Session
  ↓
[UserPromptSubmit Hook] → cortex_agent.py
  ↓
1. Détecte projet (via transcript)
2. Init session Ralph
3. Charge mémoires pertinentes (inherit_memories)
  ↓
Pendant le travail
  ↓
[PostToolUse Hook] → cortex_agent.py
  ↓
1. Analyse l'outil utilisé
2. Détecte si c'est une décision/erreur/action
3. Capture automatiquement
4. Met à jour context usage
  ↓
Fin de session
  ↓
[Stop Hook] → auto_compress.py
  ↓
1. Vérifie context usage
2. Fold si nécessaire
3. Sauvegarde checkpoint
```

---

## 🔧 Configuration

### Hooks activés (`~/.claude/settings.json`)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "command": "python3 ~/.ralph/hooks/cortex_agent.py"
      }
    ],
    "PostToolUse": [
      {
        "command": "python3 ~/.ralph/hooks/cortex_agent.py"
      }
    ],
    "Stop": [
      {
        "command": "python3 ~/.ralph/hooks/auto_compress.py"
      }
    ]
  }
}
```

---

## 🧪 Tester

### Vérifier que le Cortex fonctionne

```bash
# 1. Ovrir une nouvelle session Claude Code
# 2. Lancer un script de test :
python3 ~/.ralph/hooks/cortex_agent.py

# 3. Vérifier stderr (logs Cortex) :
tail -f ~/.ralph/cortex.log
```

### Scénario de test

```
1. Ouvre Claude Code
2. Demande : "Crée une fonction d'auth avec JWT"
3. Le Cortex doit :
   - Auto-détecter le projet
   - Auto-init la session
   - Auto-capturer la décision JWT
4. Demande : "Comment on gère l'auth ?"
5. Le Cortex doit :
   - Auto-rappeler la décision JWT
   - L'injecter dans le context
```

---

## 📈 Métriques

### Token Savings (estimés)

| Action | Sans Cortex | Avec Cortex | Économie |
|--------|-------------|-------------|----------|
| Démarrage session | 5000 tokens (re-read) | 200 tokens (inherit) | **96%** |
| Capture mémoire | Manuel (oublié) | Auto | **∞** |
| Recall | 5000 tokens | 200 tokens (index) | **96%** |
| Session complète | 50k tokens | 20k tokens | **60%** |

---

## ⚙️ Personnalisation

### Changer les seuils de fold

Éditer `~/.ralph/hooks/cortex_agent.py` :

```python
def should_auto_fold(self) -> bool:
    # GLM: 75% (plus agressif)
    # Anthropic: 85%
    # Gemini: 90%
    if self.context_usage >= 0.75:  # ← Modifier ici
        return True
```

### Ajouter des patterns de capture

Éditer `auto_capture.py` :

```python
DECISION_PATTERNS = [
    (r'ton pattern ici', 'category'),
]
```

---

## 🐛 Debug

### Le Cortex ne démarre pas

```bash
# Vérifier les logs
python3 ~/.ralph/hooks/cortex_agent.py

# Vérifier les hooks
cat ~/.claude/settings.json | grep cortex
```

### Les mémoires ne se capturent pas

```bash
# Vérifier auto_memories.jsonl
tail -20 ~/.ralph/auto_memories.jsonl

# Vérifier les permissions
ls -la ~/.ralph/hooks/
```

### Le context ne se fold pas

```bash
# Vérifier context usage
curl -s http://localhost:8000/api/status | jq '.projects[].contextUsage'
```

---

## 🎓 Concepts

### Progressive Disclosure (3-Layer)

```
Layer 1: Index (~50 tokens/résultat)
  → ID + summary
  ↓
Layer 2: Timeline (~150 tokens)
  → Contexte avant/après
  ↓
Layer 3: Full (~500 tokens)
  → Contenu complet

Tu ne charges que ce dont tu as besoin !
```

### Provider-Aware Thresholds

```
GLM (z.ai):         50% → 65% → 75% → 85%
Anthropic (OAuth):  60% → 75% → 85% → 95%
Gemini:             70% → 80% → 90% → 97%
```

---

## 🚀 Prochaine étape

Le Cortex devient **prédictif** :

```
- Anticipe tes besoins
- Suggère des actions
- Apprend de tes patterns
```

**L'objectif : Tu ne penses même plus à Ralph, il est juste là.**
