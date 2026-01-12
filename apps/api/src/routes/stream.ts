/**
 * Stream Routes - Server-Sent Events for real-time updates
 * Allows Web UI to receive observations in real-time
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

type Database = {
  query: <T>(sql: string, ...params: unknown[]) => T[];
  queryOne: <T>(sql: string, ...params: unknown[]) => T | null;
  run: (sql: string, ...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
};

interface Observation {
  id: number;
  type: string;
  title: string;
  summary?: string;
  project: string;
  created_at: number;
}

export function createStreamRoutes(getDb: () => Promise<Database>) {
  const app = new Hono();

  // Track last seen observation ID per connection
  let lastSeenId = 0;

  // GET /stream - Server-Sent Events for real-time observations
  app.get('/', async (c) => {
    // Initialize lastSeenId from query param or get latest from DB
    const sinceParam = c.req.query('since');
    if (sinceParam) {
      lastSeenId = parseInt(sinceParam);
    } else {
      try {
        const db = await getDb();
        const latest = db.queryOne<{ id: number }>('SELECT MAX(id) as id FROM observations');
        lastSeenId = latest?.id || 0;
      } catch {
        lastSeenId = 0;
      }
    }

    return streamSSE(c, async (stream) => {
      // Send initial connection message
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({ status: 'connected', lastSeenId }),
      });

      // Poll for new observations every 2 seconds
      const pollInterval = 2000;
      let isActive = true;

      // Handle client disconnect
      c.req.raw.signal.addEventListener('abort', () => {
        isActive = false;
      });

      while (isActive) {
        try {
          const db = await getDb();

          // Get new observations since lastSeenId
          const newObservations = db.query<Observation>(
            `SELECT id, type, title, summary, project, created_at
             FROM observations
             WHERE id > ?
             ORDER BY id ASC
             LIMIT 20`,
            lastSeenId
          );

          if (newObservations.length > 0) {
            // Send each observation as a separate event
            for (const obs of newObservations) {
              await stream.writeSSE({
                event: 'observation',
                data: JSON.stringify(obs),
                id: String(obs.id),
              });
              lastSeenId = obs.id;
            }
          }

          // Send heartbeat to keep connection alive
          await stream.writeSSE({
            event: 'heartbeat',
            data: JSON.stringify({ timestamp: Date.now(), lastSeenId }),
          });

          // Wait before next poll
          await stream.sleep(pollInterval);
        } catch (error) {
          // Send error event but keep connection alive
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({ message: String(error) }),
          });

          // Wait a bit longer after error
          await stream.sleep(pollInterval * 2);
        }
      }
    });
  });

  // GET /stream/test - Test endpoint to create a test observation
  app.post('/test', async (c) => {
    const db = await getDb();
    const { message } = await c.req.json().catch(() => ({ message: 'Test observation' }));

    const result = db.run(
      `INSERT INTO observations (session_id, project, type, scope, title, summary, confidence, discovery_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `test-${Date.now()}`,
      'nexus',
      'note',
      'repo',
      message || 'Test observation from SSE endpoint',
      message || 'Test',
      0.5,
      10,
      Date.now()
    );

    return c.json({ ok: true, id: result.lastInsertRowid });
  });

  return app;
}

export default createStreamRoutes;
