# E2E Test Infra: FitPlus Stage 4D Production Readiness

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Tests are derived strictly from product specifications in `ORIGINAL_REQUEST.md` and interface contracts in `PROJECT.md`, exercising the system as real users and external gateways do.
- **Methodology**: Systematic 4-tier testing combining Category-Partition, Boundary Value Analysis (BVA), Multi-Identity Combinatorial Isolation, and Real-World End-to-End Application Scenarios.
- **Multi-Identity Security**: Testing anchored across 5 distinct synthetic identities (Client A, Client B, Trainer A, Trainer B, Administrator) to prove tenant isolation, cross-client privacy, coach authorization boundaries, and tamper resistance without leaking or polluting production data.
- **Zero-Dependency Native Execution**: Powered by Node.js built-in test runner (`node:test`, `node:assert/strict`) executed via `tsx --test`, ensuring high-speed execution (~7s), zero external dependency bloat, and total TypeScript compatibility.

---

## Synthetic Personas & Identities
| Persona | Synthetic UID | Email | Assigned Role | Coaching Relationship / Privileges |
|---------|---------------|-------|---------------|-------------------------------------|
| **Client A** | `11111111-1111-4111-a111-111111111111` | `synth.client.a@fitplus.test` | `client` | Enrolled with Trainer A; Active Monthly Package |
| **Client B** | `22222222-2222-4222-a222-222222222222` | `synth.client.b@fitplus.test` | `client` | Independent client; No active coach link |
| **Trainer A** | `33333333-3333-4333-a333-333333333333` | `synth.trainer.a@fitplus.test` | `trainer` | Verified Coach of Client A; 2 Packages Published |
| **Trainer B** | `44444444-4444-4444-a444-444444444444` | `synth.trainer.b@fitplus.test` | `trainer` | Unverified Coach; No relationship with Client A |
| **Administrator** | `55555555-5555-4555-a555-555555555555` | `pranavshindeji5001@gmail.com` | `admin` | Platform SuperAdmin; `is_platform_admin() = true` |

---

## Feature Inventory & Tier Mapping

| # | Feature Domain | Source (Requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross/Isolation) | Tier 4 (Workloads) |
|---|----------------|----------------------|:----------------:|:-----------------:|:------------------------:|:------------------:|
| 1 | Auth & RBAC | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | 3 tests | J1, J2 |
| 2 | Workouts & Live Sessions | ORIGINAL_REQUEST §R4 | 5 tests | 5 tests | 1 test | J1 |
| 3 | Nutrition & Meal Slots | ORIGINAL_REQUEST §R4 | 5 tests | 5 tests | 1 test | J1, J2 |
| 4 | Payments & Cashfree | ORIGINAL_REQUEST §R3 | 6 tests | 6 tests | 3 tests | J3 |
| 5 | Trainer Studio & AI Copilot | ORIGINAL_REQUEST §R4 | 6 tests | 5 tests | 2 tests | J2, J4 |
| 6 | Admin & Operations Console | ORIGINAL_REQUEST §R5 | 5 tests | 5 tests | 1 test | Platform |
| 7 | Storage & Media Privacy | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | 2 tests | J1 |
| 8 | Privacy & DPDP Compliance | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | 1 test | J4 |
| **Total** | | | **42 tests** | **41 tests** | **12 tests** | **4 Journeys** |

---

## Test Architecture

### 1. Test Runner & Invocation
- **Runner**: Node.js `node:test` via `tsx --test`.
- **Command**: `npm test` or `npm run test:e2e`.
- **Location**: `src/tests/e2e.test.ts` (supplementing `domain.test.ts`, `firestore.rules.test.ts`, and `routing.test.ts`).
- **Pass/Fail Semantics**: All test suites must exit with process exit code `0`. Any unhandled rejection or assertion failure causes immediate failure.

### 2. Multi-Identity Isolation Framework
- Tests exercise real authentication checks via Firebase Admin token verification and Supabase PostgreSQL RLS queries.
- For in-process API testing, request handlers are invoked with synthetic authenticated contexts representing Client A, Client B, Trainer A, Trainer B, and Administrator.
- Cashfree webhook HMAC-SHA256 signatures are computed using `CASHFREE_SECRET_KEY` over exact request timestamp + raw payload bytes to test idempotency, tampering detection, and atomic activation.

### 3. Data Hygiene & Teardown
- Synthetic fixtures are tagged with deterministic UUIDs and prefixes.
- `after()` test lifecycle hooks guarantee cleanup of temporary test rows in PostgreSQL and Supabase Auth.

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario / Journey | Personas Exercised | Features Combined | Acceptance Criteria |
|---|--------------------|--------------------|-------------------|---------------------|
| **J1** | **Client Onboarding, Live Workout Execution & Weekly Check-In** | Client A, Trainer A | Exercise Catalog, 1RM Epley calculation, Rest timers, Session Volume, Check-in photo, Streak engine | Volume calculated accurately; streak increments; check-in surfaces in Trainer A dashboard; front photo saved to private storage. |
| **J2** | **Trainer Review, AI Plan Generation Gate & Assignment** | Trainer A, Client A | Check-in review, Action items, Gemini AI Structured Plan Draft, Coach Approval Gate, Workout/Meal plan assignment | Gemini draft requires explicit coach approval (`trainer_approved: false` -> `true`); unapproved drafts invisible to client; approved plans unlock immediately. |
| **J3** | **Cashfree Checkout to Subscription Activation Webhook** | Client B, Trainer A, Cashfree Gateway | Coupon application, Cashfree raw-byte HMAC verification, PostgreSQL `activate_payment_subscription` RPC, Idempotency | Payment row captured; exactly 1 subscription & 1 enrollment created; duplicate webhook replay returns `already_processed: true` without duplicating rows. |
| **J4** | **Inactivity Detection, Client Pulse Reclassification & Coach Intervention** | Client B, Trainer A | Client Pulse engine, Inactivity threshold (14 days), Realtime chat channel, Daily activity resumption | Client correctly transitions to `needs_attention`; coach chat message delivered; client logs activity; pulse recalculates to `on_track`. |

---

## Coverage Thresholds & Minimum Gates
- **Tier 1 (Feature Coverage)**: ≥5 tests per feature area (Total ≥ 40 tests).
- **Tier 2 (Boundary & Corner Cases)**: ≥5 tests per feature area (Total ≥ 40 tests).
- **Tier 3 (Multi-Identity Isolation)**: ≥10 isolation and cross-tenant tests.
- **Tier 4 (Real-World Scenarios)**: 4 complete multi-persona user journeys.
- **Total Minimum Target**: ≥ 95 automated test cases passing with exit code 0.
