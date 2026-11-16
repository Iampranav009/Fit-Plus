/**
 * api/monitoring.ts — single-route wrapper for /api/monitoring/error
 * Re-exports the handler directly; path routing is done in vercel.json.
 */
export { default } from './_handlers/monitoring/error.js';
