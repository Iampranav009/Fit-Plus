# FitPlus Changelog

## Stage 3D — Cashfree Payments Migration & Production Verification (2026-11-16)

### Production Defect Fix (`/api/health` 500) & Vercel Runtime Compatibility
- Fixed `/api/health` `500 FUNCTION_INVOCATION_FAILED` by removing synchronous `initializeApp()` / `initializeFirestore()` calls from health probes, adding `getFirebaseAdminConfig()` / `getFirebaseAdminStatus()`, normalizing escaped `\\n` PEM keys in both camelCase and snake_case service account JSONs, and wrapping `/api/health` in fail-safe `try/catch`.
- Added `/api/tsconfig.json` isolating serverless handlers from Vite client `@types` (`TS2688`) and fixed extensionless `./date` imports in `src/lib/engines.ts` and `src/lib/streak.ts` to `./date.js` for Node.js native ESM execution on Vercel.

### Cashfree Payments PG Integration (Sandbox First)
- Replaced Razorpay dependency (`razorpay`) with `@cashfreepayments/cashfree-js` and official Cashfree PG REST APIs (`POST /pg/orders`, `GET /pg/orders/{order_id}`, `GET /pg/orders/{order_id}/payments`, `POST /pg/orders/{order_id}/refunds`).
- Added `/payments/result` (`PaymentResultPage.tsx`) handling `verifying`, `paid`, `pending`, `failed`, and `cancelled` return outcomes with idempotent server verification and duplicate-checkout prevention.
- Implemented raw-body Cashfree webhook signature verification (`x-webhook-signature` + `x-webhook-timestamp` Base64 HMAC-SHA256) with deterministic `webhookEventId` deduplication and out-of-order protection (never downgrading captured payments).
- Refactored `Subscription`, `PaymentRecord`, `firebase-blueprint.json`, and `firestoreService.ts` to provider-agnostic fields (`providerOrderId`, `providerPaymentId`, `paymentSessionId`, `paymentMethod`, `refundStatus`, `settlementStatus`, `verifiedAt`, `webhookEventId`, `lastWebhookAt`) while preserving historical Razorpay receipts.
- Added `/api/payments/refund.ts` for admin-authorized Cashfree refunds and disabled Easy Split vendor settlement scaffolding (`CASHFREE_EASY_SPLIT_ENABLED="false"`).
- Hardened PWA Service Worker Workbox config in `vite.config.ts` with `NetworkOnly` for `/api/*`.
- Added `payment-migration.md` and updated unit, routing, and API handler tests.

---

## Stage 3A — Production Foundation (2026-11-15)

### Infrastructure, Hosting & APIs
- Added `vercel.json` with SPA rewrite exclusions for `/api/*`, `/assets/*`, `manifest.webmanifest`, `sw.js`, `robots.txt`, `sitemap.xml`, and static extensions, plus security & cache headers.
- Upgraded `server.ts` with Express + Vercel handler parity for `/api/health`, `/api/invites/resolve`, `/api/account/delete`, API 404 isolation, and production `dist/` SPA fallback.
- Added `api/_lib/firebaseAdmin.ts` for Firebase Admin initialization against named Firestore database `ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841`, Bearer ID token verification, optional App Check verification, and verified admin resolution.
- Added branded application-level `NotFoundPage` (`404`) without demo-only wording.

### Authentication, RBAC & Account Lifecycle
- Implemented full Firebase Email/Password sign-up & sign-in, `sendEmailVerification` enforcement gate, `sendPasswordResetEmail`, and Google Sign-In with `browserLocalPersistence` in `AuthPage.tsx` and `AppContext.tsx`.
- Implemented 18+ age & Privacy/Terms consent capture (`consentRecords`) during signup and settings updates.
- Implemented self-service account deletion via `POST /api/account/delete` and confirmation modal in client and trainer settings.
- Replaced `DemoRoleGuard` with strict `ProtectedRoute` (`client`, `trainer`, `admin`) and `OnboardingGuard` in `App.tsx`.
- Added `/admin` console (`AdminDashboardPage.tsx`) for trainer credential verification review and `auditLogs` inspection.
- Isolated interactive demo fixtures into `/demo` sandbox (`exitDemoSandbox` / `enterDemoPreview`) and removed automatic merging of demo trainers, packages, and invites into authenticated cloud workspaces.
- Migrated client daily hydration tracking from `localStorage` to Firestore `dailyActivity` for cloud-synced users.

### Database, Storage & Security Rules
- Expanded `firebase-blueprint.json` and `src/lib/firestoreValidation.ts` across all 30 collections/subcollections.
- Hardened and deployed `firestore.rules` with `isAdmin()`, verified-email enforcement, trainer verification tamper protection, and strict tenant isolation.
- Added `storage.rules` (private progress photos & trainer verification assets) and `firestore.indexes.json`.
- Wired optional Firebase App Check (`VITE_FIREBASE_APP_CHECK_SITE_KEY`) in `src/lib/firebase.ts`.

### Testing & Documentation
- Added `src/tests/routing.test.ts` and `src/tests/firestore.emulator.test.ts`, and expanded `src/tests/firestore.rules.test.ts`.
- Added `audit.md`, `architecture.md`, `security_spec.md`, `deployment.md`, `testing.md`, `README.md`, and `CHANGELOG.md`.

---

## Stage 2A — Liquid Glass Visual Elevation
- Applied Apple-inspired Liquid Glass design tokens (`#101218` / `#090B10` surfaces, `#FF803E` accent), reusable `Glass*` primitives, `ActivityRing`, `MetricCard`, and `StreakIndicator` across all client, trainer, and public pages.

## Stage 1 — Initial Foundation & Firebase Bootstrap
- Built India-first FitPlus web application, deterministic streak engine, local demo fixtures, and initial Firebase Auth + Firestore synchronization.
