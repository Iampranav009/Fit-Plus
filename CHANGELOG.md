# FitPlus Changelog

## Stage 4E — Complete Supabase Database & Storage Migration (2026-11-16)

### Checkpoint 4E.1: Architecture & Audit
- Performed complete audit of 41 managed Firestore collections and 57+ real-time snapshot listeners (`database-migration-audit.md`).
- Designed hybrid enterprise architecture retaining Firebase Authentication as the sole end-user identity provider while replacing Firestore with Supabase PostgreSQL and Firebase Storage with Supabase Storage.
- Mapped all document models to strongly-typed PostgreSQL schemas with TEXT primary keys and proper constraints.

### Checkpoint 4E.2: Supabase Schema & Row Level Security
- Created version-controlled SQL migrations:
  - `001_base_schema.sql`: 41 tables with TIMESTAMPTZ, integer minor currency units, and JSONB document storage.
  - `002_rls_policies.sql`: Comprehensive Row Level Security policies utilizing `auth.jwt()->>'sub'` for Firebase user verification.
  - `003_functions_triggers.sql`: PostgreSQL triggers for `updated_at`, streak recalculation, and `activate_payment_subscription` atomic transaction.
  - `004_indexes.sql`: Performance indexes on all foreign keys, status flags, and timestamps, plus Supabase Realtime publications.
  - `005_storage_buckets.sql`: Storage bucket provisioning and access policies.
  - `seed.sql`: Baseline promo coupons and feature flags.
- Generated full TypeScript definitions in `src/types/database.types.ts`.

### Checkpoint 4E.3: Client & Storage Integration
- Configured official `@supabase/supabase-js` SDK with dynamic accessToken resolver passing Firebase ID tokens.
- Created `src/lib/supabaseStorage.ts` and provisioned all 5 Supabase Storage buckets live in the cloud (`public-trainer-assets`, `profile-avatars`, `progress-photos`, `coaching-attachments`, `verification-documents`).
- Implemented client repositories in `src/data/repositories/` and unified `src/data/supabaseService.ts`.

### Checkpoint 4E.4: API & Payment Hardening
- Resolved trainer mode chat permission error (`conversations/conv_aarav_arjun`) by adding Supabase synchronization and defensive handling for demo records.
- Refactored `api/ai/generate-plan.ts` with Supabase persistence and deterministic fallback, resolving the HTTP 500 error.
- Enhanced `api/_lib/payments.ts` with dual-system synchronization during Cashfree payment captures.
- Updated `api/health.ts` to report live readiness for Firebase Auth, Supabase DB, Supabase Storage, Gemini, and Cashfree.
- Implemented `api/auth/provision-claims.ts` to set `role: 'authenticated'` custom claim on Firebase tokens.

## Stage 4B — Trainer Empowerment & Coaching Operations (2026-11-16)

### Checkpoint 4B.0: Critical Cashfree Webhook Defect Resolution
- Resolved Cashfree merchant dashboard test webhook failure ("The endpoint did not respond properly to the test") for webhook version `2025-01-01`.
- Added `"engines": { "node": ">=22.x" }` in `package.json` to resolve Vercel runtime engine mismatch with `firebase-admin@14.5.1`.
- Decoupled `api/health.ts` from static Firebase Admin imports to reliably return HTTP 200 without exposing sensitive configuration.
- Enhanced `api/payments/webhook.ts` and `api/_lib/payments.ts` to detect and immediately acknowledge valid signed Cashfree test events (`TEST_WEBHOOK`, `order_test_*`) with HTTP 200 `{ ok: true, test: true }`.
- Hardened HMAC-SHA256 signature verification with quote-stripping, raw buffer concatenation, and `crypto.timingSafeEqual`.

### Checkpoint 4B.1: FitPlus Connect (In-App Messaging & WhatsApp Bridge)
- Built 1-to-1 real-time messaging architecture backed by Cloud Firestore (`/conversations/{conversationId}` and `/conversations/{conversationId}/messages/{messageId}`).
- Implemented canonical lexicographical conversation ID generation (`[uidA, uidB].sort().join('__')`).
- Designed Apple Messages-inspired Liquid Glass chat UI:
  - `ChatConversationList`: Contact search, role badges, relative time formatted for Indian users, and unread counts.
  - `ChatMessageBubble`: Gradient sent vs frosted received bubbles, read receipts, image previews with zoom modal, and quoted replies.
  - `ChatComposer`: Floating glass pill with auto-growing textarea, 5 MB photo upload (`/private/messages`), and plan reference picker.
- Added user-initiated WhatsApp click-to-chat bridge (`WhatsAppShareModal`) with pre-formatted Indian coaching templates for program assignments, check-in nudges, and streak milestones without third-party API costs.
- Mounted `/app/messages` and `/studio/messages` with unread notification badge counters in `GlassNavigation`.

### Checkpoint 4B.2: Visual Workout Studio & Nutrition Studio
- Created `StudioWorkoutBuilderPage.tsx` (`/studio/workout-builder`) featuring:
  - Multi-week program modeling with customizable training days.
  - Curated exercise selector linked directly to `exerciseLibrary.ts` (28+ movements).
  - Dynamic volume calculation (total sets, estimated session duration accounting for rest countdowns).
  - Gemini AI workout plan drafting integration with structured JSON schema constraints.
- Created `StudioNutritionBuilderPage.tsx` (`/studio/nutrition-builder`) featuring:
  - Authentic Indian meal slot scheduler (Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, Post-Workout).
  - Indian food composition catalog integration (`indianFoods.ts`) with dynamic portion scaling (katori, phulka, cup, piece, 100g).
  - Live macro summary bar tracking Calories, Protein, Carbs, and Fats against daily targets.
  - Gemini AI diet plan drafting integration.
- Added master template library persistence in `/workoutTemplates` and `/nutritionTemplates`.

### Checkpoint 4B.3: Client Pulse & Retention Automations
- Built deterministic 4-state Client Pulse engine (`src/lib/pulseEngine.ts`):
  - `on_track` (Adherence >= 75% and active within 2 days).
  - `needs_attention` (Inactivity >= 4 days, adherence < 50%, or 0 completed workouts).
  - `follow_up_recommended` (Inactivity 3 days or pending unreviewed weekly check-in).
  - `insufficient_data` (New client with 0 past tasks).
- Implemented Studio Action Center on `StudioOverviewPage.tsx` with weighted urgency scoring and quick one-click coaching actions.
- Created scheduled reminder architecture (`/scheduledReminders`) with Indian quiet hours enforcement (`isInIndianQuietHours`, 22:00–07:00 IST).
- Added trainer business KPI calculations (MRR, active clients, average roster adherence, check-in completion rate).

### Checkpoint 4B.4: Security, Blueprint Sync & Automated Verification
- Expanded `firebase-blueprint.json` from 35 to 40 managed collections.
- Added comprehensive security rules in `firestore.rules` for chat conversations, messages, workout templates, nutrition templates, and scheduled reminders.
- Added Firebase Storage security rule for `/private/messages/{conversationId}/{fileName}` with 5 MB cap and MIME validation.
- Added composite queries in `firestore.indexes.json` for conversations, messages, templates, and reminders.
- Expanded automated unit test suite to 25 tests passing (`src/tests/domain.test.ts` and `src/tests/firestore.rules.test.ts`).
- Verified 0 ESLint errors on rules (`npm run test:rules`), 0 TypeScript compiler errors (`npm run lint`), and clean production Vite build.

---

## Stage 4A — Product Experience & User Engagement (2026-11-16)

### Interactive Live Workout Mode
- Created `LiveWorkoutPage.tsx` (`/app/workout`, `/app/workout/:dayIndex`) featuring set-by-set weight and rep logging, automatic rest countdown timer with tactile haptics (`src/lib/haptics.ts`), elapsed session stopwatch, and pause/resume capability.
- Added live personal record (PR) detection comparing current attempts against historical bests using Epley formula 1RM calculations (`src/lib/workoutEngine.ts`).
- Added in-workout exercise substitution modal matching approved alternatives by target muscle group and equipment availability.
- Implemented persistent mid-session draft preservation in local storage (`saveLiveWorkoutDraft` / `loadLiveWorkoutDraft`), surviving accidental browser closes and page reloads.
- Integrated workout completion summary modal celebrating volume, sets, and achieved personal records with one-click progress navigation.

### Structured Exercise Library & Anatomy Visualizer
- Created `ExerciseLibraryPage.tsx` (`/app/exercises` for clients, `/studio/exercises` for trainers) powered by `src/data/exerciseLibrary.ts` featuring 30 India-accessible home and gym exercises.
- Added structured cues, common mistakes, safety notes, equipment filters (`bodyweight`, `dumbbells`, `barbell`, `bands`), environment filters (`home`, `gym`, `both`), and muscle group filters.
- Built `AnatomyMuscleSvg` (`src/components/ui/FitnessIllustrations.tsx`) rendering anterior and posterior human muscular systems highlighting primary and secondary targeted muscles without third-party asset dependencies.
- Added custom exercise creator for trainers in Studio mode (`saveCustomExercise` / `deleteCustomExercise`) synchronized to Cloud Firestore (`/exercises/{exerciseId}`).

### Indian Nutrition Diary (IFCT / NIN-Aligned)
- Created `NutritionDiaryPage.tsx` (`/app/nutrition`) with daily meal slots (Breakfast, Lunch, Evening Snack, Dinner, Additional Items) and prominent ICMR-NIN / IFCT nutritional disclaimer.
- Built `src/data/indianFoods.ts` with 23 verified Indian staples (dal, roti, rice, khichdi, paneer, sprouts, chicken breast, eggs, idli, oats, curd, buttermilk, almonds) with estimated calories, protein, carbs, and fat.
- Added portion multiplier scaling (0.5x, 1x, 1.5x, 2x), daily macro aggregation totals, custom meal quick-add, and two-way hydration sync with `dailyActivity`.
- Added coach review and feedback interface in `StudioClientDetailPage.tsx` enabling trainers to comment on daily nutrition logs.

### Weekly Reflection & Client Check-ins
- Created `WeeklyCheckInPage.tsx` (`/app/check-in`) supporting 1–5 qualitative scales for energy, sleep quality, workout difficulty, and hunger, plus schedule challenges and general feedback.
- Added optional private progress photo upload stored securely in Firebase Storage (`uploadWeeklyCheckInPhoto`).
- Added coach review panel with historical comparison and coach feedback in `StudioClientDetailPage.tsx`.

### FitPlus Wrapped (Monthly Recap Card Generator)
- Created `WrappedPage.tsx` (`/app/wrapped`) computing monthly summaries (`computeMonthlyWrappedSummary`) of completed workouts, total volume, consistency percentage, longest streak, PR count, and top exercise.
- Built native HTML5 Canvas card renderer (`renderWrappedCardToDataUrl`) exporting 1080×1920 (9:16 Instagram Story / WhatsApp Status) and 1080×1350 (4:5 Instagram Feed) PNG cards with Web Share API fallback.
- Enforced strict privacy-first architecture with optional weight change and personal notes **default OFF**.

### Expanded Achievements System
- Expanded `ACHIEVEMENT_CATALOG` (`src/lib/achievementsEngine.ts`) to 9 milestones: First Workout, Personal Record, 7/14/30/60/100-Day Streaks, and 10/30 Active Days.
- Built `AchievementUnlockModal.tsx` displaying celebratory animated medallions, unlock stats, and tactile haptic vibration.
- Automated achievement evaluation on workout session completion with deduplicated unlock persistence to Firestore (`/achievements/{achievementId}`).

### Audit Defect Resolutions & Performance Optimizations
- **Firestore Read Amplification**: Scoped `subscribeAuthenticatedWorkspace` by user role (`client` vs `trainer` vs `admin`) and replaced real-time listeners on public marketplace collections (`trainers`, `packages`, `reviews`) with cached one-time queries.
- **Route Code Splitting**: Wrapped all sub-routes with `React.lazy` and `Suspense` (`RouteLoadingFallback`), reducing route chunk sizes to 10–25 kB.
- **Task Detail Logging Fix**: Removed hardcoded `'8200'` default in `TaskDetailPage.tsx`.
- **Database & Security Blueprint**: Updated `firebase-blueprint.json` (35 collections), `firestore.rules`, and composite indexes in `firestore.indexes.json`. `npm run test:rules` passed with 0 errors.
- **Automated Test Suite**: Added Stage 4A test suites in `src/tests/domain.test.ts`. 21/21 tests passing.

---

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
