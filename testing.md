# FitPlus — Stage 3A Testing & Verification Guide

This document defines the automated test suites, static verification commands, HTTP smoke tests, and manual QA checklists for FitPlus Stage 3A (Production Foundation).

---

## 1. Automated Test Suites

| Command | Suite | What It Verifies |
|---|---|---|
| `npm test` | `tsx --test src/tests/domain.test.ts src/tests/firestore.rules.test.ts src/tests/routing.test.ts` | Deterministic streak calculations, timezone day-key logic, Firestore rules/blueprint schema alignment across all 30 collections, `storage.rules` coverage, `firestore.indexes.json`, and `vercel.json` SPA rewrite exclusions & security headers. |
| `npm run test:rules` | `eslint firestore.rules` | Official `@firebase/eslint-plugin-security-rules` static validation of `firestore.rules`. |
| `npm run lint` | `tsc --noEmit` | Full TypeScript typechecking across client React code, domain validators, and `/api/*` handlers. |
| `npm run build` | `vite build` | Production Vite bundle verification into `dist/`. |
| `npm run test:emulator` | `firebase emulators:exec --only firestore 'tsx --test src/tests/firestore.emulator.test.ts'` | Live Firestore Emulator security-rule tests covering the Dirty Dozen RBAC & multi-tenant invariants. **Prerequisite:** Java 11+ runtime (`java -version`) and `firebase-tools`. |

---

## 2. Dirty Dozen Security Matrix (`src/tests/firestore.emulator.test.ts`)

When Java 11+ is available locally or in CI, `npm run test:emulator` validates:
1. Unauthenticated reads of private `users`, `clients`, `relationships`, `payments`, and `auditLogs` are denied.
2. Authenticated users with `email_verified: false` are denied private workspace reads/writes.
3. Cross-tenant reads of another user's `/users/{uid}/private/contact` document are denied.
4. Client role self-escalation (`role: "trainer"` or `role: "admin"` via update) is denied.
5. Direct writes to `/admins/{uid}` by non-admin users are denied.
6. Direct client writes to `/payments/{id}` and `/subscriptions/{id}` are denied.
7. Trainers cannot tamper with their own `verificationStatus` or `isVerified` badge fields.
8. Non-admins cannot approve or reject `/trainerVerificationRequests/{id}`.
9. Platform admins (`/admins/{uid}` or verified admin email) can review verification requests and inspect `auditLogs`.
10. Only active relationship participants can read shared coaching records (`assignments`, `completions`, `workoutPlans`, `mealPlans`).

---

## 3. HTTP Route & API Smoke Checklist

Verify against `npm run build` + `NODE_ENV=production PORT=3100 npx tsx server.ts` (or against `https://fitplus-kappa.vercel.app/`):

- `GET /api/health` -> HTTP `200`, JSON `{ ok: true, service: "fitplus-api", firebase: { projectId, firestoreDatabaseId, adminConfigured } }`
- `GET /api/invites/resolve?token=FIT-ARJUN-2026` -> HTTP `200`, JSON response (`source: "firestore_admin"` when Admin SDK configured, or `"client_fallback"` with `state: "unverified_server"` otherwise)
- `GET /api/invites/resolve?token=FIT-EXP-000` -> HTTP `200`, JSON response
- `GET /api/nonexistent` -> HTTP `404`, JSON `{ ok: false, error: "API endpoint not found" }` (never rewritten to HTML)
- `POST /api/account/delete` (without Authorization header) -> HTTP `401`, JSON `{ ok: false, code: "auth/missing-token" }`
- `GET /discover`, `/auth`, `/welcome`, `/demo`, `/join/FIT-ARJUN-2026`, `/join/FIT-EXP-000` -> HTTP `200`, `text/html` containing `<div id="root"></div>`

---

## 4. Manual End-to-End Verification Checklist (Stage 3A)

1. **Direct Routing & Refresh:** Open `/discover`, `/auth`, `/welcome`, `/join/FIT-ARJUN-2026`, `/join/FIT-EXP-000`, and `/unknown-route` directly in the browser and refresh each page. Confirm zero Vercel 404s and confirm `/unknown-route` renders the branded FitPlus 404 page.
2. **Email/Password Registration & Verification Gate:** Create an account on `/auth` with 18+ consent checked. Confirm the Verify Email Gate blocks onboarding and workspace routes until the email verification link is confirmed and `"I've verified — continue"` is clicked.
3. **Google Sign-In & Onboarding:** Sign in with Google, complete Client or Trainer onboarding, and confirm new accounts start with honest empty states (no demo trainers or sample packages merged into cloud storage).
4. **Hydration Persistence:** Log water glasses on `/app/home`, reload the browser, and verify persistence in Firestore `dailyActivity` (not `localStorage`).
5. **RBAC Enforcement:** Sign in as a `client` and visit `/studio/overview` or `/admin`; confirm strict access-denied screen without any demo role-switch bypass. Sign in as platform admin and visit `/admin` to approve/reject trainer verification requests.
6. **Account Deletion:** Open Settings -> Account Deletion modal, type `DELETE`, and confirm `/api/account/delete` removes auth and personal workspace records cleanly.
7. **Isolated Demo Sandbox:** Visit `/demo` from a signed-out session and confirm interactive fixtures work locally without polluting cloud Firestore.
