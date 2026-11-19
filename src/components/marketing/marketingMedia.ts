// Responsive variants of the existing FitPlus photography for the public site.
// Originals live in src/assets/images; smaller WebP/AVIF crops were generated
// from them so phones never download the 1280px masters.
import heroOriginal from '../../assets/images/welcome_hero_1794798688353.webp';
import hero640 from '../../assets/images/marketing/hero_640.webp';
import hero960 from '../../assets/images/marketing/hero_960.webp';
import hero640Avif from '../../assets/images/marketing/hero_640.avif';
import hero960Avif from '../../assets/images/marketing/hero_960.avif';
import hero1280Avif from '../../assets/images/marketing/hero_1280.avif';
import weightOriginal from '../../assets/images/program_weight_loss_1794800686866.webp';
import weight640 from '../../assets/images/marketing/track_weight_640.webp';
import strengthOriginal from '../../assets/images/program_muscle_building_1794800688149.webp';
import strength640 from '../../assets/images/marketing/track_strength_640.webp';
import foodOriginal from '../../assets/images/food_lunch_1794798690865.webp';
import food480 from '../../assets/images/marketing/track_food_480.webp';
import consult640 from '../../assets/images/marketing/consult_640.webp';
import consult1280 from '../../assets/images/marketing/consult_1280.webp';
import meal480 from '../../assets/images/marketing/meal_480.webp';
import today640 from '../../assets/images/marketing/today_640.webp';

export interface MarketingImage {
  src: string;
  width: number;
  height: number;
  srcSet: string;
  avifSrcSet?: string;
}

export const MEDIA = {
  hero: {
    src: hero960,
    width: 1280,
    height: 1714,
    srcSet: `${hero640} 640w, ${hero960} 960w, ${heroOriginal} 1280w`,
    avifSrcSet: `${hero640Avif} 640w, ${hero960Avif} 960w, ${hero1280Avif} 1280w`,
  },
  trackWeight: {
    src: weight640,
    width: 1280,
    height: 714,
    srcSet: `${weight640} 640w, ${weightOriginal} 1280w`,
  },
  trackStrength: {
    src: strength640,
    width: 1280,
    height: 714,
    srcSet: `${strength640} 640w, ${strengthOriginal} 1280w`,
  },
  trackFood: {
    src: food480,
    width: 800,
    height: 597,
    srcSet: `${food480} 480w, ${foodOriginal} 800w`,
  },
  consult: {
    src: consult640,
    width: 1280,
    height: 956,
    srcSet: `${consult640} 640w, ${consult1280} 1280w`,
  },
  meal: { src: meal480, width: 480, height: 480, srcSet: `${meal480} 480w` },
  gym: { src: today640, width: 640, height: 430, srcSet: `${today640} 640w` },
} satisfies Record<string, MarketingImage>;
