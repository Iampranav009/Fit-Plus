# FitPlus Owner Configuration Guide

## 1. Supabase SQL Migration Execution

The SQL migration scripts in `supabase/migrations/` should be executed in your Supabase project:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/rayzmyfanubpuqdsencw) > **SQL Editor**.
2. Run in order:
   - `001_base_schema.sql` (Tables and constraints)
   - `002_rls_policies.sql` (Row Level Security)
   - `003_functions_triggers.sql` (Triggers & atomic activation RPC)
   - `004_indexes.sql` (Performance indexes & Realtime publications)
   - `005_storage_buckets.sql` (Storage buckets & storage RLS)
   - `006_security_hardening.sql` (Privilege escalation defenses & audit logs)
   - `seed.sql` (Default feature flags and coupons)

---

## 2. Supabase Third-Party Firebase Auth Setting

1. In Supabase Dashboard, navigate to **Authentication** > **Providers** > **Third-Party Auth**.
2. Select **Firebase Auth**.
3. Verify that your Firebase Project ID is set to: `gen-lang-client-0381020502`.
4. Save configuration.

---

## 3. Cashfree Production Cutover

When ready to accept live payments from real credit cards and UPI accounts:
1. Complete Cashfree merchant business KYC.
2. In Vercel Project Settings > **Environment Variables**, update:
   - `CASHFREE_APP_ID`: Your production App ID (starts with `CF_PROD_` or similar)
   - `CASHFREE_SECRET_KEY`: Your production Secret Key (`cfsk_ma_prod_...`)
   - `CASHFREE_ENV`: `production`
   - `VITE_CASHFREE_ENV`: `production`
3. In Cashfree Merchant Dashboard > **Developers** > **Webhooks**:
   - Set Webhook URL to: `https://fitplus-kappa.vercel.app/api/payments/webhook`
   - Select events: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `REFUND_STATUS_WEBHOOK`
   - Set Webhook Version to: `2025-01-01`.
