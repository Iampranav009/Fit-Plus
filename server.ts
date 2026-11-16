import 'dotenv/config';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'node:path';
import fs from 'node:fs';

// ── Consolidated function handlers (matches Vercel deployment layout) ─────────
import healthHandler from './api/health.js';
import paymentsHandler from './api/payments.js';
import accountHandler from './api/account.js';
import studioHandler from './api/studio.js';
import authHandler from './api/auth.js';
import adminHandler from './api/admin.js';
import aiHandler from './api/ai.js';
import monitoringHandler from './api/monitoring.js';

import { SECURITY_HEADERS } from './api/_lib/security.js';

const PORT = Number(process.env.PORT) || 3000;

function adaptVercelHandler(
  handler: (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>,
): express.RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    } catch (error) {
      next(error);
    }
  };
}

async function startServer() {
  const app = express();

  // Standard security headers middleware
  app.use((_req, res, next) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(key, value);
    }
    next();
  });

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  // ── API Routes (mirror vercel.json rewrites exactly) ──────────────────────
  app.all('/api/health', adaptVercelHandler(healthHandler));

  // Payments: all 4 sub-routes → consolidated payments handler
  app.all('/api/payments/*', adaptVercelHandler(paymentsHandler));
  app.all('/api/payments',   adaptVercelHandler(paymentsHandler));

  // Account: delete + export → consolidated account handler
  app.all('/api/account/*', adaptVercelHandler(accountHandler));

  // Studio: invites, relationships, streaks → consolidated studio handler
  app.all('/api/invites/*',       adaptVercelHandler(studioHandler));
  app.all('/api/relationships/*', adaptVercelHandler(studioHandler));
  app.all('/api/streaks/*',       adaptVercelHandler(studioHandler));

  // Auth, Admin, AI, Monitoring
  app.all('/api/auth/*',       adaptVercelHandler(authHandler));
  app.all('/api/admin/*',      adaptVercelHandler(adminHandler));
  app.all('/api/ai/*',         adaptVercelHandler(aiHandler));
  app.all('/api/monitoring/*', adaptVercelHandler(monitoringHandler));

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'API endpoint not found' });
  });

  // Sanitized global error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { maxAge: '1y', index: false }));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ ok: false, error: 'API endpoint not found' });
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }
      return res.status(404).send('Build output not found. Run npm run build.');
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FitPlus server listening on http://localhost:${PORT}`);
  });
}

void startServer();
