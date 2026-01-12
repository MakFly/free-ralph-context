/**
 * @nexus/hooks - Claude Code lifecycle hooks
 *
 * Hooks:
 * - SessionStart      - Initialize session + inject context from previous sessions
 * - UserPromptSubmit  - Initialize session in DB + capture first prompt
 * - PreToolUse        - Pass-through
 * - PostToolUse       - Capture tool use as observation
 * - Stop              - Generate session summary
 * - SessionEnd        - Cleanup temp files
 *
 * Install: bun run setup
 * Uninstall: bun run setup:uninstall
 */

export {};
