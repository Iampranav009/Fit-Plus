# FitPlus Database & Storage Migration Audit — Stage 4E

## 1. Executive Summary

FitPlus is migrating its entire persistence layer (Cloud Firestore and Firebase Storage) to Supabase (PostgreSQL, Supabase Storage, and Supabase Realtime). 
Firebase Authentication remains the sole user identity provider. Firebase Google Sign-In, email/password authentication, and Firebase Admin token verification are strictly preserved.

This audit catalogs all Firestore collections, real-time listeners, Storage buckets, and API routes currently in the FitPlus codebase, providing the architectural foundation for the relational database schema, migration scripts, and RLS policies.

---

## 2. Inventory of Firestore Collections & PostgreSQL Mapping

The codebase manages 41 distinct collections and subcollections across Identity, Coaching, Communication, Commerce, and Administration domains:

| # | Firestore Collection | Document ID Strategy | PostgreSQL Table Name | Domain | Migration Complexity |
|---|----------------------|----------------------|-----------------------|--------|----------------------|
| 1 | `users` | Firebase UID (String) | `app_users` | Identity | High (Auth anchor) |
| 2 | `users/{uid}/private/contact` | Sub-document | `app_users` (columns) | Identity | Low (merged into `app_users`) |
| 3 | `admins` | Firebase UID | `platform_admins` | Identity | Low |
| 4 | `trainers` | `tr_<uid>` or UUID | `trainer_profiles` | Marketplace | High |
| 5 | `clients` | `cl_<uid>` or UUID | `client_profiles` | Coaching | High |
| 6 | `relationships` | `rel_<id>` | `coaching_relationships` | Coaching | High |
| 7 | `invites` | `inv_<id>` / token | `trainer_invites` | Growth | Medium |
| 8 | `packages` | `pkg_<id>` | `coaching_packages` | Commerce | Medium |
| 9 | `enrollments` | `enr_<id>` | `enrollments` | Commerce | Medium |
| 10 | `subscriptions` | `sub_<id>` | `subscriptions` | Commerce | High |
| 11 | `payments` | `pay_<id>` / orderId | `payment_records` | Commerce | High (Financial) |
| 12 | `reviews` | `rev_<id>` | `trainer_reviews` | Social Proof | Medium |
| 13 | `templates` | `tmpl_<id>` | `task_templates` | Coaching | Medium |
| 14 | `assignments` | `asgn_<id>` | `task_assignments` | Fitness | High |
| 15 | `completions` | `comp_<id>` | `task_completions` | Fitness | High |
| 16 | `progressEvents` | `prog_<id>` | `progress_events` | Fitness | Medium |
| 17 | `workoutPlans` | `wp_<id>` | `workout_plans` | Fitness | High |
| 18 | `mealPlans` | `mp_<id>` | `meal_plans` | Nutrition | High |
| 19 | `consultationSlots` | `slot_<id>` | `consultation_slots` | Scheduling | Medium |
| 20 | `bookings` | `book_<id>` | `consultation_bookings`| Scheduling | Medium |
| 21 | `notifications` | `notif_<id>` | `notifications` | Communication | Medium |
| 22 | `aiDrafts` | `aidraft_<id>` | `ai_plan_drafts` | AI Studio | High |
| 23 | `dailyActivity` | `act_<uid>_<dateKey>`| `daily_activity` | Habit Tracking | Medium |
| 24 | `streaks` | `strk_<uid>` | `streak_records` | Gamification | Medium |
| 25 | `clientGroups` | `grp_<id>` | `client_groups` | Coaching | Medium |
| 26 | `clientGroups/{id}/members` | `mem_<id>` | `client_group_members` | Coaching | Medium |
| 27 | `consentRecords` | `cns_<id>` | `consent_records` | Compliance | Low |
| 28 | `trainerVerificationRequests` | `vrf_<id>` | `trainer_verification_requests` | Compliance | Medium |
| 29 | `auditLogs` | `aud_<id>` | `audit_logs` | Compliance | Low |
| 30 | `exercises` | `ex_<id>` | `exercise_definitions` | Fitness Library | Low |
| 31 | `workoutSessions` | `wsess_<id>` | `workout_sessions` | Fitness Logs | High |
| 32 | `achievements` | `ach_<id>` | `achievement_unlocks` | Gamification | Low |
| 33 | `nutritionLogs` | `nutr_<id>` | `nutrition_diary_entries`| Nutrition Logs | High |
| 34 | `weeklyCheckIns` | `wcin_<id>` | `weekly_check_ins` | Coaching Review | High |
| 35 | `conversations` | `conv_<cId>_<tId>` | `chat_conversations` | Communication | High |
| 36 | `conversations/{id}/messages`| `msg_<id>` | `chat_messages` | Communication | High |
| 37 | `workoutTemplates` | `wtmpl_<id>` | `workout_program_templates` | Studio | Medium |
| 38 | `nutritionTemplates`| `ntmpl_<id>` | `nutrition_program_templates`| Studio | Medium |
| 39 | `scheduledReminders`| `rem_<id>` | `scheduled_reminders` | Automations | Low |
| 40 | `coupons` | `coup_<id>` / code | `coupons` | Commerce | Low |
| 41 | `referrals` | `ref_<id>` | `referrals` | Growth | Medium |

---

## 3. Realtime Listeners Inventory (`onSnapshot`)

The codebase currently sets up 57 individual `onSnapshot` listeners inside `subscribeAuthenticatedWorkspace` and per-conversation listeners.
These will be replaced with Supabase Realtime channels scoped per domain:

1. **User & Identity Channel**: `app_users`, `platform_admins`
2. **Coaching Relationships Channel**: `coaching_relationships`, `trainer_invites`, `enrollments`
3. **Fitness & Activity Channel**: `task_assignments`, `task_completions`, `workout_sessions`, `streak_records`, `daily_activity`
4. **Plans & Templates Channel**: `workout_plans`, `meal_plans`, `ai_plan_drafts`, `workout_program_templates`, `nutrition_program_templates`
5. **Communication Channel**: `notifications`, `chat_conversations`, `chat_messages` (scoped to active conversation)
6. **Commerce Channel**: `payment_records`, `subscriptions`, `consultation_bookings`

---

## 4. Firebase Storage Migration to Supabase Storage

Current Firebase Storage uses:
1. `trainers/{trainerId}/photo_{timestamp}` -> Public trainer profile photos.
2. `trainers/{trainerId}/cover_{timestamp}` -> Public trainer cover images.
3. `clients/{clientId}/progress/{timestamp}` -> Private client progress photos.
4. `clients/{clientId}/checkins/{checkInId}` -> Private weekly check-in photos.
5. `verification/{trainerId}/{file}` -> Private trainer certification/ID documents.
6. `chat/{conversationId}/{file}` -> Private coaching chat attachments.

Supabase Storage Buckets to Create:
1. `public-trainer-assets` (Public) — Profile pictures, cover headers. Max 5MB. MIME: jpeg, png, webp.
2. `profile-avatars` (Public) — User avatar pictures. Max 2MB. MIME: jpeg, png, webp.
3. `progress-photos` (Private, RLS-protected) — Progress tracking photos. Max 10MB.
4. `coaching-attachments` (Private, RLS-protected) — Chat message images/PDFs. Max 20MB.
5. `verification-documents` (Private, RLS-protected) — Trainer certificates & ID proofs. Max 10MB.

---

## 5. API Routes Inventory & Firestore Dependencies

| API Route | Current Firestore Operations | Supabase Migration Path |
|---|---|---|
| `api/health.ts` | Ping Firestore | Health check for Firebase Auth + Supabase DB + Storage + Gemini + Cashfree |
| `api/ai/generate-plan.ts` | Read client & plan data, write aiDrafts | Supabase Admin query client history, upsert `ai_plan_drafts` |
| `api/payments/create-order.ts` | Read package & coupon, create payment doc | Supabase Admin query `coaching_packages`, `coupons`, insert `payment_records` |
| `api/payments/verify.ts` | Batch write: payment, sub, relationship | Atomic Supabase RPC function `activate_payment_subscription` |
| `api/payments/webhook.ts` | Idempotent check, batch activation | Atomic Supabase RPC function `activate_payment_subscription` |
| `api/payments/refund.ts` | Update payment, cancel subscription | Supabase Admin update `payment_records`, `subscriptions` |
| `api/admin/overview.ts` | Count collections across Firestore | Fast SQL aggregations on Supabase tables |
| `api/account/delete.ts` | Batch delete user documents | Foreign-key CASCADE or admin delete from `app_users` |
| `api/invites/resolve.ts` | Query invite token doc | Supabase query `trainer_invites` |
| `api/relationships/respond.ts`| Update relationship doc | Supabase update `coaching_relationships` |
| `api/streaks/recalculate.ts` | Read completions, update streak doc | PostgreSQL function or Supabase query |
| `api/auth/provision-claims.ts`| (New) | Provision `role: authenticated` custom claim on Firebase token |

---

## 6. Migration Risk & Mitigation Matrix

1. **Firebase UID vs UUID**: Firebase UIDs are arbitrary alphanumeric strings (e.g. `rnmf3FFBtuVH15ASOGoOhZfT1TD2`). **Mitigation**: All user identity columns are `TEXT` primary/foreign keys. Never cast to UUID.
2. **Third-party Auth RLS**: Supabase RLS policies read `auth.jwt()->>'sub'` to match the verified Firebase UID. **Mitigation**: Standardized helper function `current_firebase_uid()`.
3. **Financial Precision**: Firestore stored INR in floats in some legacy places. **Mitigation**: All monetary amounts in PostgreSQL are strictly stored as `INTEGER` in paise (1 INR = 100 paise) and `price_inr` computed/stored as exact integers.
4. **Dual Writes / Zero Data Loss**: Provide migration scripts and backward-compatible data service so that frontend can seamlessly operate against Supabase while preserving Firebase Auth credentials.
