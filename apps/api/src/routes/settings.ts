/**
 * Settings Routes - Configuration management with API key encryption
 * Sprint 7: Settings System - Full CRUD + API key testing
 */

import { Hono } from 'hono';
import {
  encryptApiKey,
  decryptApiKey,
  maskEncryptedApiKey,
  isEncrypted,
  type CompressionProvider
} from '@nexus/core';

// Anthropic SDK for API key testing - loaded dynamically

type Database = {
  exec: (sql: string, ...params: unknown[]) => void;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
};

export function createSettingsRoutes(getDb: () => Promise<Database>) {
  const app = new Hono();

  // ==================== GET ALL SETTINGS ====================
  app.get('/', async (c) => {
    const db = await getDb();

    const settings = db.query<{
      key: string;
      value: string;
      encrypted: number;
      category: string;
      updated_at: string;
    }>(`
      SELECT key, value, encrypted, category, updated_at
      FROM settings
      ORDER BY category, key
    `);

    // Mask sensitive values
    const masked = settings.map(s => {
      let displayValue = s.value;
      if (s.encrypted === 1) {
        displayValue = maskEncryptedApiKey(s.value);
      }
      return {
        key: s.key,
        value: displayValue,
        encrypted: s.encrypted === 1,
        category: s.category,
        updated_at: s.updated_at
      };
    });

    return c.json({ settings: masked });
  });

  // ==================== SPECIFIC ROUTES (must be before /:key) ====================

  // ==================== GET COMPRESSION SETTINGS ====================
  app.get('/compression/config', async (c) => {
    const db = await getDb();

    const settings = db.query<{ key: string; value: string }>(`
      SELECT key, value FROM settings WHERE category = 'compression'
    `);

    const config = {
      mode: 'auto',
      provider: 'anthropic' as CompressionProvider,
      maxTokens: 30,
      llmModel: 'claude-3-5-haiku-20241022'
    };

    settings.forEach(s => {
      if (s.key === 'compression_mode') config.mode = s.value as any;
      if (s.key === 'compression_provider') config.provider = s.value as any;
      if (s.key === 'compression_max_tokens') config.maxTokens = parseInt(s.value);
      if (s.key === 'compression_llm_model') config.llmModel = s.value;
    });

    return c.json(config);
  });

  // ==================== GET SYNTHESIS SETTINGS ====================
  app.get('/synthesis', async (c) => {
    const db = await getDb();

    const settings = db.query<{ key: string; value: string; encrypted: number }>(`
      SELECT key, value, encrypted FROM settings WHERE category = 'synthesis'
    `);

    const config: any = {
      mode: 'auto',
      provider: 'anthropic',
      confidence: 0.7,
      model: undefined,
      configured: false,
      apiKeyMasked: undefined,
    };

    for (const setting of settings) {
      if (setting.key === 'synthesis_mode') {
        config.mode = setting.value;
      } else if (setting.key === 'synthesis_provider') {
        config.provider = setting.value;
      } else if (setting.key === 'synthesis_confidence') {
        config.confidence = parseFloat(setting.value);
      } else if (setting.key === 'synthesis_model') {
        config.model = setting.value;
      } else if (setting.key === 'synthesis_api_key') {
        config.apiKeyMasked = maskEncryptedApiKey(setting.value);
        config.configured = true;
      }
    }

    return c.json(config);
  });

  // ==================== POST SYNTHESIS SETTINGS ====================
  app.post('/synthesis', async (c) => {
    const db = await getDb();
    const { mode, provider, apiKey, model, confidence } = await c.req.json();

    try {
      // Save mode
      if (mode !== undefined) {
        db.run(`
          INSERT INTO settings (key, value, encrypted, category, updated_at)
          VALUES ('synthesis_mode', ?, 0, 'synthesis', datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `, mode);
      }

      // Save provider
      if (provider !== undefined) {
        db.run(`
          INSERT INTO settings (key, value, encrypted, category, updated_at)
          VALUES ('synthesis_provider', ?, 0, 'synthesis', datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `, provider);
      }

      // Save confidence
      if (confidence !== undefined) {
        db.run(`
          INSERT INTO settings (key, value, encrypted, category, updated_at)
          VALUES ('synthesis_confidence', ?, 0, 'synthesis', datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `, confidence.toString());
      }

      // Save model
      if (model !== undefined) {
        db.run(`
          INSERT INTO settings (key, value, encrypted, category, updated_at)
          VALUES ('synthesis_model', ?, 0, 'synthesis', datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `, model);
      }

      // Save API key (encrypted)
      if (apiKey !== undefined && apiKey !== '') {
        const encrypted = encryptApiKey(apiKey);
        db.run(`
          INSERT INTO settings (key, value, encrypted, category, updated_at)
          VALUES ('synthesis_api_key', ?, 1, 'synthesis', datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `, encrypted);
      }

      return c.json({ success: true });
    } catch (e) {
      console.error('[Settings] Save synthesis error:', e);
      return c.json({ error: 'Failed to save synthesis settings' }, 500);
    }
  });

  // ==================== GENERAL ROUTES ====================

  // ==================== GET SETTING BY KEY ====================
  app.get('/:key', async (c) => {
    const db = await getDb();
    const key = c.req.param('key');

    const setting = db.queryOne<{
      key: string;
      value: string;
      encrypted: number;
      category: string;
      updated_at: string;
    }>(`
      SELECT key, value, encrypted, category, updated_at
      FROM settings
      WHERE key = ?
    `, key);

    if (!setting) {
      return c.json({ error: 'Setting not found' }, 404);
    }

    // Return masked value by default
    let displayValue = setting.value;
    if (setting.encrypted === 1) {
      displayValue = maskEncryptedApiKey(setting.value);
    }

    return c.json({
      key: setting.key,
      value: displayValue,
      encrypted: setting.encrypted === 1,
      category: setting.category,
      updated_at: setting.updated_at
    });
  });

  // ==================== GET SETTING BY KEY (DECRYPTED) ====================
  app.get('/:key/decrypt', async (c) => {
    const db = await getDb();
    const key = c.req.param('key');

    const setting = db.queryOne<{
      value: string;
      encrypted: number;
    }>(`
      SELECT value, encrypted
      FROM settings
      WHERE key = ?
    `, key);

    if (!setting) {
      return c.json({ error: 'Setting not found' }, 404);
    }

    // Decrypt if needed
    let decryptedValue = setting.value;
    if (setting.encrypted === 1 && isEncrypted(setting.value)) {
      try {
        decryptedValue = decryptApiKey(setting.value);
      } catch (e) {
        return c.json({ error: 'Failed to decrypt value' }, 500);
      }
    }

    return c.json({ key, value: decryptedValue });
  });

  // ==================== UPSERT SETTING ====================
  app.post('/', async (c) => {
    const db = await getDb();
    const { key, value, category = 'general', encrypt = false } = await c.req.json();

    if (!key || value === undefined) {
      return c.json({ error: 'Missing required fields: key, value' }, 400);
    }

    try {
      // Encrypt if requested or if key contains sensitive keywords
      let finalValue = value;
      let shouldEncrypt = encrypt;

      if (!shouldEncrypt) {
        // Auto-detect sensitive keys
        const sensitiveKeys = ['api_key', 'apikey', 'anthropic', 'mistral', 'openai', 'token', 'password', 'secret'];
        shouldEncrypt = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
      }

      if (shouldEncrypt) {
        finalValue = encryptApiKey(value);
      }

      db.run(`
        INSERT INTO settings (key, value, encrypted, category, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          encrypted = excluded.encrypted,
          category = excluded.category,
          updated_at = datetime('now')
      `, key, finalValue, shouldEncrypt ? 1 : 0, category);

      return c.json({
        success: true,
        key,
        encrypted: shouldEncrypt,
        category
      });
    } catch (e) {
      console.error('[Settings] Upsert error:', e);
      return c.json({ error: 'Failed to save setting' }, 500);
    }
  });

  // ==================== DELETE SETTING ====================
  app.delete('/:key', async (c) => {
    const db = await getDb();
    const key = c.req.param('key');

    const result = db.run(`DELETE FROM settings WHERE key = ?`, key);

    if (result.changes === 0) {
      return c.json({ error: 'Setting not found' }, 404);
    }

    return c.json({ success: true, deleted: key });
  });

  // ==================== TEST API KEY ====================
  app.post('/test-api-key', async (c) => {
    const { provider, api_key } = await c.req.json();

    if (!provider || !api_key) {
      return c.json({ error: 'Missing required fields: provider, api_key' }, 400);
    }

    try {
      const isValid = await testApiKey(provider, api_key);
      return c.json({ valid: isValid, provider });
    } catch (e: any) {
      return c.json({
        valid: false,
        provider,
        error: e.message || 'Failed to test API key'
      }, 400);
    }
  });

  // ==================== DATABASE STATS ====================
  app.get('/stats', async (c) => {
    const db = await getDb();

    const stats = db.queryOne<{
      files: number;
      chunks: number;
      memories: number;
      candidates: number;
      projects: number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM files) as files,
        (SELECT COUNT(*) FROM chunks) as chunks,
        (SELECT COUNT(*) FROM observations) as memories,
        (SELECT COUNT(*) FROM candidates) as candidates,
        (SELECT COUNT(*) FROM projects) as projects
    `);

    return c.json({
      database: {
        files: stats?.files || 0,
        chunks: stats?.chunks || 0,
        memories: stats?.memories || 0,
        candidates: stats?.candidates || 0,
        projects: stats?.projects || 0,
      }
    });
  });

  // ==================== RESET DATABASE ====================
  app.post('/reset', async (c) => {
    const db = await getDb();

    const { confirm } = await c.req.json();

    if (confirm !== 'RESET_DATABASE_CONFIRM') {
      return c.json({ error: 'Confirmation required. Use "RESET_DATABASE_CONFIRM"' }, 400);
    }

    try {
      // Delete all data from tables (in specific order for foreign keys)
      db.exec('DELETE FROM chunks');  // Will cascade due to FK
      db.exec('DELETE FROM files');
      db.exec('DELETE FROM observations');
      db.exec('DELETE FROM candidates');
      db.exec('DELETE FROM projects');

      // Reset sequences
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('files', 'chunks', 'observations', 'candidates', 'projects')");

      return c.json({
        success: true,
        message: 'Database reset successfully. All data has been cleared.'
      });
    } catch (error) {
      console.error('[Settings] Reset error:', error);
      return c.json({ error: 'Failed to reset database' }, 500);
    }
  });

  // ==================== RESET INDEXATION ====================
  app.post('/reset-index', async (c) => {
    const db = await getDb();

    const { confirm } = await c.req.json();

    if (confirm !== 'RESET_INDEX_CONFIRM') {
      return c.json({ error: 'Confirmation required. Use "RESET_INDEX_CONFIRM"' }, 400);
    }

    try {
      // Get counts before deletion for feedback
      const stats = db.queryOne<{ files: number; chunks: number }>(`
        SELECT
          (SELECT COUNT(*) FROM files) as files,
          (SELECT COUNT(*) FROM chunks) as chunks
      `);

      // Delete only indexation data (files + chunks)
      db.exec('DELETE FROM chunks');
      db.exec('DELETE FROM files');

      // Reset sequences for files and chunks only
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('files', 'chunks')");

      return c.json({
        success: true,
        message: `Indexation reset. Deleted ${stats?.files || 0} files and ${stats?.chunks || 0} chunks.`,
        deleted: {
          files: stats?.files || 0,
          chunks: stats?.chunks || 0
        }
      });
    } catch (error) {
      console.error('[Settings] Reset index error:', error);
      return c.json({ error: 'Failed to reset indexation' }, 500);
    }
  });

  return app;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Test if an API key is valid for the given provider
 */
async function testApiKey(provider: string, apiKey: string): Promise<boolean> {
  switch (provider) {
    case 'anthropic':
      return await testAnthropicKey(apiKey);
    case 'mistral':
      return await testMistralKey(apiKey);
    case 'openai':
      return await testOpenAIKey(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Test Anthropic API key
 */
async function testAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    // Dynamic import for optional dependency
    // @ts-ignore - Optional dependency
    const AnthropicModule = await import('@anthropic-ai/sdk').catch(() => null);
    if (!AnthropicModule) {
      throw new Error('Anthropic SDK not installed');
    }

    const client = new AnthropicModule.default({ apiKey });
    await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    return true;
  } catch (e: any) {
    if (e.status === 401) {
      return false;
    }
    throw e;
  }
}

/**
 * Test Mistral API key
 */
async function testMistralKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Test OpenAI API key
 */
async function testOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}
