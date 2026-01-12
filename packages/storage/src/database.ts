/**
 * Database - SQLite wrapper with migrations and CRUD helpers
 * Sprint 0: Foundation - Core storage layer
 */

import { Database as BunSqlite } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

// Migration files - resolve from package root (works in both src/ and dist/)
const MIGRATIONS_DIR = join(import.meta.dir, '..', 'src', 'migrations');

/**
 * Database options
 */
export interface DatabaseOptions {
  path?: string;              // ':memory:' for testing, or file path
  readonly?: boolean;         // Open in read-only mode
  verbose?: boolean;          // Enable query logging
}

/**
 * Query result helper types
 */
export type SqlValue = string | number | boolean | Buffer | null;
export type SqlRow = Record<string, SqlValue>;
export type SqlParams = Record<string, SqlValue> | SqlValue[];

/**
 * Database class with migration support and CRUD helpers
 */
export class Database {
  private db: BunSqlite;
  private verbose: boolean;

  constructor(options: DatabaseOptions = {}) {
    const {
      path = ':memory:',
      verbose = false
    } = options;

    this.verbose = verbose;
    // bun:sqlite constructor only takes path string
    this.db = new BunSqlite(path);

    // Enable WAL mode for better concurrency
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  /**
   * Initialize database and run pending migrations
   */
  init(): void {
    this.ensureMigrationsTable();
    this.runMigrations();
  }

  /**
   * Ensure migrations tracking table exists
   */
  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);
  }

  /**
   * Get list of applied migrations
   */
  private getAppliedMigrations(): Set<string> {
    const rows = this.db.query('SELECT name FROM _migrations').all() as { name: string }[];
    return new Set(rows.map(r => r.name));
  }

  /**
   * Run all pending migrations
   */
  private runMigrations(): void {
    const applied = this.getAppliedMigrations();

    // For now, hardcode the migration files
    // In production, scan the migrations directory
    const migrations = ['001_unified_schema.sql', '002_memory_system.sql', '003_projects.sql', '004_automation.sql', '005_settings.sql', '006_compression.sql', '007_session_history.sql', '008_synthesis_settings.sql', '009_system_logs.sql', '010_hooks_to_system_logs.sql'];

    for (const migration of migrations) {
      if (applied.has(migration)) {
        if (this.verbose) console.log(`[DB] Migration ${migration} already applied`);
        continue;
      }

      this.log(`[DB] Applying migration: ${migration}`);
      const sql = readFileSync(join(MIGRATIONS_DIR, migration), 'utf-8');
      this.db.exec(sql);

      // Record migration
      this.db.run(
        'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
        [migration, Date.now()]
      );

      this.log(`[DB] Migration ${migration} applied`);
    }
  }

  /**
   * Execute a SELECT query and return all rows
   */
  query<T extends SqlRow = SqlRow>(sql: string, ...params: SqlValue[]): T[] {
    this.logQuery(sql, params);
    const stmt = this.db.query(sql);
    const result = stmt.all(...params) as T[];
    return result;
  }

  /**
   * Execute a SELECT query and return first row
   */
  queryOne<T extends SqlRow = SqlRow>(sql: string, ...params: SqlValue[]): T | undefined {
    this.logQuery(sql, params);
    const stmt = this.db.query(sql);
    const result = stmt.get(...params) as T | undefined;
    return result;
  }

  /**
   * Execute an INSERT query and return last insert id
   */
  insert(sql: string, params?: SqlParams): number {
    this.logQuery(sql, params);
    const stmt = this.db.query(sql);
    const result = stmt.run(...this.paramsToArray(params));
    return result.lastInsertRowid as number;
  }

  /**
   * Execute an UPDATE query and return number of changes
   */
  update(sql: string, params?: SqlParams): number {
    this.logQuery(sql, params);
    const stmt = this.db.query(sql);
    const result = stmt.run(...this.paramsToArray(params));
    return result.changes;
  }

  /**
   * Execute a DELETE query and return number of changes
   */
  delete(sql: string, params?: SqlParams): number {
    this.logQuery(sql, params);
    const stmt = this.db.query(sql);
    const result = stmt.run(...this.paramsToArray(params));
    return result.changes;
  }

  /**
   * Execute any query (INSERT/UPDATE/DELETE) and return changes + lastInsertRowid
   * Generic method for routes that need both insert ID and change count
   */
  run(sql: string, ...params: SqlValue[]): { changes: number; lastInsertRowid: number | bigint } {
    this.logQuery(sql, params);
    const stmt = this.db.query(sql);
    const result = stmt.run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  /**
   * Prepare a statement for repeated execution
   * Returns an object with run method that accepts parameters
   */
  prepare(sql: string): { run: (...params: SqlValue[]) => { changes: number; lastInsertRowid: number | bigint } } {
    this.logQuery(sql);
    const stmt = this.db.query(sql);
    return {
      run: (...params: SqlValue[]) => {
        const result = stmt.run(...params);
        return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
      }
    };
  }

  /**
   * Execute arbitrary SQL (for schema changes, etc.)
   */
  exec(sql: string): void {
    this.logQuery(sql);
    this.db.exec(sql);
  }

  /**
   * Begin a transaction
   */
  begin(): void {
    this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  commit(): void {
    this.db.exec('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  rollback(): void {
    this.db.exec('ROLLBACK');
  }

  /**
   * Execute a function within a transaction
   * Using arrow function approach to preserve 'this'
   */
  transaction = <T,>(fn: () => T): T => {
    this.begin();
    try {
      const result = fn();
      this.commit();
      return result;
    } catch (e) {
      this.rollback();
      throw e;
    }
  };

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get underlying bun:sqlite instance (for advanced usage)
   */
  get raw(): BunSqlite {
    return this.db;
  }

  /**
   * Convert params object to array for prepared statements
   */
  private paramsToArray(params?: SqlParams): any[] {
    if (!params) return [];
    if (Array.isArray(params)) return params;
    return Object.values(params);
  }

  /**
   * Log query if verbose mode is enabled
   */
  private logQuery(sql: string, params?: SqlParams): void {
    if (!this.verbose) return;
    const paramsStr = params ? JSON.stringify(params) : '';
    console.log(`[DB] Query: ${sql.substring(0, 100)}... ${paramsStr}`);
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(msg: string): void {
    if (!this.verbose) return;
    console.log(msg);
  }
}

/**
 * Create and initialize a database instance
 */
export function createDatabase(options?: DatabaseOptions): Database {
  const db = new Database(options);
  db.init();
  return db;
}

/**
 * Default database singleton (lazy initialized)
 */
let defaultDb: Database | null = null;

/**
 * Get or create default database instance
 */
export function getDatabase(options?: DatabaseOptions): Database {
  if (!defaultDb) {
    defaultDb = createDatabase(options);
  }
  return defaultDb;
}

/**
 * Close default database instance
 */
export function closeDatabase(): void {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
  }
}
