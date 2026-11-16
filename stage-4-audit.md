# FitPlus — Stage 4 Audit Report

> **Audit scope**: Complete codebase inspection prior to Stage 4A–4D execution (`https://fitplus-kappa.vercel.app/`, React 19 + Vite 8 + Firebase Auth/Firestore/Storage/Admin + Gemini AI + Cashfree PG Sandbox + Vercel serverless `/api/*`).
> **Execution rule**: Resolve critical audit defects (listener efficiency, initial bundle code splitting, hardcoded input defaults) alongside Stage 4A implementation, and stop for review after Stage 4A before proceeding to 4B/4C/4D.

---

## 1. Feature Status Inventory

### Functional (Preserve & Extend)
- **Authentication & Verification**: Google Sign-In, Email/Password registration, Email verification gate, password recovery, onboarding role routing (`src/context/AppContext.tsx`, `src/pages/public/AuthPage.tsx`, `src/App.tsx`).
- **SPA Routing & Serverless Health**: `vercel.json` rewrites SPA routes while preserving `/api/*` and static assets; `/api/health` returns non-secret readiness JSON.
- **Role-Based Access & Client–Trainer Linking**: `ProtectedRoute`, `CoachingRelationship` pending/active/ended lifecycle, `/api/relationships/respond`, trainer-scoped client visibility.
- **Task Assignment & Streaks Engine**: Bulk assignments with duplicate skipping and custom overrides (`src/lib/engines.ts`), streak & 12-week heatmap calculation (`src/lib/streak.ts`) with trainer-approved recovery days and zero app-open streak inflation.
- **Cashfree Sandbox Payments & Subscriptions**: `/api/payments/{create-order,verify,webhook,refund}` with server-authoritative INR pricing, HMAC webhook signature checks, idempotent webhook event logging, and legacy Razorpay field preservation.
- **AI Plan Copilot (Trainer)**: `/api/ai/generate-plan` using Gemini `@google/genai` with deterministic fallback, draft editing, and template conversion.
- **Consultations, Reviews & Admin Moderation**: Atomic slot/booking transitions (`firestore.rules`), relationship-verified trainer reviews, trainer credential verification & moderation console (`/admin`).
- **PWA & Branded SVGs**: `vite-plugin-pwa`, offline banner, Liquid Glass components (`GlassNavigation`, `GlassTabBar`, `GlassSheet`, `GlassModal`, `GlassSegmentedControl`, `ActivityRing`, `MetricCard`, `TrendChart`, `Heatmap`, `StreakIndicator`).

### Partially Functional / Needs Elevation
- **Client Today Dashboard (`src/pages/client/TodayPage.tsx`)**: Renders a static hero layout regardless of training vs recovery vs new-user vs all-completed state; lacks workout-mode launch CTA, nutrition macro/diary summary card, trainer feedback preview, and achievement milestone progress.
- **Achievements (`src/pages/client/ProgressPage.tsx`)**: Only 4 transient badges (`7-day`, `10 active days`, `strength benchmark`, `3+ check-ins`). Missing `14`, `30`, `60`, `100`-day streak milestones, `First workout`, `Personal Strength Record`, `30 active days`, persistent deduplicated unlock ledger (`achievements`), and animated celebration modal.
- **Anatomical Graphics (`src/components/ui/FitnessIllustrations.tsx`)**: `MuscleGroupEmblem` is a small 44px abstract torso box; lacks detailed anatomical muscle-group SVGs highlighting primary and secondary target muscles.
- **Task Logging (`src/pages/client/TaskDetailPage.tsx`)**: Line 43 hardcodes `'8200'` as default `loggedValue` for `log_value` tasks instead of leaving empty or pulling a realistic target/previous value.
- **Client Profile Page (`src/pages/client/ProfilePage.tsx`)**: Line 135 displays `"Role preview switcher, timezone & QA states"` for cloud users as well as demo users; should adapt copy cleanly for production cloud accounts.

### Missing (Required by Stage 4)
- **Stage 4A — Client Engagement & Core Product Loops**:
  - **Interactive Live Workout Mode**: No set-by-set tracking, rep/weight logging, rest countdown timer, elapsed timer, pause/resume, previous performance comparison, PR detection, exercise substitution picker, or refresh-safe mid-workout draft persistence.
  - **Structured Exercise Library**: No curated India-accessible home/gym exercise database (`exercises`), muscle/equipment filters, instructions/common mistakes/safety notes, substitutions, anatomical SVG diagrams, or custom trainer exercise creation.
  - **Nutrition Diary**: `PlanPage.tsx` only shows static trainer `MealPlan` cards; no interactive daily diary (`nutritionLogs`), IFCT/NIN-aligned Indian food catalog with estimated macros, portion adjustment, water sync, notes, or trainer feedback loop.
  - **Weekly Client Check-ins**: Only a numeric `checkin` `1–10` score exists in `ProgressEvent`; missing structured weekly check-in (`weeklyCheckIns`) with energy/sleep/difficulty/hunger 1–5 ratings, schedule challenges, optional weight & private progress photo, historical comparison, and trainer feedback.
  - **FitPlus Wrapped**: No monthly activity recap generator (`WrappedPage`) or `9:16` / `4:5` Canvas card exporter with strict privacy opt-in toggles.
- **Stage 4B–4D (Deferred Until After Stage 4A Checkpoint Approval)**:
  - **4B**: Real-time in-app messaging / WhatsApp notifications, trainer workout program builder linked to Exercise Library, visual meal plan builder, client retention & churn alerts, automated reminder scheduling.
  - **4C**: Referral program, coach comparison & saved coaches, public trainer achievements/badges, onboarding drip / trial conversion flows, landing page trust/ROI polish.
  - **4D**: Analytics/funnel tracking, Sentry/structured observability, cashfree production readiness checklist, E2E verification, SEO & Lighthouse pass.

---

## 2. Security, Read-Efficiency & Performance Audit Findings

1. **Firestore Read Amplification (`src/data/firestoreService.ts:2275-3135`) — HIGH**:
   - `subscribeAuthenticatedWorkspace` currently attaches **40+ concurrent real-time `onSnapshot` listeners** for *every* signed-in user regardless of whether the account is a `client` or `trainer`, including subscribing in real time to public marketplace collections (`trainers`, `packages`, `reviews`, `consultationSlots where status == 'available'`) that `fetchPublicTrainersAndPackages` already fetches once!
   - **Stage 4A Fix**:
     - Pass the user's `role` (`'client' | 'trainer' | 'admin'`) into `subscribeAuthenticatedWorkspace` and scope role-specific listeners accordingly (clients don't subscribe to `templates`, `invites`, `aiDrafts`, `clientGroups`, or `trainerUserId` dual queries when role is strictly `client`; trainers don't subscribe to redundant `clientUserId` queries unless needed).
     - Fetch public directory collections (`trainers`, `packages`, `reviews`) via cached one-time `getDocs` (`publicDirectory`) instead of permanent real-time `onSnapshot` listeners across all logged-in clients, keeping only `ownTrainers` / `ownPackages` / `activeCoach` real-time where mutations occur.
2. **Initial Bundle Size / Lack of Route Code Splitting (`src/App.tsx:13-52`) — MEDIUM**:
   - All 27+ page modules (public, onboarding, client, trainer studio, admin) are statically imported in `src/App.tsx`, increasing initial download & parse cost on mobile.
   - **Stage 4A Fix**: Convert secondary/role-specific pages and new Stage 4A routes (`LiveWorkoutPage`, `ExerciseLibraryPage`, `NutritionDiaryPage`, `WeeklyCheckInPage`, `WrappedPage`, Studio & Admin routes) to `React.lazy` + `Suspense` with a sleek Liquid Glass fallback.
3. **Hardcoded Placeholder Value in `TaskDetailPage.tsx:43` — LOW/UX**:
   - Hardcoded `'8200'` pre-populates `loggedValue` for any `log_value` task even before the user logs anything.
   - **Stage 4A Fix**: Default `loggedValue` to `completion?.loggedValue || ''` with an informative placeholder derived from `assignment.targetLabel`.
4. **Haptic Feedback & Reduced Motion Discipline**:
   - Ensure tactile `navigator.vibrate?.(...)` helper degrades safely on unsupported browsers and respects `prefers-reduced-motion` across new workout timers and achievement unlock animations.
5. **Firebase Security Rules Synchronicity (`firestore.rules` + `firebase-blueprint.json` + `src/lib/firestoreValidation.ts`)**:
   - Every new Stage 4A Firestore collection (`/exercises/{exerciseId}`, `/workoutSessions/{sessionId}`, `/achievements/{achievementId}`, `/nutritionLogs/{logId}`, `/weeklyCheckIns/{checkInId}`) must strictly enforce:
     - Verified user gate (`isVerifiedUser()`)
     - Exact `keys().hasAll(...)` / `keys().hasOnly(...)` field allowlists
     - Immutable ownership/relationship IDs and `createdAt == request.time`
     - Strict trainer access verification (`activeTrainerUserId == request.auth.uid` or active relationship lookup) and trainer-feedback updates isolated via `affectedKeys().hasOnly(...)`.

---

## 3. Existing Reusable Components Verified

- Layout & Nav: `AppShell`, `GlassSidebar`, `GlassTopHeader`, `GlassTabBar`, `ErrorBoundary`, `OfflineIndicator`
- UI Controls: `GlassButton`, `GlassSheet`, `GlassModal`, `GlassSegmentedControl`, `GlassSearchBar`, `FloatingActionButton`, `InputField`, `TextAreaField`, `ToastContainer`
- Data Visualization & Media: `ActivityRing`, `MetricCard`, `StreakIndicator`, `StreakIntroModal`, `TrendChart`, `Heatmap`, `EmptyState`, `MediaImage`, `StreakFlameSvg`, `MuscleGroupEmblem`, `WeightManagementSvg`, `AchievementBadgeSvg`, `SkeletonBlock`

---

## 4. Stage 4A Execution Plan (Current Checkpoint Scope)

1. **Audit Fixes First**: Optimize `subscribeAuthenticatedWorkspace` role-based listeners + eliminate redundant public `onSnapshot` listeners; add `React.lazy` route splitting; remove hardcoded `'8200'` default in `TaskDetailPage.tsx`; refine `ProfilePage.tsx` cloud vs demo copy.
2. **Domain, Catalogs & Deterministic Engines**:
   - `src/types/domain.ts`: Add `ExerciseDefinition`, `WorkoutSession`, `WorkoutExerciseLog`, `WorkoutSetLog`, `AchievementUnlock`, `NutritionFoodItem`, `NutritionMealLog`, `NutritionDiaryEntry`, `WeeklyCheckIn`, `WrappedMonthlySummary`.
   - `src/data/exerciseLibrary.ts`: 28+ structured gym/home/bodyweight/equipment exercises with instructions, mistakes, safety notes, alternatives, muscle maps.
   - `src/data/indianFoods.ts`: Indian food composition dataset (IFCT/NIN-referenced clearly-marked estimated macros & kcal per standard Indian serving — katori, phulka, bowl, cup, piece, 100g).
   - `src/lib/workoutEngine.ts`, `src/lib/achievementsEngine.ts`, `src/lib/wrappedEngine.ts`: Deterministic volume/PR tracking, local draft recovery, deduplicated milestone evaluation, and privacy-first Wrapped computation + Canvas 9:16 / 4:5 card exporter.
3. **Firebase Blueprint, Validation & Rules Sync**:
   - Update `firebase-blueprint.json`, `src/lib/firestoreValidation.ts`, `firestore.rules`, `firestore.indexes.json`, `src/data/firestoreService.ts`, and deploy updated rules.
4. **Stage 4A Pages & Visual Craft**:
   - Upgrade `FitnessIllustrations.tsx` (anatomical front/back highlighted SVG + extended achievement medallions) & add `src/lib/haptics.ts` + `AchievementUnlockModal`.
   - Refine `TodayPage.tsx` (adaptive day states, workout launch, nutrition macro card, trainer feedback snippet, achievement milestone bar).
   - Create `LiveWorkoutPage.tsx` (`/app/workout` & `/app/workout/:dayIndex`).
   - Create `ExerciseLibraryPage.tsx` (`/app/exercises` + custom trainer exercise creation in Studio).
   - Create `NutritionDiaryPage.tsx` (`/app/nutrition` + integrate seamlessly with `PlanPage.tsx` and trainer review in `StudioClientDetailPage.tsx`).
   - Create `WeeklyCheckInPage.tsx` (`/app/check-in` + trainer review & feedback UI in `StudioClientDetailPage.tsx`).
   - Create `WrappedPage.tsx` (`/app/wrapped` + Canvas Story/Feed export & privacy toggles) and expand `ProgressPage.tsx` with full achievement gallery & navigation links.
5. **Verification & Stage 4A Checkpoint Stop**:
   - Update `design.md`, `architecture.md`, `testing.md`, `CHANGELOG.md`.
   - Add unit + Firestore rules tests; run `compile_applet`, `lint_applet`, `npm test`, `npm run test:rules`, `vite build` chunk measurement, and emulator check.
   - **STOP** and present the 8-part Stage 4A checkpoint report.
