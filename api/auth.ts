/**
 * api/auth.ts — single-route wrapper for /api/auth/provision-claims
 * Re-exports the handler directly; path routing is done in vercel.json.
 */
export { default } from './_handlers/auth/provision-claims.js';
