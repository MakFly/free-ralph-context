/**
 * Hook: Stop
 * Triggered when Claude generates [stop] or timeout
 *
 * Generates a session summary from all observations
 */

import { readFileSync, existsSync, unlinkSync } from 'fs';

const NEXUS_API = process.env.NEXUS_API_URL || 'http://localhost:3001';
const SESSION_FILE = '/tmp/nexus-session-id';
const SESSION_META_FILE = '/tmp/nexus-session-meta.json';

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
  stop_reason?: string;
  last_assistant_message?: string;
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

    const { stop_reason, last_assistant_message } = input;

    // Get session data
    const session = getSessionData();
    if (!session) {
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    // Request summarization from API
    const summarizeData = {
      session_id: session.sessionId,
      project: session.project,
      stop_reason: stop_reason || 'unknown',
      last_message: last_assistant_message?.substring(0, 1000) || null,
      ended_at: Date.now(),
    };

    // Send to API (fire and forget)
    fetch(`${NEXUS_API}/sessions/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summarizeData),
    }).catch(() => {
      // Silently ignore errors
    });

    // Clean up temp files (optional, session-end also does this)
    try {
      if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
      if (existsSync(SESSION_META_FILE)) unlinkSync(SESSION_META_FILE);
    } catch {
      // Ignore cleanup errors
    }

    console.log(JSON.stringify({ result: 'continue' }));
  } catch {
    // Always continue
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main();
