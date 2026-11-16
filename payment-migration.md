# FitPlus — Stage 3D Payment Migration & Production Verification (`Razorpay` -> `Cashfree Payments`)

**Deployment:** `https://fitplus-kappa.vercel.app/`  
**Gateway:** Cashfree Payment Gateway (`@cashfreepayments/cashfree-js` v3 + Server REST API `x-api-version: 2025-01-01`)  
**Initial Mode:** Sandbox (`CASHFREE_ENV="sandbox"`, `VITE_CASHFREE_ENV="sandbox"`)

---

## 1. Confirmed Production Defect Investigation (`/api/health` -> `500 FUNCTION_INVOCATION_FAILED`)

### Root Causes Identified
1. **Unnecessary synchronous Firebase Admin & Firestore initialization on `/api/health`:** `api/health.ts` called `getFirebaseAdminContext()`, which immediately ran `initializeApp(...)` and `initializeFirestore(..., { preferRest: true })` without any `try/catch`. When `FIREBASE_SERVICE_ACCOUNT_JSON` / `FIREBASE_PRIVATE_KEY` was absent or formatted with unescaped newlines in Vercel runtime, `cert()` or `initializeFirestore()` threw at invocation time, causing `500 FUNCTION_INVOCATION_FAILED`.
2. **CamelCase private key `\n` normalization bug in `api/_lib/firebaseAdmin.ts`:** Escaped `\\n` characters were only normalized in the `snake_case` (`private_key`) branch and omitted in the `camelCase` (`privateKey`) branch.
3. **Node Native ESM extensionless relative imports in shared modules:** `src/lib/engines.ts` and `src/lib/streak.ts` imported `./date` without the `.js` extension. Because `package.json` uses `"type": "module"` and `@vercel/node` emits ESM `.js` files, serverless handlers importing those helpers (`/api/ai/generate-plan.ts`, `/api/streaks/recalculate.ts`) risked `ERR_MODULE_NOT_FOUND` under Node.js ESM on Vercel.
4. **Root `tsconfig.json` leaking Vite client types into Vercel Lambda transpilation:** `@vercel/node` extends root `tsconfig.json` (`types: ["vite/client", "node", "vite-plugin-pwa/client"]`), producing `TS2688` errors when dev-only Vite client types aren't installed or traced in serverless builds.

### Fixes Implemented
- Added `getFirebaseAdminConfig()` and `getFirebaseAdminStatus()` in `api/_lib/firebaseAdmin.ts` so configuration inspection never invokes `initializeApp()` or `initializeFirestore()`.
- Fixed `\n` normalization across both `camelCase` and `snake_case` service-account JSON payloads and added PEM sanity checks.
- Wrapped `api/health.ts` in `try/catch`, returning HTTP `200` with Firebase + Cashfree Sandbox readiness status (`adminConfigured`, `cashfreeConfigured`, `cashfreeEnv`, `cashfreeApiVersion`, `easySplitEnabled`) and zero sensitive secrets.
- Added `/api/tsconfig.json` with Node-scoped `types: ["node"]`.
- Updated `src/lib/engines.ts` and `src/lib/streak.ts` relative imports to `./date.js`.

---

## 2. Pre-Migration Razorpay Inventory & Disposition

| Component | Legacy Razorpay Artifact | Stage 3D Cashfree Replacement / Action |
|---|---|---|
| Package dependency | `razorpay` (`^2.9.8`) in `package.json` | Replaced with `@cashfreepayments/cashfree-js` (`^1.0.7`) |
| Environment variables | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `VITE_RAZORPAY_KEY_ID`, `RAZORPAY_LIVE_ENABLED` | Replaced with `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV`, `CASHFREE_API_VERSION`, `APP_BASE_URL`, `CASHFREE_EASY_SPLIT_ENABLED`, `VITE_CASHFREE_ENV` |
| Backend service | `api/_lib/payments.ts` (`createRazorpayOrder`, HMAC checkout/webhook) | Replaced with Cashfree PG v3 REST API (`POST /pg/orders`, `GET /pg/orders/{order_id}`, `GET /pg/orders/{order_id}/payments`, `POST /pg/orders/{order_id}/refunds`), Base64 HMAC webhook verifier (`timestamp + rawBody`), out-of-order protection, and disabled Easy Split scaffolding |
| API routes | `api/payments/create-order.ts`, `verify.ts`, `webhook.ts` | Updated for Cashfree `payment_session_id`, server-side order + payments verification, Cashfree webhooks, plus new admin `api/payments/refund.ts` |
| Frontend checkout | `src/lib/razorpay.ts` + inline modal verification | Replaced with `src/lib/cashfree.ts` (`@cashfreepayments/cashfree-js` redirect checkout) + dedicated `/payments/result` route (`PaymentResultPage.tsx`) |
| Domain & Firestore | `razorpayOrderId`, `razorpayPaymentId` | Refactored to provider-agnostic `provider`, `providerOrderId`, `providerPaymentId`, `paymentSessionId`, `paymentMethod`, `refundStatus`, `settlementStatus`, `verifiedAt`, `webhookEventId`, `lastWebhookAt` while **preserving** historical `razorpayOrderId` / `razorpayPaymentId` fields cleanly in `firestoreService.ts` and UI receipts |
| PWA caching | Default `vite-plugin-pwa` navigate denylist only | Added explicit Workbox `runtimeCaching` `NetworkOnly` rule for all `/api/*` requests |

---

## 3. Payment & Webhook Lifecycle

1. **Order Creation (`POST /api/payments/create-order`):**
   - Verifies Firebase ID token (+ App Check if enabled), validates coach/package ownership, and computes INR package price **strictly from Firestore** (never trusting client amounts).
   - `₹0` free packages activate immediately (`mode: 'free_enrolled'`).
   - Paid INR packages call Cashfree `POST /pg/orders` with `order_id = fp_{paymentId}`, `order_currency = "INR"`, `return_url = {APP_BASE_URL}/payments/result?order_id={order_id}&payment_id={paymentId}`, `notify_url = {APP_BASE_URL}/api/payments/webhook`.
2. **Checkout Launch (`src/lib/cashfree.ts`):**
   - Calls `load({ mode: 'sandbox' | 'production' })` and `cashfree.checkout({ paymentSessionId, redirectTarget: '_self' })` with double-click lock protection.
3. **Authoritative Result Verification (`POST /api/payments/verify` via `/payments/result`):**
   - Never trusts URL query params alone. Calls both Cashfree `GET /pg/orders/{order_id}` and `GET /pg/orders/{order_id}/payments`.
   - Verifies `order_currency === "INR"` and `Math.round(order_amount * 100) === payment.amountPaise`.
   - Activates subscription, enrollment, relationship, invite redemption, and notifications **only** when `order_status === "PAID"` and an attempt has `payment_status === "SUCCESS"`.
   - Safely returns `paid`, `pending`, `failed`, or `cancelled` without creating duplicate orders on page refresh.
4. **Webhook Reconciliation (`POST /api/payments/webhook`):**
   - Reads raw request body (`bodyParser: false` on Vercel; `req.rawBody` on Express).
   - Verifies `x-webhook-signature` against `Base64(HMAC_SHA256(CASHFREE_SECRET_KEY, x-webhook-timestamp + rawBody))`.
   - Handles `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `PAYMENT_USER_DROPPED_WEBHOOK`, and `REFUND_STATUS_WEBHOOK` idempotently using `webhookEventId`.
   - **Out-of-order safety:** Never overwrites an already `captured` or `refunded` payment if a delayed failure/dropped webhook arrives.

---

## 4. Easy Split / Coach Settlement Readiness (Disabled)

- `TrainerSettlementAccount` and `buildTrainerSettlementPreview(...)` scaffold future Cashfree Easy Split vendor payouts.
- Guarded strictly by `CASHFREE_EASY_SPLIT_ENABLED="false"` (`settlementStatus: "not_applicable"`). No split payouts or fake settlements are sent or simulated before merchant Easy Split approval.

---

## 5. Production Environment Variable Checklist (Vercel)

Set these in **Vercel Project Settings -> Environment Variables**:
- `CASHFREE_APP_ID`: Sandbox App ID initially (`TEST...`), Production App ID later
- `CASHFREE_SECRET_KEY`: Sandbox Secret Key initially, Production Secret Key later (server-only, **never** `VITE_*`)
- `CASHFREE_ENV`: `"sandbox"` initially (change to `"production"` only when switching live)
- `CASHFREE_API_VERSION`: `"2025-01-01"`
- `CASHFREE_EASY_SPLIT_ENABLED`: `"false"`
- `VITE_CASHFREE_ENV`: `"sandbox"` initially
- `APP_BASE_URL`: `"https://fitplus-kappa.vercel.app"`
- Plus existing Firebase Admin & Gemini server env vars (`FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`, `FIREBASE_FIRESTORE_DATABASE_ID`, `GEMINI_API_KEY`, `FITPLUS_ADMIN_EMAIL`).
