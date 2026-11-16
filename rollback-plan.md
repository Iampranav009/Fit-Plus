# FitPlus Migration Rollback Plan

## 1. Safety Principles

1. **Zero Data Loss**: During the migration window, Firebase Authentication and Firestore remain intact as a fallback data source.
2. **Provider Selection Toggle**: The application runtime includes environment switches:
   - `DATABASE_PROVIDER=supabase` (or `firebase`)
   - `STORAGE_PROVIDER=supabase` (or `firebase`)
   - `AUTH_PROVIDER=firebase` (constant)
3. **Dual Synchronization**: Payment activations and conversation writes update both systems during transition.

---

## 2. Immediate Rollback Procedure

If a critical issue is discovered after deployment:

1. **Revert Provider Environment Variables in Vercel**:
   ```
   DATABASE_PROVIDER=firebase
   STORAGE_PROVIDER=firebase
   ```
2. **Redeploy Current Production Build**:
   Trigger a zero-downtime redeploy in the Vercel dashboard. The application will resume reading and writing from Cloud Firestore.
3. **Reconcile Transactions**:
   Run `scripts/migration/04_verify_migration.ts` to identify any payments or subscriptions created in Supabase during the window, and mirror them back to Firestore.
