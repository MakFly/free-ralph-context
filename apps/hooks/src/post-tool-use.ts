/**
 * Hook: PostToolUse
 * Triggered after each tool execution
 *
 * Captures tool usage as observations for memory system
 */

import { readFileSync, existsSync } from 'fs';

const NEXUS_API = process.env.NEXUS_API_URL || 'http://localhost:3001';
const SESSION_FILE = '/tmp/nexus-session-id';
const SESSION_META_FILE = '/tmp/nexus-session-meta.json';

// Tool type inference mapping
const TOOL_TYPE_MAP: Record<string, string> = {
  // File operations → discovery
  Read: 'discovery',
  Glob: 'discovery',
  Grep: 'discovery',
  LSP: 'discovery',

  // Code modifications → change
  Edit: 'change',
  Write: 'change',
  NotebookEdit: 'change',

  // Commands → decision
  Bash: 'decision',
  Task: 'decision',

  // Web/Search → discovery
  WebFetch: 'discovery',
  WebSearch: 'discovery',

  // Memory operations → note
  TodoWrite: 'note',
};

// Infer observation type from tool name
function inferObservationType(toolName: string): string {
  return TOOL_TYPE_MAP[toolName] || 'note';
}

// Format tool title
function formatToolTitle(toolName: string, input: unknown): string {
  if (!input || typeof input !== 'object') {
    return `Used ${toolName}`;
  }

  const inp = input as Record<string, unknown>;

  // File operations
  if (inp.file_path) {
    const path = String(inp.file_path).split('/').pop();
    return `${toolName}: ${path}`;
  }

  // Bash commands
  if (inp.command) {
    const cmd = String(inp.command).slice(0, 50);
    return `${toolName}: ${cmd}${String(inp.command).length > 50 ? '...' : ''}`;
  }

  // Search/Grep
  if (inp.pattern || inp.query) {
    const q = String(inp.pattern || inp.query).slice(0, 30);
    return `${toolName}: ${q}`;
  }

  // Glob
  if (inp.glob) {
    return `${toolName}: ${inp.glob}`;
  }

  return `Used ${toolName}`;
}

// Estimate tokens from content
function estimateTokens(content: string | undefined): number {
  if (!content) return 0;
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(content.length / 4);
}

// Read session data
function getSessionData(): { sessionId: string; project: string } | null {
  try {
    if (!existsSync(SESSION_FILE) || !existsSync(SESSION_META_FILE)) {
      return null;
    }
    const sessionId = readFileSync(SESSION_FILE, 'utf-8').trim();
    const meta = JSON.parse(readFileSync(SESSION_META_FILE, 'utf-8'));
    return { sessionId, project: meta.project || 'unknown' };
  } catch {
    return null;
  }
}

// Parse hook input from stdin
interface HookInput {
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: string;
}

async function main(): Promise<void> {
  try {
    // Read input from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const inputJson = Buffer.concat(chunks).toString('utf-8');

    let input: HookInput = {};
    try {
      input = JSON.parse(inputJson);
    } catch {
      // No input or invalid JSON
    }

    const { tool_name, tool_input, tool_response } = input;

    // Skip if no tool info
    if (!tool_name) {
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    // Skip internal/meta tools
    const skipTools = ['TodoWrite', 'AskUserQuestion', 'ExitPlanMode', 'EnterPlanMode'];
    if (skipTools.includes(tool_name)) {
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    // Get session data
    const session = getSessionData();
    if (!session) {
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    // Create observation
    const observation = {
      session_id: session.sessionId,
      project: session.project,
      type: inferObservationType(tool_name),
      scope: 'repo',
      title: formatToolTitle(tool_name, tool_input),
      narrative: tool_response?.substring(0, 2000) || null,
      confidence: 0.7,
      discovery_tokens: estimateTokens(tool_response),
    };

    // Send to API (fire and forget, don't block Claude)
    fetch(`${NEXUS_API}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(observation),
    }).catch(() => {
      // Silently ignore errors - don't block Claude Code
    });

    console.log(JSON.stringify({ result: 'continue' }));
  } catch {
    // Always continue, never block Claude Code
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main();
