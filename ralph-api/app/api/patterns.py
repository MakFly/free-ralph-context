"""
Pattern management API endpoints

Handles project scanning, pattern learning, and pattern retrieval
for code reuse and token optimization.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import logging
import uuid

logger = logging.getLogger(__name__)


def get_search_service():
    """Lazy import to avoid circular dependency."""
    from app.main import search_service
    return search_service


router = APIRouter(prefix="/api/patterns", tags=["patterns"])


# === Pydantic Schemas ===

class ScanProjectRequest(BaseModel):
    project_path: str = Field(default=".", description="Path to scan")


class ScanProjectResponse(BaseModel):
    message: str
    framework: Optional[str] = None
    patterns_count: int = 0
    conventions: dict = {}
    detected_files: List[str] = []


class LearnPatternRequest(BaseModel):
    session_id: str
    pattern_name: str
    pattern_description: str
    code_example: Optional[str] = ""
    tags: List[str] = []


class LearnPatternResponse(BaseModel):
    message: str
    pattern_id: str
    tags: List[str]


class GetPatternRequest(BaseModel):
    session_id: str
    query: str


class GetPatternResponse(BaseModel):
    pattern_name: str
    description: str
    structure: dict
    conventions: List[str]
    code_example: str
    tags: List[str]
    source_files: List[str]


# === ENDPOINTS ===

@router.post("/scan", response_model=ScanProjectResponse)
async def scan_project(request: ScanProjectRequest):
    """
    Scan project to detect framework, patterns, and conventions.
    This is a simplified version - in production, use ast/tree-sitter.
    """
    from pathlib import Path
    import os

    raw_path = request.project_path

    # Docker container path mapping: ${HOME} is mounted at /host-home
    # Host: /home/<user>/Documents/...  →  Container: /host-home/Documents/...
    # We detect /home/<user> paths and map them to /host-home
    import re
    home_pattern = re.compile(r'^/home/[^/]+/')
    if home_pattern.match(raw_path):
        # Remove /home/<user> prefix and prepend /host-home
        relative_path = home_pattern.sub('', raw_path)
        container_path = f"/host-home/{relative_path}"
        project_path = Path(container_path).resolve()
    else:
        project_path = Path(raw_path).expanduser().resolve()

    if not project_path.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {project_path} (container mapping from: {raw_path})")

    # Detect framework
    framework = None

    # Helper function to search composer.json in subdirectories
    def find_composer_json(base_path: Path) -> Path | None:
        """Find composer.json in base path or any subdirectory (max depth 2)."""
        # Check root first
        if (base_path / "composer.json").exists():
            return base_path / "composer.json"

        # Check subdirectories (depth 1-2)
        for subdir in base_path.iterdir():
            if subdir.is_dir() and not subdir.name.startswith('.'):
                if (subdir / "composer.json").exists():
                    return subdir / "composer.json"
                # Depth 2
                for subsubdir in subdir.iterdir():
                    if subsubdir.is_dir() and not subsubdir.name.startswith('.'):
                        if (subsubdir / "composer.json").exists():
                            return subsubdir / "composer.json"
        return None

    # Detect PHP frameworks (Symfony, Laravel)
    composer_json = find_composer_json(project_path)
    if composer_json:
        try:
            import json
            with open(composer_json) as f:
                pkg = json.load(f)
                deps = pkg.get("require", {})

                # Check Laravel first
                if "laravel/framework" in deps:
                    framework = "Laravel"
                # Check Symfony (more comprehensive check)
                elif any(key.startswith("symfony/") for key in deps.keys()):
                    framework = "Symfony"
                # Check Slim
                elif "slim/slim" in deps or "slim/psr7" in deps:
                    framework = "Slim"
                # Check generic PHP
                else:
                    framework = "PHP"
        except Exception as e:
            # Fallback: detect PHP files
            if list(project_path.rglob("*.php")):
                framework = "PHP"

    # Detect Node.js frameworks
    package_json = None
    if (project_path / "package.json").exists():
        package_json = project_path / "package.json"
    else:
        # Search in subdirectories
        for subdir in project_path.iterdir():
            if subdir.is_dir() and not subdir.name.startswith('.'):
                if (subdir / "package.json").exists():
                    package_json = subdir / "package.json"
                    break

    if package_json and not framework:
        try:
            import json
            with open(package_json) as f:
                pkg = json.load(f)
                deps = pkg.get("dependencies", {})
                dev_deps = pkg.get("devDependencies", {})
                all_deps = {**deps, **dev_deps}

                if "next" in all_deps:
                    framework = "Next.js"
                elif "nuxt" in all_deps:
                    framework = "Nuxt"
                elif "@remix-run/node" in all_deps or "@remix-run/react" in all_deps:
                    framework = "Remix"
                elif "astro" in all_deps:
                    framework = "Astro"
                elif "svelte" in all_deps or "@sveltejs/kit" in all_deps:
                    framework = "Svelte"
                elif "@tanstack/start" in all_deps:
                    framework = "TanStack Start"
                elif "react" in all_deps and "@vitejs/plugin-react" in all_deps:
                    framework = "React + Vite"
                elif "react" in all_deps:
                    framework = "React"
                elif "vue" in all_deps:
                    framework = "Vue"
                elif "angular" in all_deps or "@angular/core" in all_deps:
                    framework = "Angular"
                elif "svelte" in all_deps:
                    framework = "Svelte"
        except:
            pass

    # Fallback: Detect by file patterns if no framework found
    if not framework:
        if list(project_path.rglob("*.php")):
            framework = "PHP"
        elif list(project_path.rglob("*.tsx")):
            framework = "TypeScript"
        elif list(project_path.rglob("*.ts")):
            framework = "TypeScript"
        elif list(project_path.rglob("*.js")):
            framework = "JavaScript"

    # Detect common patterns
    detected_patterns = []
    detected_files = []

    # Scan for common patterns
    for file_path in project_path.rglob("*.ts"):
        detected_files.append(str(file_path.relative_to(project_path)))
        if "action" in file_path.name.lower() or "actions" in file_path.parent.name.lower():
            detected_patterns.append("Server Actions")

    for file_path in project_path.rglob("*.php"):
        detected_files.append(str(file_path.relative_to(project_path)))
        if "controller" in file_path.parent.name.lower():
            detected_patterns.append("Controllers")
        if "model" in file_path.parent.name.lower():
            detected_patterns.append("Models")

    # Detect conventions
    conventions = {
        "file_structure": detected_files[:5] if detected_files else [],
        "detected_patterns": list(set(detected_patterns)),
        "total_files_scanned": len(detected_files)
    }

    return ScanProjectResponse(
        message=f"Scanned {len(detected_files)} files",
        framework=framework,
        patterns_count=len(set(detected_patterns)),
        conventions=conventions,
        detected_files=detected_files[:10]
    )


@router.post("/learn")
async def learn_pattern(request: LearnPatternRequest):
    """
    Learn and store a code pattern for later reuse.
    Patterns are stored as memories with 'pattern' category.
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    # Create memory with pattern-specific content
    pattern_content = f"""PATTERN: {request.pattern_name}

Description:
{request.pattern_description}

Code Example:
{request.code_example or 'No example provided'}

Tags: {', '.join(request.tags)}""".strip()

    # Generate unique memory ID
    memory_id = f"pattern-{request.pattern_name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:8]}"

    # Create metadata
    metadata = {
        "type": "pattern",
        "pattern_name": request.pattern_name,
        "tags": request.tags,
        "category": "pattern"
    }

    try:
        result = await svc.add_memory(
            session_id=request.session_id,
            memory_id=memory_id,
            content=pattern_content,
            metadata=metadata,
        )

        return LearnPatternResponse(
            message=f"Pattern '{request.pattern_name}' learned successfully!",
            pattern_id=memory_id,
            tags=request.tags
        )
    except Exception as e:
        logger.error(f"Failed to learn pattern: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to learn pattern: {str(e)}")


@router.post("/get")
async def get_pattern(request: GetPatternRequest):
    """
    Get a learned pattern by name or description.
    Uses hybrid search: exact name match first, then semantic search.
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    def _parse_pattern_content(content: str, memory_id: str) -> dict:
        """Parse pattern content from stored memory."""
        lines = content.split("\n")

        # Extract pattern name from "PATTERN: ..." header
        pattern_name = "Unknown"
        description = ""
        code_example = ""

        for i, line in enumerate(lines):
            if line.startswith("PATTERN:"):
                pattern_name = line.replace("PATTERN:", "").strip()
            elif line.startswith("Description:"):
                # Extract everything after "Description:" until next section
                desc_lines = []
                for j in range(i + 1, len(lines)):
                    if lines[j].startswith("Code Example:") or lines[j].startswith("Tags:"):
                        break
                    desc_lines.append(lines[j])
                description = "\n".join(desc_lines).strip()
            elif line.startswith("Code Example:"):
                # Extract everything after "Code Example:"
                code_lines = []
                for j in range(i + 1, len(lines)):
                    if lines[j].startswith("Tags:"):
                        break
                    code_lines.append(lines[j])
                code_example = "\n".join(code_lines).strip()

        return {
            "pattern_name": pattern_name,
            "description": description or content[:200],
            "code_example": code_example or "No example provided",
            "id": memory_id
        }

    try:
        # === STRATEGY 1: Exact name match (highest priority) ===
        # First, try to find exact pattern_name match in metadata
        memories = await svc.get_session_memories(request.session_id)

        exact_match = None
        for memory in memories:
            metadata = memory.get("metadata", {})
            if metadata.get("type") == "pattern" and metadata.get("pattern_name") == request.query:
                exact_match = memory
                break

        if exact_match:
            parsed = _parse_pattern_content(exact_match.get("content", ""), exact_match.get("id", ""))
            return GetPatternResponse(
                pattern_name=parsed["pattern_name"],
                description=parsed["description"],
                structure={"type": "exact_match", "id": parsed["id"], "match_type": "exact_name"},
                conventions=["Exact name match"],
                code_example=parsed["code_example"],
                tags=exact_match.get("metadata", {}).get("tags", ["pattern"]),
                source_files=[]
            )

        # === STRATEGY 2: Semantic search (fallback) ===
        # Lower threshold from 0.3 to 0.2 for better recall
        results = await svc.search(
            session_id=request.session_id,
            query=f"PATTERN: {request.query}",  # More specific query format
            top_k=5,
            min_score=0.2
        )

        if results:
            # Filter for patterns only
            pattern_results = [
                r for r in results
                if r.get("metadata", {}).get("type") == "pattern"
            ]

            if pattern_results:
                best_match = pattern_results[0]
                parsed = _parse_pattern_content(best_match.get("content", ""), best_match.get("id", ""))
                return GetPatternResponse(
                    pattern_name=parsed["pattern_name"],
                    description=parsed["description"],
                    structure={
                        "type": "semantic_match",
                        "id": parsed["id"],
                        "match_type": "semantic",
                        "score": float(best_match.get("score", 0))
                    },
                    conventions=[f"Semantic match (score: {best_match.get('score', 0):.2f})"],
                    code_example=parsed["code_example"],
                    tags=best_match.get("metadata", {}).get("tags", ["pattern"]),
                    source_files=[]
                )

        # === STRATEGY 3: Not found ===
        return GetPatternResponse(
            pattern_name="Not found",
            description=f"No pattern found matching: {request.query}",
            structure={},
            conventions=[],
            code_example="",
            tags=[],
            source_files=[]
        )

    except Exception as e:
        logger.error(f"Failed to get pattern: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get pattern: {str(e)}")


@router.get("/")
async def list_patterns(
    session_id: str,
    category: Optional[str] = None
):
    """
    List all learned patterns for this session.
    """
    svc = get_search_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    search_query = f"pattern {category}" if category else "pattern"

    try:
        results = await svc.search(
            session_id=session_id,
            query=search_query,
            top_k=100,
            min_score=0.2
        )

        patterns = []
        if results:
            for r in results:
                content = r.get("content", "")
                # Extract pattern name from content
                if content.startswith("PATTERN:"):
                    lines = content.split("\n")
                    pattern_name = lines[0].replace("PATTERN:", "").strip() if lines else "Unknown"
                    patterns.append({
                        "name": pattern_name,
                        "preview": content[:100] + "..." if len(content) > 100 else content,
                        "id": r.get("id")
                    })

        return {
            "patterns": patterns,
            "total": len(patterns),
            "categories": list(set([p.get("metadata", {}).get("category", "pattern") for p in results])) if results else []
        }

    except Exception as e:
        logger.error(f"Failed to list patterns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list patterns: {str(e)}")
