# FitPlus Production Architecture (Stage 3)

## 1. Platform Overview
FitPlus is an India-first independent personal coaching platform built with:
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (Liquid Glass design system).
- **Routing & Hosting**: React Router v7 SPA hosted on Vercel (`vercel.json` rewrites non-file/non-API routes to `/index.html`) + Express dev/preview parity (`server.ts`) and Vercel Serverless Functions (`/api/*`).
- **Authentication & App Security**: Firebase Authentication (Google Sign-In + Email/Password with `sendEmailVerification` & `sendPasswordResetEmail` + `browserLocalPersistence`), optional Firebase App Check (`ReCaptchaV3Provider`), and server-side Firebase Admin SDK Bearer ID token verification.
- **Database**: Cloud Firestore named database `ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841` in `asia-south1` under Firebase project `gen-lang-client-0381020502`, accessed on the server with `{ preferRest: true }` for low-latency serverless cold starts.
- **Storage**: Firebase Storage (`gen-lang-client-0381020502.firebasestorage.app`) governed by `storage.rules` for private client progress photos and trainer credential uploads.

---

## 2. Logical-to-Physical Firestore Collection Mapping
Existing live collections from Stage 2 are preserved so existing user accounts and indexes remain intact while Stage 3 and Stage 4 add dedicated collections for groups, subscriptions, payments, daily activity, streaks, consent, admin governance, verification, AI logs, reviews, live workouts, nutrition logs, achievements, check-ins, real-time chat, program templates, and scheduled reminders (40 paths total in `firebase-blueprint.json`).

| Logical Concept | Physical Firestore Path | Owner / Access Model |
| :--- | :--- | :--- |
| Core user profile | `/users/{userId}` | Owner read/write (no `admin` self-assignment); Admin read/update |
| Private PII & prefs | `/users/{userId}/private/{docId}` | Strictly Owner only (`email`, `whatsappE164`, `pendingInviteToken`, `notificationPrefs`) |
| Platform admins | `/admins/{userId}` | Owner `get` only; strictly server-provisioned (`allow write: if false`) |
| Trainer storefront | `/trainers/{trainerId}` | Public read if `acceptingClients == true`, or owner/admin; `verificationStatus` admin-gated |
| Coaching packages | `/packages/{packageId}` | Public read if `status == 'active'`, or owning trainer |
| Client profile | `/clients/{clientId}` | Owner read/write + Master Gate linked trainer read/`coachNotes` update |
| Coaching relationship | `/relationships/{relationshipId}` | Linked client or trainer; client `pending`/`active`, trainer `groupId` |
| Client invitations | `/invites/{inviteId}` | Owning trainer list/manage; signed-in `get` for active tokens; `/api/invites/resolve` for public preview |
| Package enrollments | `/enrollments/{enrollmentId}` | Client or trainer participant |
| Client groups | `/clientGroups/{groupId}` | Owning trainer CRUD |
| Group members | `/clientGroups/{groupId}/members/{clientId}` | Owning trainer + Master Gate client check |
| Subscriptions | `/subscriptions/{subscriptionId}` | Client/trainer/admin read; **server-written only** |
| Payments | `/payments/{paymentId}` | Client/trainer/admin read; **server-written only** |
| Task templates | `/templates/{templateId}` | Owning trainer CRUD |
| Client assignments | `/assignments/{assignmentId}` | Client or linked trainer |
| Task completions | `/completions/{completionId}` | Client create/update/delete; linked trainer read |
| Daily activity & hydration | `/dailyActivity/{activityId}` | Client create/update hydration/steps/sleep; trainer `recoveryApproved` |
| Streak summary | `/streaks/{clientId}` | Client create/update; linked trainer read |
| Progress events | `/progressEvents/{eventId}` | Client create/update/delete; linked trainer read |
| Workout plans | `/workoutPlans/{planId}` | Client (self-guided) or linked trainer |
| Meal plans | `/mealPlans/{planId}` | Client (self-guided) or linked trainer |
| Consultation slots | `/consultationSlots/{slotId}` | Trainer create/manage; atomic `existsAfter`/`getAfter` booking sync |
| Consultation bookings | `/bookings/{bookingId}` | Client create with atomic slot lock; terminal states locked |
| In-app notifications | `/notifications/{notificationId}` | Recipient read/update `read`/delete; self or linked trainer create |
| AI plan drafts | `/aiDrafts/{draftId}` | Owning trainer CRUD until `'saved'` |
| AI generation logs | `/aiGenerations/{generationId}` | Trainer/admin read; **server-written only** |
| Privacy & health consent | `/consentRecords/{consentId}` | Immutable append-only compliance trail (`allow update, delete: if false`) |
| Security audit logs | `/auditLogs/{logId}` | Admin read; **server-written only** |
| Trainer verification queue | `/trainerVerificationRequests/{requestId}` | Trainer submit (`pending`); Admin approve/reject (`isAdmin()`) |
| Coach reviews | `/reviews/{reviewId}` | Public read; create only if authentic `/relationships/{relationshipId}` exists |
| Custom exercises | `/exercises/{exerciseId}` | Public built-ins + Trainer custom exercises |
| Live workout sessions | `/workoutSessions/{sessionId}` | Client create/update with set logs, 1RM & volume; linked trainer read |
| Persistent achievement unlocks | `/achievements/{achievementId}` | Client create (server-evaluated deduplicated milestones); linked trainer read |
| Daily nutrition logs | `/nutritionLogs/{logId}` | Client create/update daily meals & water; linked trainer `trainerFeedback` |
| Weekly client check-ins | `/weeklyCheckIns/{checkInId}` | Client create weekly reflection; linked trainer review & feedback |
| Chat conversations | `/conversations/{conversationId}` | Participant read/create/update (`participantUserIds`); admin delete |
| Chat messages | `/conversations/{conversationId}/messages/{messageId}` | Participant read/create; immutable author; read receipts |
| Workout program templates | `/workoutTemplates/{templateId}` | Trainer create/update/delete; public or shared read |
| Nutrition program templates | `/nutritionTemplates/{templateId}` | Trainer create/update/delete; public or shared read |
| Scheduled reminders | `/scheduledReminders/{reminderId}` | Trainer create/manage; Indian quiet hours evaluation |

---

## 3. RBAC & Authentication Architecture
1. **Verified Email Requirement**: `isVerifiedUser()` in `firestore.rules` and `verifyAuthenticatedRequest()` in `api/_lib/firebaseAdmin.ts` enforce `email_verified == true` for cloud writes and privileged API routes. Unverified email/password sign-ups are held in an explicit verification gate in `/auth` until `emailVerified` is confirmed.
2. **Role Separation**:
   - `client`: `/app/*` (`Today`, `Plan`, `Progress`, `Coach`, `Consultations`, `Profile`, `Settings`, `Notifications`).
   - `trainer`: `/studio/*` (`Overview`, `Clients`, `Assign`, `Templates`, `AI Builder`, `Packages`, `Consultations`, `Storefront`, `Settings`, `Notifications`).
   - `admin`: `/admin` (Platform governance, trainer verification approval, audit logs). Determined strictly by `/admins/{uid}` or verified `FITPLUS_ADMIN_EMAIL` bootstrap — never selectable via signup or onboarding.
3. **Demo Sandbox Isolation**:
   - Unauthenticated visitors can explore `/discover`, `/welcome`, `/auth`, `/join/:token` (sanitized via `/api/invites/resolve` or sample demo tokens), or explicitly enter the local demo sandbox (`/demo` or demo preview buttons).
   - Authenticated Firebase Cloud users **never** merge seed/fixture trainers, packages, or invites into `cloudStore`.

---

## 4. Storage Layout (`storage.rules`)
- `/private/clients/{userId}/progress/{fileName}`: Strictly readable/writable by owning verified client (`image/*`, max 8 MB). Readable by an authorized trainer only when custom metadata contains `sharedWithTrainer == 'true'` and `authorizedTrainerUid == request.auth.uid`.
- `/private/trainers/{userId}/credentials/{fileName}`: Owner write (`image/*` or `application/pdf`, max 10 MB); owner or admin read.
- `/private/messages/{conversationId}/{fileName}`: Conversation participant read/write (`image/*`, max 5 MB) for chat attachments.

---

## 5. Server & API Layer (`/api/*` + `server.ts`)
- `GET /api/health`: Non-secret runtime readiness report (Firebase Admin config status, named DB, App Check, Gemini, Cashfree Sandbox/Production readiness). Never initializes Firebase Admin synchronously so `/api/health` reliably returns HTTP 200.
- `GET /api/invites/resolve?token=...`: Returns sanitized non-PII invite state, trainer summary, and active packages without exposing client emails/labels.
- `POST /api/payments/create-order`: Server-verified INR package checkout via Cashfree `POST /pg/orders` (or instant ₹0 free-tier enrollment).
- `POST /api/payments/verify`: Queries Cashfree `GET /pg/orders/{order_id}` + `/payments` server-side before activating `subscriptions`, `enrollments`, `relationships`, and invoices.
- `POST /api/payments/webhook`: Verifies Cashfree `x-webhook-signature` + `x-webhook-timestamp` (`Base64(HMAC-SHA256)`) on raw body with idempotency, test-event recognition (`TEST_WEBHOOK`, `order_test_*`), and out-of-order protection.
- `POST /api/payments/refund`: Admin-only Cashfree refund trigger (`POST /pg/orders/{order_id}/refunds`) with audit logging.
- `POST /api/account/delete`: Verifies Firebase ID token, removes user-scoped Firestore documents, logs a deletion event to `/auditLogs`, and deletes the Firebase Auth user via Admin SDK.

---

## 6. Composite Indexes (`firestore.indexes.json`)
Composite indexes support:
- `assignments` by `clientUserId` + `createdAt`, and `trainerUserId` + `createdAt`
- `completions` by `clientId` + `dateKey`
- `dailyActivity` by `clientId` + `dateKey`
- `progressEvents` by `clientId` + `dateKey`
- `bookings` by `clientUserId` + `dateKey` and `trainerUserId` + `dateKey`
- `consultationSlots` by `trainerId` + `status` + `dateKey`
- `notifications` by `recipientUserId` + `createdAt`
- `payments` & `subscriptions` by `clientUserId` + `createdAt` and `trainerUserId` + `createdAt`
- `trainerVerificationRequests` by `status` + `createdAt`
- `reviews` by `trainerId` + `createdAt`
- `workoutSessions` by `clientId` + `dateKey`
- `nutritionLogs` by `clientId` + `dateKey`
- `weeklyCheckIns` by `clientId` + `weekKey`
- `achievements` by `clientId` + `unlockedAt`
- `conversations` by `participantUserIds` (array-contains) + `updatedAt`
- `messages` subcollection by `conversationId` + `createdAt`
- `workoutTemplates` & `nutritionTemplates` by `trainerUserId` + `updatedAt`
- `scheduledReminders` by `trainerUserId` + `scheduledFor` + `status`

---

## 7. Stage 4A Performance & Read-Efficiency Architecture
1. **Scoped Workspace Subscriptions**:
   - `subscribeAuthenticatedWorkspace` accepts authenticated user role (`client` vs `trainer` vs `admin`) and attaches only relevant collection queries.
   - Public marketplace collections (`trainers`, `packages`, `reviews`) use cached one-time `getDocs` reads instead of 40+ concurrent real-time `onSnapshot` listeners.
2. **Route-Level Code Splitting**:
   - All application sub-routes are code-split using `React.lazy` and wrapped in `Suspense` with an Apple-inspired Liquid Glass `RouteLoadingFallback`.
   - Client routes (`LiveWorkoutPage`, `NutritionDiaryPage`, `WeeklyCheckInPage`, `WrappedPage`, `ExerciseLibraryPage`), Trainer Studio routes, and Admin routes are loaded on-demand.
   - Production bundle initial chunks remain lightweight (<25 kB per route chunk).
3. **Optimistic Local Storage & Draft Safety**:
   - Live workout in-progress sessions are auto-saved to local browser storage (`fitplus_live_workout_draft_{clientId}`) every 5 seconds to protect users against accidental tab closures or mobile browser refreshes.
   - Completed workout sessions clear local drafts automatically upon cloud sync.

---

## 8. Stage 4B Coaching Operations & Automation Architecture
1. **FitPlus Connect (In-App Messaging & WhatsApp Bridge)**:
   - Real-time 1-to-1 coach-client chat backed by `/conversations` and subcollection `/messages`.
   - Deterministic conversation IDs `[uidA, uidB].sort().join('__')`.
   - Unread count badge integration into navigation bars.
   - Rich plan reference embedding (direct links to workout and nutrition programs within chat bubbles).
   - User-initiated WhatsApp click-to-chat bridge (`wa.me`) with pre-configured contextual coaching templates.
2. **Visual Workout Studio & Nutrition Studio**:
   - Multi-week visual workout builder linked to curated `exerciseLibrary.ts` (28+ movements) with live set/rep/volume calculations.
   - Visual Indian nutrition builder linked to `indianFoods.ts` (IFCT/NIN-referenced items) with dynamic portion scaling (katori, phulka, cup, piece, 100g) and live macro totals.
   - Gemini AI Copilot drafting pipeline with schema constraints and deterministic fallbacks.
   - Master template library persistence in `/workoutTemplates` and `/nutritionTemplates`.
3. **Client Pulse & Automated Retention**:
   - Deterministic 4-state engagement algorithm: `on_track` (adherence >= 75%), `needs_attention` (inactivity >= 4 days, adherence < 50%), `follow_up_recommended` (inactivity 3 days, unreviewed check-in), and `insufficient_data` (new onboarding).
   - Studio Overview Action Center sorting urgent coaching actions.
   - Scheduled reminder architecture (`/scheduledReminders`) with Indian quiet hours (22:00–07:00 IST) suppression.
