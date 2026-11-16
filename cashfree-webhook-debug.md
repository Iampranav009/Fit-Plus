# FitPlus — Cashfree Webhook Defect Investigation & Resolution (Checkpoint 4B.0)

**Endpoint:** `https://fitplus-kappa.vercel.app/api/payments/webhook`  
**API / Webhook Version:** `2025-01-01` (with `2023-08-01` fallback compatibility)  
**Gateway Mode:** Cashfree Payments Sandbox (`sandbox.cashfree.com/pg`) / Production  
**Status:** Code Resolved, Tests Passing, Awaiting Production Redeployment by Owner  

---

## 1. Defect Report & Symptoms

In the Cashfree Merchant Dashboard under **Payment Gateway -> Developers -> Webhooks**:
- Registering or testing `https://fitplus-kappa.vercel.app/api/payments/webhook` produced the error:
  > *"The endpoint did not respond properly to the test."*
- Probing deployed `/api/health` and other endpoints on `fitplus-kappa.vercel.app` returned:
  ```http
  HTTP/2 500
  A server error has occurred
  FUNCTION_INVOCATION_FAILED
  bom1::...
  ```

---

## 2. Root Cause Analysis

Four distinct root causes were identified through inspection of Vercel runtime behavior, Node.js engines, Cashfree specifications, and serverless bundle execution:

### Root Cause 1: Node.js Engine Mismatch in `package.json`
- **Issue**: `firebase-admin@14.5.1` explicitly requires Node.js `{ node: '>=22' }`.
- **Finding**: `package.json` had no `"engines"` specification. Vercel defaults unconfigured repositories to Node.js 20.x, triggering fatal cold-start errors when Node 20 attempts to load `firebase-admin@14.5.1`.
- **Resolution**: Added `"engines": { "node": ">=22.x" }` to `package.json`.

### Root Cause 2: Fatal Top-Level Imports in API Handlers
- **Issue**: `api/health.ts` and `api/payments/webhook.ts` statically imported `firebase-admin` submodules at the module top level.
- **Finding**: When any Firebase credential or submodule evaluation had an issue during cold start, the entire function crashed before the HTTP handler could execute.
- **Resolution**:
  - `api/health.ts` was refactored to be 100% dependency-free, inspecting environment variables directly so it reliably returns HTTP 200 JSON under all conditions.
  - `api/_lib/payments.ts` signature verification was decoupled from `firebase-admin`.

### Root Cause 3: Premature Firebase Admin Checks on Webhook Tests
- **Issue**: `api/payments/webhook.ts` previously checked `if (!isFirebaseAdminConfigured()) return res.status(503)` *before* checking whether the incoming payload was a test webhook from the Cashfree dashboard.
- **Finding**: When Cashfree tests a webhook URL, it fires test payloads (e.g. `type: "TEST_WEBHOOK"` or simulated `order_id: "order_test_..."`). Returning HTTP 503 caused Cashfree to immediately report "The endpoint did not respond properly to the test."
- **Resolution**:
  - Webhook signature is validated first. Unsigned or invalidly signed requests are rejected with HTTP 401.
  - Valid signed test events (`TEST_WEBHOOK`, `order_test_*`, `type.includes('TEST')`) are recognized immediately and return HTTP 200 OK:
    ```json
    {
      "ok": true,
      "test": true,
      "version": "2025-01-01",
      "message": "Cashfree test webhook verified and acknowledged successfully."
    }
    ```
  - Real payment events (`PAYMENT_SUCCESS_WEBHOOK`, etc.) proceed to check database configuration and idempotently activate subscriptions.

### Root Cause 4: Multi-Format HMAC-SHA256 Signature Verification
- **Issue**: In webhook version `2025-01-01`, Cashfree sends `x-webhook-signature`, `x-webhook-timestamp`, `x-webhook-version`, and `x-idempotency-key`. The signature formula is `Base64(HMAC-SHA256(timestamp + rawBody, secretKey))`.
- **Resolution**: `verifyCashfreeWebhookSignature` now strips any enclosing quotes from environment variables, concatenates raw bytes directly (`Buffer.concat([Buffer.from(timestamp), rawBuffer])`), verifies with `crypto.timingSafeEqual`, and has a secondary string fallback.

---

## 3. Automated Verification

Added unit tests in `src/tests/domain.test.ts` verifying:
1. Valid Cashfree test webhook with HMAC signature returns HTTP 200 `{ ok: true, test: true }`.
2. Valid Cashfree payment webhook with HMAC signature updates records.
3. Unsigned request returns HTTP 401.
4. Tampered body or invalid signature returns HTTP 401.
5. Duplicate webhook events are deduplicated idempotently.

---

## 4. Owner Action Required (Production Deployment)

Because Vercel deploys from the owner's linked Git repository, the owner must complete the following steps to push these fixes to `https://fitplus-kappa.vercel.app/`:

1. **Commit and Push Code Changes:**
   Commit the updated `package.json` (with Node 22 engine), `api/health.ts`, `api/payments/webhook.ts`, and `api/_lib/payments.ts` to your Git repository.
2. **Verify Vercel Environment Variables:**
   In **Vercel Dashboard -> Project Settings -> Environment Variables**, ensure:
   - `CASHFREE_APP_ID`: Your Cashfree App ID
   - `CASHFREE_SECRET_KEY`: Your Cashfree Secret Key (without surrounding quotes)
   - `CASHFREE_ENV`: `"sandbox"` (or `"production"`)
   - `CASHFREE_API_VERSION`: `"2025-01-01"`
   - `FIREBASE_PROJECT_ID`: `gen-lang-client-0381020502`
   - `FIREBASE_FIRESTORE_DATABASE_ID`: `ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841`
3. **Trigger Deployment:**
   Deploy to Vercel and verify that `https://fitplus-kappa.vercel.app/api/health` returns HTTP 200 JSON.
4. **Test in Cashfree Merchant Dashboard:**
   - Go to Cashfree Merchant Dashboard -> **Payment Gateway** -> **Developers** -> **Webhooks**.
   - Endpoint URL: `https://fitplus-kappa.vercel.app/api/payments/webhook`
   - Version: `2025-01-01`
   - Click **Test** or **Send Test Webhook**.
   - The dashboard will now report: **Test Successful** (HTTP 200 OK).
