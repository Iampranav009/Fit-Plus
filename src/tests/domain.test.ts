import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDayConsistency, computeStreakSummary } from '../lib/streak';
import {
  attemptBookConsultationSlot,
  buildBulkAssignments,
  createDemoEnrollmentState,
  generateDeterministicPlanDraft,
  validateInvite,
} from '../lib/engines';
import { createSeedSnapshot } from '../data/demo/fixtures';
import type { Assignment, CompletionEvent } from '../types/domain';

test('Streak engine: counts recovery days, treats unscheduled/future days as neutral, and recalculates on undo', () => {
  const today = '2026-11-15';
  const assignments: Assignment[] = [
    {
      id: 'a_req',
      clientId: 'c1',
      title: 'Workout',
      category: 'workout',
      instructions: 'Lift',
      durationMinutes: 40,
      dueTime: '8:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-12', '2026-11-14', '2026-11-15', '2026-11-16'],
      isOptional: false,
      isRecovery: false,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'a_rec',
      clientId: 'c1',
      title: 'Recovery walk',
      category: 'recovery',
      instructions: 'Walk 20 min',
      durationMinutes: 20,
      dueTime: '8:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-13'],
      isOptional: false,
      isRecovery: true,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'a_opt',
      clientId: 'c1',
      title: 'Optional stretch',
      category: 'habit',
      instructions: 'Stretch',
      durationMinutes: 10,
      dueTime: '9:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-11', '2026-11-15'],
      isOptional: true,
      isRecovery: false,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  // Note: 2026-11-11 has only an optional task -> must be neutral (neither breaks nor extends)
  const day11 = computeDayConsistency('2026-11-11', assignments, [], today);
  assert.equal(day11.status, 'neutral');

  const dayFuture = computeDayConsistency('2026-11-16', assignments, [], today);
  assert.equal(dayFuture.status, 'future');

  // Complete Nov 12, Nov 13 (recovery), Nov 14 -> today (Nov 15) is still pending, so streak is 3
  const completions: CompletionEvent[] = [
    { id: 'c1', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-12', completedAt: '2026-11-12T10:00:00Z' },
    { id: 'c2', assignmentId: 'a_rec', clientId: 'c1', dateKey: '2026-11-13', completedAt: '2026-11-13T10:00:00Z' },
    { id: 'c3', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-14', completedAt: '2026-11-14T10:00:00Z' },
  ];

  const pendingToday = computeStreakSummary(assignments, completions, today, 10);
  assert.equal(pendingToday.currentStreak, 3);
  assert.equal(pendingToday.todayStatus, 'pending');

  // Complete today's required task -> streak increases to 4 (even without optional task)
  const withToday = [
    ...completions,
    { id: 'c4', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-15', completedAt: '2026-11-15T10:00:00Z' },
  ];
  const afterToday = computeStreakSummary(assignments, withToday, today, 10);
  assert.equal(afterToday.currentStreak, 4);
  assert.equal(afterToday.todayStatus, 'completed');

  // Undo Nov 13 recovery -> breaks streak back to 2 (Nov 14 + Nov 15)
  const afterUndo = computeStreakSummary(
    assignments,
    withToday.filter((c) => c.id !== 'c2'),
    today,
    10,
  );
  assert.equal(afterUndo.currentStreak, 2);
});

test('Bulk assignment: creates individual records, skips duplicates when enabled, and preserves overrides', () => {
  const seed = createSeedSnapshot(new Date('2026-11-15T12:00:00Z'));
  const clientUserIdMap: Record<string, string> = {};
  seed.clients.forEach((c) => {
    clientUserIdMap[c.id] = c.userId;
  });

  const tpl = seed.templates.find((t) => t.id === 'tpl_steps_8k')!;
  const result = buildBulkAssignments(
    {
      trainerId: 'trn_arjun',
      clientIds: ['cl_aarav', 'cl_ananya'],
      template: tpl,
      startDateKey: seed.anchorDateKey,
      recurrenceDays: 3,
      dueTime: '8:30 PM',
      skipDuplicates: true,
      existingAssignments: seed.assignments,
    },
    clientUserIdMap,
  );

  // Aarav already has tpl_steps_8k scheduled today, so he is skipped; Ananya gets a new record
  assert.deepEqual(result.skippedClientIds, ['cl_aarav']);
  assert.equal(result.created.length, 1);
  assert.equal(result.created[0].clientId, 'cl_ananya');
  assert.equal(result.created[0].scheduledDates.length, 3);
});

test('Invite validation, package enrollment, and consultation duplicate-slot prevention', () => {
  const seed = createSeedSnapshot(new Date('2026-11-15T12:00:00Z'));

  const valid = validateInvite('FIT-ARJUN-2026', seed.invites, seed.anchorDateKey);
  assert.equal(valid.state, 'valid');

  const expired = validateInvite('FIT-EXP-000', seed.invites, seed.anchorDateKey);
  assert.equal(expired.state, 'expired');

  const invalid = validateInvite('NO-SUCH-TOKEN', seed.invites, seed.anchorDateKey);
  assert.equal(invalid.state, 'not_found');

  // Enrollment connects Kavya only after explicit acceptance
  const pkg = seed.packages.find((p) => p.id === 'pkg_arjun_weight')!;
  const enrolled = createDemoEnrollmentState({
    clientId: 'cl_kavya',
    trainerId: 'trn_arjun',
    pkg,
    existingRelationships: seed.relationships,
    existingEnrollments: seed.enrollments,
  });
  assert.ok(
    enrolled.relationships.some(
      (r) => r.clientId === 'cl_kavya' && r.trainerId === 'trn_arjun' && r.status === 'active',
    ),
  );

  // Booking slot succeeds once and blocks duplicate attempt on same slot
  const openSlot = seed.consultationSlots.find((s) => s.status === 'available')!;
  const firstBook = attemptBookConsultationSlot({
    slotId: openSlot.id,
    clientId: 'cl_kavya',
    topic: 'Initial consult',
    slots: seed.consultationSlots,
    bookings: seed.bookings,
  });
  assert.equal(firstBook.ok, true);
  if (firstBook.ok) {
    const secondBook = attemptBookConsultationSlot({
      slotId: openSlot.id,
      clientId: 'cl_aarav',
      topic: 'Double booking attempt',
      slots: firstBook.slots,
      bookings: [...seed.bookings, firstBook.booking],
    });
    assert.equal(secondBook.ok, false);
  }
});

test('Deterministic AI plan drafter produces reviewable draft without live API calls', () => {
  const draft = generateDeterministicPlanDraft({
    trainerId: 'trn_arjun',
    objective: 'weight_management',
    experienceLevel: 'beginner',
    daysPerWeek: 4,
    environment: 'home',
    dietaryPreference: 'vegetarian',
    constraints: 'Knee comfort',
  });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.workoutDays.length, 7);
  assert.ok(draft.nutritionOutline.length >= 3);
});
