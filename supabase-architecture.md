# FitPlus Supabase Architecture — Stage 4E

## 1. Architectural Overview

FitPlus uses a hybrid enterprise architecture that combines the strengths of **Firebase Authentication** with **Supabase PostgreSQL & Storage**:

```
+--------------------------------------------------------------------------+
|                        FitPlus Client Application                        |
|                                                                          |
|   +--------------------------+          +----------------------------+   |
|   |  Firebase Authentication |          |   Supabase Client SDK      |   |
|   |  (Google Sign-In, Email) |          |   (Database & Storage)     |   |
|   +------------+-------------+          +-------------+--------------+   |
+----------------|--------------------------------------|------------------+
                 | Firebase ID Token                    |
                 | (used as accessToken)                |
                 +--------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                          Supabase Cloud Platform                         |
|                                                                          |
|   +-----------------------+     +------------------+     +-----------+   |
|   | Third-Party Auth JWT  | --> | PostgreSQL 16 DB | --> | Realtime  |   |
|   | (Firebase Provider)   |     | (with RLS)       |     | (Websock) |   |
|   +-----------------------+     +------------------+     +-----------+   |
|                                           |                              |
|                                 +------------------+                     |
|                                 | Supabase Storage |                     |
|                                 | (5 S3 Buckets)   |                     |
|                                 +------------------+                     |
+--------------------------------------------------------------------------+
```

---

## 2. Component Roles

| Component | Provider | Description |
|---|---|---|
| **Identity & Authentication** | Firebase Auth | Sole identity provider for Google Sign-In, email/password, session tokens, and passwords. |
| **Relational Database** | Supabase (PostgreSQL) | Primary ACID relational database storing 41 tables with Row Level Security. |
| **Object Storage** | Supabase Storage | S3-compatible buckets for trainer assets, avatars, progress photos, and chat attachments. |
| **Realtime Sync** | Supabase Realtime | Websocket synchronization for instant chat delivery, task status updates, and notifications. |
| **AI Copilot** | Google Gemini 2.5 Flash | Serverless AI plan generation and diet copilot via `@google/genai`. |
| **Payment Gateway** | Cashfree PG | India-first UPI, card, and netbanking checkout with webhook signature verification. |
| **Hosting & Serverless** | Vercel | Production CDN edge hosting with Node.js serverless functions in `/api/*`. |

---

## 3. Data Access Layer

1. **Browser Access (`src/lib/supabase.ts`)**:
   - Initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - Dynamic `accessToken` resolver passes `auth.currentUser.getIdToken()`.
   - Queries strictly enforced by PostgreSQL Row Level Security using `auth.jwt()->>'sub'`.

2. **Serverless API Access (`api/_lib/supabaseAdmin.ts`)**:
   - Initialized with `SUPABASE_SECRET_KEY`.
   - Bypasses RLS to perform authoritative transactional mutations (Cashfree payment capture, referral rewards, admin aggregations).

3. **Storage Client (`src/lib/supabaseStorage.ts`)**:
   - Validates file sizes and MIME types client-side before upload.
   - Automatically chooses between permanent public URLs and temporary signed URLs based on bucket privacy.
