import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

export const SYNTHETIC_IDENTITIES = {
  CLIENT_A: {
    uid: 'usr_client_a',
    email: 'synth.client.a@fitplus.test',
    role: 'client' as const,
    clientId: 'cl_usr_client_a',
    firstName: 'Rohan',
    lastName: 'Sharma',
    displayName: 'Rohan Sharma',
    referralCode: 'FIT-ROHAN-CLIA',
    token: 'synth_jwt_token_client_a',
  },
  CLIENT_B: {
    uid: 'usr_client_b',
    email: 'synth.client.b@fitplus.test',
    role: 'client' as const,
    clientId: 'cl_usr_client_b',
    firstName: 'Ananya',
    lastName: 'Verma',
    displayName: 'Ananya Verma',
    referralCode: 'FIT-ANANY-CLIB',
    token: 'synth_jwt_token_client_b',
  },
  TRAINER_A: {
    uid: 'usr_trainer_a',
    email: 'synth.trainer.a@fitplus.test',
    role: 'trainer' as const,
    trainerId: 'tr_usr_trainer_a',
    firstName: 'Arjun',
    lastName: 'Kulkarni',
    displayName: 'Coach Arjun Kulkarni',
    slug: 'arjun-kulkarni',
    token: 'synth_jwt_token_trainer_a',
  },
  TRAINER_B: {
    uid: 'usr_trainer_b',
    email: 'synth.trainer.b@fitplus.test',
    role: 'trainer' as const,
    trainerId: 'tr_usr_trainer_b',
    firstName: 'Meera',
    lastName: 'Patel',
    displayName: 'Coach Meera Patel',
    slug: 'meera-patel',
    token: 'synth_jwt_token_trainer_b',
  },
  ADMIN: {
    uid: 'usr_admin',
    email: 'pranavshindeji5001@gmail.com',
    role: 'admin' as const,
    firstName: 'Platform',
    lastName: 'Admin',
    displayName: 'Platform Admin',
    token: 'synth_jwt_token_admin',
  },
};

export const SYNTHETIC_PACKAGES = {
  PKG_ARJUN_MONTHLY: {
    id: 'pkg_arjun_monthly',
    trainer_id: 'tr_usr_trainer_a',
    name: '1-on-1 Monthly Coaching',
    cadence: 'monthly',
    price_inr: 3000,
    price_paise: 300000,
    duration_days: 30,
    status: 'active',
  },
  PKG_ARJUN_TRANSFORM: {
    id: 'pkg_arjun_transform',
    trainer_id: 'tr_usr_trainer_a',
    name: '90-Day Total Transformation',
    cadence: 'quarterly',
    price_inr: 8000,
    price_paise: 800000,
    duration_days: 90,
    status: 'active',
  },
  PKG_FREE_INTRO: {
    id: 'pkg_free_intro',
    trainer_id: 'tr_usr_trainer_a',
    name: 'Free Starter Trial',
    cadence: 'monthly',
    price_inr: 0,
    price_paise: 0,
    duration_days: 7,
    status: 'active',
  },
} as const;

export interface MockResponseResult {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

export function createMockRes(): { res: VercelResponse; result: MockResponseResult } {
  const headers: Record<string, string> = {};
  const result: MockResponseResult = {
    statusCode: 200,
    body: undefined,
    headers,
  };
  const res = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      result.body = payload;
      return res;
    },
  };
  return { res: res as unknown as VercelResponse, result };
}

export function createMockReq(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}): VercelRequest {
  return {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body || {},
    query: options.query || {},
  } as unknown as VercelRequest;
}

export function createSyntheticWebhook(params: {
  eventType: 'PAYMENT_SUCCESS_WEBHOOK' | 'PAYMENT_FAILED_WEBHOOK' | 'PAYMENT_USER_DROPPED_WEBHOOK' | 'REFUND_STATUS_WEBHOOK';
  orderId: string;
  amountInr: number;
  secretKey: string;
  cfPaymentId?: string;
  timestamp?: string;
}) {
  const timestamp = params.timestamp || Date.now().toString();
  const cfPaymentId = params.cfPaymentId || `cf_pay_${Date.now()}`;

  const payload = {
    type: params.eventType,
    event_time: new Date().toISOString(),
    data: {
      order: {
        order_id: params.orderId,
        order_amount: params.amountInr,
        order_currency: 'INR',
      },
      payment: {
        cf_payment_id: cfPaymentId,
        payment_status: params.eventType === 'PAYMENT_SUCCESS_WEBHOOK' ? 'SUCCESS' : 'FAILED',
        payment_amount: params.amountInr,
        payment_currency: 'INR',
        payment_group: 'upi',
        payment_message: params.eventType === 'PAYMENT_SUCCESS_WEBHOOK' ? 'Transaction Successful' : 'User cancelled',
      },
    },
  };

  const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = crypto
    .createHmac('sha256', params.secretKey)
    .update(Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]))
    .digest('base64');

  return {
    rawBody,
    payload,
    timestamp,
    signature,
    headers: {
      'content-type': 'application/json',
      'x-webhook-timestamp': timestamp,
      'x-webhook-signature': signature,
      'x-webhook-version': '2025-01-01',
      'x-webhook-id': `cf_evt_${Date.now()}`,
    },
  };
}

export async function setupAuthMock() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    project_id: 'gen-lang-client-0381020502',
    client_email: 'test@example.com',
    private_key: privateKey,
  });

  const { getApps, initializeApp, getApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  const app = getApps().length ? getApp() : initializeApp({ projectId: 'gen-lang-client-0381020502' });
  const auth = getAuth(app);

  auth.verifyIdToken = async (idToken: string) => {
    if (idToken === 'expired' || idToken.includes('expired')) {
      throw new Error('Firebase ID token has expired.');
    }
    if (idToken === 'unverified' || idToken.includes('unverified')) {
      return {
        uid: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
        email: SYNTHETIC_IDENTITIES.CLIENT_B.email,
        email_verified: false,
        auth_time: Math.floor(Date.now() / 1000),
      } as any;
    }
    if (idToken.includes('trainer_b')) {
      return {
        uid: SYNTHETIC_IDENTITIES.TRAINER_B.uid,
        email: SYNTHETIC_IDENTITIES.TRAINER_B.email,
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
      } as any;
    }
    if (idToken.includes('trainer_a')) {
      return {
        uid: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
        email: SYNTHETIC_IDENTITIES.TRAINER_A.email,
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
      } as any;
    }
    if (idToken.includes('admin')) {
      return {
        uid: SYNTHETIC_IDENTITIES.ADMIN.uid,
        email: SYNTHETIC_IDENTITIES.ADMIN.email,
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
      } as any;
    }
    if (idToken.includes('client_b')) {
      return {
        uid: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
        email: SYNTHETIC_IDENTITIES.CLIENT_B.email,
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
      } as any;
    }
    // Default to Client A
    return {
      uid: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
      email: SYNTHETIC_IDENTITIES.CLIENT_A.email,
      email_verified: true,
      auth_time: Math.floor(Date.now() / 1000),
    } as any;
  };
}

export async function setupSyntheticDatabase(sbAdmin: SupabaseClient<Database>) {
  // 1. Insert app_users
  await sbAdmin.from('app_users').upsert([
    {
      firebase_uid: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
      first_name: SYNTHETIC_IDENTITIES.CLIENT_A.firstName,
      last_name: SYNTHETIC_IDENTITIES.CLIENT_A.lastName,
      email: SYNTHETIC_IDENTITIES.CLIENT_A.email,
      role: SYNTHETIC_IDENTITIES.CLIENT_A.role,
      referral_code: SYNTHETIC_IDENTITIES.CLIENT_A.referralCode,
    },
    {
      firebase_uid: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
      first_name: SYNTHETIC_IDENTITIES.CLIENT_B.firstName,
      last_name: SYNTHETIC_IDENTITIES.CLIENT_B.lastName,
      email: SYNTHETIC_IDENTITIES.CLIENT_B.email,
      role: SYNTHETIC_IDENTITIES.CLIENT_B.role,
      referral_code: SYNTHETIC_IDENTITIES.CLIENT_B.referralCode,
    },
    {
      firebase_uid: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      first_name: SYNTHETIC_IDENTITIES.TRAINER_A.firstName,
      last_name: SYNTHETIC_IDENTITIES.TRAINER_A.lastName,
      email: SYNTHETIC_IDENTITIES.TRAINER_A.email,
      role: SYNTHETIC_IDENTITIES.TRAINER_A.role,
    },
    {
      firebase_uid: SYNTHETIC_IDENTITIES.TRAINER_B.uid,
      first_name: SYNTHETIC_IDENTITIES.TRAINER_B.firstName,
      last_name: SYNTHETIC_IDENTITIES.TRAINER_B.lastName,
      email: SYNTHETIC_IDENTITIES.TRAINER_B.email,
      role: SYNTHETIC_IDENTITIES.TRAINER_B.role,
    },
    {
      firebase_uid: SYNTHETIC_IDENTITIES.ADMIN.uid,
      first_name: SYNTHETIC_IDENTITIES.ADMIN.firstName,
      last_name: SYNTHETIC_IDENTITIES.ADMIN.lastName,
      email: SYNTHETIC_IDENTITIES.ADMIN.email,
      role: SYNTHETIC_IDENTITIES.ADMIN.role,
    },
  ]);

  // 2. Insert platform_admins
  await sbAdmin.from('platform_admins').upsert({
    firebase_uid: SYNTHETIC_IDENTITIES.ADMIN.uid,
    granted_by: 'system_bootstrap',
  });

  // 3. Insert trainer_profiles
  await sbAdmin.from('trainer_profiles').upsert([
    {
      id: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
      user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      display_name: SYNTHETIC_IDENTITIES.TRAINER_A.displayName,
      slug: SYNTHETIC_IDENTITIES.TRAINER_A.slug,
      headline: 'Certified Strength & Conditioning Coach',
      verification_status: 'verified',
      is_published: true,
      accepting_clients: true,
    },
    {
      id: SYNTHETIC_IDENTITIES.TRAINER_B.trainerId,
      user_id: SYNTHETIC_IDENTITIES.TRAINER_B.uid,
      display_name: SYNTHETIC_IDENTITIES.TRAINER_B.displayName,
      slug: SYNTHETIC_IDENTITIES.TRAINER_B.slug,
      headline: 'Holistic Yoga & Mobility Coach',
      verification_status: 'unverified',
      is_published: false,
      accepting_clients: false,
    },
  ]);

  // 4. Insert client_profiles
  await sbAdmin.from('client_profiles').upsert([
    {
      id: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
      user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
      first_name: SYNTHETIC_IDENTITIES.CLIENT_A.firstName,
      last_name: SYNTHETIC_IDENTITIES.CLIENT_A.lastName,
      primary_goal: 'muscle_strength',
      experience_level: 'intermediate',
      days_per_week: 4,
      environment: 'gym',
      dietary_preference: 'non_vegetarian',
      active_trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    },
    {
      id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
      user_id: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
      first_name: SYNTHETIC_IDENTITIES.CLIENT_B.firstName,
      last_name: SYNTHETIC_IDENTITIES.CLIENT_B.lastName,
      primary_goal: 'general_fitness',
      experience_level: 'beginner',
      days_per_week: 3,
      environment: 'home',
      dietary_preference: 'vegetarian',
    },
  ]);

  // 5. Insert coaching packages
  await sbAdmin.from('coaching_packages').upsert([
    {
      id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
      trainer_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.trainer_id,
      trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      name: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.name,
      cadence: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.cadence,
      price_inr: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.price_inr,
      duration_days: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.duration_days,
      status: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.status,
    },
    {
      id: SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.id,
      trainer_id: SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.trainer_id,
      trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      name: SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.name,
      cadence: SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.cadence,
      price_inr: SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.price_inr,
      duration_days: SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.duration_days,
      status: SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.status,
    },
  ]);

  // 6. Insert coaching relationship between Client A and Trainer A
  await sbAdmin.from('coaching_relationships').upsert({
    id: `rel_${SYNTHETIC_IDENTITIES.CLIENT_A.uid}_${SYNTHETIC_IDENTITIES.TRAINER_A.uid}`,
    client_id: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    trainer_id: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    package_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    status: 'active',
  });
}

export async function teardownSyntheticDatabase(sbAdmin: SupabaseClient<Database>) {
  const uids = [
    SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    SYNTHETIC_IDENTITIES.CLIENT_B.uid,
    SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    SYNTHETIC_IDENTITIES.TRAINER_B.uid,
    SYNTHETIC_IDENTITIES.ADMIN.uid,
  ];

  try {
    await sbAdmin.from('notifications').delete().in('recipient_user_id', uids);
    await sbAdmin.from('weekly_check_ins').delete().in('client_user_id', uids);
    await sbAdmin.from('workout_sessions').delete().in('client_user_id', uids);
    await sbAdmin.from('nutrition_diary_entries').delete().in('client_user_id', uids);
    await sbAdmin.from('task_completions').delete().in('client_user_id', uids);
    await sbAdmin.from('task_assignments').delete().in('client_user_id', uids);
    await sbAdmin.from('workout_plans').delete().in('client_user_id', uids);
    await sbAdmin.from('meal_plans').delete().in('client_user_id', uids);
    await sbAdmin.from('streak_records').delete().in('client_user_id', uids);
    await sbAdmin.from('daily_activity').delete().in('client_user_id', uids);
    await sbAdmin.from('enrollments').delete().in('client_user_id', uids);
    await sbAdmin.from('subscriptions').delete().in('client_user_id', uids);
    await sbAdmin.from('payment_records').delete().in('client_user_id', uids);
    await sbAdmin.from('referrals').delete().in('referrer_user_id', uids);
    await sbAdmin.from('referrals').delete().in('referee_user_id', uids);
    await sbAdmin.from('consent_records').delete().in('user_id', uids);
    await sbAdmin.from('chat_messages').delete().in('sender_user_id', uids);
    await sbAdmin.from('chat_conversations').delete().in('client_user_id', uids);
    await sbAdmin.from('coaching_relationships').delete().in('client_user_id', uids);
    await sbAdmin.from('coaching_packages').delete().in('id', [
      SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
      SYNTHETIC_PACKAGES.PKG_ARJUN_TRANSFORM.id,
      SYNTHETIC_PACKAGES.PKG_FREE_INTRO.id,
    ]);
    await sbAdmin.from('client_profiles').delete().in('user_id', uids);
    await sbAdmin.from('trainer_profiles').delete().in('user_id', uids);
    await sbAdmin.from('platform_admins').delete().in('firebase_uid', uids);
    await sbAdmin.from('app_users').delete().in('firebase_uid', uids);
  } catch (err) {
    console.warn('Synthetic teardown warning:', err);
  }
}
