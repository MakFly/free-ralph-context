"""
Streaming file scanner - Zero buffer architecture
Utilise des générateurs pour ne jamais garder plus d'1 fichier en mémoire
"""

import hashlib
import sys
import time
from pathlib import Path
from typing import Generator, Any
import sqlite3

from chunker import chunk_content, detect_language
from database import (
    get_file_by_path,
    upsert_file,
    delete_chunks_for_file,
    insert_chunk,
)


# ANSI codes pour la progress bar
ANSI_CLEAR_LINE = '\033[K'
ANSI_MOVE_CURSOR = '\033[G'


def show_progress(current: int, total: int, width: int = 40, file_path: str | None = None) -> None:
    """Affiche une progress bar sur stderr."""
    if total <= 0:
        percent = 100
    else:
        percent = min(100, int((current / total) * 100))

    filled = int(width * percent / 100)
    bar = '█' * filled + '░' * (width - filled)

    # Afficher sur stderr pour ne pas polluer stdout
    sys.stderr.write(f'\r{ANSI_MOVE_CURSOR} [{bar}] {percent:3d}% ')

    if file_path:
        # Tronquer le nom du fichier si trop long
        display_path = file_path
        if len(display_path) > 50:
            display_path = '...' + display_path[-47:]
        sys.stderr.write(f'| {display_path}')

    sys.stderr.flush()


def clear_progress() -> None:
    """Efface la progress bar."""
    sys.stderr.write(f'\r{ANSI_CLEAR_LINE}{ANSI_MOVE_CURSOR}')
    sys.stderr.flush()


# Patterns à ignorer (comme .gitignore)
# Exhaustive list of directories that should NEVER be indexed
DEFAULT_IGNORE = {
    # JavaScript/Node
    "node_modules",
    ".npm",
    ".yarn",
    ".pnpm-store",
    "bower_components",

    # PHP/Composer
    "vendor",

    # Python
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "venv",
    ".venv",
    "env",
    ".env",
    "site-packages",
    ".tox",
    ".nox",
    "eggs",
    "*.egg-info",

    # Build outputs
    "dist",
    "build",
    "out",
    "target",  # Rust/Java
    "_build",  # Elixir/Sphinx
    "public/build",  # Laravel Mix

    # Framework caches
    ".next",
    ".nuxt",
    ".output",  # Nuxt 3
    ".vinxi",
    ".svelte-kit",
    ".vercel",
    ".netlify",
    "var",  # Symfony (cache, log, etc.)
    "storage",  # Laravel (logs, cache, framework)
    "bootstrap/cache",  # Laravel

    # IDE/Editor
    ".idea",
    ".vscode",
    ".vs",
    "*.sublime-workspace",

    # Version control
    ".git",
    ".svn",
    ".hg",

    # Test coverage
    "coverage",
    ".nyc_output",
    "htmlcov",

    # Caches
    ".cache",
    ".turbo",
    ".parcel-cache",
    ".webpack",
    ".rollup.cache",
    ".eslintcache",
    ".stylelintcache",

    # Logs
    "logs",
    "*.log",

    # Temporary
    "tmp",
    "temp",
    ".tmp",

    # OS files
    ".DS_Store",
    "Thumbs.db",

    # Docker
    ".docker",
}

# Additional patterns from common .gitignore files
GITIGNORE_COMMON_PATTERNS = {
    "*.local",
    "*.lock",  # Most lock files aren't useful for indexing
    ".env*",
    "*.bak",
    "*.swp",
    "*.swo",
    "*~",
}

IGNORE_EXTENSIONS = {
    ".min.js",
    ".min.css",
    ".bundle.js",
    ".map",
    ".db",
    ".db-shm",
    ".db-wal",
    ".pyc",
    ".pyo",
    ".so",
    ".dylib",
    ".dll",
    ".exe",
    ".bin",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp3",
    ".mp4",
    ".wav",
    ".avi",
    ".mov",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".7z",
}


def parse_gitignore(root_path: Path) -> set[str]:
    """
    Parse .gitignore file and return set of patterns to ignore.
    Returns empty set if no .gitignore exists.
    """
    gitignore_path = root_path / ".gitignore"
    patterns = set()

    if not gitignore_path.exists():
        return patterns

    try:
        content = gitignore_path.read_text(encoding="utf-8", errors="ignore")
        for line in content.splitlines():
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith("#"):
                continue
            # Remove trailing slashes for directory patterns
            pattern = line.rstrip("/")
            # Skip negation patterns (too complex for simple matching)
            if pattern.startswith("!"):
                continue
            patterns.add(pattern)
    except Exception:
        pass  # Silently ignore read errors

    return patterns


def should_ignore(name: str, rel_path: str, gitignore_patterns: set[str]) -> bool:
    """
    Check if a file/directory should be ignored.
    Supports simple glob matching for gitignore patterns.
    """
    import fnmatch

    # Check default ignore list (exact match)
    if name in DEFAULT_IGNORE:
        return True

    # Check gitignore patterns
    for pattern in gitignore_patterns:
        # Pattern matches directory name directly
        if fnmatch.fnmatch(name, pattern):
            return True
        # Pattern matches relative path
        if fnmatch.fnmatch(rel_path, pattern):
            return True
        # Pattern with ** matches anywhere in path
        if "**" in pattern:
            simplified = pattern.replace("**", "*")
            if fnmatch.fnmatch(rel_path, simplified):
                return True

    return False


def walk_files(root_path: Path, max_depth: int = 20) -> Generator[Path, None, None]:
    """
    Générateur streaming de fichiers.
    Ne garde JAMAIS la liste complète en mémoire.
    Respecte le .gitignore du projet.
    """
    # Parse .gitignore once at the start
    gitignore_patterns = parse_gitignore(root_path)

    def _walk(path: Path, depth: int):
        if depth > max_depth:
            return

        try:
            entries = list(path.iterdir())
        except PermissionError:
            return

        for entry in entries:
            rel_path = str(entry.relative_to(root_path))

            # Skip ignored directories
            if entry.is_dir():
                # Skip hidden directories
                if entry.name.startswith("."):
                    continue
                # Check ignore patterns
                if should_ignore(entry.name, rel_path, gitignore_patterns):
                    continue
                yield from _walk(entry, depth + 1)

            elif entry.is_file():
                # Skip hidden files
                if entry.name.startswith("."):
                    continue
                # Skip ignored extensions
                if entry.suffix.lower() in IGNORE_EXTENSIONS:
                    continue
                # Check ignore patterns for files too
                if should_ignore(entry.name, rel_path, gitignore_patterns):
                    continue

                yield entry

    yield from _walk(root_path, 0)


def hash_content(content: str) -> str:
    """Hash xxhash-style (mais en SHA256 tronqué pour simplicité)."""
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def scan_workspace_sync(
    conn: sqlite3.Connection,
    root_path: Path,
    max_files: int = 10000,
    max_file_size: int = 1024 * 1024,  # 1MB
    max_chunk_lines: int = 80,
    project_id: int | None = None,
    progress_bar: bool = True,
) -> dict[str, Any]:
    """
    Scan et indexe un workspace en streaming (SYNC).

    ZERO BUFFER: Chaque fichier est traité et libéré immédiatement.
    Mémoire max = taille du plus gros fichier.
    """
    start_time = time.time()

    result = {
        "files_scanned": 0,
        "files_indexed": 0,
        "files_skipped": 0,
        "chunks_created": 0,
        "errors": [],
    }

    # Compter les fichiers d'abord pour la progress bar
    total_files = 0
    if progress_bar:
        for _ in walk_files(root_path):
            total_files += 1
            if total_files >= max_files:
                break

    # Afficher la progress bar initiale
    if progress_bar:
        show_progress(0, max(1, total_files), file_path="Initialisation...")

    # Streaming: traite 1 fichier à la fois
    for file_path in walk_files(root_path):
        if result["files_scanned"] >= max_files:
            result["stopped_early"] = True
            break

        result["files_scanned"] += 1
        rel_path = str(file_path.relative_to(root_path))

        # Mettre à jour la progress bar
        if progress_bar and result["files_scanned"] % 10 == 0:
            show_progress(result["files_scanned"], max(1, total_files), file_path=rel_path)

        try:
            # Check file size AVANT de lire
            stat = file_path.stat()
            file_size = stat.st_size
            file_mtime = int(stat.st_mtime * 1000)  # Convert to milliseconds

            if file_size > max_file_size:
                result["files_skipped"] += 1
                continue

            # Lire le fichier (seul moment où on utilise de la RAM)
            content = file_path.read_text(encoding="utf-8", errors="ignore")

            # Hash pour détecter les changements
            content_hash = hash_content(content)

            # Check si déjà indexé avec même hash
            existing = get_file_by_path(conn, rel_path)
            if existing and existing["hash"] == content_hash:
                result["files_skipped"] += 1
                continue  # Fichier inchangé, skip

            # Detect language
            lang = detect_language(file_path.name)

            # Upsert file record
            file_id = upsert_file(
                conn,
                path=rel_path,
                content_hash=content_hash,
                size=file_size,
                lang=lang,
                mtime=file_mtime,
                project_id=project_id,
            )

            # Delete old chunks si update
            if existing:
                delete_chunks_for_file(conn, file_id)

            # Chunk et insert IMMÉDIATEMENT (pas d'accumulation)
            chunks = chunk_content(content, max_lines=max_chunk_lines)

            for chunk in chunks:
                insert_chunk(
                    conn,
                    file_id=file_id,
                    start_line=chunk["start_line"],
                    end_line=chunk["end_line"],
                    content=chunk["content"],
                    symbol=chunk.get("symbol"),
                    kind=chunk.get("kind"),
                )
                result["chunks_created"] += 1

            result["files_indexed"] += 1

            # Commit après chaque fichier (pas de transaction longue)
            conn.commit()

        except UnicodeDecodeError:
            # Fichier binaire déguisé en texte
            result["files_skipped"] += 1
        except Exception as e:
            result["errors"].append({
                "path": rel_path,
                "error": str(e),
            })

        # Le contenu est automatiquement libéré ici (sort du scope)

    # Effacer la progress bar
    if progress_bar:
        clear_progress()

    result["duration_ms"] = int((time.time() - start_time) * 1000)
    return result
