import type {
  ExerciseDefinition,
  NutritionFoodItem,
  NutritionMealSlot,
  VisualMealFoodItem,
  VisualMealSlotPlan,
  VisualWorkoutDayPlan,
  VisualWorkoutExerciseItem,
} from '../types/domain';
import { parseRestSeconds, parseTargetRepsNum, parseTargetSetCount } from './workoutEngine';

export function reorderItems<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export function computeWorkoutDayMetrics(day: VisualWorkoutDayPlan): {
  exerciseCount: number;
  totalSets: number;
  estimatedMinutes: number;
  primaryMuscles: string[];
} {
  let totalSets = 0;
  let totalSeconds = 0;
  const muscles = new Set<string>();

  for (const ex of day.exercises) {
    const sets = ex.targetSets || parseTargetSetCount(ex.sets || '3');
    const rest = ex.restSeconds !== undefined ? ex.restSeconds : parseRestSeconds(ex.rest || '60s');
    totalSets += sets;
    // Assume ~35s work per set + rest interval
    totalSeconds += sets * (35 + rest);
  }

  const estimatedMinutes = Math.max(15, Math.ceil(totalSeconds / 60));

  return {
    exerciseCount: day.exercises.length,
    totalSets,
    estimatedMinutes,
    primaryMuscles: Array.from(muscles),
  };
}

export function convertDefinitionToVisualExercise(
  def: ExerciseDefinition,
  options?: {
    sets?: string;
    reps?: string;
    rest?: string;
    weightTargetKg?: number;
    cue?: string;
  },
): VisualWorkoutExerciseItem {
  return {
    id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: def.name,
    sets: options?.sets || '3',
    reps: options?.reps || '10-12',
    rest: options?.rest || '60s',
    cue: options?.cue || (def.instructions[0] ? def.instructions[0] : undefined),
    weightTargetKg: options?.weightTargetKg || 0,
    alternatives: def.alternativeIds || [],
  };
}

export function convertFoodToVisualMealItem(
  food: NutritionFoodItem,
  servings = 1,
): VisualMealFoodItem {
  const safeServings = Math.max(0.25, Math.min(10, Math.round(servings * 4) / 4));
  return {
    id: `meal_item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    foodId: food.id,
    name: food.name,
    hindiOrRegional: food.hindiOrRegional,
    servingLabel: food.servingLabel,
    servings: safeServings,
    estimatedCalories: Math.round(food.estimatedCalories * safeServings),
    estimatedProteinG: Math.round(food.estimatedProteinG * safeServings * 10) / 10,
    estimatedCarbsG: Math.round(food.estimatedCarbsG * safeServings * 10) / 10,
    estimatedFatG: Math.round(food.estimatedFatG * safeServings * 10) / 10,
  };
}

export function computeMealPlanTotals(slots: VisualMealSlotPlan[]): {
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  itemCount: number;
} {
  let totalCalories = 0;
  let totalProteinG = 0;
  let totalCarbsG = 0;
  let totalFatG = 0;
  let itemCount = 0;

  for (const slot of slots) {
    for (const item of slot.items) {
      itemCount += 1;
      totalCalories += item.estimatedCalories;
      totalProteinG += item.estimatedProteinG;
      totalCarbsG += item.estimatedCarbsG;
      totalFatG += item.estimatedFatG;
    }
  }

  return {
    totalCalories: Math.round(totalCalories),
    totalProteinG: Math.round(totalProteinG * 10) / 10,
    totalCarbsG: Math.round(totalCarbsG * 10) / 10,
    totalFatG: Math.round(totalFatG * 10) / 10,
    itemCount,
  };
}

export const calculateVisualWorkoutDayMetrics = computeWorkoutDayMetrics;

export function calculateVisualNutritionDayMacros(slots: VisualMealSlotPlan[]): {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  itemCount: number;
} {
  const totals = computeMealPlanTotals(slots);
  return {
    calories: totals.totalCalories,
    proteinG: totals.totalProteinG,
    carbsG: totals.totalCarbsG,
    fatG: totals.totalFatG,
    itemCount: totals.itemCount,
  };
}

export const scaleIndianFoodItem = convertFoodToVisualMealItem;
