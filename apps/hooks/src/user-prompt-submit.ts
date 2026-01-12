/**
 * Hook: UserPromptSubmit
 * Triggered when user submits a prompt
 *
 * Initializes the session in the database and captures the first prompt
 */

import { readFileSync, existsSync } from 'fs';

const NEXUS_API = process.env.NEXUS_API_URL || 'http://localhost:3001';
const SESSION_FILE = '/tmp/nexus-session-id';
const SESSION_META_FILE = '/tmp/nexus-session-meta.json';

// Read session data
function getSessionData(): { sessionId: string; project: string; cwd: string } | null {
  try {
    if (!existsSync(SESSION_FILE) || !existsSync(SESSION_META_FILE)) {
      return null;
    }
    const sessionId = readFileSync(SESSION_FILE, 'utf-8').trim();
    const meta = JSON.parse(readFileSync(SESSION_META_FILE, 'utf-8'));
    return {
      sessionId,
      project: meta.project || 'unknown',
      cwd: meta.cwd || process.cwd(),
    };
  } catch {
    return null;
  }
}

// Parse hook input from stdin
interface HookInput {
  user_prompt?: string;
  session_id?: string;
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

    const { user_prompt } = input;

    // Get session data
    const session = getSessionData();
    if (!session) {
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    // Initialize session in database
    const initData = {
      session_id: session.sessionId,
      project: session.project,
      cwd: session.cwd,
      first_prompt: user_prompt?.substring(0, 500) || null,
      started_at: Date.now(),
    };

    // Send to API (fire and forget)
    fetch(`${NEXUS_API}/sessions/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initData),
    }).catch(() => {
      // Silently ignore errors
    });

    console.log(JSON.stringify({ result: 'continue' }));
  } catch {
    // Always continue
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main();
