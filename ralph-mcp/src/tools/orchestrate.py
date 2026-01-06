"""
Orchestrate - Task Router & Agent Coordinator

Analyzes tasks and recommends the optimal agent + tools combination.
Supports multi-agent parallel execution plans.
The brain of Ralph's multi-agent orchestration.
"""

import os
import re
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class AgentTask:
    """A single task to be executed by an agent."""
    agent: str  # swe-scout, debug-agent, snipper, etc.
    task: str  # Task description
    depends_on: list[str] = field(default_factory=list)  # Task IDs this depends on
    priority: int = 0  # Higher = earlier execution
    estimated_duration: int = 30  # Seconds
    task_id: str = ""  # Auto-generated unique ID


@dataclass
class ExecutionPlan:
    """Multi-agent execution plan with parallel and sequential tasks."""
    parallel_tasks: list[AgentTask] = field(default_factory=list)
    sequential_tasks: list[AgentTask] = field(default_factory=list)
    ralph_tools: list[str] = field(default_factory=list)
    reasoning: str = ""
    estimated_duration: int = 0  # Total seconds
    mode: Literal["single", "parallel", "hybrid"] = "single"

    def to_dict(self) -> dict:
        return {
            "mode": self.mode,
            "parallelTasks": [
                {
                    "agent": t.agent,
                    "task": t.task,
                    "task_id": t.task_id or f"{t.agent}-{hash(t.task) % 10000}",
                    "priority": t.priority,
                    "estimatedDuration": t.estimated_duration,
                }
                for t in self.parallel_tasks
            ],
            "sequentialTasks": [
                {
                    "agent": t.agent,
                    "task": t.task,
                    "task_id": t.task_id or f"{t.agent}-{hash(t.task) % 10000}",
                    "dependsOn": t.depends_on,
                    "estimatedDuration": t.estimated_duration,
                }
                for t in self.sequential_tasks
            ],
            "ralphTools": self.ralph_tools,
            "reasoning": self.reasoning,
            "estimatedDuration": self.estimated_duration,
        }

    def get_all_tasks(self) -> list[AgentTask]:
        """Get all tasks in execution order (parallel first, then sequential)."""
        return self.parallel_tasks + self.sequential_tasks


@dataclass
class OrchestrateResult:
    """Result of task orchestration analysis (legacy compatibility)."""
    task_type: str
    recommended_agent: str
    suggested_tools: list[str]
    context_estimate: int  # Estimated context tokens needed
    complexity: Literal["low", "medium", "high"]
    reasoning: str = ""
    alternative_agents: list[str] = field(default_factory=list)
    execution_plan: ExecutionPlan | None = None  # New: multi-agent plan

    def to_dict(self) -> dict:
        result = {
            "taskType": self.task_type,
            "recommendedAgent": self.recommended_agent,
            "suggestedTools": self.suggested_tools,
            "contextEstimate": self.context_estimate,
            "complexity": self.complexity,
            "reasoning": self.reasoning,
            "alternativeAgents": self.alternative_agents,
        }
        if self.execution_plan:
            result["executionPlan"] = self.execution_plan.to_dict()
        return result


class OrchestrateTool:
    """
    Task analysis and agent routing.

    Classifies tasks and recommends:
    - Which agent to use (swe-scout, snipper, plan, etc.)
    - Which Ralph tools the agent should leverage
    - Estimated context requirements
    """

    # Agent capabilities mapping
    AGENT_MAP = {
        "explore": {
            "agent": "swe-scout",
            "description": "Ultra-fast code exploration and search",
            "tools": ["ralph_warpgrep", "ralph_recall"],
            "context": 5000,
        },
        "quick_fix": {
            "agent": "snipper",
            "description": "Surgical code fixes with minimal context",
            "tools": ["ralph_fast_apply", "ralph_recall"],
            "context": 3000,
        },
        "architecture": {
            "agent": "plan",
            "description": "Strategic planning and architecture design",
            "tools": ["ralph_warpgrep", "ralph_checkpoint", "ralph_add_memory"],
            "context": 15000,
        },
        "debug": {
            "agent": "debug-agent",
            "description": "Multi-framework debugging specialist",
            "tools": ["ralph_warpgrep", "ralph_recall", "ralph_cross_search"],
            "context": 10000,
        },
        "refactor": {
            "agent": "refactor-agent",
            "description": "AST-based safe code transformations",
            "tools": ["ralph_fast_apply", "ralph_checkpoint", "ralph_warpgrep"],
            "context": 12000,
        },
        "performance": {
            "agent": "perf-agent",
            "description": "Performance analysis and optimization",
            "tools": ["ralph_warpgrep", "ralph_add_memory", "ralph_recall"],
            "context": 8000,
        },
        "feature": {
            "agent": "general-purpose",
            "description": "New feature implementation",
            "tools": ["ralph_warpgrep", "ralph_fast_apply", "ralph_checkpoint", "ralph_add_memory"],
            "context": 20000,
        },
        "security": {
            "agent": "security-agent",
            "description": "Security audit and vulnerability scanning",
            "tools": ["ralph_warpgrep", "ralph_cross_search", "ralph_add_memory"],
            "context": 10000,
        },
        "test": {
            "agent": "qa-agent",
            "description": "Testing and quality assurance",
            "tools": ["ralph_warpgrep", "ralph_recall"],
            "context": 8000,
        },
    }

    # Keywords for task classification
    TASK_PATTERNS = {
        "explore": [
            r"\bfind\b", r"\bsearch\b", r"\bwhere\b", r"\blocate\b",
            r"\bexplore\b", r"\blook\s+for\b", r"\bhow\s+does\b",
            r"\bunderstand\b", r"\bexplain\b",
        ],
        "quick_fix": [
            r"\bfix\b", r"\bquick\b", r"\bsimple\b", r"\btypo\b",
            r"\bbug\b", r"\berror\b", r"\bjust\b", r"\bonly\b",
            r"\bchange\s+line\b", r"\bupdate\s+the\b",
        ],
        "architecture": [
            r"\bplan\b", r"\barchitect\b", r"\bdesign\b", r"\bstructure\b",
            r"\bstrategy\b", r"\bapproach\b", r"\bhow\s+should\b",
            r"\bbest\s+way\b", r"\brecommend\b",
        ],
        "debug": [
            r"\bdebug\b", r"\bcrash\b", r"\bfail\b", r"\bbroken\b",
            r"\bnot\s+work\b", r"\bunexpected\b", r"\bexception\b",
            r"\btraceback\b", r"\berror\s+message\b",
        ],
        "refactor": [
            r"\brefactor\b", r"\brename\b", r"\bextract\b", r"\bmove\b",
            r"\breorganize\b", r"\bclean\s+up\b", r"\bsimplify\b",
            r"\bmodularize\b",
        ],
        "performance": [
            r"\bslow\b", r"\bperformance\b", r"\boptimize\b", r"\bfast\b",
            r"\bbottleneck\b", r"\bmemory\b", r"\bleak\b", r"\bprofile\b",
            r"\blatency\b",
        ],
        "feature": [
            r"\badd\b", r"\bimplement\b", r"\bcreate\b", r"\bbuild\b",
            r"\bnew\b", r"\bfeature\b", r"\bfunctionality\b",
        ],
        "security": [
            r"\bsecurity\b", r"\bvulnerability\b", r"\baudit\b",
            r"\bxss\b", r"\bsql\s*injection\b", r"\bauth\b",
            r"\bvalidation\b", r"\bsanitize\b",
        ],
        "test": [
            r"\btest\b", r"\bspec\b", r"\bcoverage\b", r"\bassert\b",
            r"\bunit\b", r"\bintegration\b", r"\be2e\b",
        ],
    }

    # Known projects registry (can be extended via ~/.ralph/projects.json)
    # Format: {project_name: {path, aliases, keywords}}
    PROJECT_REGISTRY = {
        "iautos": {
            "path": None,  # Will be auto-detected
            "aliases": ["crm", "auto", "life", "automobile"],
            "keywords": ["iautos", "iauto", "crm.*auto", "automobile"],
            "description": "CRM automobile Symfony + Next.js",
        },
        "ralph": {
            "path": None,
            "aliases": ["context", "mcp", "free-ralph"],
            "keywords": ["ralph", "free.*ralph", "ralph.*mcp"],
            "description": "Ralph MCP context management",
        },
        "boilerplate": {
            "path": None,
            "aliases": ["boiler", "scaffold", "template"],
            "keywords": ["boilerplate", "starter", "template"],
            "description": "Project boilerplates",
        },
    }

    # Multi-agent trigger patterns
    # More flexible patterns to catch project references anywhere in the sentence
    MULTI_AGENT_TRIGGERS = {
        "project_switch": [
            r"explain",
            r"analyze",
            r"how\s+does",
            r"tell\s+me\s+about",
            r"what\s+about",
            r"explique",  # French
            r"analyse",   # French
            r"comment",   # French
        ],
        "cross_project_compare": [
            r"compare\s+.+\s+and\s+",
            r"difference\s+between\s+.+\s+and\s+",
            r".+\s+vs\s+",
        ],
        "multi_aspect_analysis": [
            r"explain.*auth",
            r"analyze.*system",
            r"understand.*architecture",
            r"explique.*auth",      # French
            r"analyse.*système",    # French
            r"comprendre.*arch",    # French
        ],
    }

    def __init__(self):
        # Compile regex patterns
        self.compiled_patterns = {
            task_type: [re.compile(p, re.IGNORECASE) for p in patterns]
            for task_type, patterns in self.TASK_PATTERNS.items()
        }
        # Compile multi-agent triggers
        self.compiled_triggers = {
            trigger_type: [re.compile(p, re.IGNORECASE) for p in patterns]
            for trigger_type, patterns in self.MULTI_AGENT_TRIGGERS.items()
        }
        # Load custom projects from ~/.ralph/projects.json via ProjectRegistry
        self._load_custom_projects()

    def _load_custom_projects(self) -> None:
        """
        Load custom project registry via ProjectRegistry.

        The ProjectRegistry handles:
        - Auto-initialization of ~/.ralph/projects.json
        - Auto-discovery of projects
        - Sync with SQLite database
        - Fuzzy search support

        NOTE: Registry update skipped here to avoid slow project scanning.
        Updates happen on-demand when tools are called.
        """
        try:
            from src.project_registry import get_registry
            registry = get_registry()

            # Skip auto-update to avoid blocking - registry updates on-demand
            # registry.update_on_mcp_call()

            # Merge existing projects from registry into PROJECT_REGISTRY
            for name, config in registry.list_projects().items():
                if name not in self.PROJECT_REGISTRY:
                    # Add to registry for orchestrate to use
                    self.PROJECT_REGISTRY[name] = {
                        "path": config["path"],
                        "aliases": config.get("aliases", []),
                        "keywords": config.get("keywords", []),
                        "description": config.get("description", ""),
                    }
                else:
                    # Merge with existing
                    self.PROJECT_REGISTRY[name].update({
                        "path": config["path"],
                        "aliases": config.get("aliases", []),
                        "keywords": config.get("keywords", []),
                    })
        except Exception:
            # Fallback to manual loading if registry fails
            registry_path = os.path.expanduser("~/.ralph/projects.json")
            if os.path.exists(registry_path):
                try:
                    import json
                    with open(registry_path) as f:
                        data = json.load(f)
                        projects = data.get("projects", {})
                        for name, config in projects.items():
                            if name in self.PROJECT_REGISTRY:
                                self.PROJECT_REGISTRY[name].update(config)
                            else:
                                self.PROJECT_REGISTRY[name] = config
                except Exception:
                    pass  # Silently fail if registry is invalid

    async def execute(self, task_description: str) -> OrchestrateResult:
        """
        Analyze task and recommend optimal agent + tools.
        May generate a multi-agent execution plan for complex tasks.

        Args:
            task_description: Natural language description of the task

        Returns:
            OrchestrateResult with recommendations and optional execution plan
        """
        # Step 1: Check if multi-agent execution is needed
        execution_plan = self._should_use_multi_agent(task_description)
        if execution_plan:
            # Multi-agent mode: generate execution plan
            task_type, score = self._classify_task(task_description)
            complexity = self._estimate_complexity(task_description)
            config = self.AGENT_MAP.get(task_type, self.AGENT_MAP["feature"])

            reasoning = (
                f"Multi-agent execution triggered. "
                f"Detected project context requiring parallel exploration. "
                f"Primary task type: '{task_type}'. "
                f"Execution plan: {len(execution_plan.parallel_tasks)} parallel + "
                f"{len(execution_plan.sequential_tasks)} sequential tasks."
            )

            return OrchestrateResult(
                task_type=task_type,
                recommended_agent="multi-agent",
                suggested_tools=execution_plan.ralph_tools,
                context_estimate=sum(t.estimated_duration * 100 for t in execution_plan.get_all_tasks()),
                complexity=complexity,
                reasoning=reasoning,
                alternative_agents=[t.agent for t in execution_plan.get_all_tasks()],
                execution_plan=execution_plan,
            )

        # Step 2: Single-agent mode (legacy behavior)
        task_type, score = self._classify_task(task_description)

        # Get agent configuration
        config = self.AGENT_MAP.get(task_type, self.AGENT_MAP["feature"])

        # Determine complexity
        complexity = self._estimate_complexity(task_description)

        # Adjust context estimate based on complexity
        base_context = config["context"]
        context_multiplier = {"low": 0.7, "medium": 1.0, "high": 1.5}
        context_estimate = int(base_context * context_multiplier[complexity])

        # Generate reasoning
        reasoning = self._generate_reasoning(task_type, score, complexity)

        # Get alternative agents
        alternatives = self._get_alternatives(task_type)

        return OrchestrateResult(
            task_type=task_type,
            recommended_agent=config["agent"],
            suggested_tools=config["tools"],
            context_estimate=context_estimate,
            complexity=complexity,
            reasoning=reasoning,
            alternative_agents=alternatives,
        )

    def _classify_task(self, description: str) -> tuple[str, float]:
        """Classify task based on keyword patterns."""
        scores = {}

        for task_type, patterns in self.compiled_patterns.items():
            score = 0
            for pattern in patterns:
                matches = pattern.findall(description)
                score += len(matches)
            scores[task_type] = score

        # Get highest scoring type
        if not any(scores.values()):
            return "feature", 0.0

        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]

        # Normalize score (0-1)
        max_possible = len(self.compiled_patterns[best_type])
        normalized = min(best_score / max_possible, 1.0) if max_possible > 0 else 0

        return best_type, normalized

    def _estimate_complexity(self, description: str) -> Literal["low", "medium", "high"]:
        """Estimate task complexity from description."""
        # Count complexity indicators
        high_indicators = [
            r"\bmultiple\b", r"\bcomplex\b", r"\brefactor\b",
            r"\bmigrate\b", r"\boverhaul\b", r"\bredesign\b",
            r"\ball\b", r"\bentire\b", r"\bwhole\b",
        ]
        low_indicators = [
            r"\bsimple\b", r"\bquick\b", r"\bjust\b",
            r"\bonly\b", r"\bone\b", r"\bsingle\b",
            r"\btypo\b", r"\bminor\b",
        ]

        high_count = sum(
            1 for p in high_indicators
            if re.search(p, description, re.IGNORECASE)
        )
        low_count = sum(
            1 for p in low_indicators
            if re.search(p, description, re.IGNORECASE)
        )

        # Word count as secondary indicator
        word_count = len(description.split())

        if low_count > high_count or word_count < 10:
            return "low"
        elif high_count > low_count or word_count > 50:
            return "high"
        return "medium"

    def _generate_reasoning(
        self, task_type: str, score: float, complexity: str
    ) -> str:
        """Generate human-readable reasoning for the recommendation."""
        config = self.AGENT_MAP.get(task_type, self.AGENT_MAP["feature"])

        confidence = "high" if score > 0.5 else "medium" if score > 0.2 else "low"

        return (
            f"Task classified as '{task_type}' with {confidence} confidence. "
            f"Recommended agent '{config['agent']}' - {config['description']}. "
            f"Complexity estimated as {complexity}. "
            f"Suggested tools: {', '.join(config['tools'])}."
        )

    def _get_alternatives(self, primary_type: str) -> list[str]:
        """Get alternative agents that could handle the task."""
        # Map of related task types
        related = {
            "explore": ["debug", "architecture"],
            "quick_fix": ["debug", "refactor"],
            "architecture": ["feature", "refactor"],
            "debug": ["quick_fix", "performance"],
            "refactor": ["architecture", "quick_fix"],
            "performance": ["debug", "refactor"],
            "feature": ["architecture", "refactor"],
            "security": ["debug", "test"],
            "test": ["debug", "feature"],
        }

        alt_types = related.get(primary_type, [])
        return [
            self.AGENT_MAP[t]["agent"]
            for t in alt_types
            if t in self.AGENT_MAP
        ]

    # === MULTI-AGENT DETECTION & PLANNING ===

    def _should_use_multi_agent(self, description: str) -> ExecutionPlan | None:
        """
        Determine if task requires multi-agent parallel execution.

        Returns ExecutionPlan if multi-agent is needed, None otherwise.
        """
        # Detect project context
        project_context = self._detect_project_context(description)
        if not project_context:
            return None

        # Detect multi-agent triggers
        trigger_type = self._detect_trigger_type(description)
        if not trigger_type:
            return None

        # If project has a known path, check if we're NOT in it
        # If no path is set, always generate multi-agent plan (discovery mode)
        project_path = project_context.get("path")
        if project_path:
            current_cwd = os.getcwd()
            if self._is_in_project(current_cwd, project_path):
                # Already in project, no need for multi-agent
                return None

        # Generate multi-agent plan for project discovery/analysis
        return self._create_execution_plan(description, project_context, trigger_type)

    def _detect_project_context(self, description: str) -> dict | None:
        """Detect if description references a known project."""
        description_lower = description.lower()

        for project_name, config in self.PROJECT_REGISTRY.items():
            # Check direct name match
            if project_name.lower() in description_lower:
                return {"name": project_name, **config}

            # Check aliases
            for alias in config.get("aliases", []):
                if alias.lower() in description_lower:
                    return {"name": project_name, **config}

            # Check keyword patterns
            for keyword_pattern in config.get("keywords", []):
                if re.search(keyword_pattern, description, re.IGNORECASE):
                    return {"name": project_name, **config}

        return None

    def _detect_trigger_type(self, description: str) -> str | None:
        """Detect which multi-agent trigger pattern matches."""
        for trigger_type, patterns in self.MULTI_AGENT_TRIGGERS.items():
            for pattern in patterns:
                if re.search(pattern, description, re.IGNORECASE):
                    return trigger_type
        return None

    def _is_in_project(self, cwd: str, project_path: str) -> bool:
        """Check if current working directory is within project path."""
        if not project_path:
            return False
        try:
            cwd_abs = os.path.abspath(cwd)
            proj_abs = os.path.abspath(project_path)
            return cwd_abs.startswith(proj_abs)
        except Exception:
            return False

    def _create_execution_plan(
        self, description: str, project_context: dict, trigger_type: str
    ) -> ExecutionPlan:
        """Create a multi-agent execution plan for the task."""
        project_name = project_context["name"]
        project_desc = project_context.get("description", "")

        # Extract the specific topic (auth, login, etc.)
        topic = self._extract_topic(description)

        # Build parallel tasks (can run simultaneously)
        parallel_tasks = [
            AgentTask(
                agent="swe-scout",
                task=f"Locate {project_name} project directory",
                task_id=f"locate-{project_name}",
                priority=10,
                estimated_duration=10,
            ),
            AgentTask(
                agent="swe-scout",
                task=f"Search {topic} in {project_name}" if topic
                     else f"Explore {project_name} structure",
                task_id=f"search-{project_name}",
                priority=9,
                estimated_duration=15,
            ),
        ]

        # Build sequential tasks (depend on parallel tasks)
        sequential_tasks = []
        if topic:
            # Analysis task depends on search results
            sequential_tasks.append(
                AgentTask(
                    agent="debug-agent" if "bug" in description.lower() or "error" in description.lower() else "general-purpose",
                    task=f"Analyze {topic} implementation in {project_name}",
                    task_id=f"analyze-{topic}-{project_name}",
                    depends_on=[f"search-{project_name}", f"locate-{project_name}"],
                    estimated_duration=30,
                )
            )

        # Calculate total duration (parallel tasks run concurrently)
        parallel_duration = max((t.estimated_duration for t in parallel_tasks), default=0)
        sequential_duration = sum(t.estimated_duration for t in sequential_tasks)
        total_duration = parallel_duration + sequential_duration

        # Determine Ralph tools to use
        ralph_tools = ["ralph_warpgrep", "ralph_recall"]
        if "auth" in topic or "security" in topic:
            ralph_tools.append("ralph_cross_search")

        return ExecutionPlan(
            parallel_tasks=parallel_tasks,
            sequential_tasks=sequential_tasks,
            ralph_tools=ralph_tools,
            reasoning=(
                f"Project '{project_name}' detected: {project_desc}. "
                f"Triggered by '{trigger_type}' pattern. "
                f"Parallel discovery phase, then sequential analysis."
            ),
            estimated_duration=total_duration,
            mode="hybrid" if sequential_tasks else "parallel",
        )

    def _extract_topic(self, description: str) -> str:
        """Extract the main topic from description (auth, api, etc.)."""
        # Common technical topics
        topics = [
            r"\bauth\b",
            r"\blogin\b",
            r"\bapi\b",
            r"\bdatabase\b",
            r"\bfrontend\b",
            r"\bbackend\b",
            r"\bmiddleware\b",
            r"\bsecurity\b",
            r"\bperformance\b",
            r"\btesting\b",
            r"\bdeployment\b",
        ]

        for topic_pattern in topics:
            match = re.search(topic_pattern, description, re.IGNORECASE)
            if match:
                return match.group(0).lower()

        return ""


# Convenience function
async def orchestrate(task_description: str) -> dict:
    """
    Analyze task and recommend optimal agent + tools.

    Example:
        result = await orchestrate("Find all API endpoints and understand the auth flow")
        # Returns: {
        #   "taskType": "explore",
        #   "recommendedAgent": "swe-scout",
        #   "suggestedTools": ["ralph_warpgrep", "ralph_recall"],
        #   ...
        # }
    """
    tool = OrchestrateTool()
    result = await tool.execute(task_description)
    return result.to_dict()
