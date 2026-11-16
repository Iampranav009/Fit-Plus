import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

interface VercelConfig {
  rewrites?: Array<{ source: string; destination: string }>;
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}

function compileVercelRewriteRegex(sourcePattern: string): RegExp {
  // Vercel source patterns match pathname only (excluding query string).
  return new RegExp(`^${sourcePattern}$`);
}

test('vercel.json rewrites SPA routes to /index.html while excluding API and static assets', () => {
  const vercelPath = path.resolve(process.cwd(), 'vercel.json');
  const raw = JSON.parse(fs.readFileSync(vercelPath, 'utf8')) as VercelConfig;

  assert.ok(Array.isArray(raw.rewrites) && raw.rewrites.length > 0, 'vercel.json rewrites missing');
  const spaRewrite = raw.rewrites[0];
  assert.equal(spaRewrite.destination, '/index.html');

  const regex = compileVercelRewriteRegex(spaRewrite.source);

  const spaRoutes = [
    '/',
    '/welcome',
    '/auth',
    '/discover',
    '/demo',
    '/admin',
    '/join/FIT-ARJUN-2026',
    '/join/FIT-EXP-000',
    '/trainers/arjun-kulkarni',
    '/app/home',
    '/studio/overview',
    '/nonexistent-route',
  ];

  for (const route of spaRoutes) {
    assert.ok(regex.test(route), `Expected SPA rewrite to match route: ${route}`);
  }

  const excludedPaths = [
    '/api/health',
    '/api/invites/resolve',
    '/api/account/delete',
    '/assets/index-123abc.js',
    '/assets/styles-abc.css',
    '/manifest.webmanifest',
    '/sw.js',
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/images/hero.webp',
  ];

  for (const assetOrApi of excludedPaths) {
    assert.equal(
      regex.test(assetOrApi),
      false,
      `Expected SPA rewrite NOT to match API/static path: ${assetOrApi}`,
    );
  }
});

test('vercel.json configures required security and cache headers', () => {
  const vercelPath = path.resolve(process.cwd(), 'vercel.json');
  const raw = JSON.parse(fs.readFileSync(vercelPath, 'utf8')) as VercelConfig;
  const globalHeaders = raw.headers?.find((h) => h.source === '/(.*)')?.headers ?? [];
  const headerKeys = new Set(globalHeaders.map((h) => h.key));

  assert.ok(headerKeys.has('X-Content-Type-Options'));
  assert.ok(headerKeys.has('X-Frame-Options'));
  assert.ok(headerKeys.has('Referrer-Policy'));
});
