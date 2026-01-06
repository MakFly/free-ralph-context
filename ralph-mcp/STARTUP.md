# 🚀 Ralph MCP - Guide de Démarrage

## ⚠️ IMPORTANT - Ordre de démarrage

Le MCP Ralph échouera si l'API n'est **pas démarrée AVANT** Claude Desktop !

### 1️⃣ Démarrer l'API (OBLIGATOIRE)

```bash
# Méthode recommandée - Script automatisé
cd ~/Documents/lab/brainstorming/free-ralph-context
./start.sh
```

Ou manuellement:

```bash
cd ~/Documents/lab/brainstorming/free-ralph-context/ralph-api
docker-compose up -d
```

**Vérifier que l'API fonctionne**:
```bash
curl http://localhost:8000/health/
```

Doit retourner:
```json
{"status":"healthy","redis":true,"embedding_service":true,"search_service":true}
```

### 2️⃣ Démarrer Claude Desktop

Une fois l'API démarrée, lancez Claude Desktop.

Les outils `ralph_*` seront disponibles automatiquement.

## 🔧 Outils disponibles (13)

### Session
- `ralph_malloc` - Initialiser une session
- `ralph_get_status` - Vérifier l'état

### Patterns (NOUVEAU)
- `ralph_scan_project` - Scanner le projet
- `ralph_learn_pattern` - Apprendre un pattern
- `ralph_get_pattern` - Récupérer un pattern
- `ralph_list_patterns` - Lister les patterns

### Context
- `ralph_compress` - Comprimer le contexte
- `ralph_fold` - Context folding
- `ralph_should_fold` - Évaluer si besoin de fold

### Memory
- `ralph_add_memory` - Ajouter un mémoire
- `ralph_search` - Rechercher
- `ralph_checkpoint` - Créer checkpoint
- `ralph_curate` - Nettoyer mémoires

## 🐛 Résolution de problèmes

### MCP échoue au démarrage

**Symptôme**: "ralph-mcp failed" dans Claude Desktop

**Cause**: L'API n'est pas démarrée

**Solution**:
```bash
cd ~/Documents/lab/brainstorming/free-ralph-context
./start.sh
# Attendre "✅ Ralph is ready!"
# Puis redémarrer Claude Desktop
```

### Vérifier les logs

```bash
# Logs API
cd ~/Documents/lab/brainstorming/free-ralph-context/ralph-api
docker-compose logs -f api

# Tester MCP manuellement
cd ~/Documents/lab/brainstorming/free-ralph-context/ralph-mcp
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | python3 mcp_server.py
```

## 🛑 Arrêter

```bash
cd ~/Documents/lab/brainstorming/free-ralph-context
./stop.sh
```
