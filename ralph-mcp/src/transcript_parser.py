"""
Transcript Parser - Learn skills from Claude transcripts

Phase 3: Auto-learning from transcripts
- Parse ~/.claude/transcripts/*.json
- Extract action sequences
- Identify repeatable patterns
- Update skill definitions
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict, Counter
from dataclasses import dataclass
import re


@dataclass
class Action:
    """A single action in a transcript"""
    type: str  # "tool_use", "response", "user_input"
    name: Optional[str]  # Tool name if tool_use
    content: str
    timestamp: Optional[str] = None


@dataclass
class ActionSequence:
    """A sequence of actions that forms a pattern"""
    actions: List[Action]
    frequency: int
    contexts: List[str]  # Project paths where this occurred
    pattern_type: str  # "git_workflow", "testing_workflow", etc.


class TranscriptParser:
    """
    Parse Claude transcripts to extract learnable patterns.

    Extracts:
    - Common action sequences
    - Tool usage patterns
    - Project-specific workflows
    """

    def __init__(self):
        self.transcripts_dir = Path.home() / ".claude" / "transcripts"
        self.sequences: Dict[str, ActionSequence] = {}

    # === PARSING ===

    def parse_all_transcripts(self, limit: int = 50) -> Dict[str, ActionSequence]:
        """Parse all transcripts and extract patterns"""
        if not self.transcripts_dir.exists():
            return {}

        pattern_counts = defaultdict(int)
        sequence_examples = defaultdict(list)

        for transcript_file in self._get_transcript_files(limit):
            try:
                actions = self._parse_transcript(transcript_file)
                sequences = self._extract_sequences(actions)

                for seq in sequences:
                    key = self._sequence_key(seq)
                    pattern_counts[key] += 1
                    sequence_examples[key].append(seq)

            except Exception as e:
                print(f"Error parsing {transcript_file}: {e}")
                continue

        # Build final sequences
        for key, count in pattern_counts.items():
            if count >= 2:  # Only keep patterns seen at least twice
                examples = sequence_examples[key]
                self.sequences[key] = ActionSequence(
                    actions=examples[0].actions,
                    frequency=count,
                    contexts=[s.context for s in examples],
                    pattern_type=self._classify_pattern(examples[0])
                )

        return self.sequences

    def _get_transcript_files(self, limit: int) -> List[Path]:
        """Get transcript files, most recent first"""
        files = list(self.transcripts_dir.glob("*.json"))
        # Sort by modification time
        files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        return files[:limit]

    def _parse_transcript(self, path: Path) -> List[Action]:
        """Parse a single transcript file into actions"""
        actions = []

        try:
            with open(path, 'r') as f:
                data = json.load(f)

            for msg in data.get("messages", []):
                if msg.get("role") == "user":
                    actions.append(Action(
                        type="user_input",
                        name=None,
                        content=msg.get("content", "")
                    ))

                elif msg.get("role") == "assistant":
                    # Check for tool uses
                    for content in msg.get("content", []):
                        if isinstance(content, dict) and content.get("type") == "tool_use":
                            actions.append(Action(
                                type="tool_use",
                                name=content.get("name"),
                                content=content.get("input", {}).get("query", content.get("input", {}).get("path", "")),
                                timestamp=msg.get("timestamp")
                            ))

        except Exception as e:
            print(f"Error reading {path}: {e}")

        return actions

    def _extract_sequences(self, actions: List[Action]) -> List[ActionSequence]:
        """Extract repeatable sequences from actions"""
        sequences = []

        # Look for common patterns
        # Pattern 1: Git workflow (status → diff → add → commit)
        git_seq = self._find_git_sequence(actions)
        if git_seq:
            sequences.append(git_seq)

        # Pattern 2: Test workflow (find tests → run → check results)
        test_seq = self._find_test_sequence(actions)
        if test_seq:
            sequences.append(test_seq)

        # Pattern 3: Code fix workflow (grep → read → edit → test)
        fix_seq = self._find_fix_sequence(actions)
        if fix_seq:
            sequences.append(fix_seq)

        return sequences

    def _find_git_sequence(self, actions: List[Action]) -> Optional[ActionSequence]:
        """Find git workflow sequence"""
        # Look for: Bash(git status) → Bash(git diff) → Bash(git add) → Bash(git commit)
        git_commands = []
        for action in actions:
            if action.type == "tool_use" and action.name == "Bash":
                cmd = action.content.strip()
                if cmd.startswith("git "):
                    git_commands.append(action)

        if len(git_commands) >= 3:
            # Check if it looks like a commit workflow
            has_status = any("status" in c.content for c in git_commands)
            has_commit = any("commit" in c.content for c in git_commands)

            if has_status and has_commit:
                return ActionSequence(
                    actions=git_commands,
                    frequency=1,
                    contexts=[],
                    pattern_type="git_workflow"
                )

        return None

    def _find_test_sequence(self, actions: List[Action]) -> Optional[ActionSequence]:
        """Find testing workflow sequence"""
        # Look for: find test files → run tests → check output
        test_related = []
        for action in actions:
            content_lower = action.content.lower()
            if ("test" in content_lower or
                action.name in ["Grep", "Glob"] and "test" in action.content):
                test_related.append(action)

        if len(test_related) >= 2:
            return ActionSequence(
                actions=test_related,
                frequency=1,
                contexts=[],
                pattern_type="testing_workflow"
            )

        return None

    def _find_fix_sequence(self, actions: List[Action]) -> Optional[ActionSequence]:
        """Find code fix workflow sequence"""
        # Look for: search → read → edit → verify
        fix_actions = []
        for action in actions:
            if action.type == "tool_use":
                if action.name in ["Grep", "Glob", "ralph_warpgrep"]:
                    fix_actions.append(action)
                elif action.name == "Read":
                    fix_actions.append(action)
                elif action.name in ["Edit", "Write"]:
                    fix_actions.append(action)
                    break  # Edit is usually the fix

        if len(fix_actions) >= 2:
            return ActionSequence(
                actions=fix_actions,
                frequency=1,
                contexts=[],
                pattern_type="code_fix_workflow"
            )

        return None

    def _sequence_key(self, sequence: ActionSequence) -> str:
        """Generate a key for deduplication"""
        action_names = [a.name or a.type for a in sequence.actions]
        return "|".join(action_names)

    def _classify_pattern(self, sequence: ActionSequence) -> str:
        """Classify what type of pattern this is"""
        return sequence.pattern_type

    # === SKILL GENERATION ===

    def generate_skills(self) -> Dict[str, Dict]:
        """Generate skill definitions from learned patterns"""
        skills = {}

        for key, sequence in self.sequences.items():
            if sequence.frequency >= 3:  # Only patterns seen 3+ times
                skill_name = self._pattern_to_skill_name(sequence.pattern_type)

                # Extract steps
                steps = []
                for action in sequence.actions:
                    if action.type == "tool_use":
                        step = f"Use {action.name}: {action.content[:50]}..."
                        steps.append(step)

                # Extract triggers from user messages
                triggers = self._extract_triggers(sequence)

                skills[skill_name] = {
                    "triggers": triggers,
                    "steps": steps,
                    "pattern": sequence.pattern_type,
                    "frequency": sequence.frequency
                }

        return skills

    def _pattern_to_skill_name(self, pattern_type: str) -> str:
        """Convert pattern type to skill name"""
        mapping = {
            "git_workflow": "commit",
            "testing_workflow": "qa",
            "code_fix_workflow": "fix"
        }
        return mapping.get(pattern_type, pattern_type)

    def _extract_triggers(self, sequence: ActionSequence) -> List[str]:
        """Extract trigger phrases from user messages"""
        triggers = []

        # Look for user messages before the sequence
        for action in sequence.actions:
            if action.type == "user_input":
                content = action.content.lower().strip()
                # Extract key phrases (first 3 words)
                words = content.split()[:3]
                if len(words) >= 2:
                    triggers.append(" ".join(words))

        return list(set(triggers))[:5]  # Max 5 triggers

    # === EXPORT ===

    def export_patterns_for_cortex(self) -> Dict[str, Any]:
        """Export learned patterns for Cortex to use"""
        skills = self.generate_skills()

        return {
            "learned_skills": skills,
            "pattern_counts": {k: v.frequency for k, v in self.sequences.items()},
            "total_patterns": len(self.sequences)
        }


# === UTILITY FUNCTIONS ===

def learn_from_transcripts(db=None, limit: int = 50) -> Dict[str, Any]:
    """
    Main entry point to learn from transcripts.

    Returns patterns and skills that can be used by Cortex.
    """
    parser = TranscriptParser()
    parser.parse_all_transcripts(limit)

    return parser.export_patterns_for_cortex()


def update_cortex_with_learning(cortex, learned_data: Dict[str, Any]) -> None:
    """Update Cortex with newly learned patterns"""
    for skill_name, skill_def in learned_data.get("learned_skills", {}).items():
        # Add to Cortex skills
        cortex.skills[skill_name] = skill_def
