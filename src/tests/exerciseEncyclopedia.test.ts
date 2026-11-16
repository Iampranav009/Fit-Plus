import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_EXERCISES,
  filterExercises,
  findExerciseByNameOrId,
  mergeExerciseCatalog,
  MUSCLE_LABELS,
} from '../data/exerciseLibrary';
import { resolveAnatomicalHighlights } from '../components/anatomy/muscleMapping';
import { getExerciseImageUrl } from '../lib/exerciseMedia';
import type { ExerciseDefinition } from '../types/domain';

test('Exercise Encyclopedia: Catalog scale, uniqueness, and schema integrity', () => {
  // 1. Ensure catalog has reached prioritized 100-150 range
  assert.ok(
    BUILTIN_EXERCISES.length >= 100 && BUILTIN_EXERCISES.length <= 150,
    `Exercise catalog should have between 100 and 150 exercises, got ${BUILTIN_EXERCISES.length}`,
  );

  // 2. Ensure all IDs are unique with zero duplicates
  const idSet = new Set<string>();
  for (const ex of BUILTIN_EXERCISES) {
    assert.ok(!idSet.has(ex.id), `Duplicate exercise ID detected: ${ex.id}`);
    idSet.add(ex.id);

    // Schema integrity assertions
    assert.ok(ex.id.startsWith('ex_'), `Exercise ID ${ex.id} must begin with ex_`);
    assert.ok(ex.name.trim().length >= 3, `Exercise ${ex.id} must have descriptive name`);
    assert.ok(ex.instructions.length >= 2, `Exercise ${ex.name} must have at least 2 steps`);
    assert.ok(ex.commonMistakes.length >= 1, `Exercise ${ex.name} must list common mistakes`);
    assert.ok(ex.primaryMuscles.length >= 1, `Exercise ${ex.name} must have at least 1 primary muscle`);
    assert.ok(MUSCLE_LABELS[ex.primaryMuscles[0]], `Primary muscle ${ex.primaryMuscles[0]} must exist in MUSCLE_LABELS`);
    assert.ok(['beginner', 'intermediate', 'experienced'].includes(ex.difficulty), `Valid difficulty for ${ex.name}`);
    assert.ok(['home', 'gym', 'both'].includes(ex.environment), `Valid environment for ${ex.name}`);
  }
});

test('Exercise Encyclopedia: 30 Original Core IDs preservation', () => {
  const originalIds = [
    'ex_incline_db_press',
    'ex_floor_db_press',
    'ex_pushup_elevated',
    'ex_band_chest_press',
    'ex_chest_supported_row',
    'ex_one_arm_db_row',
    'ex_band_seated_row',
    'ex_lat_pulldown',
    'ex_pullup_assisted',
    'ex_seated_db_ohp',
    'ex_pike_pushup',
    'ex_band_ohp',
    'ex_face_pull',
    'ex_band_pull_apart',
    'ex_goblet_squat',
    'ex_bodyweight_squat',
    'ex_kb_goblet_squat',
    'ex_db_rdl',
    'ex_barbell_rdl',
    'ex_glute_bridge',
    'ex_split_squat',
    'ex_step_up',
    'ex_farmer_carry',
    'ex_kb_swing',
    'ex_pallof_press',
    'ex_dead_bug',
    'ex_hip_90_90',
    'ex_thoracic_open_book',
    'ex_outdoor_walk',
    'ex_machine_leg_press',
  ];

  for (const id of originalIds) {
    const found = BUILTIN_EXERCISES.find((e) => e.id === id);
    assert.ok(found, `Original core exercise ID ${id} must be preserved in the catalog`);
  }
});

test('Exercise Encyclopedia: Anatomical muscle mapping and highlight resolution', () => {
  // Test Chest Press highlighting
  const { primaryIds, secondaryIds } = resolveAnatomicalHighlights(['chest'], ['triceps']);
  assert.ok(primaryIds.has('pectoralis_major'), 'Chest must highlight pectoralis_major as primary');
  assert.ok(primaryIds.has('pectoralis_minor'), 'Chest must highlight pectoralis_minor as primary');
  assert.ok(secondaryIds.has('triceps_brachii'), 'Triceps must highlight triceps_brachii as secondary');
  assert.ok(!secondaryIds.has('pectoralis_major'), 'Primary muscle must not be in secondary set');

  // Test Posterior Chain Deadlift highlighting
  const dlHighlights = resolveAnatomicalHighlights(['hamstrings', 'glutes'], ['back', 'core']);
  assert.ok(dlHighlights.primaryIds.has('hamstrings_biceps_femoris'), 'Hamstrings must be highlighted');
  assert.ok(dlHighlights.primaryIds.has('gluteus_maximus'), 'Glutes must be highlighted');
  assert.ok(dlHighlights.secondaryIds.has('latissimus_dorsi'), 'Back should be secondary highlight');
});

test('Exercise Encyclopedia: Multi-dimensional search, aliases, and filters', () => {
  // 1. Search by Alias (RDL -> Romanian Deadlift)
  const rdlSearch = filterExercises(BUILTIN_EXERCISES, { search: 'RDL' });
  assert.ok(rdlSearch.length >= 1, 'Search for alias RDL must return results');
  assert.ok(rdlSearch.some((e) => e.name.includes('Romanian Deadlift') || (e.aliases || []).includes('RDL')));

  // 2. Search by Alias (OHP -> Overhead Press)
  const ohpSearch = filterExercises(BUILTIN_EXERCISES, { search: 'OHP' });
  assert.ok(ohpSearch.length >= 1, 'Search for alias OHP must return results');

  // 3. Filter by Muscle: Chest
  const chestFiltered = filterExercises(BUILTIN_EXERCISES, { muscle: 'chest' });
  assert.ok(chestFiltered.length >= 10, 'Should find at least 10 chest movements');
  for (const ex of chestFiltered) {
    const allTargets = [...ex.primaryMuscles, ...ex.secondaryMuscles];
    assert.ok(allTargets.includes('chest'), `${ex.name} must target chest`);
  }

  // 4. Filter by Location: Home friendly
  const homeFiltered = filterExercises(BUILTIN_EXERCISES, { environment: 'home' });
  assert.ok(homeFiltered.length >= 15, 'Should have robust home exercise representation');
  for (const ex of homeFiltered) {
    assert.notEqual(ex.environment, 'gym', 'Home filter must exclude gym-only equipment');
  }

  // 5. Filter by Equipment: Bodyweight
  const bwFiltered = filterExercises(BUILTIN_EXERCISES, { equipment: 'bodyweight' });
  assert.ok(bwFiltered.length >= 20, 'Should have at least 20 bodyweight movements');
  for (const ex of bwFiltered) {
    assert.equal(ex.equipment, 'bodyweight');
  }
});

test('Exercise Encyclopedia: Media resolver and movement phases', () => {
  const cdnUrl = getExerciseImageUrl('Incline_Dumbbell_Press/0.jpg', 'start');
  assert.ok(cdnUrl.includes('raw.githubusercontent.com') || cdnUrl.includes('Incline_Dumbbell_Press'));

  const emptyFallback = getExerciseImageUrl();
  assert.ok(emptyFallback.startsWith('data:image/svg+xml'), 'Must return valid SVG fallback');
});

test('Exercise Encyclopedia: Custom exercise merge stability', () => {
  const customEx: ExerciseDefinition = {
    id: 'ex_custom_surya_namaskar',
    name: 'Surya Namaskar Dynamic Flow',
    category: 'mobility',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['full_body', 'core'],
    secondaryMuscles: ['hamstrings'],
    instructions: ['Inhale and reach overhead.', 'Fold forward into Uttanasana.'],
    commonMistakes: ['Hyperextending neck without abdominal support.'],
    safetyNotes: 'Move fluidly with breath.',
    alternativeIds: [],
    isCustom: true,
  };

  const initialCount = BUILTIN_EXERCISES.length;
  const merged = mergeExerciseCatalog([customEx]);
  assert.equal(merged.length, initialCount + 1, 'Merged catalog should have exactly 1 more exercise');

  const found = findExerciseByNameOrId('ex_custom_surya_namaskar', merged);
  assert.ok(found);
  assert.equal(found?.name, 'Surya Namaskar Dynamic Flow');
});
