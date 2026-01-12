/**
 * Hook: SessionStart
 * Triggered when a Claude Code session begins
 *
 * Stores session ID and injects context from previous sessions
 */

import { writeFileSync } from 'fs';

const NEXUS_API = process.env.NEXUS_API_URL || 'http://localhost:3001';

// Generate unique session ID
const SESSION_ID = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Store session ID in temp file for other hooks to read
const SESSION_FILE = '/tmp/nexus-session-id';
const SESSION_META_FILE = '/tmp/nexus-session-meta.json';

// Detect model from environment (CCS or default)
function detectModel(): { model: string; provider: string; cliType: string } {
  const envModel = process.env.ANTHROPIC_MODEL;
  const envBaseUrl = process.env.ANTHROPIC_BASE_URL;

  // Check if GLM (z.ai)
  if (envBaseUrl?.includes('z.ai')) {
    return {
      model: envModel || 'glm-4-plus',
      provider: 'zhipu',
      cliType: 'claude-code',
    };
  }

  // Check if explicit model set
  if (envModel) {
    const provider = envModel.includes('gpt') ? 'openai' :
                     envModel.includes('gemini') ? 'google' : 'anthropic';
    return { model: envModel, provider, cliType: 'claude-code' };
  }

  // Default: Anthropic OAuth (opus)
  return {
    model: 'opus-4.5',
    provider: 'anthropic',
    cliType: 'claude-code',
  };
}

// Fetch context from Nexus API
async function fetchContext(project: string): Promise<string | null> {
  try {
    const response = await fetch(`${NEXUS_API}/context/inject?project=${encodeURIComponent(project)}&limit=10`);
    if (!response.ok) return null;

    const data = await response.json() as { context?: string; formatted?: string };
    return data.formatted || data.context || null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const project = cwd.split('/').pop() || 'unknown';
  const startedAt = Date.now();
  const { model, provider, cliType } = detectModel();

  try {
    // Write session ID to file for other hooks
    writeFileSync(SESSION_FILE, SESSION_ID, 'utf-8');

    // Write session metadata for session-end hook
    const sessionMeta = {
      sessionId: SESSION_ID,
      startedAt,
      model,
      provider,
      cliType,
      project,
      cwd,
    };
    writeFileSync(SESSION_META_FILE, JSON.stringify(sessionMeta), 'utf-8');

    // Fetch context from previous sessions (async, don't block)
    const context = await fetchContext(project);

    if (context) {
      // Output context for injection into Claude's system prompt
      // Using result format that Claude Code understands
      console.log(JSON.stringify({
        result: 'continue',
        context: context,
      }));
    } else {
      console.log(JSON.stringify({ result: 'continue' }));
    }
  } catch {
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main();
