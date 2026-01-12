#!/usr/bin/env bun
/**
 * Nexus CLI - Command-line interface for Nexus
 *
 * Usage:
 *   nexus sync                  - Index current project
 *   nexus watch [path]          - Start watching directory
 *   nexus watch --pause         - Pause watcher
 *   nexus watch --resume        - Resume watcher
 *   nexus watch --status        - Get watcher status
 *   nexus watch --stop          - Stop watcher
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

const API_BASE = process.env.NEXUS_API_URL || 'http://localhost:3001';

// Chemin vers la config Claude
const CLAUDE_CONFIG_PATH = join(homedir(), '.claude-glm', '.claude.json');

// Chemin vers l'indexeur Python (déduit du projet Nexus)
let NEXUS_ROOT = process.env.NEXUS_ROOT || join(homedir(), 'Documents', 'lab', 'brainstorming', 'nexus');
const INDEXER_PATH = join(NEXUS_ROOT, 'packages', 'indexer-py', 'main.py');
const DEFAULT_DB_PATH = join(NEXUS_ROOT, 'apps', 'api', 'nexus.db');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(message: string, color = 'reset') {
  console.log(`${colors[color as keyof typeof colors]}${message}${colors.reset}`);
}

/**
 * Trouve le chemin de la DB Nexus depuis la config Claude
 */
function findDbPath(): string {
  try {
    if (existsSync(CLAUDE_CONFIG_PATH)) {
      const config = JSON.parse(readFileSync(CLAUDE_CONFIG_PATH, 'utf-8'));

      // Chercher le serveur MCP 'nexus'
      const nexusServer = config.mcpServers?.nexus;
      if (nexusServer?.args) {
        // L'indexeur est dans args, trouver le DB
        const dbPath = nexusServer.args.find((arg: string) => arg.includes('nexus.db'));
        if (dbPath) {
          return dbPath;
        }
      }

      // Sinon, utiliser le chemin par défaut
      return DEFAULT_DB_PATH;
    }
  } catch (e) {
    // Ignore les erreurs de lecture
  }
  return DEFAULT_DB_PATH;
}

/**
 * Commande sync: indexe le projet courant
 */
async function cmdSync(args: string[]) {
  const projectPath = process.cwd();
  const dbPath = findDbPath();

  // Vérifier que l'indexeur existe
  if (!existsSync(INDEXER_PATH)) {
    log(`Error: Indexer not found at ${INDEXER_PATH}`, 'red');
    log(`Set NEXUS_ROOT environment variable to point to Nexus project`, 'yellow');
    process.exit(1);
  }

  // Parser les options
  const maxFiles = args.includes('--max-files')
    ? parseInt(args[args.indexOf('--max-files') + 1] || '10000')
    : 10000;

  const maxSize = args.includes('--max-size')
    ? parseInt(args[args.indexOf('--max-size') + 1] || '1048576')
    : 1048576;

  const projectName = args.includes('--name')
    ? args[args.indexOf('--name') + 1]
    : undefined;

  log(`🔍 Indexing project: ${projectPath}`, 'blue');
  log(`📁 Database: ${dbPath}`, 'dim');
  log(`⚙️  Max files: ${maxFiles}, Max size: ${maxSize} bytes`, 'dim');
  log('', 'reset');

  const startTime = Date.now();

  try {
    // Lancer l'indexeur Python
    const indexerArgs = [
      INDEXER_PATH,
      'index',
      projectPath,
      '--db', dbPath,
      '--max-files', maxFiles.toString(),
      '--max-size', maxSize.toString(),
    ];

    if (projectName) {
      indexerArgs.push('--project-name', projectName);
    }

    const child = spawn('python3', indexerArgs, {
      stdio: ['ignore', 'pipe', 'pipe']  // stdin=ignore, stdout=pipe, stderr=pipe
    });

    let output = '';

    // Capturer stdout (JSON)
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
    });

    // Afficher stderr en temps réel (progress bar)
    child.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);  // Afficher directement
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (code !== 0) {
        log(`\n❌ Indexer failed with code ${code}`, 'red');
        process.exit(1);
      }

      // Parser le résultat JSON
      try {
        const result = JSON.parse(output);

        if (result.error) {
          log(`❌ Error: ${result.error}`, 'red');
          process.exit(1);
        }

        log(`✅ Indexing complete!`, 'green');
        log(`📊 Stats:`, 'blue');
        log(`   Files scanned: ${result.files_scanned}`, 'dim');
        log(`   Files indexed: ${result.files_indexed}`, 'dim');
        log(`   Files skipped: ${result.files_skipped}`, 'dim');
        log(`   Chunks created: ${result.chunks_created}`, 'dim');
        log(`   Duration: ${result.duration_ms}ms`, 'dim');

        if (result.project) {
          log(`\n📦 Project:`, 'blue');
          log(`   ID: ${result.project.id}`, 'dim');
          log(`   Name: ${result.project.name}`, 'dim');
          log(`   Path: ${result.project.root_path}`, 'dim');
        }

        if (result.stopped_early) {
          log(`\n⚠️  Stopped early: reached max files limit`, 'yellow');
        }

        if (result.errors?.length > 0) {
          log(`\n⚠️  Errors: ${result.errors.length} files failed`, 'yellow');
          result.errors.slice(0, 5).forEach((err: any) => {
            log(`   ${err.path}: ${err.error}`, 'dim');
          });
          if (result.errors.length > 5) {
            log(`   ... and ${result.errors.length - 5} more`, 'dim');
          }
        }

        log(`\n⏱️  Total time: ${duration}s`, 'green');
      } catch (e) {
        log(`⚠️  Could not parse indexer output`, 'yellow');
        console.log(output);
      }

      process.exit(code || 0);
    });

  } catch (e) {
    log(`❌ Failed to run indexer: ${e}`, 'red');
    process.exit(1);
  }
}

async function apiRequest(endpoint: string, method = 'GET', body?: any) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (e) {
    throw new Error(`API request failed: ${e}`);
  }
}

async function cmdWatch(args: string[]) {
  const path = args[0] || process.cwd();

  // Check for flags
  if (args.includes('--status')) {
    try {
      const status = await apiRequest('/watcher/status', 'GET');

      if (status.status === 'stopped') {
        log('Watcher not running', 'yellow');
        return;
      }

      log(`Watcher Status:`, 'blue');
      log(`  Status: ${status.status}`, 'green');
      log(`  Queued files: ${status.queuedFiles}`, 'dim');
      log(`  Watched paths: ${status.watchedPaths}`, 'dim');
      log(`  Uptime: ${status.uptime}s`, 'dim');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (args.includes('--pause')) {
    try {
      const result = await apiRequest('/watcher/pause', 'POST');
      log(result.message, 'green');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (args.includes('--resume')) {
    try {
      const result = await apiRequest('/watcher/resume', 'POST');
      log(result.message, 'green');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (args.includes('--stop')) {
    try {
      const result = await apiRequest('/watcher/stop', 'POST');
      log(result.message, 'green');
    } catch (e) {
      log(`Error: ${e}`, 'red');
      process.exit(1);
    }
    return;
  }

  // Default: start watching
  try {
    log(`Starting watcher for: ${path}`, 'blue');
    const result = await apiRequest('/watcher/start', 'POST', {
      path,
      debounceMs: 500,
      batchSize: 10,
    });

    log(result.message, 'green');
    log(`Debounce: ${result.debounceMs}ms`, 'dim');
    log(`Batch size: ${result.batchSize}`, 'dim');
    log('\nPress Ctrl+C to stop...', 'dim');

    // Keep process alive
    process.on('SIGINT', async () => {
      log('\nStopping watcher...', 'yellow');
      await apiRequest('/watcher/stop', 'POST');
      log('Watcher stopped', 'green');
      process.exit(0);
    });

    // Prevent exit
    await new Promise(() => {});
  } catch (e) {
    log(`Error: ${e}`, 'red');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  switch (command) {
    case 'sync':
      await cmdSync(args.slice(1));
      break;
    case 'watch':
      await cmdWatch(args.slice(1));
      break;
    default:
      log(`Unknown command: ${command}`, 'red');
      showHelp();
      process.exit(1);
  }
}

function showHelp() {
  log('Nexus CLI - Command-line interface for Nexus\n', 'blue');
  log('Usage:', 'green');
  log('  nexus sync                  Index current project', 'dim');
  log('  nexus sync [--max-files N] [--max-size N] [--name NAME]', 'dim');
  log('  nexus watch [path]          Start watching directory', 'dim');
  log('  nexus watch --status        Get watcher status', 'dim');
  log('  nexus watch --pause         Pause watcher', 'dim');
  log('  nexus watch --resume        Resume watcher', 'dim');
  log('  nexus watch --stop          Stop watcher', 'dim');
  log('\nEnvironment:', 'green');
  log('  NEXUS_API_URL               API URL (default: http://localhost:3001)', 'dim');
  log('  NEXUS_ROOT                  Nexus project root (auto-detected)', 'dim');
}

main();
