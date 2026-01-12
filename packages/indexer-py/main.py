#!/usr/bin/env python3
"""
Nexus Indexer - Python Streaming Service
Zero-buffer indexation: 1 fichier en mémoire max

Usage:
    python main.py index <path> [--db nexus.db] [--max-files 10000]
    python main.py status --db nexus.db
    python main.py clear --db nexus.db
"""

import argparse
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

from scanner import scan_workspace_sync
from database import (
    init_db,
    get_stats,
    clear_index,
    get_or_create_project,
    update_project_indexed_at,
    get_mistral_api_key,
    embed_chunks_with_mistral,
    get_chunks_without_embeddings,
)


def run_post_index_hooks(conn, result: dict, project_id: int, api_url: str = "http://localhost:3001") -> dict:
    """
    Exécute les hooks d'analyse post-indexation.

    Appelle l'API Nexus pour analyser le contenu indexé et détecter
    automatiquement des patterns et suggérer des mémoires pertinentes.
    """
    hooks_result = {
        "patterns_detected": 0,
        "memories_suggested": 0,
        "errors": []
    }

    try:
        # Préparer le payload
        payload = json.dumps({
            "project_id": project_id,
            "stats": {
                "files_scanned": result.get("files_scanned", 0),
                "files_indexed": result.get("files_indexed", 0),
                "files_skipped": result.get("files_skipped", 0),
                "chunks_created": result.get("chunks_created", 0),
                "errors": result.get("errors", [])
            }
        }).encode()

        # Appeler l'API d'analyse
        req = urllib.request.Request(
            f"{api_url}/projects/post-index",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            hooks_result = json.loads(response.read().decode())

    except urllib.error.HTTPError as e:
        # L'API n'est pas disponible (normal pendant le développement)
        hooks_result["errors"].append(f"API not available (HTTP {e.code}): {e.reason}")
    except urllib.error.URLError as e:
        # L'API n'est pas démarrée (normal pendant le développement)
        hooks_result["errors"].append(f"API not available: {e.reason}")
    except Exception as e:
        # Autre erreur
        hooks_result["errors"].append(str(e))

    return hooks_result


def cmd_index(args):
    """Index un workspace en streaming."""
    db_path = Path(args.db)
    root_path = Path(args.path).resolve()

    if not root_path.exists():
        print(json.dumps({"error": f"Path not found: {root_path}"}))
        sys.exit(1)

    # Init DB
    conn = init_db(db_path)

    # Auto-créer le projet s'il n'existe pas
    project = get_or_create_project(conn, str(root_path), name=args.project_name)
    project_id = project["id"]

    # Index en streaming (sync)
    result = scan_workspace_sync(
        conn=conn,
        root_path=root_path,
        max_files=args.max_files,
        max_file_size=args.max_size,
        max_chunk_lines=args.chunk_lines,
        project_id=project_id,
    )

    # Mettre à jour le timestamp d'indexation
    update_project_indexed_at(conn, project_id)

    # Exécuter les hooks post-indexation (analyse intelligente)
    # Note: l'API doit être démarrée pour que cela fonctionne
    hooks_result = run_post_index_hooks(conn, result, project_id)
    result["post_index_hooks"] = hooks_result

    # Générer les embeddings automatiquement avec Mistral
    chunks_without = get_chunks_without_embeddings(conn)
    if chunks_without > 0:
        api_key = get_mistral_api_key()
        if api_key:
            print(f"\n🧠 Generating embeddings for {chunks_without} chunks...", file=sys.stderr)
            embeddings_result = embed_chunks_with_mistral(conn, api_key)
            result["embeddings"] = embeddings_result
            print(f"   ✅ {embeddings_result['embedded_count']} embedded in {embeddings_result['duration_ms']}ms", file=sys.stderr)
            if embeddings_result.get('skipped_count', 0) > 0:
                print(f"   ⏭️  {embeddings_result['skipped_count']} skipped (too large)", file=sys.stderr)
            if embeddings_result['error_count'] > 0:
                print(f"   ⚠️  {embeddings_result['error_count']} errors", file=sys.stderr)
        else:
            print("⚠️  MISTRAL_API_KEY not found in apps/api/.env - skipping embeddings", file=sys.stderr)
            result["embeddings"] = {"skipped": True, "reason": "MISTRAL_API_KEY not found"}

    # Ajouter les infos du projet au résultat
    result["project"] = {
        "id": project_id,
        "name": project["name"],
        "root_path": str(root_path),
    }

    conn.close()

    # Output JSON pour parsing par Bun
    print(json.dumps(result))


def cmd_status(args):
    """Affiche les stats de l'index."""
    db_path = Path(args.db)

    if not db_path.exists():
        print(json.dumps({"error": "Database not found"}))
        sys.exit(1)

    conn = init_db(db_path)
    stats = get_stats(conn)
    conn.close()

    print(json.dumps(stats))


def cmd_clear(args):
    """Vide l'index."""
    db_path = Path(args.db)

    if not db_path.exists():
        print(json.dumps({"error": "Database not found"}))
        sys.exit(1)

    conn = init_db(db_path)
    clear_index(conn)
    conn.close()

    print(json.dumps({"status": "cleared"}))


def main():
    parser = argparse.ArgumentParser(description="Nexus Indexer - Python Streaming")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # index command
    index_parser = subparsers.add_parser("index", help="Index a workspace")
    index_parser.add_argument("path", help="Root path to index")
    index_parser.add_argument("--db", default="apps/api/nexus.db", help="SQLite database path")
    index_parser.add_argument("--project-name", help="Project name (auto-detected from folder if not provided)")
    index_parser.add_argument("--max-files", type=int, default=10000, help="Max files to index")
    index_parser.add_argument("--max-size", type=int, default=1048576, help="Max file size in bytes (1MB)")
    index_parser.add_argument("--chunk-lines", type=int, default=80, help="Max lines per chunk")

    # status command
    status_parser = subparsers.add_parser("status", help="Show index stats")
    status_parser.add_argument("--db", default="apps/api/nexus.db", help="SQLite database path")

    # clear command
    clear_parser = subparsers.add_parser("clear", help="Clear the index")
    clear_parser.add_argument("--db", default="apps/api/nexus.db", help="SQLite database path")

    args = parser.parse_args()

    if args.command == "index":
        cmd_index(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "clear":
        cmd_clear(args)


if __name__ == "__main__":
    main()
