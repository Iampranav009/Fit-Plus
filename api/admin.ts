/**
 * api/admin.ts — single-route wrapper for /api/admin/overview
 * Re-exports the handler directly; path routing is done in vercel.json.
 */
export { default } from './_handlers/admin/overview.js';
