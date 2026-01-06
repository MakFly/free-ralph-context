# Ralph API - Plan de Test Complet

**Date**: 2026-01-06
**Version**: 1.0
**Score Audit**: 82/100

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Setup de Test](#setup-de-test)
3. [Tests Unitaires](#tests-unitaires)
4. [Tests d'Intégration](#tests-dintégration)
5. [Tests End-to-End](#tests-end-to-end)
6. [Tests de Performance](#tests-de-performance)
7. [Tests de Sécurité](#tests-de-sécurité)
8. [Checklist de Validation](#checklist-de-validation)

---

## 🚀 Prérequis

```bash
# Vérifier les services
cd ralph-api && bun dev  # API sur port 8000
cd ralph-dashboard && bun dev  # Dashboard sur port 3000

# Vérifier la BDD
psql postgres://user:pass@localhost/ralph \dt

# Vérifier les sources Claude
ls ~/.claude/projects/
ls ~/.claude-glm/projects/
```

---

## 🛠 Setup de Test

### 1. Données de Test

```bash
# Créer des transcripts de test
mkdir -p ~/.claude/projects/test-project
cat > ~/.claude/projects/test-project/transcript.jsonl << 'EOF'
{"type":"user","message":{"content":"Hello"}}
{"type":"assistant","message":{"usage":{"input_tokens":50000,"cache_read_input_tokens":150000,"cache_creation_input_tokens":5000},"content":"Response"}}
EOF
```

### 2. Moniteurs

```bash
# Terminal 1 - API
cd ralph-api && bun dev

# Terminal 2 - Dashboard
cd ralph-dashboard && bun dev

# Terminal 3 - BDD
watch -n 2 'psql postgres://user:pass@localhost/ralph -c "SELECT COUNT(*), AVG(current_tokens) FROM sessions;"'

# Terminal 4 - Logs
tail -f ralph-api/app.log
```

---

## 🧪 Tests Unitaires

### TU-1: Token Calculation

**Objectif**: Vérifier le calcul des tokens avec le cap

```bash
# Test 1: Tokens réels depuis API
cd ralph-api
bun test tests/test_transcript_service.py

# Vérifier:
# - Real tokens < 200k → OK
# - Estimated tokens capped at 200k → OK
# - Cache read tokens NOT counted → OK
```

**Checklist**:
- [ ] `input_tokens` seul → affiché correct
- [ ] `input_tokens + cache_creation` → affiché correct
- [ ] `input_tokens + cache_read (150k)` → PAS additionné
- [ ] Estimation pour fichier 5MB → capped à 200k

### TU-2: Multi-Source Deduplication

**Objectif**: Vérifier la séparation par source

```bash
# Créer même projet dans 2 sources
cp -r ~/.claude/projects/test-project ~/.claude-glm/projects/

# Attendre 5s (polling)

# Vérifier via API
curl http://localhost:8000/status | jq '.projects[] | select(.name | contains("test-project")) | .name'

# Attendu: 2 projets séparés
# "claude—test-project"
# "claude-glm—test-project"
```

**Checklist**:
- [ ] 2 sessions créées en BDD
- [ ] Tokens séparés par source
- [ ] Noms avec préfixe source

### TU-3: URL-Friendly Names

**Objectif**: Vérifier les URLs de projets

```bash
# Dashboard: cliquer sur "View" d'un projet
# URL attendue: /projects/claude—test-project
# URL interdite: /projects/[claude]%20test-project
```

**Checklist**:
- [ ] Format: `source—name` (em dash)
- [ ] Pas de crochets `[ ]`
- [ ] Pas d'espaces
- [ ] Navigation fonctionne

---

## 🔗 Tests d'Intégration

### TI-1: API → Dashboard

**Objectif**: Vérifier le flux de données

```bash
# 1. Créer un nouveau transcript
NEW_PROJECT="test-$(date +%s)"
mkdir -p ~/.claude/projects/$NEW_PROJECT
echo '{"type":"assistant","message":{"usage":{"input_tokens":75000}}}' \
  > ~/.claude/projects/$NEW_PROJECT/transcript.jsonl

# 2. Attendre polling (5-10s)

# 3. Vérifier API
curl http://localhost:8000/status | jq ".projects[] | select(.name | contains(\"$NEW_PROJECT\"))"

# 4. Vérifier Dashboard (browser)
# http://localhost:3000 → doit afficher le projet

# 5. Cliquer sur "View" → doit naviguer vers la page détail
```

**Checklist**:
- [ ] Projet apparaît dans dashboard
- [ ] Tokens affichés correctement
- [ ] Source badge affiché
- [ ] Navigation vers détail fonctionne

### TI-2: Session Auto-Create

**Objectif**: Vérifier la création automatique de sessions

```bash
# 1. Créer transcript
PROJECT="auto-test-$(date +%s)"
mkdir -p ~/.claude/projects/$PROJECT
echo '{"type":"assistant","message":{"usage":{"input_tokens":50000}}}' \
  > ~/.claude/projects/$PROJECT/transcript.jsonl

# 2. Attendre 35s (sanity check interval)

# 3. Vérifier BDD
psql postgres://user:pass@localhost/ralph \
  -c "SELECT task_description, current_tokens, status FROM sessions WHERE task_description LIKE '%$PROJECT%';"

# Attendu: 1 session avec "Auto-detected: claude:$PROJECT"
```

**Checklist**:
- [ ] Session créée automatiquement
- [ ] task_description contient "claude:$PROJECT"
- [ ] current_tokens = 50000
- [ ] status = 'active'

### TI-3: Token Update

**Objectif**: Vérifier la mise à jour des tokens

```bash
# 1. Modifier le transcript (ajouter des tokens)
PROJECT="update-test"
echo '{"type":"assistant","message":{"usage":{"input_tokens":100000}}}' \
  > ~/.claude/projects/$PROJECT/transcript.jsonl

# 2. Attendre polling (5-10s)

# 3. Vérifier BDD
psql ... -c "SELECT current_tokens FROM sessions WHERE task_description LIKE '%$PROJECT%';"

# Attendu: current_tokens = 100000 (mis à jour)
```

**Checklist**:
- [ ] Tokens mis à jour en BDD
- [ ] Dashboard reflète la nouvelle valeur
- [ ] Pas de duplication de session

### TI-4: SSE Real-Time

**Objectif**: Vérifier les mises à jour temps réel

```bash
# Écouter les événements SSE
curl -N http://localhost:8000/events

# Dans un autre terminal, créer un projet
# Vérifier que l'événement "update" est reçu
```

**Checklist**:
- [ ] Connexion SSE établie
- [ ] Événements reçus en temps réel
- [ ] Dashboard se met à jour sans refresh

---

## 🎯 Tests End-to-End

### E2E-1: User Flow Complet

**Scénario**: Utilisateur utilise Ralph pour un projet

```bash
# 1. Démarrer une session Claude (créer un transcript)
# 2. Ouvrir le dashboard → http://localhost:3000
# 3. Vérifier le projet apparaît
# 4. Cliquer sur "View"
# 5. Vérifier la page détail
# 6. Modifier le transcript
# 7. Vérifier que la page détail se met à jour
# 8. Vérifier que les tokens sont corrects
```

**Checklist**:
- [ ] Projet détecté automatiquement
- [ ] Tokens calculés correctement
- [ ] Source identifiée
- [ ] Navigation fluide
- [ ] Mises à jour temps réel

### E2E-2: Multi-Source Workflow

**Scénario**: Utilisateur avec plusieurs installations Claude

```bash
# 1. Avoir des projets dans ~/.claude ET ~/.claude-glm
# 2. Ouvrir le dashboard
# 3. Vérifier que les deux sources apparaissent
# 4. Vérifier les badges de couleur
# 5. Vérifier que les projets sont séparés
```

**Checklist**:
- [ ] Sources multiples détectées
- [ ] Badges de couleur distincts
- [ ] Projets non fusionnés
- [ ] Tokens corrects par source

---

## ⚡ Tests de Performance

### TP-1: Cache Performance

**Objectif**: Vérifier l'efficacité du cache

```bash
# Mesurer le temps de réponse
time curl http://localhost:8000/status

# Premier appel: ~500ms (scan filesystem)
# Deuxième appel: ~50ms (cache)
```

**Checklist**:
- [ ] Cache fonctionne
- [ ] Response time < 100ms (cached)
- [ ] Cache invalidé quand fichier modifié

### TP-2: Large Dataset

**Objectif**: Tester avec beaucoup de projets

```bash
# Créer 100 projets
for i in {1..100}; do
  mkdir -p ~/.claude/projects/test-$i
  echo '{"type":"assistant","message":{"usage":{"input_tokens":'$((i*1000))'}}}' \
    > ~/.claude/projects/test-$i/transcript.jsonl
done

# Mesurer performance
time curl http://localhost:8000/status
```

**Checklist**:
- [ ] API répond en < 2s
- [ ] Dashboard reste responsive
- [ ] Pas de fuite mémoire

### TP-3: Concurrent Connections

**Objectif**: Tester plusieurs clients

```bash
# Ouvrir 10 onglets browser sur http://localhost:3000
# Vérifier que tous reçoivent les mises à jour SSE
```

**Checklist**:
- [ ] Toutes les connexions fonctionnent
- [ ] Pas de timeout
- [ ] Mises à jour reçues partout

---

## 🔒 Tests de Sécurité

### TS-1: Token Cap

**Objectif**: Vérifier que les tokens ne dépassent jamais 200k

```bash
# Créer un transcript avec valeurs énormes
echo '{"type":"assistant","message":{"usage":{"input_tokens":999999}}}' \
  > ~/.claude/projects/test-huge/transcript.jsonl

# Vérifier
curl http://localhost:8000/status | jq '.projects[] | select(.name | contains("test-huge")) | .currentTokens'

# Doit afficher 200000 (pas plus!)
```

**Checklist**:
- [ ] Jamais > 200k dans l'API
- [ ] Jamais > 200k dans le dashboard
- [ ] context_usage capped à 0.99

### TS-2: Path Traversal

**Objectif**: Empêcher l'accès aux fichiers système

```bash
# Tester avec des chemins malveillants
curl -X POST http://localhost:8000/api/tools/fast-apply \
  -d '{"file_path":"../../../etc/passwd","intent":"test"}'

# Doit retourner une erreur, PAS le fichier
```

**Checklist**:
- [ ] Chemins bloqués
- [ ] Erreur retournée
- [ ] Pas de fuite de données

---

## ✅ Checklist de Validation

### Corrections Récentes

- [x] Token calculation cap à 200k
- [x] Multi-source deduplication (`source:project`)
- [x] URL-friendly names (`source—name`)
- [x] Session token updates
- [x] Cache clearing on startup
- [x] Search page reset

### Fonctionnalités Core

- [ ] Détection automatique des transcripts
- [ ] Calcul des tokens (réels ou estimés)
- [ ] Multi-source support
- [ ] Dashboard temps réel
- [ ] Page détail projet
- [ ] Navigation fluide

### Issues de l'Audit

#### Critical (1)
- [ ] Backup cleanup `/tmp/ralph_backups/`

#### High (3)
- [ ] Path.cwd() → config
- [ ] Debug logging spam
- [ ] Search error handling

#### Medium (6)
- [ ] WarpGrep default paths
- [ ] Project name patterns config
- [ ] Context usage avec cap
- [ ] Sanity check thread safety
- [ ] SSE client list locking
- [ ] MCP polling cleanup

---

## 📊 Critères de Succès

### Minimum Viable (70%)
- [ ] Tokens calculés correctement
- [ ] Multi-source détecté
- [ ] Dashboard fonctionnel
- [ ] Pas de crash

### Production Ready (90%)
- [ ] Tous les tests unitaires passent
- [ ] Tous les tests E2E passent
- [ ] Performance OK
- [ ] Sécurité OK

### Excellent (95%+)
- [ ] Toutes les issues de l'audit résolues
- [ ] Tests de performance OK
- [ ] Documentation complète
- [ ] Monitoring en place

---

## 🚨 Procédure en cas d'échec

### Test échoue
1. **Identifier** : Quel test? Quelle erreur?
2. **Logs** : Checker `ralph-api/app.log`
3. **BDD** : Vérifier les données
4. **Réparer** : Corriger le bug
5. **Re-tester** : Relancer le test

### Bug critique
1. Arrêter les services
2. Sauvegarder la BDD
3. Corriger le bug
4. Restaurer la BDD si nécessaire
5. Relancer les tests

---

## 📝 Notes

- **Intervalle polling**: 5s
- **Intervalle sanity check**: 35s
- **SSE timeout**: 30s
- **Max context tokens**: 200k
- **Cache size**: variable (nombre de transcripts)

---

**Fin du plan de test**
