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

- `GET /api/health` -> HTTP `200`, JSON `{ ok: true, service: "fitplus-api", firebase: { projectId, firestoreDatabaseId, adminConfigured }, capabilities: { cashfreeConfigured, cashfreeEnv, cashfreeApiVersion, easySplitEnabled } }`
- `GET /api/invites/resolve?token=FIT-ARJUN-2026` -> HTTP `200`, JSON response (`source: "firestore_admin"` when Admin SDK configured, or `"client_fallback"` with `state: "unverified_server"` otherwise)
- `GET /api/invites/resolve?token=FIT-EXP-000` -> HTTP `200`, JSON response
- `POST /api/payments/create-order` (without Authorization header) -> HTTP `401`
- `POST /api/payments/verify` (without Authorization header) -> HTTP `401`
- `POST /api/payments/webhook` (without Cashfree env or signature) -> HTTP `503` (when gateway unconfigured) or `401` (when signature invalid)
- `GET /api/nonexistent` -> HTTP `404`, JSON `{ ok: false, error: "API endpoint not found" }` (never rewritten to HTML)
- `POST /api/account/delete` (without Authorization header) -> HTTP `401`, JSON `{ ok: false, code: "auth/missing-token" }`
- `GET /discover`, `/auth`, `/welcome`, `/demo`, `/payments/result`, `/join/FIT-ARJUN-2026`, `/join/FIT-EXP-000` -> HTTP `200`, `text/html` containing `<div id="root"></div>`

---

## 4. Stage 4A Automated Testing & Verification Checklist

### Automated Unit Test Coverage (`src/tests/domain.test.ts`)
- **Exercise Library Engine:**
  - Built-in exercise count: >= 30 verified Indian-accessible exercises
  - Data structure checks: IDs (`ex_*`), step-by-step instructions, common mistakes, primary/secondary muscles
  - Muscle group filtering: primary and secondary muscle targeting matches
  - Equipment filtering: bodyweight vs equipment vs home/gym compatibility
  - Custom exercise merge: trainer-created exercises seamlessly merge with built-ins
- **Live Workout Engine:**
  - 1RM calculation: Epley formula accuracy (`weight * (1 + reps/30)`)
  - Rest parsing: supports seconds, minutes, and fallback default values
  - Historical benchmarks: lookup across past sessions by exercise name and ID
  - Metrics calculation: volume (`sum(weight * reps)`), completed set counts, personal record detection
- **Indian Nutrition Engine:**
  - Database integrity: >= 20 Indian staples with positive calories, macros, and serving grams
  - Food scaling: portion multiplier (0.5x, 1x, 1.5x, 2x) accurately scales kcal and macros
  - Daily totals: aggregated calories, protein, carbs, and fat across meal items
- **Achievements Engine:**
  - Catalog verification: 9 badge definitions with targets and icons
  - Unlock triggers: first workout, PR milestones, streak tiers (7, 14, 30, 60, 100 days), active days
  - Deduplication: previously unlocked badges are never duplicated in notifications
- **FitPlus Wrapped:**
  - Monthly aggregation: training minutes, volume, PR counts, consistency percent, top exercise
  - Privacy enforcement: optional weight changes and personal notes are strictly undefined when toggles are OFF

### Manual QA Verification Checklist
1. **Live Workout Execution (`/app/workout`):**
   - Click "Start Live Workout" from Today or Plan page.
   - Verify exercise stepper carousel displays exercise numbers and set counts.
   - Enter weights and reps; click checkmark to complete set; verify rest countdown starts automatically.
   - Click "Substitute" and select an approved alternative; verify replacement reflects on the card.
   - Click "Finish" and verify celebration dialog with total volume, elapsed time, and sets completed.
   - Refresh page mid-workout; verify session restores seamlessly from local draft.
2. **Indian Nutrition Diary (`/app/nutrition`):**
   - View macro and hydration dashboard (Energy, Protein, Carbs, Fat, Hydration).
   - Click "Add Food", search for "roti", "paneer", or "dal", choose portion size, and add to Breakfast/Lunch.
   - Log water intake and confirm sync with today's hydration ring.
   - Sign in as trainer and view client's diary in `/studio/clients/:id`; add coach feedback and confirm client sees it.
3. **Weekly Check-in (`/app/check-in`):**
   - Submit a weekly reflection with 1–5 ratings for energy, sleep, difficulty, and hunger.
   - Optionally attach a progress photo and submit; confirm coach sees check-in in client detail view.
4. **FitPlus Wrapped (`/app/wrapped`):**
   - Switch between months; verify metrics update reactively.
   - Toggle Story (9:16) vs Post (4:5) format and verify Canvas card re-renders instantly.
   - Confirm weight change toggle defaults to OFF. Click "Download PNG" and verify clean 1080px export.
5. **Exercise Library (`/app/exercises`):**
   - Filter by muscle group, environment, and equipment.
   - Click an exercise to inspect cues, common mistakes, and anatomical muscle highlighting diagram.
   - As trainer in `/studio/exercises`, create a custom exercise and verify it appears in catalog.

---

## 5. Stage 4B Automated Testing & Verification Matrix

### Automated Unit Test Suite (`npm test` — 25 Tests Passing)
- **Checkpoint 4B.0: Cashfree Webhook Defect Resolution:**
  - Test event recognition (`TEST_WEBHOOK`, `order_test_*`) returning HTTP 200 `{ ok: true, test: true }`.
  - HMAC-SHA256 signature verification with raw byte buffers and `crypto.timingSafeEqual`.
  - Unsigned requests and tampered signatures correctly rejected with HTTP 401.
  - Idempotent deduplication of repeat webhook events.
- **Checkpoint 4B.1: FitPlus Connect (In-App Messaging & WhatsApp Bridge):**
  - `buildConversationId`: Canonical lexicographical ID generation (`[uidA, uidB].sort().join('__')`).
  - Indian time formatters: `formatMessageTime` and `formatTimeIndian` adhering to IST AM/PM formatting.
  - `buildWhatsAppChatUrl`: E.164 phone number sanitation and URI encoding.
- **Checkpoint 4B.2: Workout Studio & Nutrition Studio Builders:**
  - Workout Day metrics: total sets, estimated workout duration accounting for rest countdowns.
  - Indian Food Scaling: portion multiplier calculations across `katori`, `phulka`, and `100g` measures.
  - Macro Totals: aggregated Calories, Protein, Carbohydrates, and Fats across meal slots.
- **Checkpoint 4B.3: Client Pulse, Action Center & Scheduled Automations:**
  - Client Pulse status: `on_track` (adherence >= 75%), `needs_attention` (inactivity >= 4 days or 0 workouts logged), `follow_up_recommended` (inactivity 3 days or pending check-in), and `insufficient_data` (new client).
  - Trainer Action Center: priority ranking of high-urgency client tasks.
  - Indian Quiet Hours: `isInIndianQuietHours` accurately detects 22:00 to 07:00 IST.
- **Firestore Blueprint & Security Rules Synchronization:**
  - Exact alignment of 40 managed collections across `firebase-blueprint.json`, `firestore.rules`, and `firestore.indexes.json`.

### Manual QA Checklist for Stage 4B
1. **FitPlus Connect Messaging (`/app/messages` & `/studio/messages`):**
   - Open chat thread between client and coach; send a message and verify instant real-time delivery.
   - Attach an image photo; verify upload completes and thumbnail displays with zoom modal.
   - Attach a Workout or Nutrition plan card; verify one-click navigation to the routine.
   - Send a quote reply; verify the referenced message snippet appears above the new message.
   - Verify unread message count displays as glowing orange pill on navigation bars.
2. **WhatsApp Bridge (`WhatsAppShareModal`):**
   - Click WhatsApp icon next to a client; select "Workout Plan Assigned" template.
   - Verify generated `wa.me` link opens with clean, personalized message text and deep link.
3. **Workout Studio Builder (`/studio/workout-builder`):**
   - Create a 4-week program; add Push Day; search and add Bench Press and Overhead Press.
   - Adjust sets, reps, rest seconds; verify live total sets and estimated time update instantly.
   - Click "AI Assistant" to generate a draft; verify structured day schedules populate cleanly.
   - Save as Master Template; verify it persists in `/workoutTemplates`.
4. **Nutrition Studio Builder (`/studio/nutrition-builder`):**
   - Create a diet plan; add Paneer Bhurji and Phulka to Breakfast and Dal Tadka to Lunch.
   - Adjust portion sizes; verify Calories, Protein, Carbs, and Fats scale dynamically.
   - Save as Master Template; verify it persists in `/nutritionTemplates`.
5. **Client Pulse & Studio Action Center (`/studio`):**
   - Inspect Trainer Action Center on Studio Overview page; verify urgent tasks appear at the top.
   - Check Client Roster on `/studio/clients`; verify status pills (`On Track`, `Attention`, `Follow-up`, `New`) reflect recent workout and check-in history.

---

## 6. Manual End-to-End Verification Checklist (Stage 3A)

1. **Direct Routing & Refresh:** Open `/discover`, `/auth`, `/welcome`, `/join/FIT-ARJUN-2026`, `/join/FIT-EXP-000`, and `/unknown-route` directly in the browser and refresh each page. Confirm zero Vercel 404s and confirm `/unknown-route` renders the branded FitPlus 404 page.
2. **Email/Password Registration & Verification Gate:** Create an account on `/auth` with 18+ consent checked. Confirm the Verify Email Gate blocks onboarding and workspace routes until the email verification link is confirmed and `"I've verified — continue"` is clicked.
3. **Google Sign-In & Onboarding:** Sign in with Google, complete Client or Trainer onboarding, and confirm new accounts start with honest empty states (no demo trainers or sample packages merged into cloud storage).
4. **Hydration Persistence:** Log water glasses on `/app/home`, reload the browser, and verify persistence in Firestore `dailyActivity` (not `localStorage`).
5. **RBAC Enforcement:** Sign in as a `client` and visit `/studio/overview` or `/admin`; confirm strict access-denied screen without any demo role-switch bypass. Sign in as platform admin and visit `/admin` to approve/reject trainer verification requests.
6. **Account Deletion:** Open Settings -> Account Deletion modal, type `DELETE`, and confirm `/api/account/delete` removes auth and personal workspace records cleanly.
7. **Isolated Demo Sandbox:** Visit `/demo` from a signed-out session and confirm interactive fixtures work locally without polluting cloud Firestore.
