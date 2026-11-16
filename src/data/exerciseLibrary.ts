import type { ExerciseDefinition, ExerciseEnvironment, ExerciseEquipment, MuscleGroup } from '../types/domain';

export const BUILTIN_EXERCISES: ExerciseDefinition[] = [
  {
    id: 'ex_incline_db_press',
    name: 'Incline Dumbbell Press',
    category: 'strength',
    environment: 'both',
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps'],
    instructions: [
      'Set a bench to a 30-degree incline (or prop a sturdy wedge at home) and plant both feet flat.',
      'Hold dumbbells at a 45-degree elbow angle rather than flared out at 90 degrees.',
      'Lower with a controlled 2-second count until dumbbells align near the upper chest.',
      'Press smoothly upward while keeping shoulder blades tucked gently into the bench.',
    ],
    commonMistakes: [
      'Flaring elbows wide toward the ears, which irritates the front shoulder.',
      'Bouncing weights off the chest without tension at the bottom.',
    ],
    safetyNotes: 'Keep wrists stacked directly over elbows and stop 1-2 reps shy of form breakdown.',
    alternativeIds: ['ex_pushup_elevated', 'ex_floor_db_press', 'ex_band_chest_press'],
  },
  {
    id: 'ex_floor_db_press',
    name: 'Dumbbell Floor Press',
    category: 'strength',
    environment: 'home',
    equipment: 'dumbbells',
    difficulty: 'beginner',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    instructions: [
      'Lie flat on a mat with knees bent and feet planted hip-width apart.',
      'Lower dumbbells slowly until upper arms lightly tap the floor with elbows at 45 degrees.',
      'Pause briefly, then press up over the mid-chest.',
    ],
    commonMistakes: ['Dropping elbows rapidly onto the floor.', 'Over-arching the lower back.'],
    safetyNotes: 'Naturally limits shoulder depth, making it gentle for home training.',
    alternativeIds: ['ex_incline_db_press', 'ex_pushup_elevated'],
  },
  {
    id: 'ex_pushup_elevated',
    name: 'Push-Up (Hands Elevated or Floor)',
    category: 'strength',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders', 'core'],
    instructions: [
      'Place hands slightly wider than shoulders on the floor, a sturdy bench, or kitchen counter.',
      'Brace glutes and abs so your body moves as one straight plank line.',
      'Lower chest toward the support with elbows angled back ~45 degrees, then press through the floor.',
    ],
    commonMistakes: ['Letting hips sag toward the ground.', 'Craning the neck forward before the chest lowers.'],
    safetyNotes: 'Use a higher incline to scale difficulty smoothly without wrist or shoulder strain.',
    alternativeIds: ['ex_incline_db_press', 'ex_floor_db_press', 'ex_band_chest_press'],
  },
  {
    id: 'ex_band_chest_press',
    name: 'Resistance Band Chest Press',
    category: 'strength',
    environment: 'home',
    equipment: 'resistance_band',
    difficulty: 'beginner',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps', 'core'],
    instructions: [
      'Loop a resistance band behind your upper back or anchor it securely behind you.',
      'Step into a staggered stance for balance and press handles forward until arms extend cleanly.',
    ],
    commonMistakes: ['Shrugging shoulders upward during the press.'],
    safetyNotes: 'Check band tension and anchor security before every set.',
    alternativeIds: ['ex_pushup_elevated', 'ex_floor_db_press'],
  },
  {
    id: 'ex_chest_supported_row',
    name: 'Chest-Supported Row',
    category: 'strength',
    environment: 'gym',
    equipment: 'dumbbells',
    difficulty: 'beginner',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'shoulders'],
    instructions: [
      'Lie chest-down on an incline bench set to 30-45 degrees with dumbbells hanging straight down.',
      'Pull elbows back toward your hips, squeezing shoulder blades together for a beat at the top.',
      'Lower steadily until arms reach full stretch without rounding shoulders forward.',
    ],
    commonMistakes: ['Pulling straight up toward the armpits instead of sweeping back toward the hips.'],
    safetyNotes: 'Bench support protects the lower back during high-rep back training.',
    alternativeIds: ['ex_one_arm_db_row', 'ex_band_seated_row', 'ex_lat_pulldown'],
  },
  {
    id: 'ex_one_arm_db_row',
    name: 'Single-Arm Dumbbell Row',
    category: 'strength',
    environment: 'both',
    equipment: 'dumbbells',
    difficulty: 'beginner',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core'],
    instructions: [
      'Support one hand on a sturdy bench or chair with a flat, neutral spine.',
      'Pull the dumbbell smoothly toward your hip pocket while keeping hips square to the floor.',
    ],
    commonMistakes: ['Twisting the torso aggressively to heave heavy weight.'],
    safetyNotes: 'Brace your midsection so lower-back rotation stays minimal.',
    alternativeIds: ['ex_chest_supported_row', 'ex_band_seated_row'],
  },
  {
    id: 'ex_band_seated_row',
    name: 'Seated Resistance Band Row',
    category: 'strength',
    environment: 'home',
    equipment: 'resistance_band',
    difficulty: 'beginner',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps'],
    instructions: [
      'Sit tall on a mat with knees slightly bent and loop a band around the midfoot.',
      'Row elbows straight back past your ribs, pausing 1 second at full squeeze.',
    ],
    commonMistakes: ['Rounding the upper back or letting the band slip off shoes/feet.'],
    safetyNotes: 'Keep band centered securely around the arch of the foot or wear trainers.',
    alternativeIds: ['ex_one_arm_db_row', 'ex_chest_supported_row'],
  },
  {
    id: 'ex_lat_pulldown',
    name: 'Lat Pulldown (Neutral Grip)',
    category: 'strength',
    environment: 'gym',
    equipment: 'cable',
    difficulty: 'beginner',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'shoulders'],
    instructions: [
      'Adjust the thigh pad snug and grip the neutral attachment shoulder-width apart.',
      'Initiate by drawing shoulder blades down, pulling handles cleanly toward the upper collarbone.',
      'Control the return until lats feel a clean overhead stretch.',
    ],
    commonMistakes: ['Leaning far back and turning the movement into a torso swing.'],
    safetyNotes: 'Avoid pulling the bar behind the neck.',
    alternativeIds: ['ex_pullup_assisted', 'ex_band_seated_row'],
  },
  {
    id: 'ex_pullup_assisted',
    name: 'Pull-Up / Band-Assisted Chin-Up',
    category: 'strength',
    environment: 'both',
    equipment: 'pullup_bar',
    difficulty: 'intermediate',
    primaryMuscles: ['back', 'biceps'],
    secondaryMuscles: ['core'],
    instructions: [
      'Hang from a bar slightly wider than shoulder width with ribs tucked down.',
      'Pull chest up toward the bar until chin clears cleanly, then lower with 2-second control.',
    ],
    commonMistakes: ['Kipping legs or cutting bottom range of motion short.'],
    safetyNotes: 'Ensure doorway or wall pull-up bars are rated and locked before loading.',
    alternativeIds: ['ex_lat_pulldown', 'ex_one_arm_db_row'],
  },
  {
    id: 'ex_seated_db_ohp',
    name: 'Seated Dumbbell Shoulder Press',
    category: 'strength',
    environment: 'both',
    equipment: 'dumbbells',
    difficulty: 'beginner',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'core'],
    instructions: [
      'Sit tall with back supported or upright, dumbbells poised just above shoulder height.',
      'Keep elbows slightly forward in the scapular plane and press smoothly overhead.',
    ],
    commonMistakes: ['Flaring lower ribs outward to compensate for tight overhead mobility.'],
    safetyNotes: 'Keep head neutral instead of jutting chin forward.',
    alternativeIds: ['ex_pike_pushup', 'ex_band_ohp'],
  },
  {
    id: 'ex_pike_pushup',
    name: 'Pike Push-Up',
    category: 'strength',
    environment: 'home',
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'core'],
    instructions: [
      'Start in an inverted V stance with hips high and hands shoulder-width apart.',
      'Bend elbows back to lower the crown of your head softly toward a point ahead of your hands, then press up.',
    ],
    commonMistakes: ['Flaring elbows straight out sideways.'],
    safetyNotes: 'Bend knees slightly if hamstrings feel tight.',
    alternativeIds: ['ex_seated_db_ohp', 'ex_band_ohp'],
  },
  {
    id: 'ex_band_ohp',
    name: 'Standing Band Overhead Press',
    category: 'strength',
    environment: 'home',
    equipment: 'resistance_band',
    difficulty: 'beginner',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'core'],
    instructions: [
      'Stand firmly on the middle of a resistance band with feet shoulder-width apart.',
      'Brace abs and glutes, then press handles cleanly overhead without arching the back.',
    ],
    commonMistakes: ['Locking knees rigidly or leaning back.'],
    safetyNotes: 'Keep band clear of face when lowering.',
    alternativeIds: ['ex_seated_db_ohp', 'ex_pike_pushup'],
  },
  {
    id: 'ex_face_pull',
    name: 'Cable Face Pulls',
    category: 'strength',
    environment: 'gym',
    equipment: 'cable',
    difficulty: 'beginner',
    primaryMuscles: ['shoulders', 'back'],
    secondaryMuscles: ['biceps'],
    instructions: [
      'Set a rope attachment around eye level and hold with thumbs pointing backward.',
      'Pull rope handles smoothly toward your temples while rotating thumbs backward at the end.',
    ],
    commonMistakes: ['Using too much weight so lower back leans into the pull.'],
    safetyNotes: 'Prioritize posture and rear-shoulder tension over heavy load.',
    alternativeIds: ['ex_band_pull_apart', 'ex_chest_supported_row'],
  },
  {
    id: 'ex_band_pull_apart',
    name: 'Resistance Band Pull-Apart',
    category: 'strength',
    environment: 'both',
    equipment: 'resistance_band',
    difficulty: 'beginner',
    primaryMuscles: ['shoulders', 'back'],
    secondaryMuscles: [],
    instructions: [
      'Hold a light band at shoulder width with arms extended straight ahead.',
      'Sweep arms open horizontally until the band gently taps the upper chest, keeping shoulders relaxed.',
    ],
    commonMistakes: ['Shrugging upper traps toward the ears.'],
    safetyNotes: 'Ideal warm-up or home substitute for cable face pulls.',
    alternativeIds: ['ex_face_pull', 'ex_chest_supported_row'],
  },
  {
    id: 'ex_goblet_squat',
    name: 'Goblet Squat',
    category: 'strength',
    environment: 'both',
    equipment: 'dumbbells',
    difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['core', 'back'],
    instructions: [
      'Cup one dumbbell or kettlebell vertically against your chest with elbows tucked down.',
      'Stand shoulder-width apart with toes slightly turned out and sit hips down between your heels.',
      'Drive evenly through mid-foot and heel to stand tall.',
    ],
    commonMistakes: ['Heels lifting off the floor.', 'Allowing knees to cave inward on the ascent.'],
    safetyNotes: 'Elevate heels slightly on thin plates or use a bodyweight box squat if ankles feel stiff.',
    alternativeIds: ['ex_bodyweight_squat', 'ex_kb_goblet_squat', 'ex_split_squat'],
  },
  {
    id: 'ex_bodyweight_squat',
    name: 'Bodyweight Tempo Squat',
    category: 'strength',
    environment: 'home',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['core'],
    instructions: [
      'Stand shoulder-width apart, reach arms forward for counterbalance, and lower for 3 full seconds.',
      'Pause 1 second at comfortable depth, then stand smoothly.',
    ],
    commonMistakes: ['Rushing the bottom bounce.'],
    safetyNotes: 'Squat to a sturdy chair first if rebuilding knee confidence.',
    alternativeIds: ['ex_goblet_squat', 'ex_split_squat'],
  },
  {
    id: 'ex_kb_goblet_squat',
    name: 'Kettlebell Goblet Squat',
    category: 'strength',
    environment: 'both',
    equipment: 'kettlebell',
    difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['core'],
    instructions: [
      'Hold kettlebell by the horns tight against the collarbone.',
      'Sit straight down keeping chest proud and elbows inside the knees at the bottom.',
    ],
    commonMistakes: ['Letting the bell drift away from the torso.'],
    safetyNotes: 'Keep neutral spine and controlled descent.',
    alternativeIds: ['ex_goblet_squat', 'ex_bodyweight_squat'],
  },
  {
    id: 'ex_db_rdl',
    name: 'Dumbbell Romanian Deadlift',
    category: 'strength',
    environment: 'both',
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['back', 'core'],
    instructions: [
      'Stand hip-width with knees softly unlocked and dumbbells resting gently along your front thighs.',
      'Push hips straight backward as though closing a car door behind you, keeping weights grazing your shins.',
      'Stop as soon as hips stop traveling back (mid-shin level), then squeeze glutes forward to stand.',
    ],
    commonMistakes: ['Rounding the lower back to chase extra floor reach.', 'Squatting hips down instead of hinging back.'],
    safetyNotes: 'Keep neck neutral and stop depth before the lower spine rounds.',
    alternativeIds: ['ex_barbell_rdl', 'ex_glute_bridge'],
  },
  {
    id: 'ex_barbell_rdl',
    name: 'Barbell Romanian Deadlift',
    category: 'strength',
    environment: 'gym',
    equipment: 'barbell',
    difficulty: 'experienced',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['back', 'core'],
    instructions: [
      'Hold a barbell just outside thighs with lats engaged so the bar stays glued to your legs.',
      'Hinge hips back smoothly for 2-3 seconds, then drive hips forward without hyperextending.',
    ],
    commonMistakes: ['Letting the bar drift away from shins.'],
    safetyNotes: 'Brace trunk before every repetition and use straps if grip limits hamstring stimulus.',
    alternativeIds: ['ex_db_rdl', 'ex_glute_bridge'],
  },
  {
    id: 'ex_glute_bridge',
    name: 'Single-Leg or Bodyweight Glute Bridge',
    category: 'strength',
    environment: 'home',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['glutes', 'hamstrings'],
    secondaryMuscles: ['core'],
    instructions: [
      'Lie face-up with knees bent and heels tucked ~20 cm from glutes.',
      'Tuck ribs down gently and drive through heels to lift hips into a straight knee-to-shoulder line.',
    ],
    commonMistakes: ['Flaring lower back by driving hips too high without glute tension.'],
    safetyNotes: 'Very joint-friendly home hinge option.',
    alternativeIds: ['ex_db_rdl', 'ex_kb_swing'],
  },
  {
    id: 'ex_split_squat',
    name: 'Split Squat',
    category: 'strength',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'calves'],
    instructions: [
      'Take a comfortable split stance as if standing on two train tracks (not a tightrope).',
      'Lower rear knee straight down toward a soft pad while keeping front heel planted.',
    ],
    commonMistakes: ['Stepping feet inline so balance wobbles.', 'Front heel peeling off the floor.'],
    safetyNotes: 'Hold onto a doorframe or bench with one hand if building balance.',
    alternativeIds: ['ex_step_up', 'ex_goblet_squat'],
  },
  {
    id: 'ex_step_up',
    name: 'Controlled Step-Up',
    category: 'strength',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['calves', 'core'],
    instructions: [
      'Place whole foot solidly on a knee-height step or sturdy bench.',
      'Drive through the top heel without pushing off hard with the back toes, then lower slowly.',
    ],
    commonMistakes: ['Jumping up off the trailing foot instead of working the lead leg.'],
    safetyNotes: 'Ensure step/bench surface is non-slip and stable.',
    alternativeIds: ['ex_split_squat', 'ex_goblet_squat'],
  },
  {
    id: 'ex_farmer_carry',
    name: 'Farmer Carry',
    category: 'conditioning',
    environment: 'both',
    equipment: 'dumbbells',
    difficulty: 'beginner',
    primaryMuscles: ['core', 'full_body'],
    secondaryMuscles: ['shoulders', 'back'],
    instructions: [
      'Pick up two heavy dumbbells or loaded bags cleanly with a flat back.',
      'Walk with tall posture, stacked ribs, and quiet footsteps without leaning side-to-side.',
    ],
    commonMistakes: ['Walking too fast and swinging the weights.', 'Slumping shoulders forward.'],
    safetyNotes: 'Watch floor space and set weights down by squatting—never twist while setting down.',
    alternativeIds: ['ex_pallof_press', 'ex_kb_swing'],
  },
  {
    id: 'ex_kb_swing',
    name: 'Kettlebell Swing',
    category: 'conditioning',
    environment: 'both',
    equipment: 'kettlebell',
    difficulty: 'intermediate',
    primaryMuscles: ['glutes', 'hamstrings', 'cardio'],
    secondaryMuscles: ['core', 'back'],
    instructions: [
      'Hike the kettlebell high between thighs like a football snap.',
      'Snap hips briskly to vertical so arms float to chest height without lifting with the shoulders.',
    ],
    commonMistakes: ['Squatting low instead of hip hinging.', 'Using arms to muscle the bell up.'],
    safetyNotes: 'Master Dumbbell RDL hinge mechanics before adding ballistic swings.',
    alternativeIds: ['ex_db_rdl', 'ex_glute_bridge'],
  },
  {
    id: 'ex_pallof_press',
    name: 'Pallof Press (Cable or Band)',
    category: 'strength',
    environment: 'both',
    equipment: 'cable',
    difficulty: 'beginner',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders'],
    instructions: [
      'Stand sideways to a cable stack or anchored band with handle held at center chest.',
      'Press arms straight out in front and hold 2 seconds while resisting rotation toward the anchor.',
    ],
    commonMistakes: ['Letting shoulders twist toward the machine.'],
    safetyNotes: 'Gentle anti-rotation core drill ideal for lower-back resilience.',
    alternativeIds: ['ex_farmer_carry', 'ex_dead_bug'],
  },
  {
    id: 'ex_dead_bug',
    name: 'Dead Bug Core Brace',
    category: 'strength',
    environment: 'home',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['core'],
    secondaryMuscles: [],
    instructions: [
      'Lie on your back with arms reaching straight up and knees bent 90 degrees over hips.',
      'Gently press lower back into the mat while extending opposite arm and heel smoothly without arching.',
    ],
    commonMistakes: ['Lower back lifting off the floor as the leg lowers.'],
    safetyNotes: 'Shorten leg extension range if lower back lifts.',
    alternativeIds: ['ex_pallof_press', 'ex_farmer_carry'],
  },
  {
    id: 'ex_hip_90_90',
    name: '90/90 Hip Switches',
    category: 'mobility',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['glutes', 'full_body'],
    secondaryMuscles: ['core'],
    instructions: [
      'Sit on a mat with both knees bent 90 degrees—one leg in front, one out to the side.',
      'Rotate knees slowly across center to the opposite side while keeping chest tall.',
    ],
    commonMistakes: ['Forcing deep knee or groin stretch into sharp discomfort.'],
    safetyNotes: 'Place hands behind hips for support anytime hips feel tight.',
    alternativeIds: ['ex_thoracic_open_book', 'ex_outdoor_walk'],
  },
  {
    id: 'ex_thoracic_open_book',
    name: 'Open-Book Thoracic Rotation',
    category: 'recovery',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['back', 'chest'],
    secondaryMuscles: ['shoulders', 'core'],
    instructions: [
      'Lie on one side with top knee resting on a pillow or foam block so hips stay locked.',
      'Sweep top arm open like opening a book while exhaling gently toward the opposite shoulder.',
    ],
    commonMistakes: ['Letting top knee lift off the floor so the lower back twists instead of upper back.'],
    safetyNotes: 'Keep breath slow and smooth throughout.',
    alternativeIds: ['ex_hip_90_90', 'ex_outdoor_walk'],
  },
  {
    id: 'ex_outdoor_walk',
    name: 'Brisk Outdoor or Incline Walk',
    category: 'conditioning',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    primaryMuscles: ['cardio', 'calves'],
    secondaryMuscles: ['glutes', 'quads'],
    instructions: [
      'Walk at a steady, conversational pace where you can speak full sentences without gasping.',
      'Swing arms naturally and wear cushioned walking trainers.',
    ],
    commonMistakes: ['Starting too fast on incline recovery days.'],
    safetyNotes: 'Ideal active recovery & low-impact daily NEAT anchor.',
    alternativeIds: ['ex_hip_90_90', 'ex_farmer_carry'],
  },
  {
    id: 'ex_machine_leg_press',
    name: 'Seated Leg Press Machine',
    category: 'strength',
    environment: 'gym',
    equipment: 'machine',
    difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
    instructions: [
      'Place feet shoulder-width near the center of the sled and grip side handles firmly.',
      'Lower sled until knees bend comfortably without tailbone curling off the pad, then drive smoothly.',
    ],
    commonMistakes: ['Locking knees hard at the top.', 'Letting lower back curl off the seat at bottom depth.'],
    safetyNotes: 'Always engage mechanical safety stops before unloading.',
    alternativeIds: ['ex_goblet_squat', 'ex_split_squat'],
  },
];

export function mergeExerciseCatalog(customExercises: ExerciseDefinition[] = []): ExerciseDefinition[] {
  const map = new Map<string, ExerciseDefinition>();
  for (const ex of BUILTIN_EXERCISES) {
    map.set(ex.id, ex);
  }
  for (const ex of customExercises) {
    map.set(ex.id, ex);
  }
  return Array.from(map.values());
}

export function findExerciseByNameOrId(
  nameOrId: string,
  catalog: ExerciseDefinition[],
): ExerciseDefinition | undefined {
  const normalized = nameOrId.trim().toLowerCase();
  if (!normalized) return undefined;
  const exact = catalog.find(
    (ex) => ex.id.toLowerCase() === normalized || ex.name.toLowerCase() === normalized,
  );
  if (exact) return exact;
  return catalog.find(
    (ex) =>
      ex.name.toLowerCase().includes(normalized) ||
      normalized.includes(ex.name.toLowerCase().split('(')[0].trim()),
  );
}

export function filterExercises(
  catalog: ExerciseDefinition[],
  filters: {
    search?: string;
    environment?: 'all' | ExerciseEnvironment;
    equipment?: 'all' | 'bodyweight' | 'equipment' | ExerciseEquipment;
    muscle?: 'all' | MuscleGroup;
  },
): ExerciseDefinition[] {
  const q = (filters.search || '').trim().toLowerCase();
  return catalog.filter((ex) => {
    if (q) {
      const hay = `${ex.name} ${ex.equipment} ${ex.primaryMuscles.join(' ')} ${ex.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.environment && filters.environment !== 'all') {
      if (filters.environment === 'home' && ex.environment === 'gym') return false;
      if (filters.environment === 'gym' && ex.environment === 'home') return false;
    }
    if (filters.equipment && filters.equipment !== 'all') {
      if (filters.equipment === 'bodyweight' && ex.equipment !== 'bodyweight') return false;
      if (filters.equipment === 'equipment' && ex.equipment === 'bodyweight') return false;
      if (
        filters.equipment !== 'bodyweight' &&
        filters.equipment !== 'equipment' &&
        ex.equipment !== filters.equipment
      ) {
        return false;
      }
    }
    if (filters.muscle && filters.muscle !== 'all') {
      if (
        !ex.primaryMuscles.includes(filters.muscle) &&
        !ex.secondaryMuscles.includes(filters.muscle)
      ) {
        return false;
      }
    }
    return true;
  });
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  full_body: 'Full body',
  cardio: 'Conditioning',
};
