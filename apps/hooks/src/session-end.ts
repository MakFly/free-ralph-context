/**
 * Hook: SessionEnd
 * Triggered when Claude Code session ends
 *
 * Simplified: Cleanup only, no auto-processing
 */

import { unlinkSync, existsSync } from 'fs';

const SESSION_FILE = '/tmp/nexus-session-id';
const SESSION_META_FILE = '/tmp/nexus-session-meta.json';

function main(): void {
  try {
    // Cleanup: Remove session files
    if (existsSync(SESSION_FILE)) {
      unlinkSync(SESSION_FILE);
    }
    if (existsSync(SESSION_META_FILE)) {
      unlinkSync(SESSION_META_FILE);
    }

    console.log(JSON.stringify({ result: 'continue' }));
  } catch {
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main();
