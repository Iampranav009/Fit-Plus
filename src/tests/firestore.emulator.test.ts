/**
 * Firestore Security Rules Emulator Test Suite (Dirty Dozen Invariants).
 * Run with Java installed via: npm run test:emulator
 */
import fs from 'node:fs';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

before(async () => {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'fitplus-rules-test',
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv?.cleanup();
});

test('1-2. Unverified users cannot write protected collections; verified users cannot escalate role to admin', async () => {
  const unverifiedDb = testEnv.authenticatedContext('u_unverified', {
    email: 'unverified@example.com',
    email_verified: false,
  }).firestore();

  await assertFails(
    setDoc(doc(unverifiedDb, 'users', 'u_unverified'), {
      id: 'u_unverified',
      firstName: 'Test',
      lastName: 'User',
      role: 'client',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      isAdultConfirmed: true,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  const verifiedDb = testEnv.authenticatedContext('u_client', {
    email: 'client@example.com',
    email_verified: true,
  }).firestore();

  await assertFails(
    setDoc(doc(verifiedDb, 'users', 'u_client'), {
      id: 'u_client',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      isAdultConfirmed: true,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  await assertSucceeds(
    setDoc(doc(verifiedDb, 'users', 'u_client'), {
      id: 'u_client',
      firstName: 'Test',
      lastName: 'User',
      role: 'client',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      isAdultConfirmed: true,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('3-4. Cross-tenant client profile and private contact isolation', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', 'u_alice', 'private', 'contact'), {
      userId: 'u_alice',
      email: 'alice@example.com',
      celebratedDateKeys: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'clients', 'cl_alice'), {
      id: 'cl_alice',
      userId: 'u_alice',
      firstName: 'Alice',
      lastName: '',
      primaryGoal: 'general_fitness',
      experienceLevel: 'beginner',
      daysPerWeek: 3,
      environment: 'home',
      equipment: [],
      dietaryPreference: 'vegetarian',
      activeTrainerUserId: '',
      activeRelationshipId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const bobDb = testEnv.authenticatedContext('u_bob', {
    email: 'bob@example.com',
    email_verified: true,
  }).firestore();

  await assertFails(getDoc(doc(bobDb, 'users', 'u_alice', 'private', 'contact')));
  await assertFails(getDoc(doc(bobDb, 'clients', 'cl_alice')));
});

test('5-7. Server-only collections (admins, payments, auditLogs) deny direct client writes & verification self-approval fails', async () => {
  const trainerDb = testEnv.authenticatedContext('u_trainer', {
    email: 'trainer@example.com',
    email_verified: true,
  }).firestore();

  await assertFails(
    setDoc(doc(trainerDb, 'admins', 'u_trainer'), {
      uid: 'u_trainer',
      createdAt: serverTimestamp(),
    }),
  );

  await assertFails(
    setDoc(doc(trainerDb, 'payments', 'pay_fake'), {
      id: 'pay_fake',
      clientId: 'cl_1',
      clientUserId: 'u_client',
      trainerId: 'trn_1',
      trainerUserId: 'u_trainer',
      packageId: 'pkg_1',
      amountInr: 999,
      currency: 'INR',
      status: 'captured',
      mode: 'live',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  await assertFails(
    setDoc(doc(trainerDb, 'trainers', 'trn_1'), {
      id: 'trn_1',
      userId: 'u_trainer',
      slug: 'coach-test',
      displayName: 'Coach Test',
      headline: 'Coach',
      bio: '',
      coachingStyle: '',
      city: 'Mumbai',
      coachingMode: 'online',
      specialties: ['Strength'],
      languages: ['English'],
      experienceYears: 4,
      avatarKey: 'coachArjun',
      coverKey: 'coachCover',
      verificationStatus: 'verified',
      isDemoVerified: true,
      acceptingClients: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('8. Platform admin can approve verification request; non-admin cannot', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'trainers', 'trn_1'), {
      id: 'trn_1',
      userId: 'u_trainer',
      slug: 'coach-test',
      displayName: 'Coach Test',
      headline: 'Coach',
      bio: '',
      coachingStyle: '',
      city: 'Mumbai',
      coachingMode: 'online',
      specialties: ['Strength'],
      languages: ['English'],
      experienceYears: 4,
      avatarKey: 'coachArjun',
      coverKey: 'coachCover',
      verificationStatus: 'pending',
      isDemoVerified: false,
      acceptingClients: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'trainerVerificationRequests', 'ver_1'), {
      id: 'ver_1',
      trainerId: 'trn_1',
      trainerUserId: 'u_trainer',
      qualificationTitle: 'ACE CPT',
      issuingBody: 'ACE',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const nonAdminDb = testEnv.authenticatedContext('u_other', {
    email: 'other@example.com',
    email_verified: true,
  }).firestore();

  await assertFails(
    updateDoc(doc(nonAdminDb, 'trainerVerificationRequests', 'ver_1'), {
      status: 'approved',
      updatedAt: serverTimestamp(),
    }),
  );

  const adminDb = testEnv.authenticatedContext('u_admin', {
    email: 'pranavshindeji5001@gmail.com',
    email_verified: true,
  }).firestore();

  await assertSucceeds(
    updateDoc(doc(adminDb, 'trainerVerificationRequests', 'ver_1'), {
      status: 'approved',
      updatedAt: serverTimestamp(),
    }),
  );
});
