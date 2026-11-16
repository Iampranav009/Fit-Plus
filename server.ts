import 'dotenv/config';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'node:path';
import fs from 'node:fs';
import healthHandler from './api/health.js';
import deleteAccountHandler from './api/account/delete.js';
import resolveInviteHandler from './api/invites/resolve.js';
import generatePlanHandler from './api/ai/generate-plan.js';
import recalculateStreakHandler from './api/streaks/recalculate.js';
import respondRelationshipHandler from './api/relationships/respond.js';
import createPaymentOrderHandler from './api/payments/create-order.js';
import verifyPaymentHandler from './api/payments/verify.js';
import cashfreeWebhookHandler from './api/payments/webhook.js';
import refundPaymentHandler from './api/payments/refund.js';
import adminOverviewHandler from './api/admin/overview.js';
import monitoringErrorHandler from './api/monitoring/error.js';

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
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  app.all('/api/health', adaptVercelHandler(healthHandler));
  app.all('/api/account/delete', adaptVercelHandler(deleteAccountHandler));
  app.all('/api/invites/resolve', adaptVercelHandler(resolveInviteHandler));
  app.all('/api/ai/generate-plan', adaptVercelHandler(generatePlanHandler));
  app.all('/api/streaks/recalculate', adaptVercelHandler(recalculateStreakHandler));
  app.all('/api/relationships/respond', adaptVercelHandler(respondRelationshipHandler));
  app.all('/api/payments/create-order', adaptVercelHandler(createPaymentOrderHandler));
  app.all('/api/payments/verify', adaptVercelHandler(verifyPaymentHandler));
  app.all('/api/payments/webhook', adaptVercelHandler(cashfreeWebhookHandler));
  app.all('/api/payments/refund', adaptVercelHandler(refundPaymentHandler));
  app.all('/api/admin/overview', adaptVercelHandler(adminOverviewHandler));
  app.all('/api/monitoring/error', adaptVercelHandler(monitoringErrorHandler));

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'API endpoint not found' });
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
