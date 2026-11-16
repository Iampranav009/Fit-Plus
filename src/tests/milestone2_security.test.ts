import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import provisionClaimsHandler from '../../api/_handlers/auth/provision-claims.js';
import exportAccountHandler from '../../api/_handlers/account/export.js';
import deleteAccountHandler from '../../api/_handlers/account/delete.js';
import generatePlanHandler from '../../api/_handlers/ai/generate-plan.js';
import createOrderHandler from '../../api/_handlers/payments/create-order.js';
import {
  checkRateLimit,
  applySecurityHeaders,
  sanitizeErrorMessage,
  SECURITY_HEADERS,
} from '../../api/_lib/security.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../api/_lib/supabaseAdmin.js';
import {
  SYNTHETIC_IDENTITIES,
  setupAuthMock,
  setupSyntheticDatabase,
  teardownSyntheticDatabase,
} from './helpers/syntheticIdentities.js';

const sbAdmin = isSupabaseAdminConfigured() ? getSupabaseAdminClient() : (null as any);

before(async () => {
  await setupAuthMock();
  if (sbAdmin) {
    await setupSyntheticDatabase(sbAdmin);
  }
});

function createMockReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as VercelRequest;
}

function createMockRes() {
  const result: {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
  } = {
    statusCode: 200,
    headers: {},
    body: null,
  };

  const res = {
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    setHeader(key: string, value: string) {
      result.headers[key.toLowerCase()] = value;
      return res;
    },
    json(data: unknown) {
      result.body = data;
      return res;
    },
    send(data: unknown) {
      result.body = data;
      return res;
    },
    end() {
      return res;
    },
  } as unknown as VercelResponse;

  return { res, result };
}

// -----------------------------------------------------------------------------
// Milestone 2 Task T1: Auth & Claims Provisioning (F8)
// -----------------------------------------------------------------------------

test('M2-T1-01: /api/auth/provision-claims rejects non-POST requests with 405', async () => {
  const { res, result } = createMockRes();
  await provisionClaimsHandler(createMockReq({ method: 'GET' }), res);
  assert.equal(result.statusCode, 405);
  assert.equal(result.headers['allow'], 'POST');
});

test('M2-T1-02: /api/auth/provision-claims rejects missing Bearer token with 401', async () => {
  const { res, result } = createMockRes();
  await provisionClaimsHandler(createMockReq({ method: 'POST', headers: {} }), res);
  assert.equal(result.statusCode, 401);
  const body = result.body as { ok: boolean; error: string };
  assert.equal(body.ok, false);
});

test('M2-T1-03: /api/auth/provision-claims provisions claims and ignores body role parameters', async () => {
  const { res, result } = createMockRes();
  await provisionClaimsHandler(
    createMockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}` },
      body: { role: 'admin', is_admin: true, is_trainer: true }, // Malicious body override attempt
    }),
    res,
  );
  assert.equal(result.statusCode, 200);
  const body = result.body as {
    ok: boolean;
    claims: { role: string; is_trainer: boolean; is_admin: boolean; user_role: string };
  };
  assert.equal(body.ok, true);
  // Supabase PostgreSQL requirement: role must be 'authenticated'
  assert.equal(body.claims.role, 'authenticated');
  // Must NOT have honored the body override to admin
  assert.equal(body.claims.is_admin, false);
  assert.equal(body.claims.user_role, 'client');
});

test('M2-T1-04: /api/auth/provision-claims sets is_trainer=true for verified trainer', async () => {
  const { res, result } = createMockRes();
  await provisionClaimsHandler(
    createMockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.TRAINER_A.token}` },
    }),
    res,
  );
  assert.equal(result.statusCode, 200);
  const body = result.body as {
    ok: boolean;
    claims: { role: string; is_trainer: boolean; is_admin: boolean; user_role: string };
  };
  assert.equal(body.ok, true);
  assert.equal(body.claims.role, 'authenticated');
  assert.equal(body.claims.is_trainer, true);
  assert.equal(body.claims.user_role, 'trainer');
});

test('M2-T1-05: /api/auth/provision-claims sets is_admin=true for platform admin', async () => {
  const { res, result } = createMockRes();
  await provisionClaimsHandler(
    createMockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.ADMIN.token}` },
    }),
    res,
  );
  assert.equal(result.statusCode, 200);
  const body = result.body as {
    ok: boolean;
    claims: { role: string; is_trainer: boolean; is_admin: boolean; user_role: string };
  };
  assert.equal(body.ok, true);
  assert.equal(body.claims.role, 'authenticated');
  assert.equal(body.claims.is_admin, true);
  assert.equal(body.claims.user_role, 'admin');
});

// -----------------------------------------------------------------------------
// Milestone 2 Task T2 & T3: PostgreSQL RLS Hardening Migration (F9 & F10)
// -----------------------------------------------------------------------------

test('M2-T2-01: Migration 006_security_hardening.sql exists and contains all required security definitions', () => {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/006_security_hardening.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration 006 must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // 1. Role lock on app_users
  assert.ok(sql.includes('prevent_role_escalation'), 'Contains role escalation trigger function');
  assert.ok(sql.includes('trg_prevent_role_escalation'), 'Contains role escalation trigger');
  assert.ok(sql.includes('Users can update own profile'), 'Contains updated app_users policy');

  // 2. Coaching relationships restriction & self-pairing block
  assert.ok(sql.includes('Authorized coaching relationships insert'), 'Contains restricted coaching insert');
  assert.ok(sql.includes('trainer_user_id <> client_user_id'), 'Blocks self-pairing');
  assert.ok(sql.includes('trainer_invites'), 'Requires active trainer invite for client insert');

  // 3. All 7 unpolicied tables have policies
  assert.ok(sql.includes('ON referrals'), 'Contains policies for referrals');
  assert.ok(sql.includes('ON scheduled_reminders'), 'Contains policies for scheduled_reminders');
  assert.ok(sql.includes('ON client_groups'), 'Contains policies for client_groups');
  assert.ok(sql.includes('ON client_group_members'), 'Contains policies for client_group_members');
  assert.ok(sql.includes('ON consent_records'), 'Contains policies for consent_records');
  assert.ok(sql.includes('ON trainer_verification_requests'), 'Contains policies for trainer_verification_requests');
  assert.ok(sql.includes('ON audit_logs'), 'Contains policies for audit_logs');

  // 4. Chat messages recipient-only read update and anti-tampering
  assert.ok(sql.includes('Recipients mark messages read'), 'Contains restricted message update policy');
  assert.ok(sql.includes('prevent_message_tampering'), 'Contains message tampering trigger');

  // 5. Trainer reviews enrollment requirement
  assert.ok(sql.includes('ON trainer_reviews FOR INSERT'), 'Contains restricted review insert policy');
  assert.ok(sql.includes('coaching_relationships'), 'Verifies active or ended coaching relationship');

  // 6. Supabase storage security (Task T3)
  assert.ok(sql.includes('is_conversation_participant'), 'Contains conversation participant helper');
  assert.ok(sql.includes('bucket_id = \'coaching-attachments\''), 'Contains coaching attachments policy');
  assert.ok(sql.includes('bucket_id = \'profile-avatars\''), 'Contains profile avatars policy');
  assert.ok(sql.includes('bucket_id = \'progress-photos\''), 'Contains progress photos policy');
  assert.ok(sql.includes('bucket_id = \'verification-documents\''), 'Contains verification documents policy');
  assert.ok(sql.includes('storage.foldername(name)'), 'Enforces user-scoped folder paths');
});

// -----------------------------------------------------------------------------
// Milestone 2 Task T4: Serverless API Security, Rate Limiting & Headers (F11)
// -----------------------------------------------------------------------------

test('M2-T4-01: applySecurityHeaders injects standard CSP, HSTS, and X-Frame-Options', () => {
  const { res, result } = createMockRes();
  applySecurityHeaders(res);
  assert.ok(result.headers['content-security-policy']);
  assert.ok(result.headers['strict-transport-security']);
  assert.equal(result.headers['x-content-type-options'], 'nosniff');
  assert.equal(result.headers['x-frame-options'], 'DENY');
  assert.equal(result.headers['referrer-policy'], 'strict-origin-when-cross-origin');
});

test('M2-T4-02: checkRateLimit sliding window rate limiter blocks excessive requests', () => {
  const testKey = `test_limit_${Date.now()}`;
  const maxRequests = 3;
  const windowMs = 5000;

  const res1 = checkRateLimit(testKey, maxRequests, windowMs);
  assert.equal(res1.allowed, true);
  assert.equal(res1.remaining, 2);

  const res2 = checkRateLimit(testKey, maxRequests, windowMs);
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 1);

  const res3 = checkRateLimit(testKey, maxRequests, windowMs);
  assert.equal(res3.allowed, true);
  assert.equal(res3.remaining, 0);

  // 4th request must be blocked
  const res4 = checkRateLimit(testKey, maxRequests, windowMs);
  assert.equal(res4.allowed, false);
  assert.equal(res4.remaining, 0);
});

test('M2-T4-03: sanitizeErrorMessage redacts sensitive credentials and database connection strings', () => {
  const errorWithSecret = new Error('Database query failed: connection string postgresql://user:secret_password@db.supabase.co:5432');
  const sanitized = sanitizeErrorMessage(errorWithSecret, 'Database query failed');
  assert.equal(sanitized, 'Database query failed');

  const regularError = new Error('User record not found');
  assert.equal(sanitizeErrorMessage(regularError), 'User record not found');
});

test('M2-T4-04: API handlers attach security headers to responses', async () => {
  const { res, result } = createMockRes();
  await provisionClaimsHandler(createMockReq({ method: 'GET' }), res);
  assert.equal(result.headers['x-content-type-options'], 'nosniff');
  assert.equal(result.headers['x-frame-options'], 'DENY');
});

// -----------------------------------------------------------------------------
// Milestone 2 Task T5: Privacy Controls & DPDP Compliance (F12)
// -----------------------------------------------------------------------------

test('M2-T5-01: /api/account/export rejects unauthenticated request with 401', async () => {
  const { res, result } = createMockRes();
  await exportAccountHandler(createMockReq({ method: 'GET', headers: {} }), res);
  assert.equal(result.statusCode, 401);
});

test('M2-T5-02: /api/account/export exports clean, structured DPDP JSON archive', async () => {
  const { res, result } = createMockRes();
  await exportAccountHandler(
    createMockReq({
      method: 'GET',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}` },
    }),
    res,
  );
  assert.equal(result.statusCode, 200);
  const body = result.body as {
    ok: boolean;
    data: {
      compliance: string;
      exported_at: string;
      profile: unknown;
      workouts: unknown[];
      nutrition: unknown[];
      checkins: unknown[];
      messages: unknown[];
      consents: unknown[];
    };
  };
  assert.equal(body.ok, true);
  assert.ok(body.data.compliance.includes('DPDP'));
  assert.ok(body.data.exported_at);
  assert.ok(body.data.profile);
  assert.ok(Array.isArray(body.data.workouts));
  assert.ok(Array.isArray(body.data.nutrition));
  assert.ok(Array.isArray(body.data.checkins));
  assert.ok(Array.isArray(body.data.messages));
  assert.ok(Array.isArray(body.data.consents));
});

test('M2-T5-03: /api/account/delete rejects non-POST requests with 405', async () => {
  const { res, result } = createMockRes();
  await deleteAccountHandler(createMockReq({ method: 'GET' }), res);
  assert.equal(result.statusCode, 405);
  assert.equal(result.headers['allow'], 'POST');
});

test('M2-T5-04: /api/account/delete rejects unauthenticated request with 401', async () => {
  const { res, result } = createMockRes();
  await deleteAccountHandler(createMockReq({ method: 'POST', headers: {} }), res);
  assert.equal(result.statusCode, 401);
});
