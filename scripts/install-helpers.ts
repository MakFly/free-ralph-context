/**
 * Installation Helpers for Nexus
 *
 * Helper functions for reading/writing Claude Code configuration files
 * and formatting console output.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================
// TYPES
// ============================================================

interface ClaudeSettings {
  hooks?: Record<string, Array<{ matcher: string; hooks: Array<{ type: string; command: string; timeout: number }> }>>;
  [key: string]: unknown;
}

interface ClaudeConfig {
  mcpServers?: Record<string, { command: string; args: string[]; env?: Record<string, string> }>;
  projects?: Record<string, { mcpServers?: Record<string, unknown> }>;
  [key: string]: unknown;
}

interface HookConfig {
  matcher: string;
  hooks: Array<{ type: string; command: string; timeout: number }>;
}

// ============================================================
// PATHS
// ============================================================

function getClaudeDir(): string {
  return join(process.env.HOME || '', '.claude');
}

function getSettingsPath(): string {
  return join(getClaudeDir(), 'settings.json');
}

function getConfigPath(): string {
  return join(process.env.HOME || '', '.claude.json');
}

// ============================================================
// CLAUDE SETTINGS (~/.claude/settings.json)
// ============================================================

export function readClaudeSettings(): ClaudeSettings {
  const settingsPath = getSettingsPath();
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeClaudeSettings(settings: ClaudeSettings): void {
  const dir = getClaudeDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

export function addHook(hookName: string, config: HookConfig): ClaudeSettings {
  const settings = readClaudeSettings();
  if (!settings.hooks) {
    settings.hooks = {};
  }
  settings.hooks[hookName] = [config];
  return settings;
}

export function removeHook(hookName: string): ClaudeSettings {
  const settings = readClaudeSettings();
  if (settings.hooks && settings.hooks[hookName]) {
    delete settings.hooks[hookName];
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }
  return settings;
}

export function hasHook(hookName: string): boolean {
  const settings = readClaudeSettings();
  return !!(settings.hooks && settings.hooks[hookName]);
}

// ============================================================
// CLAUDE CONFIG (~/.claude.json)
// ============================================================

export function readClaudeConfig(): ClaudeConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeClaudeConfig(config: ClaudeConfig): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

export function addMcpServer(
  name: string,
  command: string,
  args: string[],
  env?: Record<string, string>
): ClaudeConfig {
  const config = readClaudeConfig();
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  config.mcpServers[name] = { command, args, env };
  return config;
}

export function removeMcpServer(name: string): ClaudeConfig {
  const config = readClaudeConfig();
  if (config.mcpServers && config.mcpServers[name]) {
    delete config.mcpServers[name];
    if (Object.keys(config.mcpServers).length === 0) {
      delete config.mcpServers;
    }
  }
  return config;
}

export function hasMcpServer(name: string): boolean {
  const config = readClaudeConfig();
  return !!(config.mcpServers && config.mcpServers[name]);
}

// ============================================================
// CONSOLE COLORS
// ============================================================

export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export function success(text: string): string {
  return colorize(`✓ ${text}`, 'green');
}

export function error(text: string): string {
  return colorize(`✗ ${text}`, 'red');
}

export function warning(text: string): string {
  return colorize(`⚠ ${text}`, 'yellow');
}

export function info(text: string): string {
  return colorize(`ℹ ${text}`, 'cyan');
}

export function step(stepNum: number, total: number, text: string): string {
  const stepText = `[${stepNum}/${total}]`;
  return colorize(stepText, 'bright') + ` ${text}`;
}

// ============================================================
// PROJECT PATHS
// ============================================================

export function getProjectRoot(): string {
  // Assuming this script is run from nexus/scripts/
  return join(import.meta.dir, '..');
}

export function getHooksDistPath(): string {
  return join(getProjectRoot(), 'apps', 'hooks', 'dist');
}

export function getMcpServerDistPath(): string {
  return join(getProjectRoot(), 'apps', 'mcp-server', 'dist', 'index.js');
}

// ============================================================
// PREREQUISITE CHECKS
// ============================================================

export interface PrerequisiteCheck {
  name: string;
  passed: boolean;
  version?: string;
  required: string;
}

export async function checkNode(): Promise<PrerequisiteCheck> {
  try {
    const output = new TextDecoder().decode(
      await Bun.spawn(['node', '--version']).output()
    ).trim();
    const version = output.replace('v', '');
    const major = parseInt(version.split('.')[0]);
    return {
      name: 'Node.js',
      passed: major >= 22,
      version,
      required: '>= 22.0.0',
    };
  } catch {
    return {
      name: 'Node.js',
      passed: false,
      required: '>= 22.0.0',
    };
  }
}

export async function checkBun(): Promise<PrerequisiteCheck> {
  try {
    const output = new TextDecoder().decode(
      await Bun.spawn(['bun', '--version']).output()
    ).trim();
    return {
      name: 'Bun',
      passed: true,
      version: output,
      required: '>= 1.0.0',
    };
  } catch {
    return {
      name: 'Bun',
      passed: false,
      required: '>= 1.0.0',
    };
  }
}

export async function checkPrerequisites(): Promise<PrerequisiteCheck[]> {
  return Promise.all([checkNode(), checkBun()]);
}

// ============================================================
// EXECUTION HELPERS
// ============================================================

export async function runCommand(
  command: string[],
  options: { cwd?: string; silent?: boolean } = {}
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  try {
    const proc = Bun.spawn(command, {
      cwd: options.cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = new TextDecoder().decode(await proc.stdout);
    const stderr = new TextDecoder().decode(await proc.stderr);
    const exitCode = await proc.exited;

    if (!options.silent && stdout) {
      console.log(stdout);
    }

    return {
      success: exitCode === 0,
      stdout,
      stderr,
    };
  } catch (e) {
    return {
      success: false,
      stdout: '',
      stderr: String(e),
    };
  }
}
