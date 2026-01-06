"""
Generic Pattern Extractor - Fallback for when no LLM is available

Performs static code analysis to detect:
- Framework type (Symfony, Laravel, Next.js, Nuxt, React, Vue, etc.)
- Architecture patterns (MVC, Controller-Service, etc.)
- File structure conventions
- Dependency management patterns

This is a lightweight, fast alternative to LLM-based analysis.
"""

import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import json


# === Framework Detection Patterns ===

FRAMEWORK_MARKERS = {
    "symfony": [
        "symfony/framework-bundle",
        "bin/console",
        "config/services.yaml",
        "src/Controller/",
        ".env.local",
        "composer.json"
    ],
    "laravel": [
        "laravel/framework",
        "artisan",
        "config/app.php",
        "app/Http/Controllers/",
        ".env",
        "composer.json"
    ],
    "nextjs": [
        "next.config",
        "pages/_app",
        "app/layout",
        ".next/",
        "package.json"
    ],
    "nuxt": [
        "nuxt.config",
        "pages/index",
        ".nuxt/",
        "package.json"
    ],
    "react": [
        "react",
        "src/App",
        "public/",
        "package.json"
    ],
    "vue": [
        "vue",
        "src/main",
        "public/",
        "package.json"
    ],
    "django": [
        "django",
        "manage.py",
        "settings.py",
        "requirements.txt"
    ],
    "express": [
        "express",
        "app.listen",
        "package.json"
    ],
    "fastapi": [
        "fastapi",
        "app = FastAPI()",
        "requirements.txt"
    ],
    "svelte": [
        "svelte",
        "src/routes",
        "svelte.config",
        "package.json"
    ],
    "angular": [
        "@angular",
        "angular.json",
        "src/app/",
        "package.json"
    ]
}


def detect_framework(project_path: str) -> str:
    """Detect the primary framework of a project."""
    path = Path(project_path)

    # Check each framework's markers
    for framework, markers in FRAMEWORK_MARKERS.items():
        score = 0
        for marker in markers:
            # Check for files
            if "/" in marker or marker.endswith("/"):
                check_path = path / marker
                if check_path.exists():
                    score += 1
            # Check for contents in files
            else:
                for file_path in path.rglob("*"):
                    if file_path.is_file() and file_path.suffix in [".php", ".js", ".ts", ".py", ".json", ".yaml", ".yml", ".env"]:
                        try:
                            content = file_path.read_text()[:5000]
                            if marker in content:
                                score += 1
                                break
                        except Exception:
                            continue

        if score >= 2:
            return framework

    return "unknown"


def detect_architecture_type(project_path: str, framework: str) -> str:
    """Detect the architectural pattern."""
    path = Path(project_path)

    if framework in ["symfony", "laravel", "django"]:
        # Check for MVC
        if (path / "app" / "Http" / "Controllers").exists() or \
           (path / "src" / "Controller").exists() or \
           (path / "controllers").exists():
            return "MVC (Model-View-Controller)"

        # Check for hexagonal/clean architecture
        if (path / "domain").exists() or (path / "src" / "Domain").exists():
            return "Hexagonal/Clean Architecture"

        return "MVC (Model-View-Controller)"

    elif framework in ["nextjs", "nuxt", "react", "vue", "svelte"]:
        # Check for component architecture
        if (path / "src" / "components").exists() or (path / "components").exists():
            return "Component-Based Architecture"

        return "SPA (Single Page Application)"

    elif framework in ["express", "fastapi"]:
        if (path / "routes").exists() or (path / "src" / "routes").exists():
            return "REST API (Route-Controller)"

        return "REST API"

    return "Standard Architecture"


def extract_file_structure(project_path: str) -> Dict[str, Any]:
    """Extract the file structure summary."""
    path = Path(project_path)
    structure = {
        "directories": [],
        "key_files": [],
        "total_files": 0
    }

    # Get top-level directories
    for item in path.iterdir():
        if item.is_dir() and not item.name.startswith("."):
            structure["directories"].append(item.name)

    # Get key files
    for item in path.rglob("*"):
        if item.is_file():
            structure["total_files"] += 1

            # Important config files
            if item.name in ["package.json", "composer.json", "requirements.txt", "go.mod", "Cargo.toml"]:
                structure["key_files"].append(str(item.relative_to(path)))

            # Limit to top 20 key files
            if len(structure["key_files"]) >= 20:
                break

    return structure


def extract_dependencies(project_path: str) -> List[str]:
    """Extract dependency names from package managers."""
    path = Path(project_path)
    dependencies = []

    # Node.js (package.json)
    package_json = path / "package.json"
    if package_json.exists():
        try:
            content = json.loads(package_json.read_text())
            deps = {**content.get("dependencies", {}), **content.get("devDependencies", {})}
            dependencies = list(deps.keys())[:20]  # Top 20
        except Exception:
            pass

    # PHP (composer.json)
    composer_json = path / "composer.json"
    if composer_json.exists():
        try:
            content = json.loads(composer_json.read_text())
            deps = content.get("require", {})
            dependencies = [k for k in deps.keys() if not k.startswith("ext-")][:20]
        except Exception:
            pass

    # Python (requirements.txt)
    requirements_txt = path / "requirements.txt"
    if requirements_txt.exists():
        try:
            content = requirements_txt.read_text()
            dependencies = [line.strip().split("==")[0].split(">=")[0].split("<=")[0]
                          for line in content.split("\n")
                          if line.strip() and not line.startswith("#")][:20]
        except Exception:
            pass

    return dependencies


def extract_code_example(project_path: str, framework: str) -> str:
    """Extract a representative code example."""
    path = Path(project_path)

    # Framework-specific examples
    if framework == "symfony":
        controller = (path / "src" / "Controller")
        if controller.exists():
            for file in controller.rglob("*.php"):
                try:
                    content = file.read_text()
                    if "class" in content and "Controller" in content:
                        # Extract first class
                        match = re.search(r'class\s+\w+.*?\{', content, re.DOTALL)
                        if match:
                            return match.group(0) + "\n    // ... methods}"
                except Exception:
                    continue

    elif framework == "laravel":
        controller = (path / "app" / "Http" / "Controllers")
        if controller.exists():
            for file in controller.rglob("*.php"):
                try:
                    content = file.read_text()
                    if "class" in content and "Controller" in content:
                        match = re.search(r'class\s+\w+.*?\{', content, re.DOTALL)
                        if match:
                            return match.group(0) + "\n    // ... methods}"
                except Exception:
                    continue

    elif framework in ["nextjs", "react"]:
        app = (path / "src" / "app" / "page.tsx")
        if app.exists():
            try:
                content = app.read_text()
                return content[:500]
            except Exception:
                pass

    # Fallback: Return first meaningful file
    for ext in [".ts", ".tsx", ".js", ".jsx", ".php", ".py"]:
        for file in path.rglob(f"*{ext}"):
            if file.is_file() and "node_modules" not in str(file) and ".next" not in str(file):
                try:
                    content = file.read_text()
                    if len(content) > 100:
                        return f"// {file.relative_to(path)}\n" + content[:300]
                except Exception:
                    continue

    return f"# {framework} project\n# No code example available"


def extract_conventions(project_path: str, framework: str) -> List[str]:
    """Extract coding conventions from the project."""
    path = Path(project_path)
    conventions = []

    # Framework-specific conventions
    if framework == "symfony":
        conventions.extend([
            "Symfony Framework",
            "MVC Architecture",
            "Controllers in src/Controller/",
            "Services as autowired dependencies",
            "YAML configuration",
            "Environment variables in .env"
        ])

    elif framework == "laravel":
        conventions.extend([
            "Laravel Framework",
            "MVC Architecture",
            "Controllers in app/Http/Controllers/",
            "Service providers for dependency injection",
            "Blade templating",
            "Artisan CLI"
        ])

    elif framework == "nextjs":
        conventions.extend([
            "Next.js Framework",
            "App Router or Pages Router",
            "Server Components",
            "API routes in app/api/ or pages/api/",
            "CSS Modules or Tailwind CSS"
        ])

    # Check for testing frameworks
    if any((path / d).exists() for d in ["tests/", "test/", "__tests__"]):
        test_files = list(path.rglob("*.test.*")) + list(path.rglob("*.spec.*"))
        if test_files:
            if any("jest" in str(f) for f in test_files):
                conventions.append("Jest testing framework")
            if any("pytest" in str(f) for f in test_files):
                conventions.append("Pytest testing framework")
            if any("phpunit" in str(f) for f in test_files):
                conventions.append("PHPUnit testing framework")

    return conventions


def extract_generic_pattern(project_path: str) -> Dict[str, Any]:
    """
    Main function: Extract pattern without LLM.

    Returns:
        {
            "pattern_name": "...",
            "pattern_description": "...",
            "tags": ["..."],
            "code_example": "...",
            "conventions": ["..."],
            "source_files": ["..."]
        }
    """
    project_path = os.path.abspath(project_path)
    framework = detect_framework(project_path)
    architecture = detect_architecture_type(project_path, framework)
    structure = extract_file_structure(project_path)
    dependencies = extract_dependencies(project_path)
    code_example = extract_code_example(project_path, framework)
    conventions = extract_conventions(project_path, framework)

    # Build pattern name
    if framework != "unknown":
        pattern_name = f"{framework.capitalize()} {architecture}"
    else:
        pattern_name = "Generic Project Pattern"

    # Build description
    description = f"""Framework: {framework.capitalize()}
Architecture: {architecture}

Key directories: {', '.join(structure['directories'][:10])}
Total files: {structure['total_files']}

Dependencies ({len(dependencies)}): {', '.join(dependencies[:10])}

This is a generic pattern extracted via static analysis.
For more detailed patterns, configure an LLM provider (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)."""

    # Build tags
    tags = [framework]
    if framework != "unknown":
        tags.extend(dependencies[:5])

    return {
        "pattern_name": pattern_name,
        "pattern_description": description.strip(),
        "tags": tags,
        "code_example": code_example[:500],
        "conventions": conventions,
        "source_files": structure["key_files"]
    }


# === Utility Functions ===

def count_files(project_path: str) -> int:
    """
    Count source files in a project.

    Excludes common non-source directories (node_modules, vendor, .git, etc.).
    Used by project registry for file_count metadata.
    """
    EXCLUDE_DIRS = {
        "node_modules", "vendor", ".git", ".svn", ".hg", "dist", "build",
        ".next", ".nuxt", ".output", "__pycache__", ".venv", "coverage",
        ".cache", "target", "bin", "obj", ".pytest_cache", ".vscode",
        ".idea", "tmp", "temp", "logs"
    }

    SOURCE_EXTENSIONS = {
        # JavaScript/TypeScript
        ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
        # Python
        ".py", ".pyi",
        # PHP
        ".php",
        # Go
        ".go",
        # Rust
        ".rs",
        # Java
        ".java",
        # C/C++
        ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp",
        # Web
        ".html", ".css", ".scss", ".sass", ".less",
        # Config
        ".json", ".yaml", ".yml", ".toml", ".xml",
        # Shell
        ".sh", ".bash",
    }

    path = Path(project_path)
    if not path.exists():
        return 0

    count = 0
    try:
        for root, dirs, files in os.walk(path):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                # Check if file has source extension
                if any(file.endswith(ext) for ext in SOURCE_EXTENSIONS):
                    count += 1
    except Exception:
        pass

    return count
