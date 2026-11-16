# Project: FitPlus Stage 4D Production Engineering & Launch Readiness

## Architecture
- **Frontend**: React 18 SPA with TypeScript, Vite, TailwindCSS, Apple-inspired Liquid Glass design system.
- **Authentication**: Firebase Authentication (Google Sign-In, Email/Password, Custom Claims for RBAC) with Firebase Admin SDK token verification.
- **Authoritative Database**: Supabase PostgreSQL (41 relational tables, Row Level Security, custom RPCs).
- **Storage**: Supabase Storage (5 user-scoped buckets: `public-trainer-assets`, `profile-avatars`, `progress-photos`, `coaching-attachments`, `verification-documents`).
- **Realtime**: Supabase Realtime channels for live messaging and notifications.
- **Payments**: Cashfree Payments gateway (sandbox mode, raw-byte HMAC-SHA256 signature verification, atomic activation via PostgreSQL function `activate_payment_subscription`).
- **AI**: Google Gemini API (`gemini-2.5-flash`) with structured JSON schema output, trainer review/approval gates, and deterministic fallbacks.
- **Hosting & Serverless**: Vercel Serverless Functions (`/api/*`), PWA service worker with workbox.

## Code Layout
- `api/`: Serverless functions (health, auth, account, invites, AI, payments, relationships, streaks, admin, monitoring).
- `api/_lib/`: Shared backend helpers (firebaseAdmin, supabaseAdmin, payments, firestoreAdmin).
- `src/components/`: Reusable Liquid Glass UI components, layout, chat, forms.
- `src/context/`: `AppContext.tsx` global state and persistence.
- `src/data/`: Domain data, food databases, exercises, copy, service integrations (`supabaseService.ts`).
- `src/lib/`: Pure domain engines (workout, pulse, streak, achievements, formatters).
- `src/pages/`: Client, Trainer Studio, Admin, and Public views.
- `src/types/`: `database.types.ts`, domain types, payment types.
- `supabase/migrations/`: SQL migrations (001_base_schema through 005_storage_buckets, plus additive migrations).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | .env Formatting & Env Sanitation | Fix line 4 newline syntax error and validate credentials | M1 | Survey Infra |
| 2 | TypeScript Database Types Realignment | Update database.types.ts for all 41 tables with Relationships: [] | M1 | Survey Infra |
| 3 | Supabase Storage UI Cutover | Route all UI photo/file uploads and signed URLs to Supabase Storage | M1 | Survey Infra |
| 4 | AppContext Supabase Persistence Cutover | Replace firestoreService and onSnapshot with Supabase client & realtime | M1 | Survey Infra |
| 5 | Firestore Runtime Elimination | Eliminate active Firestore reads/writes while retaining cold backup | M1 | Survey Infra |
| 6 | Demo Contamination Removal | Cleanse default demo conversation IDs and mock fallbacks | M1 | Survey Infra |
| 7 | /api/health 4-State Taxonomy | Implement configured, reachable, operational, unavailable states safely | M1 | Survey Infra |
| 8 | /api/auth/provision-claims Mounting | Mount provision-claims endpoint in server.ts and enforce role claim | M2 | Survey Sec |
| 9 | Additive RLS Hardening Migration | Prevent coaching relationship exploit, protect app_users.role, add policies to 7 tables | M2 | Survey Sec |
| 10 | Storage Authorization Hardening | Scope coaching-attachments to conversation participants and restrict progress photo mutations | M2 | Survey Sec |
| 11 | API Security & Rate Limiting | Add secure headers, CSP, and rate limiting to checkout and AI routes | M2 | Survey Sec |
| 12 | Privacy Controls & DPDP Compliance | Implement /api/account/export, full Supabase purge on delete, localStorage purge on logout | M2 | Survey Sec |
| 13 | Atomic Payment Activation RPC | Call activate_payment_subscription() in payment verification and webhooks | M3 | Survey Finance |
| 14 | Supabase Pending Order Creation | Insert pending order records into Supabase payment_records on checkout | M3 | Survey Finance |
| 15 | Cashfree Dual-Write Elimination | Remove dual-writes to Firestore from payment flows | M3 | Survey Finance |
| 16 | Commercial Policy Snapshotting & Anti-Abuse | Snapshot pricing/fees at order creation; prevent self-referral & duplicate coupon abuse | M3 | Survey Finance |
| 17 | Trainer Earnings Dashboard Audit | Remove fabricated Cashfree Easy Split claims, fix GSTIN, display true settlement breakdown | M3 | Survey Finance |
| 18 | GST Invoicing & Credit Notes | Accurate CGST/SGST/IGST breakdown and credit notes on refund in Supabase | M3 | Survey Finance |
| 19 | UI Copy & Asset Polish | Cleanse demo strings in copy.ts; maintain 100% local WebP & SVG asset integrity | M4 | Survey Product |
| 20 | Standalone Legal & Support Pages | Implement /privacy, /terms, /refund-policy, /disclaimer with navigation and consent links | M4 | Survey Product |
| 21 | Gemini AI Structured Output & Approval | Verify gemini-2.5-flash schema validation, model tagging, and mandatory coach approval | M4 | Survey Product |
| 22 | Mobile Responsiveness & Touch Targets | Verify layout across 360px–1440px viewports with HIG touch target compliance | M4 | Survey Product |
| 23 | /admin Backend Supabase Cutover | Refactor api/admin/overview.ts to query Supabase tables instead of Firestore | M5 | Survey Admin |
| 24 | /admin Operations Console Enhancement | Add feature_flags management UI, subscriptions table, and Cashfree refund modal | M5 | Survey Admin |
| 25 | Synthetic Identity E2E Test Suite | Multi-identity automated test harness for Client A/B, Trainer A/B, Admin | E2E | Survey QA |
| 26 | Documentation Suite & Final Delivery Report | Generate 17 required markdown reports and formal Stage 4D readiness assessment | M5 | Survey QA |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Infrastructure Finalization & Supabase Cutover | F1, F2, F3, F4, F5, F6, F7 | none | DONE (Verified: 5/5 verifiers PASS, Auditor CLEAN, 41/41 tables type/schema parity, 0 active onSnapshot listeners, health 4-state taxonomy ok) |
| M2 | Security, Authentication & Privacy Hardening | F8, F9, F10, F11, F12 | M1 | IN_PROGRESS |
| M3 | Financial & Commercial Infrastructure | F13, F14, F15, F16, F17, F18 | M1, M2 | PLANNED |
| M4 | Premium Product Experience & Workflow Completion | F19, F20, F21, F22 | M1 | PLANNED |
| M5 | Platform Control Center & Launch Readiness | F23, F24, F26 | M1, M2, M3, M4 | PLANNED |
| E2E | End-to-End Testing Track | F25 (Tiers 1-4 multi-identity automated suite) | M1 | IN_PROGRESS (Iteration 1: 99 tests implemented, undergoing reviewer iteration) |

## Interface Contracts
### AppContext ↔ SupabaseService
- `supabaseService`: Exposes typed queries and mutations against Supabase PostgreSQL and Realtime channels.
- Returns typed models matching `database.types.ts`.
- Handles auth token propagation via Firebase ID token to Supabase client.

### Serverless APIs ↔ PostgreSQL RPCs
- `/api/payments/verify` & `/api/payments/webhook` invoke `activate_payment_subscription(p_order_id, p_payment_id, p_payment_method, p_signature, p_raw_webhook)` returning `{ success: boolean, subscription_id: text, error?: text }`.
- `/api/health` queries `select 1` on PostgreSQL and lists bucket status without exposing secret keys.
