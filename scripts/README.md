# Scripts Nexus

Scripts d'installation et de maintenance pour Nexus.

## Scripts Disponibles

### `install.ts` - Installation TypeScript

Script d'installation appelé par `install.sh`. Configure les hooks Claude Code et le serveur MCP.

```bash
bun run scripts/install.ts
```

### `install-helpers.ts` - Helpers

Fonctions utilitaires pour la lecture/écriture des fichiers de configuration Claude Code.

### `reset-db.sh` - Reset Database

Supprime et réindexe la base de données.

```bash
./scripts/reset-db.sh
```

## Utilisation Recommandée

Utilisez plutôt le script principal à la racine :

```bash
./install.sh              # Installation complète
./install.sh --uninstall  # Désinstallation
./install.sh --help       # Aide
```
