import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const ClientErrorSchema = z.object({
  message: z.string().min(1).max(300),
  route: z.string().max(160).optional(),
  name: z.string().max(80).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const parsed = ClientErrorSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid error report payload' });
  }

  const sanitized = {
    source: 'fitplus-web',
    name: parsed.data.name || 'RenderError',
    route: parsed.data.route || '/',
    message: parsed.data.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]'),
    timestamp: new Date().toISOString(),
  };

  console.error('[FitPlus Monitoring]', JSON.stringify(sanitized));
  return res.status(200).json({ ok: true });
}
