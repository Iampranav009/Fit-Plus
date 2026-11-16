import welcomeHeroImg from '../assets/images/welcome_hero_1794798688353.webp';
import todayHeroImg from '../assets/images/today_hero_1794798688453.webp';
import coachArjunImg from '../assets/images/coach_arjun_1794798688146.webp';
import coachMeeraImg from '../assets/images/coach_meera_1794798688607.webp';
import coachKabirImg from '../assets/images/coach_kabir_1794798689550.webp';
import coachCoverImg from '../assets/images/coach_cover_1794798689071.webp';
import coachIntroImg from '../assets/images/coach_intro_1794798689566.webp';
import goalStrengthImg from '../assets/images/goal_strength_1794798689675.webp';
import goalBalanceImg from '../assets/images/goal_balance_1794798690693.webp';
import goalNutritionImg from '../assets/images/goal_nutrition_1794798690791.webp';
import foodBreakfastImg from '../assets/images/food_breakfast_1794798690265.webp';
import foodLunchImg from '../assets/images/food_lunch_1794798690865.webp';
import consultationImg from '../assets/images/consultation_1794798691226.webp';
import programWeightLossImg from '../assets/images/program_weight_loss_1794800686866.webp';
import programMuscleBuildingImg from '../assets/images/program_muscle_building_1794800688149.webp';
import illusDumbbellImg from '../assets/images/illus_dumbbell_3d_1794800685348.webp';
import illusKettlebellImg from '../assets/images/illus_kettlebell_3d_1794800687254.webp';
import illusHydrationImg from '../assets/images/illus_hydration_bottle_1794800688266.webp';
import illusTrophyImg from '../assets/images/illus_trophy_3d_1794800689318.webp';

export const ASSETS = {
  welcomeHero: welcomeHeroImg,
  todayHero: todayHeroImg,
  coachArjun: coachArjunImg,
  coachMeera: coachMeeraImg,
  coachKabir: coachKabirImg,
  coachCover: coachCoverImg,
  coachIntro: coachIntroImg,
  goalStrength: goalStrengthImg,
  goalBalance: goalBalanceImg,
  goalNutrition: goalNutritionImg,
  foodBreakfast: foodBreakfastImg,
  foodLunch: foodLunchImg,
  consultation: consultationImg,
  programWeightLoss: programWeightLossImg,
  programMuscleBuilding: programMuscleBuildingImg,
  illusDumbbell: illusDumbbellImg,
  illusKettlebell: illusKettlebellImg,
  illusHydration: illusHydrationImg,
  illusTrophy: illusTrophyImg,
} as const;

export type AssetKey = keyof typeof ASSETS;

export function getAssetSrc(key: string | undefined, fallback: AssetKey = 'coachCover'): string {
  if (key && key in ASSETS) {
    return ASSETS[key as AssetKey];
  }
  return ASSETS[fallback];
}
