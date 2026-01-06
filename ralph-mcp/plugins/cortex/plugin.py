"""
Cortex Plugin - Ralph Brain Integration

Provides the ralph_cortex tool that:
1. Analyzes tasks
2. Routes to appropriate agents/skills
3. Orchestrates execution
4. Learns from transcripts
"""

from typing import Any

from mcp.types import Tool, TextContent

from plugins.base import RalphPlugin
from core import log_info, log_debug


class CortexPlugin(RalphPlugin):
    """
    Ralph Cortex - The brain that connects Ralph to agents and skills.

    This plugin provides intelligent task routing based on:
    - Task analysis (what type of task?)
    - Context awareness (what project? what patterns?)
    - Agent selection (swe-scout, snipper, debug, etc.)
    - Skill recognition (git commit, testing, etc.)
    """

    def get_tools(self) -> list[Tool]:
        """Return cortex tools."""
        return [
            Tool(
                name="ralph_cortex",
                description="""Ralph Cortex - Intelligent task routing and execution.

Analyzes tasks and automatically routes to:
- Agents: swe-scout (exploration), snipper (quick fixes), debug (errors), perf (optimization)
- Skills: /commit, /qa, /devops (learned from transcripts)
- Direct tools: ralph_warpgrep, ralph_recall, etc.

The Cortex learns from your transcripts and improves over time.

Examples:
  ralph_cortex("find where auth is implemented")
  ralph_cortex("fix the typo in login")
  ralph_cortex("commit these changes")
  ralph_cortex("why is this slow?")
""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "task": {
                            "type": "string",
                            "description": "The task or question to execute"
                        },
                        "auto_learn": {
                            "type": "boolean",
                            "description": "Whether to learn from transcripts (default: true)",
                            "default": True
                        }
                    },
                    "required": ["task"]
                }
            ),
            Tool(
                name="ralph_learn_from_transcripts",
                description="""Learn patterns from your Claude transcripts.

Parses ~/.claude/transcripts/*.json to extract:
- Common action sequences
- Tool usage patterns
- Workflow patterns (git, testing, etc.)

Automatically updates Cortex skills database.

Results:
- Learned skills: New skills discovered
- Pattern counts: How often each pattern occurs
- Total patterns: Number of unique patterns found
""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "description": "Number of recent transcripts to parse (default: 50)",
                            "default": 50
                        }
                    },
                    "required": []
                }
            ),
        ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> list[TextContent]:
        """Execute cortex tool."""
        if name == "ralph_cortex":
            return await self._execute_cortex(arguments)
        elif name == "ralph_learn_from_transcripts":
            return await self._execute_learn(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")

    async def _execute_cortex(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Execute cortex task analysis and routing."""
        from src.cortex import get_cortex
        from src.db import get_db

        task = arguments.get("task", "")
        auto_learn = arguments.get("auto_learn", False)

        if not task:
            return [TextContent(
                type="text",
                text='{"error": "Task is required"}'
            )]

        log_info(f"Cortex: Analyzing task: {task[:50]}...")

        # Get or create Cortex
        db = get_db()
        cortex = get_cortex(db)

        # Auto-learn from transcripts if requested
        if auto_learn:
            try:
                from src.transcript_parser import learn_from_transcripts, update_cortex_with_learning
                learned = learn_from_transcripts(db, limit=20)
                update_cortex_with_learning(cortex, learned)

                if learned.get("total_patterns", 0) > 0:
                    log_info(f"Cortex: Learned {learned['total_patterns']} new patterns")
            except Exception as e:
                log_debug(f"Cortex: Auto-learning failed: {e}")

        # Analyze and execute
        result = cortex.execute(task)

        # Build response
        response = {
            "task": task,
            "analysis": {
                "execution_type": result.execution_type.value,
                "success": result.success,
                "reasoning": f"Analyzed task and routed to {result.execution_type.value}"
            },
            "output": result.output,
            "metadata": result.metadata
        }

        if result.learned_patterns:
            response["learned"] = result.learned_patterns

        if result.next_suggestions:
            response["suggestions"] = result.next_suggestions

        return [TextContent(
            type="text",
            text=self._format_response(response)
        )]

    async def _execute_learn(self, arguments: dict[str, Any]) -> list[TextContent]:
        """Execute learning from transcripts."""
        from src.transcript_parser import learn_from_transcripts
        from src.db import get_db

        limit = arguments.get("limit", 50)
        db = get_db()

        log_info(f"Cortex: Learning from {limit} recent transcripts...")

        try:
            learned = learn_from_transcripts(db, limit)

            response = {
                "learned_skills": list(learned.get("learned_skills", {}).keys()),
                "pattern_counts": learned.get("pattern_counts", {}),
                "total_patterns": learned.get("total_patterns", 0),
                "summary": f"Found {learned.get('total_patterns', 0)} patterns across {limit} transcripts"
            }

            return [TextContent(
                type="text",
                text=self._format_learning_response(response)
            )]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f'{{"error": "Learning failed: {str(e)}"}}'
            )]

    def _format_response(self, response: dict) -> str:
        """Format cortex response for display."""
        lines = [
            "## Ralph Cortex Analysis",
            "",
            f"**Task**: {response['task'][:80]}...",
            "",
            f"**Execution Type**: `{response['analysis']['execution_type']}`",
            f"**Success**: {response['analysis']['success']}",
            "",
            "### Output",
            response['output'],
            ""
        ]

        if response.get("learned"):
            lines.extend([
                "### Learned Patterns",
                ""
            ])
            for pattern in response["learned"]:
                lines.append(f"- {pattern}")
            lines.append("")

        if response.get("suggestions"):
            lines.extend([
                "### Next Steps",
                ""
            ])
            for suggestion in response["suggestions"]:
                lines.append(f"- {suggestion}")
            lines.append("")

        return "\n".join(lines)

    def _format_learning_response(self, response: dict) -> str:
        """Format learning response for display."""
        lines = [
            "## Ralph Cortex: Learning Results",
            "",
            f"**Summary**: {response['summary']}",
            "",
            f"**Total Patterns**: {response['total_patterns']}",
            "",
            "### Learned Skills",
            ""
        ]

        for skill in response.get("learned_skills", []):
            lines.append(f"- `{skill}`")

        if response.get("pattern_counts"):
            lines.extend([
                "",
                "### Pattern Frequencies",
                ""
            ])
            for pattern, count in list(response["pattern_counts"].items())[:10]:
                lines.append(f"- {pattern}: {count}x")

        return "\n".join(lines)
