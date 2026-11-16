# FitPlus

**India-first personal fitness coaching platform** connecting independent trainers and clients with structured daily habits, workout and nutrition plans, deterministic streak tracking, WhatsApp-friendly coaching links, and a Liquid Glass user experience.

---

## Architecture & Capabilities (Stage 4D/4E — Supabase PostgreSQL & Storage Migration)

- **Frontend & Design System:** React 19 + TypeScript SPA styled with an Apple-inspired Liquid Glass UI, responsive viewport adaptation, and PWA service worker with offline precaching.
- **Sole Authentication Provider:** Firebase Authentication (Google Sign-In, Email/Password, Email Verification Gate, Password Reset, and secure Firebase Admin JWT verification).
- **Authoritative Database:** Supabase PostgreSQL (41 relational tables, Row-Level Security policies tied to `auth.jwt()->>'sub'`, atomic financial transactions in integer paise, and Supabase Realtime).
- **Sole Media & File Storage:** Supabase Storage across 5 provisioned buckets (`public-trainer-assets`, `profile-avatars`, `progress-photos`, `coaching-attachments`, `verification-documents`) with RLS and path-based participant checks.
- **Payments & Commerce:** Cashfree Payments PG (India-focused: UPI, Cards, Netbanking) with raw-byte HMAC-SHA256 signature verification, server-side order creation (`/api/payments/create-order`), atomic database subscription activation, and administrative refunds.
- **AI Copilot & Safety:** Google Gemini 2.5 Flash (`gemini-2.5-flash`) structured plan copilot with strict JSON schema validation, deterministic hydration & calorie fallback engines, and a mandatory trainer review/approval gate.
- **DPDP Act 2023 & Compliance:** Self-service data export (`/api/account/export`), account deletion (`/api/account/delete`), persistent consent records, and dedicated legal routes (`/privacy`, `/terms`, `/refund-policy`, `/disclaimer`).
- **Production Serverless & Parity:** Vercel serverless functions (`/api/*`) and local development parity server (`server.ts`) running Express + Vite.

---

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Copy `.env.example` to `.env` and configure:
   - `VITE_FIREBASE_*`: Firebase Client configuration
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase Admin SDK credentials
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase browser client credentials
   - `SUPABASE_SECRET_KEY`: Supabase server-side admin secret
   - `GEMINI_API_KEY`: Google AI Studio API key
   - `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`: Cashfree sandbox/production keys

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Runs Vite + Express local parity on `http://localhost:3000`.

---

## Scripts

- `npm run dev` — Start Express + Vite development server on port 3000
- `npm run build` — Build production bundle to `dist/`
- `npm start` — Serve production `dist/` + `/api/*` endpoints via `server.ts`
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm test` — Run comprehensive test suite (126 unit, integration, schema, and API tests)
- `npm run test:rules` — Lint legacy `firestore.rules` for backward compatibility

---

## Database Migrations & Schemas

PostgreSQL migrations are located in `supabase/migrations/`:
- `001_base_schema.sql` — 41 primary tables with TEXT primary keys, foreign keys, TIMESTAMPTZ, and integer paise monetary columns.
- `002_rls_policies.sql` — Row-Level Security policies enforcing tenant isolation using `auth.jwt()->>'sub'`.
- `003_functions_triggers.sql` — Database functions (`activate_payment_subscription`, `recalculate_streak`, `get_trainer_analytics`, `update_updated_at_column`).
- `004_indexes.sql` — B-tree performance indexes and Realtime publication configuration.
- `005_storage_buckets.sql` — Storage bucket configurations and access policies.
- `006_security_hardening.sql` — Anti-tamper triggers (`prevent_role_escalation`), search_path hardening, DPDP consent checks, and conversation-scoped media protection.
- `supabase/seed.sql` — Baseline feature flags and system coupons.

---

## Documentation & Audits

- `stage-4d-audit.md` — Route-by-route and service-by-service readiness audit
- `database-migration-audit.md` — Complete Firebase to Supabase inventory and mapping
- `supabase-architecture.md` — Architectural guide for Supabase PostgreSQL + Firebase Auth
- `database-schema.md` — Detailed 41-table PostgreSQL schema dictionary
- `rls-security.md` — Complete Row-Level Security and storage policy specifications
- `security-audit.md` — Comprehensive application security audit (OWASP, DPDP, RBAC)
- `payment-verification.md` — Cashfree PG integration, webhooks, and reconciliation
- `performance-report.md` — Bundle analysis, Core Web Vitals, and PWA metrics
- `production-readiness.md` — Pre-launch checklist and classification status
- `beta-launch-plan.md` — Operational plan for closed beta rollout and monitoring
- `owner-configuration.md` — Environment variable checklist and console setup guide
