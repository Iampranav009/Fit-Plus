# FitPlus Migration Verification & Reconciliation

## 1. Verification Checklist

- [x] `@supabase/supabase-js` installed in `package.json`.
- [x] Environment configuration updated with Supabase project keys in `.env` and `.env.example`.
- [x] SQL migration files created (`001_base_schema.sql`, `002_rls_policies.sql`, `003_functions_triggers.sql`, `004_indexes.sql`, `005_storage_buckets.sql`).
- [x] TypeScript database definitions generated in `src/types/database.types.ts`.
- [x] Browser Supabase client configured with Firebase third-party auth in `src/lib/supabase.ts`.
- [x] Serverless Supabase Admin client configured in `api/_lib/supabaseAdmin.ts`.
- [x] Storage helper configured with 5 buckets in `src/lib/supabaseStorage.ts`.
- [x] All 5 Supabase Storage buckets provisioned and verified live in the Supabase project.
- [x] `/api/health` updated to report readiness for Firebase Auth, Supabase DB, Supabase Storage, Gemini, and Cashfree.
- [x] `/api/ai/generate-plan` refactored to persist to Supabase and handle rate limits safely without crashing.
- [x] Cashfree payment capture dual-synchronized in `api/_lib/payments.ts`.
- [x] Chat permission crash in `markConversationReadDoc` resolved so trainer mode chat operates smoothly.
- [x] Migration scripts implemented in `scripts/migration/01_export_firestore.ts` through `05_migrate_storage.ts`.

---

## 2. Running Reconciliation

To verify data consistency between Firestore and Supabase:
```bash
npx tsx scripts/migration/04_verify_migration.ts
```
Expected output reports the exact row counts for `app_users`, `trainer_profiles`, `client_profiles`, `coaching_packages`, `coaching_relationships`, `subscriptions`, `payment_records`, `chat_conversations`, and `chat_messages`.
