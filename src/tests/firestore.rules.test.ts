import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  assertValidId,
  BLUEPRINT_LIMITS,
  BLUEPRINT_PATTERNS,
  clampString,
  clampStringArray,
  sanitizeDateKey,
  sanitizeSlug,
  sanitizeTimeHHMM,
} from '../lib/firestoreValidation';

test('blueprint validation enforces ID pattern and length bounds', () => {
  assert.equal(assertValidId('usr_123-abc', 'userId'), 'usr_123-abc');
  assert.throws(() => assertValidId('bad/id$char', 'userId'));
  assert.throws(() => assertValidId('x'.repeat(BLUEPRINT_LIMITS.idMax + 1), 'userId'));
});

test('blueprint validation sanitizes slugs, date keys, times, and bounded arrays', () => {
  assert.equal(sanitizeSlug('Arjun Kulkarni Fitness!'), 'arjun-kulkarni-fitness');
  assert.ok(BLUEPRINT_PATTERNS.slug.test(sanitizeSlug('!@#')));
  assert.equal(sanitizeDateKey('2026-11-15', '2026-01-01'), '2026-11-15');
  assert.equal(sanitizeDateKey('not-a-date', '2026-01-01'), '2026-01-01');
  assert.equal(sanitizeTimeHHMM('07:30'), '07:30');
  assert.equal(sanitizeTimeHHMM('7:30', '09:00'), '09:00');
  assert.equal(clampString('a'.repeat(500), 140).length, 140);
  assert.equal(clampStringArray(Array.from({ length: 20 }, (_, i) => `item-${i}`), 10, 40).length, 10);
});

test('firestore.rules contains Eight Pillars hardening for every blueprint collection', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
    firestore: Record<string, unknown>;
  };

  assert.ok(rules.includes("rules_version = '2';"));
  assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  assert.ok(rules.includes('incoming().isDemoVerified == false'));
  assert.ok(rules.includes('existsAfter(/databases/$(database)/documents/bookings/'));
  assert.ok(rules.includes('getAfter(/databases/$(database)/documents/consultationSlots/'));

  const expectedCollections = [
    '/users/{userId}',
    '/private/{docId}',
    '/trainers/{trainerId}',
    '/packages/{packageId}',
    '/clients/{clientId}',
    '/relationships/{relationshipId}',
    '/invites/{inviteId}',
    '/enrollments/{enrollmentId}',
    '/templates/{templateId}',
    '/assignments/{assignmentId}',
    '/completions/{completionId}',
    '/progressEvents/{eventId}',
    '/workoutPlans/{planId}',
    '/mealPlans/{planId}',
    '/consultationSlots/{slotId}',
    '/bookings/{bookingId}',
    '/notifications/{notificationId}',
    '/aiDrafts/{draftId}',
  ];

  for (const col of expectedCollections) {
    assert.ok(rules.includes(`match ${col}`), `Missing match block for ${col}`);
  }
  assert.equal(Object.keys(blueprint.firestore).length, 18);
});
