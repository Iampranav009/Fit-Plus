/**
 * FITPLUS — IDEMPOTENT EXERCISE ENCYCLOPEDIA SEED & IMPORT SCRIPT
 * 
 * Safely inserts or updates exercises in Supabase PostgreSQL while:
 * - Preserving all existing exercise IDs
 * - Preserving assigned workout plans and client workout history
 * - Avoiding duplicates with ON CONFLICT (id) DO UPDATE
 * - Restricting modification of custom trainer exercises
 */

import { BUILTIN_EXERCISES } from '../src/data/exerciseLibrary';
import type { ExerciseDefinition } from '../src/types/domain';

export interface ExerciseSeedSummary {
  totalImported: number;
  muscleBreakdown: Record<string, number>;
  equipmentBreakdown: Record<string, number>;
  difficultyBreakdown: Record<string, number>;
}

export function generateExerciseSeedSql(catalog: ExerciseDefinition[] = BUILTIN_EXERCISES): string {
  const statements: string[] = [
    '--',
    '-- FITPLUS IDEMPOTENT EXERCISE ENCYCLOPEDIA IMPORT SQL',
    '--',
    'BEGIN;',
  ];

  for (const ex of catalog) {
    const escapedName = ex.name.replace(/'/g, "''");
    const escapedSafety = (ex.safetyNotes || '').replace(/'/g, "''");
    const aliasesArray = `ARRAY[${(ex.aliases || []).map((a) => `'${a.replace(/'/g, "''")}'`).join(',')}]`;
    const secMusclesArray = `ARRAY[${ex.secondaryMuscles.map((m) => `'${m}'`).join(',')}]`;
    const instructionsArray = `ARRAY[${ex.instructions.map((i) => `'${i.replace(/'/g, "''")}'`).join(',')}]`;
    const mistakesArray = `ARRAY[${ex.commonMistakes.map((m) => `'${m.replace(/'/g, "''")}'`).join(',')}]`;
    const benefitsArray = `ARRAY[${(ex.benefits || []).map((b) => `'${b.replace(/'/g, "''")}'`).join(',')}]`;
    const altIdsArray = `ARRAY[${(ex.alternativeIds || []).map((a) => `'${a}'`).join(',')}]`;
    const phasesJson = JSON.stringify(ex.movementPhases || []).replace(/'/g, "''");

    const sql = `
INSERT INTO exercise_definitions (
  id, name, aliases, muscle_group, secondary_muscles,
  equipment_required, instructions, tips, category,
  environment, difficulty, benefits, start_image_url,
  end_image_url, thumbnail_url, movement_phases,
  safety_notes, alternative_ids, is_verified_by_trainer,
  is_custom, updated_at
) VALUES (
  '${ex.id}',
  '${escapedName}',
  ${aliasesArray},
  '${ex.primaryMuscles[0] || 'full_body'}',
  ${secMusclesArray},
  '${ex.equipment}',
  ${instructionsArray},
  ${mistakesArray},
  '${ex.category}',
  '${ex.environment}',
  '${ex.difficulty}',
  ${benefitsArray},
  ${ex.startImageUrl ? `'${ex.startImageUrl}'` : 'NULL'},
  ${ex.endImageUrl ? `'${ex.endImageUrl}'` : 'NULL'},
  ${ex.thumbnailUrl ? `'${ex.thumbnailUrl}'` : 'NULL'},
  '${phasesJson}'::jsonb,
  '${escapedSafety}',
  ${altIdsArray},
  true,
  false,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  aliases = EXCLUDED.aliases,
  muscle_group = EXCLUDED.muscle_group,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment_required = EXCLUDED.equipment_required,
  instructions = EXCLUDED.instructions,
  tips = EXCLUDED.tips,
  category = EXCLUDED.category,
  environment = EXCLUDED.environment,
  difficulty = EXCLUDED.difficulty,
  benefits = EXCLUDED.benefits,
  start_image_url = EXCLUDED.start_image_url,
  end_image_url = EXCLUDED.end_image_url,
  thumbnail_url = EXCLUDED.thumbnail_url,
  movement_phases = EXCLUDED.movement_phases,
  safety_notes = EXCLUDED.safety_notes,
  alternative_ids = EXCLUDED.alternative_ids,
  is_verified_by_trainer = true,
  updated_at = now()
WHERE exercise_definitions.is_custom = false;
`.trim();

    statements.push(sql);
  }

  statements.push('COMMIT;');
  return statements.join('\n\n');
}

export function computeEncyclopediaSummary(catalog: ExerciseDefinition[] = BUILTIN_EXERCISES): ExerciseSeedSummary {
  const muscleBreakdown: Record<string, number> = {};
  const equipmentBreakdown: Record<string, number> = {};
  const difficultyBreakdown: Record<string, number> = {};

  for (const ex of catalog) {
    const muscle = ex.primaryMuscles[0] || 'other';
    muscleBreakdown[muscle] = (muscleBreakdown[muscle] || 0) + 1;

    const equip = ex.equipment || 'other';
    equipmentBreakdown[equip] = (equipmentBreakdown[equip] || 0) + 1;

    const diff = ex.difficulty || 'intermediate';
    difficultyBreakdown[diff] = (difficultyBreakdown[diff] || 0) + 1;
  }

  return {
    totalImported: catalog.length,
    muscleBreakdown,
    equipmentBreakdown,
    difficultyBreakdown,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv.includes('--run')) {
  const summary = computeEncyclopediaSummary();
  console.log('--- FitPlus Encyclopedia Seed Summary ---');
  console.log(`Total Exercises: ${summary.totalImported}`);
  console.log('Primary Muscle Distribution:', summary.muscleBreakdown);
  console.log('Equipment Distribution:', summary.equipmentBreakdown);
  console.log('Difficulty Distribution:', summary.difficultyBreakdown);
}
