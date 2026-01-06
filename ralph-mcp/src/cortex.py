"""
Ralph Cortex - The Brain that Connects Ralph to Agents

Phase 1: Decision Engine
- Analyzes tasks
- Decides: Agent? Skill? Direct Tool?
- Orchestrates execution
- Learns from transcripts
"""

import os
import re
import json
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class ExecutionType(Enum):
    """Type of execution to use"""
    AGENT_SCOUT = "agent_scout"       # swe-scout for exploration
    AGENT_SNIPPER = "agent_snipper"   # snipper for quick fixes
    AGENT_REFACTOR = "agent_refactor" # refactor for code transformation
    AGENT_DEBUG = "agent_debug"       # debug-agent for troubleshooting
    AGENT_PERF = "agent_perf"         # perf-agent for optimization
    SKILL_COMMIT = "skill_commit"     # /commit skill
    SKILL_QA = "skill_qa"             # /qa skill
    SKILL_DEVOPS = "skill_devops"     # /devops skill
    TOOL_DIRECT = "tool_direct"       # Use Ralph tools directly
    MULTI_AGENT = "multi_agent"       # Complex parallel execution


@dataclass
class TaskAnalysis:
    """Result of task analysis"""
    task: str
    execution_type: ExecutionType
    confidence: float  # 0-1
    reasoning: str
    suggested_agent: Optional[str] = None
    suggested_skill: Optional[str] = None
    context_requirements: List[str] = None


@dataclass
class ExecutionContext:
    """Context passed to agents/skills"""
    task: str
    project_path: str
    ralph_context: Dict[str, Any]
    patterns: List[Dict[str, Any]]
    past_similar: List[Dict[str, Any]]
    available_tools: List[str]


@dataclass
class ExecutionResult:
    """Result of execution"""
    success: bool
    execution_type: ExecutionType
    output: str
    metadata: Dict[str, Any]
    next_suggestions: List[str] = None
    learned_patterns: List[str] = None


class RalphCortex:
    """
    The Cortex - Decision engine that connects Ralph to agents and skills.

    Responsibilities:
    1. Analyze tasks and determine best execution approach
    2. Route to appropriate agent, skill, or direct tool usage
    3. Enrich context with Ralph memory
    4. Orchestrate multi-agent workflows when needed
    5. Learn from transcripts to improve future decisions
    """

    def __init__(self, db=None):
        """Initialize the Cortex with Ralph context"""
        self.db = db
        self._load_patterns()
        self._load_agent_capabilities()
        self._load_skill_definitions()

    # === PATTERN LOADING ===

    def _load_patterns(self) -> None:
        """Load learned patterns from Ralph memory"""
        self.patterns = []
        try:
            from src.db import get_db
            from src.pattern_extractor import extract_generic_pattern

            db = db or get_db()
            # Try to load patterns from the project
            project_path = os.getcwd()
            if os.path.exists(project_path):
                pattern = extract_generic_pattern(project_path)
                self.patterns.append({
                    "framework": pattern.get("pattern_description", ""),
                    "tags": pattern.get("tags", []),
                    "source": "current_project"
                })
        except Exception:
            pass

    def _load_agent_capabilities(self) -> None:
        """Define what each agent can do"""
        self.agent_capabilities = {
            "swe-scout": {
                "triggers": [
                    "find", "locate", "search", "explore", "discover",
                    "where is", "how does", "explain", "understand",
                    "trouve", "où est", "comment marche", "explore"
                ],
                "best_for": ["code_exploration", "file_discovery", "architecture_understanding"],
                "tools": ["ralph_warpgrep", "ralph_cross_search", "ralph_get_patterns"]
            },
            "snipper": {
                "triggers": [
                    "fix", "quick fix", "juste ça", "change line",
                    "correct", "simple", "fast"
                ],
                "best_for": ["quick_fixes", "single_line_changes", "obvious_bugs"],
                "tools": ["ralph_fast_apply", "Read", "Edit"]
            },
            "refactor": {
                "triggers": [
                    "refactor", "rename", "extract", "inline",
                    "move", "reorganize", "clean up"
                ],
                "best_for": ["code_transformation", "structural_changes"],
                "tools": ["ralph_warpgrep", "LSP", "Edit"]
            },
            "debug": {
                "triggers": [
                    "debug", "error", "bug", "not working",
                    "broken", "fail", "crash"
                ],
                "best_for": ["troubleshooting", "error_resolution"],
                "tools": ["ralph_warpgrep", "Bash", "Read"]
            },
            "perf": {
                "triggers": [
                    "slow", "optimize", "performance", "bottleneck",
                    "lag", "speed up"
                ],
                "best_for": ["optimization", "performance_analysis"],
                "tools": ["ralph_warpgrep", "Bash"]
            }
        }

    def _load_skill_definitions(self) -> None:
        """Define skill patterns and their sequences"""
        self.skills = {
            "commit": {
                "triggers": ["commit", "save", "check in"],
                "steps": [
                    "Check git status",
                    "Review changes with git diff",
                    "Stage files",
                    "Create commit message",
                    "Commit"
                ],
                "pattern": "git_workflow"
            },
            "qa": {
                "triggers": ["test", "qa", "verify", "validate"],
                "steps": [
                    "Identify test framework",
                    "Locate existing tests",
                    "Write/run tests",
                    "Review coverage"
                ],
                "pattern": "testing_workflow"
            },
            "devops": {
                "triggers": ["deploy", "docker", "ci/cd", "build"],
                "steps": [
                    "Check deployment config",
                    "Build/compile",
                    "Run tests",
                    "Deploy"
                ],
                "pattern": "deployment_workflow"
            }
        }

    # === TASK ANALYSIS ===

    def analyze_task(self, task: str, context: Optional[Dict] = None) -> TaskAnalysis:
        """
        Analyze a task and determine the best execution approach.

        Returns TaskAnalysis with execution type, confidence, and reasoning.
        """
        task_lower = task.lower()

        # Check for quick fix patterns (snipper)
        if self._is_quick_fix(task_lower):
            return TaskAnalysis(
                task=task,
                execution_type=ExecutionType.AGENT_SNIPPER,
                confidence=0.85,
                reasoning="Quick fix detected - single file, obvious change",
                suggested_agent="snipper"
            )

        # Check for exploration patterns (swe-scout)
        if self._is_exploration(task_lower):
            return TaskAnalysis(
                task=task,
                execution_type=ExecutionType.AGENT_SCOUT,
                confidence=0.90,
                reasoning="Code exploration or discovery task",
                suggested_agent="swe-scout"
            )

        # Check for debugging patterns
        if self._is_debugging(task_lower):
            return TaskAnalysis(
                task=task,
                execution_type=ExecutionType.AGENT_DEBUG,
                confidence=0.85,
                reasoning="Debugging or troubleshooting task",
                suggested_agent="debug"
            )

        # Check for performance patterns
        if self._is_performance(task_lower):
            return TaskAnalysis(
                task=task,
                execution_type=ExecutionType.AGENT_PERF,
                confidence=0.85,
                reasoning="Performance or optimization task",
                suggested_agent="perf"
            )

        # Check for skill patterns
        skill = self._match_skill(task_lower)
        if skill:
            return TaskAnalysis(
                task=task,
                execution_type=getattr(ExecutionType, f"SKILL_{skill.upper()}"),
                confidence=0.80,
                reasoning=f"Matches known skill pattern: {skill}",
                suggested_skill=skill
            )

        # Check for refactor patterns
        if self._is_refactor(task_lower):
            return TaskAnalysis(
                task=task,
                execution_type=ExecutionType.AGENT_REFACTOR,
                confidence=0.80,
                reasoning="Code refactoring or restructuring",
                suggested_agent="refactor"
            )

        # Default: Direct tool usage
        return TaskAnalysis(
            task=task,
            execution_type=ExecutionType.TOOL_DIRECT,
            confidence=0.60,
            reasoning="No specific pattern detected - using direct Ralph tools",
            context_requirements=["ralph_warpgrep", "ralph_recall"]
        )

    def _is_quick_fix(self, task: str) -> bool:
        """Check if task is a quick fix suitable for snipper"""
        quick_patterns = [
            r"fix.*typo",
            r"change.*line",
            r"rename.*variable",
            r"just.*this",
            r"simple.*fix",
            r"quick.*change"
        ]
        return any(re.search(p, task) for p in quick_patterns)

    def _is_exploration(self, task: str) -> bool:
        """Check if task is exploration suitable for swe-scout"""
        explore_patterns = [
            r"\bfind\b.*\bfile\b",
            r"\bwhere\b.*\bis\b",
            r"\bhow\b.*\bwork",
            r"\bexplain\b",
            r"\bexplore",
            r"\bunderstand\b",
            r"\bdiscover\b",
            r"trouve.*fichier",
            r"où.*est",
            r"comment.*marche"
        ]
        return any(re.search(p, task) for p in explore_patterns)

    def _is_debugging(self, task: str) -> bool:
        """Check if task is debugging"""
        debug_patterns = [
            r"\bdebug\b",
            r"\berror\b",
            r"\bbug\b",
            r"\bnot working\b",
            r"\bbroken\b",
            r"\bfail",
            r"\bcrash\b",
            r"marche pas",
            r"erreur"
        ]
        return any(re.search(p, task) for p in debug_patterns)

    def _is_performance(self, task: str) -> bool:
        """Check if task is performance-related"""
        perf_patterns = [
            r"\bslow\b",
            r"\boptimize",
            r"\bperformance",
            r"\bbottleneck",
            r"\blag",
            r"\bspeed",
            r"lent",
            r"optimise"
        ]
        return any(re.search(p, task) for p in perf_patterns)

    def _is_refactor(self, task: str) -> bool:
        """Check if task is refactoring"""
        refactor_patterns = [
            r"\brefactor",
            r"\brename\b",
            r"\bextract\b",
            r"\binline\b",
            r"\bmove\b",
            r"\breorganize"
        ]
        return any(re.search(p, task) for p in refactor_patterns)

    def _match_skill(self, task: str) -> Optional[str]:
        """Check if task matches a known skill pattern"""
        for skill_name, skill_def in self.skills.items():
            for trigger in skill_def["triggers"]:
                if trigger in task:
                    return skill_name
        return None

    # === EXECUTION ===

    def execute(self, task: str, context: Optional[Dict] = None) -> ExecutionResult:
        """
        Main execution entry point.

        1. Analyze the task
        2. Build execution context
        3. Route to appropriate handler
        4. Return enriched result
        """
        # Step 1: Analyze
        analysis = self.analyze_task(task, context)

        # Step 2: Build context
        exec_context = self._build_context(task, analysis)

        # Step 3: Execute based on type
        try:
            if analysis.execution_type == ExecutionType.AGENT_SCOUT:
                result = self._execute_swe_scout(task, exec_context)
            elif analysis.execution_type == ExecutionType.AGENT_SNIPPER:
                result = self._execute_snipper(task, exec_context)
            elif analysis.execution_type == ExecutionType.TOOL_DIRECT:
                result = self._execute_direct(task, exec_context)
            else:
                result = self._execute_direct(task, exec_context)  # Fallback

            # Step 4: Enrich with learning
            result.learned_patterns = self._extract_learning(task, analysis, result)

            return result

        except Exception as e:
            return ExecutionResult(
                success=False,
                execution_type=analysis.execution_type,
                output=f"Execution failed: {str(e)}",
                metadata={"error": str(e), "analysis": analysis}
            )

    def _build_context(self, task: str, analysis: TaskAnalysis) -> ExecutionContext:
        """Build execution context with Ralph memory"""
        project_path = os.getcwd()

        # Try to get patterns from Ralph
        patterns = self.patterns if self.patterns else []

        # Try to get similar past tasks
        past_similar = []
        try:
            from src.project_registry import get_registry
            registry = get_registry(self.db)
            # Could search for similar patterns here
        except Exception:
            pass

        return ExecutionContext(
            task=task,
            project_path=project_path,
            ralph_context={"framework": patterns[0].get("framework") if patterns else "unknown"},
            patterns=patterns,
            past_similar=past_similar,
            available_tools=self._get_available_tools(analysis)
        )

    def _get_available_tools(self, analysis: TaskAnalysis) -> List[str]:
        """Get list of Ralph tools available for this task"""
        base_tools = [
            "ralph_warpgrep",
            "ralph_recall",
            "ralph_cross_search",
            "ralph_get_patterns",
            "Read",
            "Grep",
            "Glob"
        ]

        if analysis.suggested_agent:
            agent_tools = self.agent_capabilities.get(
                analysis.suggested_agent, {}
            ).get("tools", [])
            return list(set(base_tools + agent_tools))

        return base_tools

    # === AGENT EXECUTION STUBS ===
    # These will call the actual agents via Task tool

    def _execute_swe_scout(self, task: str, context: ExecutionContext) -> ExecutionResult:
        """Execute swe-scout agent for code exploration"""
        # This will call Task tool with swe-scout
        return ExecutionResult(
            success=True,
            execution_type=ExecutionType.AGENT_SCOUT,
            output=f"[CORTEX] Would launch swe-scout for: {task}\nContext: {context.project_path}",
            metadata={"agent": "swe-scout", "context": context}
        )

    def _execute_snipper(self, task: str, context: ExecutionContext) -> ExecutionResult:
        """Execute snipper agent for quick fixes"""
        return ExecutionResult(
            success=True,
            execution_type=ExecutionType.AGENT_SNIPPER,
            output=f"[CORTEX] Would launch snipper for: {task}",
            metadata={"agent": "snipper", "context": context}
        )

    def _execute_direct(self, task: str, context: ExecutionContext) -> ExecutionResult:
        """Execute using Ralph tools directly"""
        return ExecutionResult(
            success=True,
            execution_type=ExecutionType.TOOL_DIRECT,
            output=f"[CORTEX] Using Ralph tools directly for: {task}\nAvailable: {context.available_tools}",
            metadata={"tools": context.available_tools, "context": context}
        )

    # === LEARNING ===

    def _extract_learning(self, task: str, analysis: TaskAnalysis, result: ExecutionResult) -> List[str]:
        """Extract patterns to learn from this execution"""
        patterns = []

        # What execution type was used
        patterns.append(f"Task '{task[:50]}...' used {analysis.execution_type.value}")

        # What worked
        if result.success:
            patterns.append(f"Execution successful with confidence {analysis.confidence}")

        return patterns


# Singleton
_cortex_instance: Optional[RalphCortex] = None

def get_cortex(db=None) -> RalphCortex:
    """Get or create the singleton Cortex instance"""
    global _cortex_instance
    if _cortex_instance is None:
        _cortex_instance = RalphCortex(db)
    return _cortex_instance
