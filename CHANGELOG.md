# FitPlus Changelog

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
