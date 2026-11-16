import React from 'react';
import { motion } from 'motion/react';
import type { AchievementBadgeId, MuscleGroup } from '../../types/domain';

export const StreakFlameSvg: React.FC<{
  size?: number;
  active?: boolean;
  celebrate?: boolean;
  className?: string;
}> = ({ size = 24, active = true, celebrate = false, className = '' }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    className={className}
    animate={
      celebrate
        ? {
            scale: [1, 1.12, 1],
            filter: [
              'drop-shadow(0 0 0 rgba(255,128,62,0))',
              'drop-shadow(0 0 16px rgba(255,128,62,0.55))',
              'drop-shadow(0 0 6px rgba(255,128,62,0.28))',
            ],
          }
        : undefined
    }
    transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
  >
    <defs>
      <linearGradient id="fp-flame-outer" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#FFB370' : '#4A5060'} />
        <stop offset="55%" stopColor={active ? '#FF803E' : '#353A46'} />
        <stop offset="100%" stopColor={active ? '#E15A1C' : '#252A35'} />
      </linearGradient>
      <linearGradient id="fp-flame-inner" x1="16" y1="13" x2="16" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#FFF0D6' : '#6F7687'} />
        <stop offset="100%" stopColor={active ? '#FFAA5E' : '#4A5060'} />
      </linearGradient>
    </defs>
    <path
      d="M17.2 3.2C18.1 7.6 22.8 10.6 24.1 15.8C25.1 20.1 22.3 27.6 16 27.6C9.8 27.6 7.1 22.2 8.2 16.9C8.9 13.4 11.2 11 12.7 9.4C12.9 11.9 14.1 13.4 15.2 14.1C14.7 10 15.4 6.2 17.2 3.2Z"
      fill="url(#fp-flame-outer)"
    />
    <path
      d="M16.3 15.8C17.9 17.6 19.3 19.6 19 22.1C18.7 24.3 17.4 25.8 15.7 25.8C13.9 25.8 12.8 24.2 13.1 22C13.4 19.7 14.9 17.9 16.3 15.8Z"
      fill="url(#fp-flame-inner)"
    />
  </motion.svg>
);

export const MuscleGroupEmblem: React.FC<{
  focus?: 'upper' | 'lower' | 'core' | 'conditioning';
  size?: number;
}> = ({ focus = 'upper', size = 44 }) => {
  const accent =
    focus === 'conditioning'
      ? '#70C8ED'
      : focus === 'core'
        ? '#C1ACF9'
        : focus === 'lower'
          ? '#B8E66C'
          : '#FF803E';

  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="40" height="40" rx="12" fill="#252A35" stroke="rgba(255,255,255,0.1)" />
      <circle cx="22" cy="12" r="3" stroke="#A2A8B5" strokeWidth="1.6" />
      <path
        d="M15 20C15 17.8 16.8 16 19 16H25C27.2 16 29 17.8 29 20V26H25.5V35H18.5V26H15V20Z"
        stroke="#A2A8B5"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {focus === 'upper' && (
        <path
          d="M15 19.5C15 17.6 16.6 16 18.5 16H25.5C27.4 16 29 17.6 29 19.5V22H15V19.5Z"
          fill={accent}
          fillOpacity="0.35"
          stroke={accent}
          strokeWidth="1.6"
        />
      )}
      {focus === 'lower' && (
        <path
          d="M18.5 26H25.5V35H18.5V26Z"
          fill={accent}
          fillOpacity="0.35"
          stroke={accent}
          strokeWidth="1.6"
        />
      )}
      {focus === 'core' && (
        <rect
          x="18.5"
          y="20.5"
          width="7"
          height="6"
          rx="1.5"
          fill={accent}
          fillOpacity="0.35"
          stroke={accent}
          strokeWidth="1.6"
        />
      )}
      {focus === 'conditioning' && (
        <path
          d="M12 23H16L18.5 18L22 27L25 20L27.5 23H32"
          stroke={accent}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

export const WeightManagementSvg: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="40" height="40" rx="12" fill="#252A35" stroke="rgba(255,255,255,0.1)" />
    <path
      d="M11 29C14.5 29 16 24.5 19.5 24.5C22.5 24.5 23.5 22 26.5 20.5C29 19.3 31 15.5 33 14"
      stroke="#B8E66C"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="33" cy="14" r="3" fill="#B8E66C" />
    <path d="M11 33H33" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export type BadgeKind = AchievementBadgeId | 'consistency' | 'hydration' | 'strength';

export const AchievementBadgeSvg: React.FC<{
  kind: BadgeKind;
  unlocked?: boolean;
  size?: number;
  className?: string;
}> = ({ kind, unlocked = true, size = 48, className = '' }) => {
  const getBadgePalette = (k: BadgeKind): { stroke: string; fill: string } => {
    switch (k) {
      case 'first_workout':
        return { stroke: '#FF803E', fill: '#FF803E' };
      case 'personal_record':
        return { stroke: '#F59E0B', fill: '#F59E0B' };
      case 'streak_7':
        return { stroke: '#FF803E', fill: '#FF803E' };
      case 'streak_14':
        return { stroke: '#FB923C', fill: '#FB923C' };
      case 'streak_30':
        return { stroke: '#F43F5E', fill: '#F43F5E' };
      case 'streak_60':
        return { stroke: '#A855F7', fill: '#A855F7' };
      case 'streak_100':
        return { stroke: '#EAB308', fill: '#EAB308' };
      case 'consistency_10':
      case 'consistency':
        return { stroke: '#B8E66C', fill: '#B8E66C' };
      case 'consistency_30':
        return { stroke: '#10B981', fill: '#10B981' };
      case 'hydration':
        return { stroke: '#70C8ED', fill: '#70C8ED' };
      case 'strength':
        return { stroke: '#C1ACF9', fill: '#C1ACF9' };
      default:
        return { stroke: '#FF803E', fill: '#FF803E' };
    }
  };

  const palette = getBadgePalette(kind);
  const color = unlocked ? palette.stroke : '#5A6170';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <polygon
        points="24,4 41,14 41,34 24,44 7,34 7,14"
        fill={unlocked ? 'rgba(37, 42, 53, 0.95)' : '#181B22'}
        stroke={color}
        strokeOpacity={unlocked ? 0.85 : 0.35}
        strokeWidth="1.8"
      />
      <polygon
        points="24,8 37,15.5 37,32.5 24,40 11,32.5 11,15.5"
        fill={color}
        fillOpacity={unlocked ? 0.14 : 0.04}
      />

      {/* Badge Icons */}
      {(kind === 'first_workout') && (
        <path
          d="M24 14L26.5 21H34L28 25.5L30.5 33L24 28.5L17.5 33L20 25.5L14 21H21.5L24 14Z"
          fill={color}
        />
      )}
      {(kind === 'personal_record') && (
        <path
          d="M17 17H31V23C31 26.9 27.9 30 24 30C20.1 30 17 26.9 17 23V17ZM17 20H14C13.4 20 13 20.4 13 21C13 23.2 14.8 25 17 25V20ZM31 20H34C34.6 20 35 20.4 35 21C35 23.2 33.2 25 31 25V20ZM22 30V33H26V30H22ZM20 33H28V35H20V33Z"
          fill={color}
        />
      )}
      {(kind === 'streak_7' || kind === 'streak_14' || kind === 'streak_30' || kind === 'streak_60' || kind === 'streak_100') && (
        <path
          d="M24.8 14C25.5 17.2 29 19.4 29.8 23.1C30.4 26.2 28.4 31.5 24 31.5C19.6 31.5 17.8 27.8 18.6 24C19.1 21.5 20.8 19.8 21.8 18.6C22 20.4 22.8 21.4 23.6 22C23.3 19.1 23.8 16.3 24.8 14Z"
          fill={color}
        />
      )}
      {(kind === 'consistency' || kind === 'consistency_10' || kind === 'consistency_30') && (
        <path
          d="M16.5 24.5L21.5 29.5L31.5 19"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {kind === 'hydration' && (
        <path
          d="M24 14C24 14 30 21.2 30 25.8C30 29.1 27.3 31.8 24 31.8C20.7 31.8 18 29.1 18 25.8C18 21.2 24 14 24 14Z"
          fill={color}
          fillOpacity="0.28"
          stroke={color}
          strokeWidth="2"
        />
      )}
      {kind === 'strength' && (
        <>
          <rect x="14" y="20" width="3.5" height="8" rx="1.2" fill={color} />
          <rect x="30.5" y="20" width="3.5" height="8" rx="1.2" fill={color} />
          <path d="M17.5 24H30.5" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = 'h-16 rounded-[16px]' }) => (
  <div className={`fp-skeleton border border-white/5 ${className}`} aria-hidden="true" />
);

// -----------------------------------------------------------------------------
// Interactive Anatomy Muscle SVG (Front & Back Human Silhouette)
// -----------------------------------------------------------------------------
export const AnatomyMuscleSvg: React.FC<{
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  view?: 'front' | 'back' | 'both';
  className?: string;
  size?: number;
}> = ({ primaryMuscles = [], secondaryMuscles = [], view = 'both', className = '', size = 180 }) => {
  const isPrimary = (m: MuscleGroup) => primaryMuscles.includes(m) || primaryMuscles.includes('full_body');
  const isSecondary = (m: MuscleGroup) =>
    !isPrimary(m) && (secondaryMuscles.includes(m) || secondaryMuscles.includes('full_body'));

  const getFill = (m: MuscleGroup) => {
    if (isPrimary(m)) return '#FF803E';
    if (isSecondary(m)) return 'rgba(255, 176, 107, 0.7)';
    return '#2C3240';
  };

  const getOpacity = (m: MuscleGroup) => {
    if (isPrimary(m)) return 1;
    if (isSecondary(m)) return 0.85;
    return 0.45;
  };

  const renderFront = () => (
    <svg viewBox="0 0 100 200" className="w-full h-full" fill="none">
      {/* Head & Neck */}
      <circle cx="50" cy="20" r="11" fill="#353B4B" />
      <path d="M46 31H54V38H46V31Z" fill="#353B4B" />

      {/* Shoulders (Deltoids) */}
      <path
        d="M33 38C30 42 27 49 28 54C30 54 34 50 36 43L33 38Z"
        fill={getFill('shoulders')}
        fillOpacity={getOpacity('shoulders')}
      />
      <path
        d="M67 38C70 42 73 49 72 54C70 54 66 50 64 43L67 38Z"
        fill={getFill('shoulders')}
        fillOpacity={getOpacity('shoulders')}
      />

      {/* Chest (Pectoralis) */}
      <path
        d="M37 42H48V56C44 57 38 55 35 52C34 46 36 43 37 42Z"
        fill={getFill('chest')}
        fillOpacity={getOpacity('chest')}
      />
      <path
        d="M63 42H52V56C56 57 62 55 65 52C66 46 64 43 63 42Z"
        fill={getFill('chest')}
        fillOpacity={getOpacity('chest')}
      />

      {/* Biceps */}
      <path
        d="M26 55C24 61 24 69 26 73C28 73 30 67 30 60C30 56 28 55 26 55Z"
        fill={getFill('biceps')}
        fillOpacity={getOpacity('biceps')}
      />
      <path
        d="M74 55C76 61 76 69 74 73C72 73 70 67 70 60C70 56 72 55 74 55Z"
        fill={getFill('biceps')}
        fillOpacity={getOpacity('biceps')}
      />

      {/* Forearms */}
      <path d="M24 74C21 82 20 90 22 95C24 95 27 88 28 80L24 74Z" fill="#353B4B" />
      <path d="M76 74C79 82 80 90 78 95C76 95 73 88 72 80L76 74Z" fill="#353B4B" />

      {/* Core (Abs) */}
      <path
        d="M42 58H49V76H42V58ZM51 58H58V76H51V58Z"
        fill={getFill('core')}
        fillOpacity={getOpacity('core')}
      />
      {/* Obliques */}
      <path
        d="M36 58C36 65 37 72 39 77H41V58H36ZM64 58C64 65 63 72 61 77H59V58H64Z"
        fill={getFill('core')}
        fillOpacity={getOpacity('core') * 0.8}
      />

      {/* Hips/Pelvis */}
      <path d="M38 78H62L60 90H40L38 78Z" fill="#353B4B" />

      {/* Quads */}
      <path
        d="M38 92C37 106 36 122 39 135C43 135 47 122 48 108C49 98 48 92 48 92H38Z"
        fill={getFill('quads')}
        fillOpacity={getOpacity('quads')}
      />
      <path
        d="M62 92C63 106 64 122 61 135C57 135 53 122 52 108C51 98 52 92 52 92H62Z"
        fill={getFill('quads')}
        fillOpacity={getOpacity('quads')}
      />

      {/* Knees */}
      <circle cx="43" cy="140" r="3.5" fill="#353B4B" />
      <circle cx="57" cy="140" r="3.5" fill="#353B4B" />

      {/* Calves (Front/Shins) */}
      <path
        d="M40 145C39 155 40 168 41 180H46C46 168 47 155 46 145H40Z"
        fill={getFill('calves')}
        fillOpacity={getOpacity('calves')}
      />
      <path
        d="M60 145C61 155 60 168 59 180H54C54 168 53 155 54 145H60Z"
        fill={getFill('calves')}
        fillOpacity={getOpacity('calves')}
      />
    </svg>
  );

  const renderBack = () => (
    <svg viewBox="0 0 100 200" className="w-full h-full" fill="none">
      {/* Head & Neck (Back) */}
      <circle cx="50" cy="20" r="11" fill="#353B4B" />
      <path d="M46 31H54V38H46V31Z" fill="#353B4B" />

      {/* Rear Delts */}
      <path
        d="M33 38C30 42 27 49 28 54C30 54 34 50 36 43L33 38Z"
        fill={getFill('shoulders')}
        fillOpacity={getOpacity('shoulders')}
      />
      <path
        d="M67 38C70 42 73 49 72 54C70 54 66 50 64 43L67 38Z"
        fill={getFill('shoulders')}
        fillOpacity={getOpacity('shoulders')}
      />

      {/* Upper Back & Lats (Traps/Lats) */}
      <path
        d="M42 36L50 46L58 36H42Z"
        fill={getFill('back')}
        fillOpacity={getOpacity('back')}
      />
      <path
        d="M36 44C36 55 38 68 43 74H57C62 68 64 55 64 44L50 56L36 44Z"
        fill={getFill('back')}
        fillOpacity={getOpacity('back')}
      />

      {/* Triceps */}
      <path
        d="M26 55C24 61 24 69 26 73C28 73 30 67 30 60C30 56 28 55 26 55Z"
        fill={getFill('triceps')}
        fillOpacity={getOpacity('triceps')}
      />
      <path
        d="M74 55C76 61 76 69 74 73C72 73 70 67 70 60C70 56 72 55 74 55Z"
        fill={getFill('triceps')}
        fillOpacity={getOpacity('triceps')}
      />

      {/* Forearms (Back) */}
      <path d="M24 74C21 82 20 90 22 95C24 95 27 88 28 80L24 74Z" fill="#353B4B" />
      <path d="M76 74C79 82 80 90 78 95C76 95 73 88 72 80L76 74Z" fill="#353B4B" />

      {/* Lower Back */}
      <path d="M43 75H57V84H43V75Z" fill={getFill('back')} fillOpacity={getOpacity('back') * 0.8} />

      {/* Glutes */}
      <path
        d="M37 86C37 96 41 104 49 104V86H37Z"
        fill={getFill('glutes')}
        fillOpacity={getOpacity('glutes')}
      />
      <path
        d="M63 86C63 96 59 104 51 104V86H63Z"
        fill={getFill('glutes')}
        fillOpacity={getOpacity('glutes')}
      />

      {/* Hamstrings */}
      <path
        d="M38 106C37 118 38 128 41 137C44 137 47 126 48 116C49 109 49 106 49 106H38Z"
        fill={getFill('hamstrings')}
        fillOpacity={getOpacity('hamstrings')}
      />
      <path
        d="M62 106C63 118 62 128 59 137C56 137 53 126 52 116C51 109 51 106 51 106H62Z"
        fill={getFill('hamstrings')}
        fillOpacity={getOpacity('hamstrings')}
      />

      {/* Knee Backs */}
      <circle cx="44" cy="140" r="3" fill="#353B4B" />
      <circle cx="56" cy="140" r="3" fill="#353B4B" />

      {/* Calves (Gastrocnemius Posterior) */}
      <path
        d="M39 144C37 154 38 165 41 180H46C48 168 49 154 47 144H39Z"
        fill={getFill('calves')}
        fillOpacity={getOpacity('calves')}
      />
      <path
        d="M61 144C63 154 62 165 59 180H54C52 168 51 154 53 144H61Z"
        fill={getFill('calves')}
        fillOpacity={getOpacity('calves')}
      />
    </svg>
  );

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} style={{ height: size }}>
      {(view === 'front' || view === 'both') && (
        <div className="flex flex-col items-center h-full">
          <div className="h-full aspect-[1/2] p-1 bg-[#1C2029]/80 rounded-xl border border-white/5 shadow-inner">
            {renderFront()}
          </div>
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider mt-1">Anterior</span>
        </div>
      )}
      {(view === 'back' || view === 'both') && (
        <div className="flex flex-col items-center h-full">
          <div className="h-full aspect-[1/2] p-1 bg-[#1C2029]/80 rounded-xl border border-white/5 shadow-inner">
            {renderBack()}
          </div>
          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider mt-1">Posterior</span>
        </div>
      )}
    </div>
  );
};
