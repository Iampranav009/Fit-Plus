# FitPlus — Production Deployment Guide (Vercel + Firebase)

**Target Production URL:** `https://fitplus-kappa.vercel.app/`  
**Firebase Project ID:** `gen-lang-client-0381020502`  
**Named Firestore Database ID:** `ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841` (`asia-south1`)  
**Cloud Storage Bucket:** `gen-lang-client-0381020502.firebasestorage.app`

---

## 1. Architecture Summary on Vercel

FitPlus deploys as a **Vite React SPA** combined with **Vercel Node.js Serverless Functions** under `/api/*`:

- **Node.js Runtime Requirement**: Node.js `>=22.x` is required by `firebase-admin@14.5.1`. Configured via `"engines": { "node": ">=22.x" }` in `package.json`.
- `vercel.json` configures:
  - `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`
  - Negative-lookahead SPA rewrite to `/index.html` that excludes `/api/*`, `/assets/*`, `manifest.webmanifest`, `sw.js`, `robots.txt`, `sitemap.xml`, and static file extensions (`.js`, `.css`, `.png`, `.svg`, `.json`, etc.) so direct visits and refreshes on `/discover`, `/auth`, `/welcome`, `/demo`, `/admin`, `/join/:token`, `/trainers/:slug`, `/app/*`, and `/studio/*` return HTTP 200 without breaking serverless API routes.
  - Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`) and cache headers for `/assets/*` and `/sw.js`.
- Local development and Node preview parity run via `server.ts` (`npm run dev` / `npm start`), mounting the exact same handlers from `/api/health.ts`, `/api/account/delete.ts`, and `/api/invites/resolve.ts`.

---

## 2. Required Vercel Environment Variables

Configure these in **Vercel Project Settings -> Environment Variables** (Production & Preview; never commit real secrets to Git):

### Required for Stage 3A Backend APIs
| Variable | Purpose | Notes |
|---|---|---|
| `APP_BASE_URL` | Canonical deployment URL (`https://fitplus-kappa.vercel.app`) | Used for Cashfree `return_url` & `notify_url` and invite links |
| `FIREBASE_PROJECT_ID` | `gen-lang-client-0381020502` | Matches `firebase-applet-config.json` |
| `FIREBASE_FIRESTORE_DATABASE_ID` | `ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841` | Critical: named Firestore database, not `(default)` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Minified JSON or Base64 service account credentials | Enables `/api/account/delete`, payment APIs, and server-side `/api/invites/resolve`. Alternatively set `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`. |
| `FITPLUS_ADMIN_EMAIL` | Bootstrap platform admin email (`pranavshindeji5001@gmail.com`) | Checked alongside `/admins/{uid}` on server endpoints |

### Cashfree Payments & Optional Security Variables
| Variable | Purpose | Notes |
|---|---|---|
| `CASHFREE_APP_ID` | Cashfree Payment Gateway App ID | Sandbox credentials initially (`CASHFREE_ENV="sandbox"`) |
| `CASHFREE_SECRET_KEY` | Cashfree Payment Gateway Secret Key | Server-only secret (never prefix with `VITE_`); also verifies webhook HMAC |
| `CASHFREE_ENV` | `"sandbox"` or `"production"` | Keep `"sandbox"` until production KYC & verification complete |
| `CASHFREE_API_VERSION` | `"2025-01-01"` | Cashfree PG REST API version header |
| `CASHFREE_EASY_SPLIT_ENABLED` | `"false"` | Scaffolding flag kept disabled until Easy Split approval |
| `VITE_CASHFREE_ENV` | `"sandbox"` or `"production"` | Client SDK mode selector |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | Google reCAPTCHA v3 site key for Firebase App Check | Client-side App Check initializes automatically when set |
| `REQUIRE_APP_CHECK` | `"true"` or `"false"` (default `"false"`) | Set `"true"` only after App Check is enabled in Firebase Console |
| `GEMINI_API_KEY` | Server-side Gemini API key (Stage 3B) | Never prefix with `VITE_` |

---

## 3. Firebase Console Owner Checklist

Before going live with production traffic, complete these one-time Firebase Console steps on project `gen-lang-client-0381020502`:

1. **Authentication -> Settings -> Authorized Domains**
   Ensure all deployment origins are listed:
   - `fitplus-kappa.vercel.app`
   - `ais-dev-zmf6yhll3u6jndab5wlorz-86170708275.asia-east1.run.app` (AI Studio preview host)
   - `localhost`
2. **Authentication -> Sign-in Method**
   - Confirm **Google** provider is enabled.
   - Confirm **Email/Password** provider is enabled (required for email sign-up, verification links, and password reset).
   - Review email templates for **Email address verification** and **Password reset**.
3. **App Check (Recommended)**
   - Register the web app with reCAPTCHA v3, paste the site key into `VITE_FIREBASE_APP_CHECK_SITE_KEY` in Vercel, and switch `REQUIRE_APP_CHECK="true"` once verified.
4. **Firestore Indexes & Cloud Storage Rules**
   Deploy `firestore.rules`, `firestore.indexes.json`, and `storage.rules` via Firebase CLI:
   ```bash
   firebase use gen-lang-client-0381020502
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
   *(Note: `firestore.rules` is already synced via AI Studio rule deployment; run the CLI command above to push composite indexes in `firestore.indexes.json` and `storage.rules`.)*

---

## 4. Build & Deploy Verification Checklist

1. Build locally: `npm run build`
2. Verify TypeScript & rules: `npm run lint && npm test && npm run test:rules`
3. After Vercel deploy, verify:
   - `GET https://fitplus-kappa.vercel.app/api/health` returns `200 OK` with `capabilities.cashfreeEnv: "sandbox"`, `firebase.adminConfigured: true` (once service account env vars are added), and the named `firestoreDatabaseId`.
   - Direct browser refresh on `/discover`, `/auth`, `/welcome`, `/demo`, `/payments/result`, `/join/FIT-ARJUN-2026`, and `/join/FIT-EXP-000` loads the SPA with HTTP 200 (no Vercel 404).
   - Unknown paths (e.g., `/non-existent-page`) render the branded FitPlus 404 page inside the SPA.
   - Sign in with Google and Email/Password, verify email gate behavior, test Sandbox Cashfree checkout + `/payments/result`, and verify `/admin` access with the configured platform admin account.
   - **Cashfree Webhook Endpoint Test**: In Cashfree Merchant Dashboard -> **Payment Gateway** -> **Developers** -> **Webhooks**:
     - Register `https://fitplus-kappa.vercel.app/api/payments/webhook` with version `2025-01-01`.
     - Click **Send Test Webhook**. Dashboard reports **Success (HTTP 200)**.
