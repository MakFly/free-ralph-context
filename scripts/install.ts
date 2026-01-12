#!/usr/bin/env bun
/**
 * Nexus Installation Script
 *
 * Automated installation for Nexus memory system:
 * - Checks prerequisites (Node.js, Bun)
 * - Builds hooks
 * - Configures hooks in ~/.claude/settings.json
 * - Configures MCP server in ~/.claude.json
 *
 * Usage: bun run install:nexus
 */

import { execSync } from 'child_process';
import {
  checkPrerequisites,
  runCommand,
  getHooksDistPath,
  getMcpServerDistPath,
  getProjectRoot,
  readClaudeSettings,
  writeClaudeSettings,
  readClaudeConfig,
  writeClaudeConfig,
  addHook,
  addMcpServer,
  hasHook,
  hasMcpServer,
  success,
  error,
  warning,
  info,
  step,
  colors,
} from './install-helpers.js';

const TOTAL_STEPS = 5;

// ============================================================
// INSTALLATION STEPS
// ============================================================

async function step1_checkPrerequisites(): Promise<boolean> {
  console.log(step(1, TOTAL_STEPS, 'Checking prerequisites...'));

  const checks = await checkPrerequisites();
  let allPassed = true;

  for (const check of checks) {
    if (check.passed) {
      console.log(`  ${success(`${check.name} ${check.version || ''} (${check.required})`)}`);
    } else {
      console.log(`  ${error(`${check.name} not found or version too old (required: ${check.required})`)}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.log();
    console.log(error('Some prerequisites are missing. Please install them and try again.'));
    return false;
  }

  console.log();
  return true;
}

async function step2_buildHooks(): Promise<boolean> {
  console.log(step(2, TOTAL_STEPS, 'Building hooks...'));

  const hooksPath = getProjectRoot() + '/apps/hooks';
  const result = await runCommand(['bun', 'run', 'build'], { cwd: hooksPath });

  if (!result.success) {
    console.log(`  ${error('Failed to build hooks')}`);
    console.log(`  ${warning('Make sure you ran "bun install" from the project root first')}`);
    return false;
  }

  console.log(`  ${success('Hooks built successfully')}`);
  console.log();
  return true;
}

async function step3_installHooks(): Promise<boolean> {
  console.log(step(3, TOTAL_STEPS, 'Installing hooks...'));

  const hooksDist = getHooksDistPath();
  const hooks = [
    { name: 'SessionStart', command: `bun run ${hooksDist}/session-start.js`, timeout: 5000 },
    { name: 'PreToolUse', command: `bun run ${hooksDist}/pre-tool-use.js`, timeout: 2000 },
    { name: 'PostToolUse', command: `bun run ${hooksDist}/post-tool-use.js`, timeout: 5000 },
    { name: 'Stop', command: `bun run ${hooksDist}/stop.js`, timeout: 5000 },
    { name: 'SessionEnd', command: `bun run ${hooksDist}/session-end.js`, timeout: 10000 },
  ];

  const settings = readClaudeSettings();
  if (!settings.hooks) {
    settings.hooks = {};
  }

  for (const hook of hooks) {
    const config = {
      matcher: '',
      hooks: [{ type: 'command', command: hook.command, timeout: hook.timeout }],
    };
    settings.hooks[hook.name] = [config];
    console.log(`  + ${hook.name}`);
  }

  writeClaudeSettings(settings);
  console.log(`  ${success('Hooks installed in ~/.claude/settings.json')}`);
  console.log();
  return true;
}

async function step4_installMCP(): Promise<boolean> {
  console.log(step(4, TOTAL_STEPS, 'Installing MCP server...'));

  const mcpPath = getMcpServerDistPath();
  const apiPath = getProjectRoot() + '/apps/api';
  const apiUrl = 'http://localhost:3001';

  const config = readClaudeConfig();
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers['nexus'] = {
    command: 'node',
    args: [mcpPath],
    env: {
      NEXUS_API_URL: apiUrl,
    },
  };

  writeClaudeConfig(config);
  console.log(`  + nexus MCP server`);
  console.log(`    ${colors.dim}command: node ${mcpPath}`);
  console.log(`    ${colors.dim}env: NEXUS_API_URL=${apiUrl}`);
  console.log(`  ${success('MCP server installed in ~/.claude.json')}`);
  console.log();
  return true;
}

async function step5_verifyInstallation(): Promise<boolean> {
  console.log(step(5, TOTAL_STEPS, 'Verifying installation...'));

  let allGood = true;

  // Check hooks
  const hookNames = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd'];
  for (const name of hookNames) {
    if (hasHook(name)) {
      console.log(`  ${success(`${name} hook installed`)}`);
    } else {
      console.log(`  ${error(`${name} hook NOT installed`)}`);
      allGood = false;
    }
  }

  // Check MCP
  if (hasMcpServer('nexus')) {
    console.log(`  ${success('nexus MCP server configured')}`);
  } else {
    console.log(`  ${error('nexus MCP server NOT configured')}`);
    allGood = false;
  }

  console.log();
  return allGood;
}

function printSummary(allPassed: boolean): void {
  console.log(colors.bright);
  console.log('═════════════════════════════════════════════════════════════');
  console.log('                    INSTALLATION SUMMARY');
  console.log('═════════════════════════════════════════════════════════════');
  console.log(colors.reset);

  if (allPassed) {
    console.log(success('Nexus has been installed successfully!'));
    console.log();
    console.log(colors.bright + 'What was installed:' + colors.reset);
    console.log('  • Claude Code hooks (session tracking, tool use capture)');
    console.log('  • MCP server (code search + memory access)');
    console.log();
    console.log(colors.bright + 'Next steps:' + colors.reset);
    console.log('  1. Start the API server: cd apps/api && bun run src/index.ts');
    console.log('  2. Restart Claude Code to activate the hooks');
    console.log('  3. Check MCP: cat ~/.claude.json | grep -A 5 nexus');
    console.log();
    console.log(colors.bright + 'Useful commands:' + colors.reset);
    console.log('  bun run uninstall:nexus  # Uninstall Nexus');
  } else {
    console.log(error('Installation completed with some errors'));
    console.log();
    console.log(warning('Please check the errors above and try again'));
    console.log(info('For troubleshooting, see: https://github.com/yourusername/nexus/blob/main/INSTALL.md'));
  }

  console.log();
  console.log(colors.dim + 'Thank you for using Nexus!' + colors.reset);
  console.log();
}

// ============================================================
// MAIN INSTALLATION FLOW
// ============================================================

async function main(): Promise<void> {
  console.log();
  console.log(colors.bright + colors.cyan);
  console.log('███╗   ███╗██╗  ██╗██╗██████╗ ███████╗');
  console.log('████╗ ████║██║  ██║██║██╔══██╗██╔════╝');
  console.log('██╔████╔██║███████║██║██║  ██║█████╗  ');
  console.log('██║╚██╔╝██║██╔══██║██║██║  ██║██╔══╝  ');
  console.log('██║ ╚═╝ ██║██║  ██║██║██████╔╝███████╗');
  console.log('╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═════╝ ╚══════╝');
  console.log(colors.reset);
  console.log(colors.dim + 'Memory-Powered Development System' + colors.reset);
  console.log();

  const steps = [
    step1_checkPrerequisites,
    step2_buildHooks,
    step3_installHooks,
    step4_installMCP,
    step5_verifyInstallation,
  ];

  let allPassed = true;
  for (const step of steps) {
    const passed = await step();
    if (!passed) {
      allPassed = false;
      break;
    }
  }

  printSummary(allPassed);
}

// Run installation
main().catch((err) => {
  console.error(error('Installation failed with error:'), err);
  process.exit(1);
});
