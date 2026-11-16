# FitPlus

**India-first personal fitness coaching platform** connecting independent trainers and clients with structured daily habits, workout and nutrition plans, deterministic streak tracking, WhatsApp-friendly coaching links, and a Liquid Glass user experience.

---

## Key Capabilities (Stage 3A — Production Foundation)

- **Vercel SPA + Serverless API Architecture:** `vercel.json` rewrites SPA routes (`/discover`, `/auth`, `/welcome`, `/demo`, `/admin`, `/join/:token`, `/trainers/:slug`, `/app/*`, `/studio/*`) to `/index.html` while keeping `/api/*` and static assets isolated. Local parity runs via Express in `server.ts`.
- **Complete Firebase Authentication:** Google Sign-In, Email/Password registration & sign-in, mandatory Email Verification Gate, Password Reset emails, persistent browser sessions, and self-service Account Deletion (`/api/account/delete`).
- **Role-Based Access Control (RBAC):** Strict `client`, `trainer`, and `admin` route protection (`ProtectedRoute` + `OnboardingGuard`), `/admin` moderation console for trainer credential verification & audit logs, and an isolated `/demo` interactive sandbox completely separated from authenticated cloud accounts.
- **30-Collection Multi-Tenant Firestore & Storage Schema:** Validated schemas (`src/lib/firestoreValidation.ts`), hardened Firestore rules (`firestore.rules`), composite indexes (`firestore.indexes.json`), and Cloud Storage rules (`storage.rules`) backed by named Firestore database `ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841`.
- **Cloud-Synced Activity & Privacy Consents:** Daily hydration tracking persisted to Firestore `dailyActivity`, persistent `consentRecords`, and honest empty states for newly created client and trainer accounts.

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and configure any optional server credentials (`FIREBASE_SERVICE_ACCOUNT_JSON`, etc.).
3. Start the dev server (Express API + Vite SPA on port `3000`):
   ```bash
   npm run dev
   ```

---

## Scripts

- `npm run dev` — Start Express + Vite development server on port 3000
- `npm run build` — Build production bundle to `dist/`
- `npm start` — Serve production `dist/` + `/api/*` endpoints via `server.ts`
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm test` — Run unit, schema, routing, and rules structural tests
- `npm run test:rules` — Lint `firestore.rules` with `@firebase/eslint-plugin-security-rules`
- `npm run test:emulator` — Run Firestore Emulator security tests (requires Java 11+)

---

## Documentation

- `audit.md` — Stage 3 production readiness audit and prioritized roadmap
- `architecture.md` — Multi-tenant data model, API contract, and service boundaries
- `security_spec.md` — Firebase rules, App Check, RBAC, and Dirty Dozen invariants
- `deployment.md` — Vercel & Firebase Console deployment guide
- `testing.md` — Test suites, emulator setup, and verification checklists
- `design.md` — Liquid Glass visual system & typography guidelines
- `CHANGELOG.md` — Stage-by-stage engineering changelog
