# FitPlus — Stage 3 Production Readiness Audit

**Audit Date:** 2026-11-15  
**Target Deployment:** `https://fitplus-kappa.vercel.app/`  
**Firebase Project:** `gen-lang-client-0381020502`  
**Firestore Database:** `ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841` (`asia-south1`)  

---

## 1. Executive Summary

Stage 1 and Stage 2A delivered a responsive, Apple-inspired Liquid Glass UI, a deterministic streak engine, local demo fixtures, and an initial Firebase Authentication (Google Sign-In) + Firestore sync layer across 18 collections. However, inspecting the full codebase reveals critical gaps blocking commercial MVP deployment on Vercel and production multi-tenant safety:

1. **Vercel Direct-Route 404s:** No `vercel.json` exists. Any direct visit or browser refresh on client-side routes (`/discover`, `/auth`, `/welcome`, `/join/FIT-ARJUN-2026`, `/join/FIT-EXP-000`, `/app/*`, `/studio/*`) returns a Vercel 404.
2. **Demo Data Bleed into Cloud Mode:** `AppContext.tsx` (`createEmptyCloudSnapshot` and `subscribeAuthenticatedWorkspace`) merges `seed.trainers`, `seed.packages`, and `seed.invites` into authenticated cloud workspaces, causing real users to see fictional demo coaches and fake INR packages alongside live data.
3. **Incomplete Authentication & RBAC:** Only Google Sign-In (`signInWithPopup`) is wired. Email/password registration, email verification gates, password recovery, account deletion, privacy consent records, and `admin` role enforcement are missing. `DemoRoleGuard` allows switching into Trainer Studio preview from client routes.
4. **Client-Side Simulations Still Active:** `TodayPage` stores hydration glasses in `localStorage`, AI Plan Builder runs a local deterministic template (`generateDeterministicPlanDraft`), package checkout stamps `isDemoCheckout: true` without Razorpay verification, and trainer verification is not backed by an admin review workflow.
5. **Missing Serverless API & Storage/Index Configs:** No `/api/*` endpoints (Vercel serverless or Express local parity) exist for ID-token-authenticated Gemini generation, Razorpay order/webhook verification, server-authoritative streaks, or account deletion. `storage.rules` and `firestore.indexes.json` do not yet exist.

---

## 2. Feature & Component Audit Matrix

| Area | Current Status | Root Cause / Finding | Target Stage |
|---|---|---|---|
| **SPA Routing & Vercel Deployment** (`/discover`, `/auth`, `/welcome`, `/join/:token`) | **Broken on Vercel** | Missing `vercel.json` SPA rewrites; direct navigation returns Vercel 404. `NotFoundPage` references "demo route". | **Stage 3A** |
| **Google Sign-In (`signInWithPopup`)** | **Functional** | Configured in `src/lib/firebase.ts` and `src/data/firestoreService.ts`. Needs verified Authorized Domains checklist for `fitplus-kappa.vercel.app`. | **Stage 3A** |
| **Email/Password Auth, Verification, Password Reset** | **Simulated / Missing** | `AuthPage.tsx` has an offline-only demo email form (`sampleEmail`); no real `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendEmailVerification`, or `sendPasswordResetEmail`. | **Stage 3A** |
| **Account Deletion & Privacy Consent** | **Missing** | No account deletion flow (`deleteUser` + Firestore cleanup) and no persistent `consentRecords` collection. | **Stage 3A** |
| **Role-Based Access Control (`client`, `trainer`, `admin`)** | **Partially Functional** | `App.tsx` uses `DemoRoleGuard`, which offers a "Switch to Trainer Studio demo" button. No `admin` role or server/rule-backed admin gate exists. | **Stage 3A** |
| **Firebase App Check** | **Missing** | `recaptchaSiteKey` is empty in `firebase-applet-config.json`; `initializeAppCheck` is not wired in `src/lib/firebase.ts`. | **Stage 3A** |
| **Firestore Core Schema (18 collections)** | **Functional (Needs Extension)** | `users`, `users/{uid}/private`, `trainers`, `packages`, `clients`, `relationships`, `invites`, `enrollments`, `templates`, `assignments`, `completions`, `progressEvents`, `workoutPlans`, `mealPlans`, `consultationSlots`, `bookings`, `notifications`, `aiDrafts` exist with Eight Pillars rules. | **Stage 3A** |
| **Extended Production Collections** | **Missing** | Missing `admins`, `clientGroups`, `subscriptions`, `dailyActivity`, `streaks`, `payments`, `aiGenerations`, `consentRecords`, `auditLogs`, `trainerVerificationRequests`, `reviews`. | **Stage 3A** |
| **Storage Security Rules & Composite Indexes** | **Missing** | Neither `storage.rules` nor `firestore.indexes.json` exists. | **Stage 3A** |
| **Demo vs Production Isolation** | **Broken** | `AppContext.tsx` merges seed fixtures (`trn_arjun`, `trn_meera`, `trn_kabir`, `FIT-ARJUN-2026`) into `cloudStore`. Hydration uses `localStorage` on `TodayPage`. | **Stage 3A** |
| **Client & Trainer Multistep Onboarding** | **Partially Functional** | Wizards exist (`ClientOnboardingPage`, `TrainerOnboardingPage`), but lack age/target-weight/allergies/health-limitations/language/preferences, save-and-resume draft persistence, trainer photo/certifications/WhatsApp, and admin verification request submission. | **Stage 3B** |
| **Trainer-Client Relationship & Groups** | **Partially Functional** | Basic invite & enroll exist, but lack `clientGroups`, pending-request accept/decline queue, cryptographically strong tokens, and full invite preservation across email/Google auth redirects. | **Stage 3B** |
| **Trainer CRM & Advanced Task Engine** | **Partially Functional** | Roster, client detail, and bulk assignment work, but lack client group/subscription filtering, revenue from verified payments, and server-synced streak/adherence stats. | **Stage 3B** |
| **Server-Authoritative Streak & Consistency Engine** | **Partially Functional** | `src/lib/streak.ts` calculates accurately client-side without incrementing on app open, but lacks persistent `streaks` & `dailyActivity` documents and trainer-approved recovery day / exemption controls. | **Stage 3B** |
| **Gemini AI Fitness Copilot** | **Simulated** | `generateDeterministicPlanDraft` in `src/lib/engines.ts` produces hardcoded local templates. No `/api/ai/generate-plan` endpoint, schema validation, rate limiting, or `aiGenerations` logging. | **Stage 3B** |
| **Client Progress & Private Photos** | **Partially Functional** | Weight/strength measurements persist, but measurements (`waist`, `chest`, etc.), personal records, weekly check-ins, and private Firebase Storage progress photos are missing. | **Stage 3B** |
| **Trainer Marketplace & Verified Reviews** | **Partially Functional** | `DiscoverPage` filters trainers, but mixes demo trainers into cloud mode and lacks city filtering, verification badges gated by admin approval, and relationship-verified client reviews. | **Stage 3C** |
| **Coaching Packages & Razorpay Payments** | **Simulated** | `isDemoCheckout: true` marks enrollments active without payment processing. Missing Razorpay test-mode `/api/payments/create-order`, signature verification, `/api/payments/webhook`, `/payments`, `/subscriptions`, and invoices. | **Stage 3C** |
| **Consultations** | **Functional (Needs Commercial Fields)** | Atomic slot/booking batch exists in `firestoreService.ts` & `firestore.rules`; needs duration, Meet/in-person link fields, and paid/allowance checks. | **Stage 3C** |
| **WhatsApp Click-to-Chat** | **Simulated** | `WhatsAppSheet.tsx` is a non-launching preview sheet; needs real `https://wa.me/<E164>` contextual click-to-chat links using trainer-configured numbers. | **Stage 3C** |
| **Notifications & FCM** | **Partially Functional** | In-app notifications exist; needs preferences, triggers for expirations/achievements/missed commitments, and optional FCM permission workflow. | **Stage 3C** |
| **Progressive Web App (PWA)** | **Missing** | No `manifest.webmanifest`, app icons, service worker, offline indicator, or install prompt. | **Stage 3C** |
| **Commercial Homepage Separation** | **Partially Functional** | `LandingPage.tsx` still displays inline demo quick-preview buttons alongside main CTAs instead of separating commercial onboarding from an isolated `/demo` sandbox. | **Stage 3C** |

---

## 3. Prioritized Execution Plan

### Stage 3A — Production Foundation (Current Checkpoint)
1. **Vercel Hosting & Routing Fix:** Add `vercel.json` (SPA rewrites excluding `/api/*` and static files, security headers) and `api/health.ts` + local Express `server.ts` parity. Upgrade `NotFoundPage`.
2. **Complete Firebase Auth & Account Management:** Implement real Email/Password sign-up/sign-in, `sendEmailVerification` gate, `sendPasswordResetEmail`, Google Sign-In (`signInWithPopup`), `browserLocalPersistence`, Account Deletion, Privacy Consent management (`consentRecords`), `ProtectedRoute` with `client`/`trainer`/`admin` RBAC, and isolated `/demo` sandbox preview mode.
3. **Production Firestore & Storage Architecture:** Expand `firebase-blueprint.json`, `src/lib/firestoreValidation.ts`, `firestore.rules`, `firestore.indexes.json`, and `storage.rules` across all 28 collections/subcollections; document in `architecture.md`.
4. **Eliminate Demo Bleed:** Stop merging seed demo trainers/packages/invites into authenticated `cloudStore`; persist daily hydration in Firestore `dailyActivity`; ensure new accounts begin with honest empty states.
5. **App Check & Server Token Verification:** Wire optional Firebase App Check (`VITE_FIREBASE_APP_CHECK_SITE_KEY`) and server-side Firebase Admin ID token verification helper (`api/_lib/firebaseAdmin.ts`).
6. **Documentation & Rules Tests:** Update `security_spec.md`, `src/tests/firestore.rules.test.ts`, `src/tests/firestore.emulator.test.ts`, and `deployment.md`.

### Stage 3B — Fitness Coaching Engine
- Full multistep client & trainer onboarding with save/resume + verification request queue + admin review panel.
- Secure invitation tokens, client groups, pending request approval/rejection, and full trainer CRM workspace.
- Server-authoritative `streaks` + `dailyActivity` engine, recovery day approvals, and private progress photo Storage uploads.
- Secure `/api/ai/generate-plan` Gemini endpoint with structured JSON validation, usage tracking (`aiGenerations`), rate limits, and safety guardrails.

### Stage 3C — Commercialization, PWA & E2E Acceptance
- Commercial marketplace & relationship-verified reviews; separate homepage from `/demo` sandbox.
- Razorpay test-mode order/verify/webhook flow with idempotent transactional subscription activation and invoices.
- Consultation meeting links, validated `wa.me` click-to-chat, notification preferences/FCM, full PWA manifest + service worker, and end-to-end acceptance tests.
