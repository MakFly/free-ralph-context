#!/usr/bin/env bun
/**
 * Install Nexus hooks into Claude Code settings
 *
 * Usage: bun run setup        # Install
 *        bun run setup -u     # Uninstall
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SETTINGS_PATH = `${process.env.HOME}/.claude/settings.json`;
const HOOKS_DIST = join(__dirname, 'dist');

interface HookConfig {
  matcher: string;
  hooks: Array<{ type: 'command'; command: string; timeout: number }>;
}

interface Settings {
  hooks?: Record<string, HookConfig[]>;
  [key: string]: unknown;
}

function readSettings(): Settings {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(settings: Settings): void {
  const dir = `${process.env.HOME}/.claude`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function getHooksConfig(): Record<string, HookConfig> {
  return {
    SessionStart: {
      matcher: '',
      hooks: [{ type: 'command', command: `bun run ${HOOKS_DIST}/session-start.js`, timeout: 5000 }]
    },
    UserPromptSubmit: {
      matcher: '',
      hooks: [{ type: 'command', command: `bun run ${HOOKS_DIST}/user-prompt-submit.js`, timeout: 5000 }]
    },
    PreToolUse: {
      matcher: '',
      hooks: [{ type: 'command', command: `bun run ${HOOKS_DIST}/pre-tool-use.js`, timeout: 2000 }]
    },
    PostToolUse: {
      matcher: '',
      hooks: [{ type: 'command', command: `bun run ${HOOKS_DIST}/post-tool-use.js`, timeout: 5000 }]
    },
    Stop: {
      matcher: '',
      hooks: [{ type: 'command', command: `bun run ${HOOKS_DIST}/stop.js`, timeout: 5000 }]
    },
    SessionEnd: {
      matcher: '',
      hooks: [{ type: 'command', command: `bun run ${HOOKS_DIST}/session-end.js`, timeout: 10000 }]
    }
  };
}

function install(): void {
  console.log('Building hooks...');
  execSync('bun run build', { cwd: __dirname, stdio: 'inherit' });

  console.log('\nInstalling hooks...');
  const settings = readSettings();
  if (!settings.hooks) settings.hooks = {};

  for (const [name, config] of Object.entries(getHooksConfig())) {
    settings.hooks[name] = [config];
    console.log(`  + ${name}`);
  }

  writeSettings(settings);
  console.log(`\nDone. Restart Claude Code to apply.`);
}

function uninstall(): void {
  console.log('Uninstalling hooks...');
  const settings = readSettings();

  if (settings.hooks) {
    for (const name of Object.keys(getHooksConfig())) {
      delete settings.hooks[name];
      console.log(`  - ${name}`);
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }

  writeSettings(settings);
  console.log('\nDone.');
}

// Main
if (process.argv.includes('-u') || process.argv.includes('--uninstall')) {
  uninstall();
} else {
  install();
}
