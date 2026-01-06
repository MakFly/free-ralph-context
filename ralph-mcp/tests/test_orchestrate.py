#!/usr/bin/env python3
"""
Tests pour le système d'orchestration multi-agent.

Ces tests valident la détection automatique des tâches complexes
et la génération de plans d'exécution multi-agents.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from src.tools.orchestrate import (
    OrchestrateTool,
    AgentTask,
    ExecutionPlan,
    OrchestrateResult
)


class TestOrchestrateTool:
    """Tests pour l'outil d'orchestration."""

    @pytest.fixture
    def orchestrator(self):
        """Instance de l'orchestrateur."""
        return OrchestrateTool()

    def test_simple_task_single_agent(self, orchestrator):
        """Test qu'une tâche simple n'active pas le multi-agent."""
        result = orchestrator._analyze_task("Fix typo on line 42")

        assert result.task_type == "simple_fix"
        assert result.recommended_agent == "snipper"
        assert result.complexity == "low"

    def test_explain_task_triggers_multi_agent(self, orchestrator):
        """Test qu'une tâche 'explain' déclenche le multi-agent."""
        result = orchestrator._analyze_task("Explique l'auth d'iautos")

        assert result.task_type == "external_project_analysis"
        assert result.recommended_agent == "multi-agent"
        assert result.complexity == "high"

    def test_project_detection_iautos(self, orchestrator):
        """Test la détection du projet iautos."""
        project = orchestrator._detect_project_context("Explique l'auth d'iautos")
        assert project is not None
        assert project["name"] == "iautos"

    def test_execution_plan_creation(self, orchestrator):
        """Test la création d'un plan d'exécution."""
        plan = orchestrator._create_execution_plan(
            project_name="iautos",
            trigger="project_switch",
            query="Explique l'auth"
        )

        assert isinstance(plan, ExecutionPlan)
        assert plan.mode in ["parallel", "sequential", "hybrid"]
        assert len(plan.parallel_tasks) >= 0
        assert len(plan.ralph_tools) >= 0

    def test_execution_plan_to_dict(self, orchestrator):
        """Test la sérialisation du plan en dict."""
        task = AgentTask(
            agent="swe-scout",
            task="Locate iautos project",
            priority=1,
            estimated_duration=10,
            task_id="task-1"
        )

        plan = ExecutionPlan(
            parallel_tasks=[task],
            reasoning="Test plan",
            mode="parallel",
            estimated_duration=10
        )

        plan_dict = plan.to_dict()

        assert plan_dict["mode"] == "parallel"
        assert len(plan_dict["parallelTasks"]) == 1
        assert plan_dict["parallelTasks"][0]["agent"] == "swe-scout"


class TestAgentTask:
    """Tests pour la classe AgentTask."""

    def test_agent_task_creation(self):
        """Test la création d'une tâche agent."""
        task = AgentTask(
            agent="swe-scout",
            task="Search auth patterns",
            priority=1
        )

        assert task.agent == "swe-scout"
        assert task.task == "Search auth patterns"
        assert task.priority == 1
        assert task.task_id != ""  # Auto-généré


class TestExecutionPlan:
    """Tests pour la classe ExecutionPlan."""

    def test_execution_plan_empty(self):
        """Test un plan vide."""
        plan = ExecutionPlan()

        assert len(plan.parallel_tasks) == 0
        assert len(plan.sequential_tasks) == 0
        assert plan.mode == "single"

    def test_execution_plan_hybrid(self):
        """Test un plan hybride (parallèle + séquentiel)."""
        parallel1 = AgentTask(agent="swe-scout", task="Task 1")
        parallel2 = AgentTask(agent="swe-scout", task="Task 2")
        sequential = AgentTask(
            agent="general-purpose",
            task="Task 3",
            depends_on=["task-1", "task-2"]
        )

        plan = ExecutionPlan(
            parallel_tasks=[parallel1, parallel2],
            sequential_tasks=[sequential],
            mode="hybrid"
        )

        assert len(plan.parallel_tasks) == 2
        assert len(plan.sequential_tasks) == 1
        assert plan.mode == "hybrid"
