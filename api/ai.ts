/**
 * api/ai.ts — single-route wrapper for /api/ai/generate-plan
 * Re-exports the handler directly; path routing is done in vercel.json.
 */
export { default } from './_handlers/ai/generate-plan.js';
