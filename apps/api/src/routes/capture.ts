/**
 * Capture Routes - Nexus API
 * Simplified: No capture, distillation, or auto-processing
 */

import { Hono } from 'hono';

export function createCaptureRoutes(_getDb: any) {
  const app = new Hono();

  // All capture endpoints disabled
  app.get('/*', async (c) => {
    return c.json({
      error: 'Capture endpoints disabled',
      message: 'Auto-capture and distillation have been removed'
    }, 410);
  });

  app.post('/*', async (c) => {
    return c.json({
      error: 'Capture endpoints disabled',
      message: 'Auto-capture and distillation have been removed'
    }, 410);
  });

  return app;
}
