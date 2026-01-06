"""
Ralph Project Registry - Cross-Project Context Management

Implements 4 options for seamless cross-project context:
1. Project Alias Registry (~/.ralph/projects.json)
2. Smart CWD Switcher (temp directory switching)
3. Global FTS5 Index (fast search across all projects)
4. Fuzzy Project Finder (fuzzy matching)

Auto-initializes and updates on every MCP call.
"""

import json
import os
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
import sqlite3
import re
from difflib import SequenceMatcher

# Paths
RALPH_DIR = Path.home() / ".ralph"
PROJECTS_JSON = RALPH_DIR / "projects.json"
DB_PATH = RALPH_DIR / "ralph-mcp.db"

# Common project directories to scan
COMMON_SEARCH_PATHS = [
    Path.home() / "Documents" / "lab",
    Path.home() / "Documents" / "projects",
    Path.home() / "projects",
    Path.home() / "work",
    Path.home() / "code",
]

# Source directory patterns for auto-detection
SOURCE_PATTERNS = [
    "src", "app", "lib", "packages", "modules", "components",
    "pages", "routes", "api", "server", "client", "frontend", "backend"
]

# Directories to always exclude
EXCLUDE_DIRS = {
    "node_modules", "vendor", ".git", ".svn", ".hg", "dist", "build",
    ".next", ".nuxt", ".output", "__pycache__", ".venv", "coverage",
    ".cache", "target", "bin", "obj", ".pytest_cache"
}


class ProjectRegistry:
    """
    Central project registry with auto-sync and fuzzy search.

    Features:
    - Auto-initializes ~/.ralph/projects.json
    - Scans and updates on every MCP call
    - Syncs with SQLite FTS5 index
    - Fuzzy project name matching
    """

    def __init__(self, db=None):
        """Initialize registry and ensure projects.json exists."""
        self.db = db
        self._projects: Dict[str, Dict[str, Any]] = {}
        self._ensure_registry_exists()
        self._load_from_json()
        self._sync_from_db()

    # === INITIALIZATION ===

    def _ensure_registry_exists(self) -> None:
        """Create ~/.ralph/projects.json with defaults if missing."""
        if PROJECTS_JSON.exists():
            return

        # Auto-discover projects
        discovered = self._discover_projects()

        # Create default registry
        registry = {
            "version": "1.0",
            "auto_discovered": True,
            "projects": {}
        }

        # Add discovered projects
        for name, path in discovered.items():
            registry["projects"][name] = {
                "path": path,
                "description": f"Auto-discovered project: {name}",
                "aliases": self._generate_aliases(name),
                "keywords": self._generate_keywords(name),
                "framework": self._detect_framework(path),
                "auto": True
            }

        # Write to file
        PROJECTS_JSON.parent.mkdir(parents=True, exist_ok=True)
        with open(PROJECTS_JSON, 'w') as f:
            json.dump(registry, f, indent=2)

    # === DISCOVERY ===

    def _discover_projects(self) -> Dict[str, str]:
        """Auto-discover projects from common directories."""
        discovered = {}

        for base_path in COMMON_SEARCH_PATHS:
            if not base_path.exists():
                continue

            # Walk 2 levels deep
            for root_str, dirs, files in os.walk(base_path):
                root = Path(root_str)
                try:
                    depth = root.relative_to(base_path).parts
                except ValueError:
                    # root is not relative to base_path (shouldn't happen)
                    continue

                if len(depth) > 2:
                    continue

                # Check if this looks like a project
                if self._is_project_dir(root):
                    name = root.name
                    if name not in discovered:
                        discovered[name] = str(root.absolute())

                # Filter out excluded dirs
                dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        return discovered

    def _is_project_dir(self, path: Path) -> bool:
        """Check if directory looks like a code project."""
        if not path.is_dir():
            return False

        # Check for source directories
        has_source = any((path / d).exists() for d in SOURCE_PATTERNS)

        # Check for config files
        config_indicators = [
            "package.json", "pom.xml", "build.gradle", "Cargo.toml",
            "go.mod", "composer.json", "Gemfile", "requirements.txt",
            "pyproject.toml", "setup.py", "mix.exs", "project.clj"
        ]
        has_config = any((path / f).exists() for f in config_indicators)

        return has_source or has_config

    def _detect_framework(self, path: str) -> str:
        """Detect the primary framework of a project."""
        p = Path(path)

        # Check package.json for JS/TS frameworks
        if (p / "package.json").exists():
            try:
                with open(p / "package.json") as f:
                    pkg = json.load(f)
                    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

                    if "next" in deps:
                        return "nextjs"
                    if "nuxt" in deps:
                        return "nuxtjs"
                    if "@tanstack/start" in deps or "@tanstack/react-router" in deps:
                        return "tanstack-start"
                    if "react" in deps:
                        return "react"
                    if "vue" in deps:
                        return "vue"
                    if "svelte" in deps:
                        return "svelte"
            except:
                pass

        # Check composer.json for PHP/Symfony
        if (p / "composer.json").exists():
            return "symfony"

        # Check for Python
        if (p / "pyproject.toml").exists() or (p / "setup.py").exists():
            return "python"

        # Check for Go
        if (p / "go.mod").exists():
            return "go"

        # Check for Rust
        if (p / "Cargo.toml").exists():
            return "rust"

        return "unknown"

    def _generate_aliases(self, name: str) -> List[str]:
        """Generate common aliases for a project name."""
        aliases = []
        lower = name.lower()

        # Add variations
        aliases.append(lower)
        aliases.append(lower.replace("-", ""))
        aliases.append(lower.replace("_", ""))

        # Add camel/pascal case variations
        parts = re.split(r'[-_]', name)
        if len(parts) > 1:
            aliases.append(''.join(part.capitalize() for part in parts))
            aliases.append(''.join(part for part in parts))

        return aliases[:5]  # Limit to 5 aliases

    def _generate_keywords(self, name: str) -> List[str]:
        """Generate searchable keywords for a project."""
        keywords = []
        lower = name.lower()

        # Add full name variations
        keywords.append(lower)
        keywords.append(lower.replace("-", ".*"))
        keywords.append(lower.replace("_", ".*"))

        # Add parts
        parts = re.split(r'[-_]', name)
        keywords.extend(parts)

        return list(set(keywords))[:10]  # Dedupe and limit

    # === LOADING ===

    def _load_from_json(self) -> None:
        """Load projects from ~/.ralph/projects.json."""
        if not PROJECTS_JSON.exists():
            return

        try:
            with open(PROJECTS_JSON) as f:
                data = json.load(f)
                self._projects = data.get("projects", {})
        except Exception:
            self._projects = {}

    def _sync_from_db(self) -> None:
        """Sync projects from SQLite database."""
        if not self.db or not DB_PATH.exists():
            return

        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cur = conn.execute("SELECT * FROM projects")
                for row in cur.fetchall():
                    project = dict(row)
                    name = project["name"]

                    # Merge with existing if not present
                    if name not in self._projects:
                        self._projects[name] = {
                            "path": project["path"],
                            "description": project.get("description", ""),
                            "aliases": json.loads(project.get("aliases", "[]")),
                            "keywords": json.loads(project.get("keywords", "[]")),
                            "framework": project.get("framework", "unknown"),
                            "db_synced": True
                        }
        except Exception:
            pass

    # === PERSISTENCE ===

    def _save_to_json(self) -> None:
        """Save projects to ~/.ralph/projects.json."""
        registry = {
            "version": "1.0",
            "auto_updated": True,
            "projects": self._projects
        }

        with open(PROJECTS_JSON, 'w') as f:
            json.dump(registry, f, indent=2)

    def _sync_to_db(self, name: str, project: Dict[str, Any]) -> None:
        """Sync project to SQLite database."""
        if not self.db:
            return

        try:
            from src.pattern_extractor import count_files

            project_id = str(uuid.uuid4())
            file_count = count_files(project["path"])

            with sqlite3.connect(DB_PATH) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO projects
                    (id, name, path, description, aliases, keywords, framework, file_count, last_scanned)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (
                    project_id,
                    name,
                    project["path"],
                    project.get("description", ""),
                    json.dumps(project.get("aliases", [])),
                    json.dumps(project.get("keywords", [])),
                    project.get("framework", "unknown"),
                    file_count
                ))
        except Exception:
            pass

    # === PUBLIC API ===

    def update_on_mcp_call(self) -> None:
        """
        Auto-update registry on every MCP call.

        - Re-scan for new projects
        - Update metadata
        - Sync to DB
        """
        # Discover new projects
        discovered = self._discover_projects()

        # Merge with existing
        for name, path in discovered.items():
            if name not in self._projects:
                self._projects[name] = {
                    "path": path,
                    "description": f"Auto-discovered project: {name}",
                    "aliases": self._generate_aliases(name),
                    "keywords": self._generate_keywords(name),
                    "framework": self._detect_framework(path),
                    "auto": True,
                    "added_at": str(Path.cwd())
                }

                # Sync to DB
                self._sync_to_db(name, self._projects[name])

        # Save to JSON
        self._save_to_json()

    def get_project_path(self, name: str) -> Optional[str]:
        """
        Get project path by name (Option 1: Project Alias Registry).

        Supports exact name match, alias match, and keyword match.
        """
        self.update_on_mcp_call()

        # Exact match
        if name in self._projects:
            return self._projects[name]["path"]

        # Alias match
        for proj_name, proj in self._projects.items():
            if name in proj.get("aliases", []):
                return proj["path"]

        return None

    def find_project_fuzzy(self, query: str, threshold: float = 0.6) -> Optional[Dict[str, Any]]:
        """
        Find project using fuzzy matching (Option 4: Fuzzy Project Finder).

        Returns the best matching project if similarity >= threshold.
        """
        self.update_on_mcp_call()

        query_lower = query.lower()
        best_match = None
        best_score = 0.0

        for name, proj in self._projects.items():
            # Check exact name
            if query_lower == name.lower():
                return {name: proj}

            # Check aliases
            for alias in proj.get("aliases", []):
                score = SequenceMatcher(None, query_lower, alias.lower()).ratio()
                if score > best_score:
                    best_score = score
                    best_match = {name: proj}

            # Check keywords
            for keyword in proj.get("keywords", []):
                if query_lower in keyword.lower():
                    return {name: proj}

        # Check description
        for name, proj in self._projects.items():
            desc = proj.get("description", "").lower()
            if query_lower in desc:
                return {name: proj}

        if best_score >= threshold:
            return best_match

        return None

    def list_projects(self) -> Dict[str, Dict[str, Any]]:
        """List all registered projects."""
        self.update_on_mcp_call()
        return self._projects

    def register_project(
        self,
        name: str,
        path: str,
        description: str = "",
        aliases: Optional[List[str]] = None,
        keywords: Optional[List[str]] = None
    ) -> None:
        """Manually register a project."""
        self._projects[name] = {
            "path": path,
            "description": description or f"Project: {name}",
            "aliases": aliases or self._generate_aliases(name),
            "keywords": keywords or self._generate_keywords(name),
            "framework": self._detect_framework(path),
            "manual": True
        }

        self._sync_to_db(name, self._projects[name])
        self._save_to_json()

    def search_fts(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search projects using FTS5 (Option 3: Global FTS5 Index).

        Returns instant search results across all indexed projects.
        """
        if not DB_PATH.exists():
            return []

        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cur = conn.execute("""
                    SELECT p.* FROM projects p
                    INNER JOIN projects_fts fts ON p.rowid = fts.rowid
                    WHERE projects_fts MATCH ?
                    ORDER BY rank
                    LIMIT ?
                """, (query, limit))

                return [dict(row) for row in cur.fetchall()]
        except Exception:
            # Fallback to LIKE if FTS5 fails
            try:
                with sqlite3.connect(DB_PATH) as conn:
                    conn.row_factory = sqlite3.Row
                    cur = conn.execute("""
                        SELECT * FROM projects
                        WHERE name LIKE ? OR description LIKE ? OR path LIKE ?
                        LIMIT ?
                    """, (f"%{query}%", f"%{query}%", f"%{query}%", limit))

                    return [dict(row) for row in cur.fetchall()]
            except Exception:
                return []

    def get_source_dirs(self, project_path: str) -> List[str]:
        """
        Get source directories for a project.

        Used by warpgrep for smart auto-detection.
        """
        path = Path(project_path)
        source_dirs = []

        for pattern in SOURCE_PATTERNS:
            if (path / pattern).exists() and (path / pattern).is_dir():
                source_dirs.append(str((path / pattern).relative_to(path)))

        return source_dirs or ["."]


# Singleton instance
_registry_instance: Optional[ProjectRegistry] = None


def get_registry(db=None) -> ProjectRegistry:
    """Get or create the singleton ProjectRegistry instance."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = ProjectRegistry(db)
    return _registry_instance
