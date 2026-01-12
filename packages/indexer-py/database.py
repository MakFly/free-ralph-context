"""
SQLite database operations - Compatible avec le schema Nexus existant
"""

import sqlite3
import time
import os
import sys
import json
import struct
from pathlib import Path
from typing import Any
import urllib.request
import urllib.error


def init_db(db_path: Path) -> sqlite3.Connection:
    """
    Initialise la connexion SQLite.
    Crée les tables si elles n'existent pas.
    """
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row  # Pour accéder aux colonnes par nom

    # Enable WAL mode for better concurrency
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    # Create tables if not exist (compatible avec schema Nexus)
    conn.executescript("""
        -- Files table
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            hash TEXT NOT NULL,
            mtime INTEGER,
            size INTEGER,
            lang TEXT,
            indexed_at INTEGER NOT NULL,
            project_id INTEGER,
            ignored BOOLEAN DEFAULT FALSE
        );

        CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
        CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
        CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);

        -- Chunks table
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
            start_line INTEGER NOT NULL,
            end_line INTEGER NOT NULL,
            content TEXT NOT NULL,
            symbol TEXT,
            kind TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);

        -- Embeddings table for semantic search
        CREATE TABLE IF NOT EXISTS embeddings (
            chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
            vector BLOB NOT NULL,
            model TEXT NOT NULL
        );

        -- FTS5 virtual table for full-text search
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
            content,
            content='chunks',
            content_rowid='id'
        );

        -- Triggers to keep FTS in sync
        CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
            INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
        END;

        CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
            INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
        END;
    """)

    conn.commit()
    return conn


def get_file_by_path(conn: sqlite3.Connection, path: str) -> dict | None:
    """Récupère un fichier par son path."""
    cursor = conn.execute(
        "SELECT id, path, hash, size, lang FROM files WHERE path = ?",
        (path,)
    )
    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def upsert_file(
    conn: sqlite3.Connection,
    path: str,
    content_hash: str,
    size: int,
    lang: str | None,
    mtime: int | None = None,
    project_id: int | None = None,
) -> int:
    """Insert ou update un fichier. Retourne l'ID."""
    now = int(time.time() * 1000)

    # Try update first
    cursor = conn.execute(
        """
        UPDATE files SET hash = ?, mtime = ?, size = ?, lang = ?, indexed_at = ?, project_id = ?
        WHERE path = ?
        """,
        (content_hash, mtime, size, lang, now, project_id, path)
    )

    if cursor.rowcount > 0:
        # Updated, get the ID
        cursor = conn.execute("SELECT id FROM files WHERE path = ?", (path,))
        return cursor.fetchone()[0]

    # Insert new
    cursor = conn.execute(
        """
        INSERT INTO files (path, hash, mtime, size, lang, indexed_at, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (path, content_hash, mtime, size, lang, now, project_id)
    )
    return cursor.lastrowid


def delete_chunks_for_file(conn: sqlite3.Connection, file_id: int) -> None:
    """Supprime tous les chunks d'un fichier."""
    conn.execute("DELETE FROM chunks WHERE file_id = ?", (file_id,))


def insert_chunk(
    conn: sqlite3.Connection,
    file_id: int,
    start_line: int,
    end_line: int,
    content: str,
    symbol: str | None = None,
    kind: str | None = None,
) -> int:
    """Insert un chunk. Retourne l'ID."""
    cursor = conn.execute(
        """
        INSERT INTO chunks (file_id, start_line, end_line, content, symbol, kind)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (file_id, start_line, end_line, content, symbol, kind)
    )
    return cursor.lastrowid


def get_stats(conn: sqlite3.Connection) -> dict[str, Any]:
    """Retourne les statistiques de l'index."""
    files_count = conn.execute("SELECT COUNT(*) FROM files").fetchone()[0]
    chunks_count = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]

    # Languages distribution
    langs = conn.execute(
        "SELECT lang, COUNT(*) as count FROM files WHERE lang IS NOT NULL GROUP BY lang ORDER BY count DESC LIMIT 10"
    ).fetchall()

    return {
        "files": files_count,
        "chunks": chunks_count,
        "languages": {row["lang"]: row["count"] for row in langs},
    }


def clear_index(conn: sqlite3.Connection) -> None:
    """Vide complètement l'index."""
    conn.execute("DELETE FROM chunks")
    conn.execute("DELETE FROM files")
    conn.commit()


def search_fts(
    conn: sqlite3.Connection,
    query: str,
    limit: int = 20,
    offset: int = 0,
    project_id: int | None = None,
) -> list[dict]:
    """
    Recherche FTS5 avec BM25 ranking.
    Retourne les chunks matchant la query.
    """
    # Escape query for FTS5
    escaped_query = query if " " not in query else f'"{query}"'

    if project_id is not None:
        cursor = conn.execute(
            """
            SELECT
                c.id,
                f.path,
                c.start_line,
                c.end_line,
                c.content,
                c.symbol,
                c.kind,
                -bm25(chunks_fts) as score
            FROM chunks_fts
            JOIN chunks c ON chunks_fts.rowid = c.id
            JOIN files f ON c.file_id = f.id
            WHERE chunks_fts MATCH ? AND f.project_id = ?
            ORDER BY score DESC
            LIMIT ? OFFSET ?
            """,
            (escaped_query, project_id, limit, offset)
        )
    else:
        cursor = conn.execute(
            """
            SELECT
                c.id,
                f.path,
                c.start_line,
                c.end_line,
                c.content,
                c.symbol,
                c.kind,
                -bm25(chunks_fts) as score
            FROM chunks_fts
            JOIN chunks c ON chunks_fts.rowid = c.id
            JOIN files f ON c.file_id = f.id
            WHERE chunks_fts MATCH ?
            ORDER BY score DESC
            LIMIT ? OFFSET ?
            """,
            (escaped_query, limit, offset)
        )

    return [dict(row) for row in cursor.fetchall()]


def create_project(
    conn: sqlite3.Connection,
    name: str,
    root_path: str,
    description: str | None = None,
) -> int:
    """
    Crée un nouveau projet et retourne son ID.
    """
    cursor = conn.execute(
        """
        INSERT INTO projects (name, root_path, description)
        VALUES (?, ?, ?)
        """,
        (name, root_path, description)
    )
    conn.commit()
    return cursor.lastrowid


def get_project_by_path(conn: sqlite3.Connection, root_path: str) -> dict | None:
    """
    Récupère un projet par son root_path.
    """
    cursor = conn.execute(
        "SELECT id, name, root_path, description, created_at, updated_at, last_indexed_at, file_count, chunk_count, memory_count, pattern_count FROM projects WHERE root_path = ?",
        (root_path,)
    )
    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def get_or_create_project(
    conn: sqlite3.Connection,
    root_path: str,
    name: str | None = None,
) -> dict:
    """
    Récupère un projet par son path, ou le crée s'il n'existe pas.
    Retourne le projet (dict avec id, name, root_path, etc.).
    """
    project = get_project_by_path(conn, root_path)
    if project:
        return project

    # Créer le projet avec le nom du dossier si pas fourni
    if name is None:
        name = Path(root_path).name

    project_id = create_project(conn, name, root_path)

    # Récupérer le projet créé
    project = get_project_by_path(conn, root_path)
    return project


def update_project_indexed_at(
    conn: sqlite3.Connection,
    project_id: int,
) -> None:
    """
    Met à jour le timestamp last_indexed_at d'un projet.
    """
    conn.execute(
        "UPDATE projects SET last_indexed_at = datetime('now') WHERE id = ?",
        (project_id,)
    )
    conn.commit()


def get_mistral_api_key(env_path: Path | None = None) -> str | None:
    """
    Récupère la clé API Mistral depuis le fichier .env.
    Cherche dans apps/api/.env par défaut.
    """
    if env_path is None:
        # Chercher le fichier .env dans apps/api/
        current_dir = Path(__file__).parent.parent.parent
        env_path = current_dir / "apps" / "api" / ".env"

    if not env_path.exists():
        return None

    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("MISTRAL_API_KEY="):
                return line.split("=", 1)[1].strip()

    return None


def vector_to_blob(vector: list[float]) -> bytes:
    """Convertit un vecteur de float en BLOB pour SQLite."""
    float_array = struct.pack(f'{len(vector)}f', *vector)
    return float_array


def embed_chunks_with_mistral(
    conn: sqlite3.Connection,
    api_key: str,
    batch_size: int = 20,
    model: str = "mistral-embed",
) -> dict:
    """
    Génère les embeddings pour tous les chunks sans embeddings avec l'API Mistral.

    Args:
        conn: Connexion SQLite
        api_key: Clé API Mistral
        batch_size: Taille des batchs (max 100 pour Mistral, 20 par défaut pour sécurité)
        model: Modèle d'embeddings

    Returns:
        Dict avec embedded_count, error_count, duration_ms
    """
    import time

    start_time = time.time()

    # Récupérer les chunks sans embeddings (exclure les chunks trop longs)
    # Estimation: ~4 chars par token, max 8192 tokens = ~20000 chars (conservateur)
    cursor = conn.execute("""
        SELECT c.id, c.content
        FROM chunks c
        LEFT JOIN embeddings e ON c.id = e.chunk_id
        LEFT JOIN files f ON c.file_id = f.id
        WHERE e.chunk_id IS NULL
          AND LENGTH(c.content) <= 20000
          AND f.path NOT LIKE '%.min.%'
          AND f.path NOT LIKE '%/vendor/%'
          AND f.path NOT LIKE '%/node_modules/%'
        ORDER BY c.id
    """)

    chunks = cursor.fetchall()

    if not chunks:
        return {"embedded_count": 0, "error_count": 0, "duration_ms": 0}

    embedded_count = 0
    error_count = 0
    skipped_count = 0

    # Traiter par batchs
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        chunk_ids = [row[0] for row in batch]
        texts = [row[1] for row in batch]

        # Vérifier la taille totale du batch (max tokens = batch_size * 8192)
        total_chars = sum(len(t) for t in texts)
        if total_chars > batch_size * 20000:
            # Batch trop volumineux, réduire la taille
            skipped_count += len(batch)
            continue

        try:
            # Appel à l'API Mistral
            payload = {
                "model": model,
                "input": texts,
                "encoding_format": "float"
            }

            req = urllib.request.Request(
                "https://api.mistral.ai/v1/embeddings",
                data=json.dumps(payload).encode(),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())

                # Insérer les embeddings
                for chunk_id, embedding_data in zip(chunk_ids, result["data"]):
                    vector = embedding_data["embedding"]
                    blob = vector_to_blob(vector)

                    conn.execute(
                        "INSERT INTO embeddings (chunk_id, vector, model) VALUES (?, ?, ?)",
                        (chunk_id, blob, model)
                    )
                    embedded_count += 1

                conn.commit()

        except urllib.error.HTTPError as e:
            error_count += len(batch)
            error_body = e.read().decode()
            print(f"Erreur HTTP Mistral: {e.code} - {e.reason}", file=sys.stderr)
            print(f"Response body: {error_body[:500]}", file=sys.stderr)
        except urllib.error.URLError as e:
            error_count += len(batch)
            print(f"Erreur URL Mistral: {e.reason}", file=sys.stderr)
        except Exception as e:
            error_count += len(batch)
            print(f"Erreur lors de la génération d'embeddings: {e}", file=sys.stderr)

    duration_ms = int((time.time() - start_time) * 1000)

    return {
        "embedded_count": embedded_count,
        "error_count": error_count,
        "skipped_count": skipped_count,
        "duration_ms": duration_ms
    }


def get_chunks_without_embeddings(conn: sqlite3.Connection) -> int:
    """Retourne le nombre de chunks sans embeddings."""
    cursor = conn.execute("""
        SELECT COUNT(*)
        FROM chunks c
        LEFT JOIN embeddings e ON c.id = e.chunk_id
        WHERE e.chunk_id IS NULL
    """)
    return cursor.fetchone()[0]
