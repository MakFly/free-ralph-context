# 🚀 Ralph Cortex - Guide de Test

## Nouveau Outil MCP Disponible

```
ralph_cortex(task: string, auto_learn: boolean = true)
```

---

## 📋 Exemples Concrets à Tester

### 1️⃣ Test : Exploration du code (swe-scout)

```
ralph_cortex("trouve où est l'auth BetterAuth dans iautos")
```

**Ce que Cortex fait :**
- Analyse : "exploration" + "iautos"
- Décision : → swe-scout agent
- Enrichit le contexte avec les patterns Ralph
- Exécute et retourne les résultats

**Attendu :**
```
## Ralph Cortex Analysis

**Task**: trouve où est l'auth BetterAuth dans iautos
**Execution Type**: `agent_scout`
**Success**: true

### Output
Lancement de swe-scout avec le contexte Ralph enrichi...
[Résultats de l'exploration]
```

---

### 2️⃣ Test : Fix rapide (snipper)

```
ralph_cortex("fix la typo dans le fichier login")
```

**Ce que Cortex fait :**
- Analyse : "fix" + "typo" = quick fix
- Décision : → snipper agent
- Cible le fichier et fait la correction

---

### 3️⃣ Test : Pattern de commit (skill)

```
ralph_cortex("commit ces changements: ajouté l'auth")
```

**Ce que Cortex fait :**
- Analyse : "commit" = skill connu
- Décision : → skill /commit
- Exécute la séquence : git status → git diff → git add → git commit

---

### 4️⃣ Test : Debug (debug-agent)

```
ralph_cortex("l'API renvoie une 500 sur /login")
```

**Ce que Cortex fait :**
- Analyse : "500" + "login" = bug
- Décision : → debug-agent
- Enrichit avec les patterns d'auth connus

---

### 5️⃣ Test : Cross-project avec registry

```
ralph_cortex("est-ce que spinnero a aussi BetterAuth ?")
```

**Ce que Cortex fait :**
- Analyse : "spinnero" = autre projet
- Utilise le project registry
- Cross-search : "BetterAuth" dans spinnero
- Compare avec iautos

---

## 🧠 Auto-Apprentissage : Test

Lance l'apprentissage depuis tes transcripts :

```
ralph_learn_from_transcripts(limit: 20)
```

**Ce que ça fait :**
- Parse `~/.claude/transcripts/*.json`
- Extrait les séquences répétitives
- Crée des skills automatiquement
- Met à jour le Cortex

**Résultat typique :**
```
## Ralph Cortex: Learning Results

**Summary**: Found 5 patterns across 20 transcripts

**Total Patterns**: 5

### Learned Skills
- `commit` - Git workflow (status → diff → add → commit)
- `qa` - Testing workflow (find tests → run → check)
- `fix` - Code fix workflow (search → read → edit)

### Pattern Frequencies
- git_workflow: 12x
- testing_workflow: 8x
- code_fix_workflow: 15x
```

---

## 🎯 Scénario Complet : Test de Bout en Bout

### Préparation

1. **Redémarre Claude Desktop** (pour charger le nouveau MCP)
2. **Vérifie que le MCP est connecté** (doit afficher "ralph" dans les outils)

### Test 1 : Exploration simple

```
@ralph ralph_cortex("où sont les tests dans ce projet ?")
```

**Attendu :**
- Cortex détecte "exploration" + "tests"
- Route vers swe-scout
- Retourne les fichiers de tests trouvés

### Test 2 : Fix avec contexte

```
@ralph ralph_cortex("change 'TODO' en 'FIXME' dans tous les fichiers PHP")
```

**Attendu :**
- Cortex détecte "fix" + "PHP"
- Route vers snipper (ou refactor pour multi-fichiers)
- Utilise ralph_warpgrep pour trouver tous les PHP
- Applique les changements

### Test 3 : Commit intelligent

```
@ralph ralph_cortex("commit : ajouté le cortex")
```

**Attendu :**
- Cortex détecte "commit"
- Utilise le skill /commit
- Exécute : git status → git diff → git add → git commit -m "ajouté le cortex"
- Retourne le hash du commit

---

## 🔍 Vérifier que ça marche

Après avoir testé, vérifie dans le dashboard :

```
cd /home/kev/Documents/lab/brainstorming/free-ralph-context/ralph-dashboard
bun dev
```

Ouvre : **http://localhost:3000/changelog**

Tu devrais voir la version **2.2.0** avec :
- Ralph Cortex
- Auto-Apprentissage
- Intégration Agents

---

## 🚀 Prochaines Étapes (si ça marche)

1. **Tester avec VRAIS agents Claude** - Intégrer swe-scout réel
2. **Feedback loop** - Cortex apprend de ce qui marche/échoue
3. **Suggestions proactives** - Cortex te suggère "Tu veux faire X ensuite ?"
4. **Multi-agent orchestrations** - Lancer plusieurs agents en parallèle

---

**Teste maintenant et dis-moi ce que tu en penses ! 🎯**
