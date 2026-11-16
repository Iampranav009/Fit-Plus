import type { MuscleGroup } from '../../types/domain';
import type { AnatomicalMuscleId } from './anatomyTypes';

export const DOMAIN_TO_ANATOMICAL_MAP: Record<MuscleGroup, AnatomicalMuscleId[]> = {
  chest: ['pectoralis_major', 'pectoralis_minor'],
  back: ['latissimus_dorsi', 'trapezius_middle_lower', 'trapezius_upper', 'infraspinatus_teres', 'erector_spinae'],
  shoulders: ['deltoid_anterior', 'deltoid_lateral', 'deltoid_posterior', 'trapezius_upper'],
  biceps: ['biceps_brachii', 'brachialis'],
  triceps: ['triceps_brachii'],
  core: ['rectus_abdominis', 'obliques_external', 'erector_spinae'],
  quads: ['quadriceps_rectus_femoris', 'quadriceps_vastus_lateralis', 'quadriceps_vastus_medialis'],
  hamstrings: ['hamstrings_biceps_femoris', 'hamstrings_semitendinosus'],
  glutes: ['gluteus_maximus', 'gluteus_medius'],
  calves: ['gastrocnemius', 'soleus', 'tibialis_anterior'],
  full_body: [
    'pectoralis_major',
    'deltoid_anterior',
    'deltoid_lateral',
    'biceps_brachii',
    'rectus_abdominis',
    'quadriceps_rectus_femoris',
    'latissimus_dorsi',
    'trapezius_upper',
    'triceps_brachii',
    'gluteus_maximus',
    'hamstrings_biceps_femoris',
  ],
  cardio: [
    'quadriceps_rectus_femoris',
    'hamstrings_biceps_femoris',
    'gluteus_maximus',
    'gastrocnemius',
    'rectus_abdominis',
  ],
};

export const ANATOMICAL_MUSCLE_LABELS: Record<AnatomicalMuscleId, string> = {
  pectoralis_major: 'Pectoralis Major',
  pectoralis_minor: 'Pectoralis Minor',
  deltoid_anterior: 'Anterior Deltoid',
  deltoid_lateral: 'Lateral Deltoid',
  deltoid_posterior: 'Posterior Deltoid',
  biceps_brachii: 'Biceps Brachii',
  brachialis: 'Brachialis',
  forearms_anterior: 'Forearm Flexors',
  rectus_abdominis: 'Rectus Abdominis',
  obliques_external: 'External Obliques',
  quadriceps_rectus_femoris: 'Rectus Femoris',
  quadriceps_vastus_lateralis: 'Vastus Lateralis',
  quadriceps_vastus_medialis: 'Vastus Medialis',
  tibialis_anterior: 'Tibialis Anterior',
  adductors: 'Adductors',

  trapezius_upper: 'Upper Trapezius',
  trapezius_middle_lower: 'Mid & Lower Trapezius',
  infraspinatus_teres: 'Rotator Cuff & Teres',
  latissimus_dorsi: 'Latissimus Dorsi',
  erector_spinae: 'Erector Spinae',
  triceps_brachii: 'Triceps Brachii',
  forearms_posterior: 'Forearm Extensors',
  gluteus_maximus: 'Gluteus Maximus',
  gluteus_medius: 'Gluteus Medius',
  hamstrings_biceps_femoris: 'Biceps Femoris',
  hamstrings_semitendinosus: 'Semitendinosus',
  gastrocnemius: 'Gastrocnemius',
  soleus: 'Soleus',
};

/**
 * Given primary and secondary muscle groups from an exercise,
 * resolve which anatomical muscle IDs should be highlighted.
 */
export function resolveAnatomicalHighlights(
  primaryMuscles: MuscleGroup[] = [],
  secondaryMuscles: MuscleGroup[] = [],
): {
  primaryIds: Set<AnatomicalMuscleId>;
  secondaryIds: Set<AnatomicalMuscleId>;
} {
  const primaryIds = new Set<AnatomicalMuscleId>();
  const secondaryIds = new Set<AnatomicalMuscleId>();

  for (const group of primaryMuscles) {
    const anatomical = DOMAIN_TO_ANATOMICAL_MAP[group] || [];
    for (const id of anatomical) {
      primaryIds.add(id);
    }
  }

  for (const group of secondaryMuscles) {
    const anatomical = DOMAIN_TO_ANATOMICAL_MAP[group] || [];
    for (const id of anatomical) {
      if (!primaryIds.has(id)) {
        secondaryIds.add(id);
      }
    }
  }

  return { primaryIds, secondaryIds };
}
