import React from 'react';
import type { AnatomicalGender, AnatomicalMuscleId } from './anatomyTypes';

interface AnatomyMuscleOverlayProps {
  view: 'anterior' | 'posterior';
  gender?: AnatomicalGender;
  primaryIds: Set<AnatomicalMuscleId>;
  secondaryIds: Set<AnatomicalMuscleId>;
  className?: string;
  onHoverMuscle?: (id: AnatomicalMuscleId | null) => void;
  onClickMuscle?: (id: AnatomicalMuscleId) => void;
}

export const AnatomyMuscleOverlay: React.FC<AnatomyMuscleOverlayProps> = ({
  view,
  gender = 'male',
  primaryIds,
  secondaryIds,
  className = '',
  onHoverMuscle,
  onClickMuscle,
}) => {
  const getFill = (id: AnatomicalMuscleId) => {
    if (primaryIds.has(id)) return '#FF803E';
    if (secondaryIds.has(id)) return '#FFBB86';
    return '#222733';
  };

  const getOpacity = (id: AnatomicalMuscleId) => {
    if (primaryIds.has(id)) return 1.0;
    if (secondaryIds.has(id)) return 0.9;
    return 0.55;
  };

  const getFilter = (id: AnatomicalMuscleId) => {
    if (primaryIds.has(id)) return 'url(#glow-primary)';
    if (secondaryIds.has(id)) return 'url(#glow-secondary)';
    return undefined;
  };

  const renderMusclePath = (
    id: AnatomicalMuscleId,
    d: string,
    label?: string,
  ) => {
    const isHighlighted = primaryIds.has(id) || secondaryIds.has(id);
    return (
      <path
        key={id}
        d={d}
        fill={getFill(id)}
        fillOpacity={getOpacity(id)}
        stroke={isHighlighted ? (primaryIds.has(id) ? '#FFA06A' : '#FFD3B0') : '#32394A'}
        strokeWidth={isHighlighted ? '1.2' : '0.75'}
        strokeLinejoin="round"
        className="transition-colors duration-200 cursor-pointer"
        filter={getFilter(id)}
        onMouseEnter={() => onHoverMuscle?.(id)}
        onMouseLeave={() => onHoverMuscle?.(null)}
        onClick={() => onClickMuscle?.(id)}
      >
        {label && <title>{label}</title>}
      </path>
    );
  };

  // ---------------------------------------------------------------------------
  // ANTERIOR (FRONT) VIEW
  // ---------------------------------------------------------------------------
  const renderAnterior = () => {
    // Proportional adjustments for male vs female anatomical silhouettes
    const waistWidth = gender === 'female' ? 24 : 28;
    const hipWidth = gender === 'female' ? 38 : 34;
    const shoulderWidth = gender === 'female' ? 44 : 52;

    return (
      <svg
        viewBox="0 0 160 320"
        className={`w-full h-full select-none ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow-primary" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#FF803E" floodOpacity="0.65" />
          </filter>
          <filter id="glow-secondary" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FFBB86" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Body Base Silhouette Background */}
        <g opacity="0.35">
          {/* Head & Neck */}
          <ellipse cx="80" cy="22" rx="13" ry="16" fill="#1C202B" stroke="#2D3342" strokeWidth="0.8" />
          <path d="M74 36 L74 46 L86 46 L86 36 Z" fill="#1C202B" />
          {/* Torso & Pelvis base */}
          <path
            d={`M${80 - shoulderWidth / 2} 48 Q80 46 ${80 + shoulderWidth / 2} 48 L${80 + waistWidth / 2} 118 L${80 + hipWidth / 2} 150 L${80 - hipWidth / 2} 150 L${80 - waistWidth / 2} 118 Z`}
            fill="#181B24"
          />
        </g>

        {/* HEAD & CRANIAL STRUCTURE */}
        <ellipse cx="80" cy="22" rx="12" ry="15" fill="#202430" stroke="#32394A" strokeWidth="0.8" />
        <path d="M75 36 Q80 39 85 36 L86 46 Q80 47 74 46 Z" fill="#202430" stroke="#32394A" strokeWidth="0.5" />

        {/* DELTOIDS (ANTERIOR & LATERAL) */}
        {/* Left Shoulder (Anterior Deltoid) */}
        {renderMusclePath(
          'deltoid_anterior',
          'M56 48 C50 49, 44 55, 43 64 C42 70, 45 77, 49 80 C52 74, 55 64, 58 58 C58 52, 57 50, 56 48 Z',
          'Left Anterior Deltoid'
        )}
        {/* Right Shoulder (Anterior Deltoid) */}
        {renderMusclePath(
          'deltoid_anterior',
          'M104 48 C110 49, 116 55, 117 64 C118 70, 115 77, 111 80 C108 74, 105 64, 102 58 C102 52, 103 50, 104 48 Z',
          'Right Anterior Deltoid'
        )}
        {/* Left Lateral Deltoid cap */}
        {renderMusclePath(
          'deltoid_lateral',
          'M43 64 C40 68, 39 74, 42 79 C45 78, 48 76, 49 74 C47 70, 45 66, 43 64 Z',
          'Left Lateral Deltoid'
        )}
        {/* Right Lateral Deltoid cap */}
        {renderMusclePath(
          'deltoid_lateral',
          'M117 64 C120 68, 121 74, 118 79 C115 78, 112 76, 111 74 C113 70, 115 66, 117 64 Z',
          'Right Lateral Deltoid'
        )}

        {/* CHEST (PECTORALIS MAJOR) */}
        {/* Left Pec */}
        {renderMusclePath(
          'pectoralis_major',
          'M78 49 C69 49, 60 52, 57 58 C55 64, 55 74, 63 80 C70 82, 76 81, 78 78 Z',
          'Left Pectoralis Major'
        )}
        {/* Right Pec */}
        {renderMusclePath(
          'pectoralis_major',
          'M82 49 C91 49, 100 52, 103 58 C105 64, 105 74, 97 80 C90 82, 84 81, 82 78 Z',
          'Right Pectoralis Major'
        )}

        {/* BICEPS BRACHII & BRACHIALIS */}
        {/* Left Biceps */}
        {renderMusclePath(
          'biceps_brachii',
          'M48 81 C44 87, 43 97, 47 107 C51 106, 54 100, 55 93 C56 87, 53 82, 48 81 Z',
          'Left Biceps'
        )}
        {/* Right Biceps */}
        {renderMusclePath(
          'biceps_brachii',
          'M112 81 C116 87, 117 97, 113 107 C109 106, 106 100, 105 93 C104 87, 107 82, 112 81 Z',
          'Right Biceps'
        )}
        {/* Left Brachialis */}
        {renderMusclePath(
          'brachialis',
          'M43 92 C41 97, 41 103, 44 107 C46 105, 46 98, 43 92 Z',
          'Left Brachialis'
        )}
        {/* Right Brachialis */}
        {renderMusclePath(
          'brachialis',
          'M117 92 C119 97, 119 103, 116 107 C114 105, 114 98, 117 92 Z',
          'Right Brachialis'
        )}

        {/* FOREARMS ANTERIOR (FLEXORS) */}
        {/* Left Forearm */}
        {renderMusclePath(
          'forearms_anterior',
          'M46 110 C41 118, 38 128, 40 142 C42 143, 45 142, 46 138 C48 132, 51 122, 51 113 Z',
          'Left Forearm'
        )}
        {/* Right Forearm */}
        {renderMusclePath(
          'forearms_anterior',
          'M114 110 C119 118, 122 128, 120 142 C118 143, 115 142, 114 138 C112 132, 109 122, 109 113 Z',
          'Right Forearm'
        )}
        {/* Hands */}
        <ellipse cx="39" cy="151" rx="4.5" ry="7" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
        <ellipse cx="121" cy="151" rx="4.5" ry="7" fill="#202430" stroke="#32394A" strokeWidth="0.6" />

        {/* ABDOMINALS (RECTUS ABDOMINIS & OBLIQUES) */}
        {/* Rectus Abdominis (Upper) */}
        {renderMusclePath(
          'rectus_abdominis',
          'M72 82 L78 82 L78 93 L72 93 Z',
          'Upper Rectus Abdominis (L)'
        )}
        {renderMusclePath(
          'rectus_abdominis',
          'M82 82 L88 82 L88 93 L82 93 Z',
          'Upper Rectus Abdominis (R)'
        )}
        {/* Rectus Abdominis (Mid) */}
        {renderMusclePath(
          'rectus_abdominis',
          'M72 95 L78 95 L78 107 L72 107 Z',
          'Mid Rectus Abdominis (L)'
        )}
        {renderMusclePath(
          'rectus_abdominis',
          'M82 95 L88 95 L88 107 L82 107 Z',
          'Mid Rectus Abdominis (R)'
        )}
        {/* Rectus Abdominis (Lower) */}
        {renderMusclePath(
          'rectus_abdominis',
          'M73 109 L78 109 L78 123 L75 127 L73 123 Z',
          'Lower Rectus Abdominis (L)'
        )}
        {renderMusclePath(
          'rectus_abdominis',
          'M82 109 L87 109 L87 123 L85 127 L82 123 Z',
          'Lower Rectus Abdominis (R)'
        )}

        {/* External Obliques */}
        {/* Left Oblique */}
        {renderMusclePath(
          'obliques_external',
          'M68 83 C63 87, 60 97, 61 110 C62 119, 67 127, 72 126 C70 119, 70 108, 70 98 C70 92, 70 87, 68 83 Z',
          'Left External Oblique'
        )}
        {/* Right Oblique */}
        {renderMusclePath(
          'obliques_external',
          'M92 83 C97 87, 100 97, 99 110 C98 119, 93 127, 88 126 C90 119, 90 108, 90 98 C90 92, 90 87, 92 83 Z',
          'Right External Oblique'
        )}

        {/* PELVIS & HIP ADDUCTORS */}
        {/* Left Adductor */}
        {renderMusclePath(
          'adductors',
          'M76 142 C74 153, 73 170, 75 186 C77 185, 78 174, 78 162 C78 153, 77 146, 76 142 Z',
          'Left Adductor'
        )}
        {/* Right Adductor */}
        {renderMusclePath(
          'adductors',
          'M84 142 C86 153, 87 170, 85 186 C83 185, 82 174, 82 162 C82 153, 83 146, 84 142 Z',
          'Right Adductor'
        )}

        {/* QUADRICEPS */}
        {/* Left Quadriceps (Rectus Femoris) */}
        {renderMusclePath(
          'quadriceps_rectus_femoris',
          'M65 142 C62 156, 61 176, 64 200 C67 201, 71 199, 72 195 C73 175, 74 156, 73 142 Z',
          'Left Rectus Femoris'
        )}
        {/* Right Quadriceps (Rectus Femoris) */}
        {renderMusclePath(
          'quadriceps_rectus_femoris',
          'M95 142 C98 156, 99 176, 96 200 C93 201, 89 199, 88 195 C87 175, 86 156, 87 142 Z',
          'Right Rectus Femoris'
        )}
        {/* Left Vastus Lateralis (Outer Quad) */}
        {renderMusclePath(
          'quadriceps_vastus_lateralis',
          'M58 144 C53 155, 52 170, 54 188 C57 194, 60 197, 62 196 C60 178, 60 160, 63 144 Z',
          'Left Vastus Lateralis'
        )}
        {/* Right Vastus Lateralis (Outer Quad) */}
        {renderMusclePath(
          'quadriceps_vastus_lateralis',
          'M102 144 C107 155, 108 170, 106 188 C103 194, 100 197, 98 196 C100 178, 100 160, 97 144 Z',
          'Right Vastus Lateralis'
        )}
        {/* Left Vastus Medialis (Teardrop) */}
        {renderMusclePath(
          'quadriceps_vastus_medialis',
          'M67 192 C67 198, 69 204, 73 205 C75 204, 75 197, 74 191 C71 191, 69 191, 67 192 Z',
          'Left Vastus Medialis'
        )}
        {/* Right Vastus Medialis (Teardrop) */}
        {renderMusclePath(
          'quadriceps_vastus_medialis',
          'M93 192 C93 198, 91 204, 87 205 C85 204, 85 197, 86 191 C89 191, 91 191, 93 192 Z',
          'Right Vastus Medialis'
        )}

        {/* KNEE JOINTS */}
        <ellipse cx="66" cy="211" rx="5" ry="4" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
        <ellipse cx="94" cy="211" rx="5" ry="4" fill="#202430" stroke="#32394A" strokeWidth="0.6" />

        {/* LOWER LEGS (TIBIALIS ANTERIOR & CALVES SHIN) */}
        {/* Left Tibialis */}
        {renderMusclePath(
          'tibialis_anterior',
          'M63 218 C59 230, 58 248, 61 274 C63 275, 65 274, 66 268 C68 252, 69 234, 69 218 Z',
          'Left Tibialis Anterior'
        )}
        {/* Right Tibialis */}
        {renderMusclePath(
          'tibialis_anterior',
          'M97 218 C101 230, 102 248, 99 274 C97 275, 95 274, 94 268 C92 252, 91 234, 91 218 Z',
          'Right Tibialis Anterior'
        )}

        {/* FEET */}
        <path d="M57 282 L65 282 L68 298 L56 298 Z" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
        <path d="M103 282 L95 282 L92 298 L104 298 Z" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // POSTERIOR (BACK) VIEW
  // ---------------------------------------------------------------------------
  const renderPosterior = () => {
    const waistWidth = gender === 'female' ? 24 : 28;
    const hipWidth = gender === 'female' ? 38 : 34;
    const shoulderWidth = gender === 'female' ? 44 : 52;

    return (
      <svg
        viewBox="0 0 160 320"
        className={`w-full h-full select-none ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow-primary-post" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#FF803E" floodOpacity="0.65" />
          </filter>
          <filter id="glow-secondary-post" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FFBB86" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Silhouette background */}
        <g opacity="0.35">
          <ellipse cx="80" cy="22" rx="13" ry="16" fill="#1C202B" stroke="#2D3342" strokeWidth="0.8" />
          <path d="M74 36 L74 46 L86 46 L86 36 Z" fill="#1C202B" />
          <path
            d={`M${80 - shoulderWidth / 2} 48 Q80 46 ${80 + shoulderWidth / 2} 48 L${80 + waistWidth / 2} 118 L${80 + hipWidth / 2} 150 L${80 - hipWidth / 2} 150 L${80 - waistWidth / 2} 118 Z`}
            fill="#181B24"
          />
        </g>

        {/* HEAD & CERVICAL SPINE BASE */}
        <ellipse cx="80" cy="22" rx="12" ry="15" fill="#202430" stroke="#32394A" strokeWidth="0.8" />

        {/* TRAPEZIUS (UPPER & MID/LOWER) */}
        {/* Upper Trap (Left) */}
        {renderMusclePath(
          'trapezius_upper',
          'M74 37 C70 41, 65 46, 58 48 C64 52, 70 56, 78 57 L78 40 Z',
          'Upper Trapezius (Left)'
        )}
        {/* Upper Trap (Right) */}
        {renderMusclePath(
          'trapezius_upper',
          'M86 37 C90 41, 95 46, 102 48 C96 52, 90 56, 82 57 L82 40 Z',
          'Upper Trapezius (Right)'
        )}
        {/* Mid & Lower Trap (Left) */}
        {renderMusclePath(
          'trapezius_middle_lower',
          'M78 58 L66 65 L72 82 L78 98 L78 58 Z',
          'Mid & Lower Trapezius (Left)'
        )}
        {/* Mid & Lower Trap (Right) */}
        {renderMusclePath(
          'trapezius_middle_lower',
          'M82 58 L94 65 L88 82 L82 98 L82 58 Z',
          'Mid & Lower Trapezius (Right)'
        )}

        {/* DELTOIDS (POSTERIOR DELT) */}
        {/* Left Rear Delt */}
        {renderMusclePath(
          'deltoid_posterior',
          'M57 49 C51 51, 45 56, 44 64 C43 71, 46 76, 50 78 C52 72, 54 62, 57 49 Z',
          'Left Posterior Deltoid'
        )}
        {/* Right Rear Delt */}
        {renderMusclePath(
          'deltoid_posterior',
          'M103 49 C109 51, 115 56, 116 64 C117 71, 114 76, 110 78 C108 72, 106 62, 103 49 Z',
          'Right Posterior Deltoid'
        )}

        {/* INFRASPINATUS & TERES MAJOR/MINOR */}
        {/* Left Infraspinatus */}
        {renderMusclePath(
          'infraspinatus_teres',
          'M52 74 C54 66, 62 64, 66 66 L64 77 C60 78, 55 77, 52 74 Z',
          'Left Infraspinatus & Teres'
        )}
        {/* Right Infraspinatus */}
        {renderMusclePath(
          'infraspinatus_teres',
          'M108 74 C106 66, 98 64, 94 66 L96 77 C100 78, 105 77, 108 74 Z',
          'Right Infraspinatus & Teres'
        )}

        {/* LATISSIMUS DORSI */}
        {/* Left Lat */}
        {renderMusclePath(
          'latissimus_dorsi',
          'M63 78 C58 86, 56 99, 61 116 C66 116, 72 110, 75 102 C74 92, 71 84, 63 78 Z',
          'Left Latissimus Dorsi'
        )}
        {/* Right Lat */}
        {renderMusclePath(
          'latissimus_dorsi',
          'M97 78 C102 86, 104 99, 99 116 C94 116, 88 110, 85 102 C86 92, 89 84, 97 78 Z',
          'Right Latissimus Dorsi'
        )}

        {/* ERECTOR SPINAE (LOWER BACK) */}
        {renderMusclePath(
          'erector_spinae',
          'M74 100 L78 100 L78 128 L74 126 Z',
          'Left Erector Spinae'
        )}
        {renderMusclePath(
          'erector_spinae',
          'M82 100 L86 100 L86 126 L82 128 Z',
          'Right Erector Spinae'
        )}

        {/* TRICEPS BRACHII */}
        {/* Left Triceps */}
        {renderMusclePath(
          'triceps_brachii',
          'M46 79 C42 86, 41 97, 44 107 C48 106, 52 101, 53 94 C54 86, 51 81, 46 79 Z',
          'Left Triceps Brachii'
        )}
        {/* Right Triceps */}
        {renderMusclePath(
          'triceps_brachii',
          'M114 79 C118 86, 119 97, 116 107 C112 106, 108 101, 107 94 C106 86, 109 81, 114 79 Z',
          'Right Triceps Brachii'
        )}

        {/* FOREARMS POSTERIOR (EXTENSORS) */}
        {/* Left Forearm */}
        {renderMusclePath(
          'forearms_posterior',
          'M45 110 C40 119, 37 129, 39 142 C41 143, 44 142, 45 138 C47 131, 50 121, 50 112 Z',
          'Left Forearm Extensors'
        )}
        {/* Right Forearm */}
        {renderMusclePath(
          'forearms_posterior',
          'M115 110 C120 119, 123 129, 121 142 C119 143, 116 142, 115 138 C113 131, 110 121, 110 112 Z',
          'Right Forearm Extensors'
        )}
        <ellipse cx="38" cy="151" rx="4.5" ry="7" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
        <ellipse cx="122" cy="151" rx="4.5" ry="7" fill="#202430" stroke="#32394A" strokeWidth="0.6" />

        {/* GLUTEALS */}
        {/* Left Gluteus Medius */}
        {renderMusclePath(
          'gluteus_medius',
          'M62 124 C57 130, 56 138, 59 146 C62 143, 65 137, 68 132 C66 128, 64 125, 62 124 Z',
          'Left Gluteus Medius'
        )}
        {/* Right Gluteus Medius */}
        {renderMusclePath(
          'gluteus_medius',
          'M98 124 C103 130, 104 138, 101 146 C98 143, 95 137, 92 132 C94 128, 96 125, 98 124 Z',
          'Right Gluteus Medius'
        )}
        {/* Left Gluteus Maximus */}
        {renderMusclePath(
          'gluteus_maximus',
          'M64 129 C58 137, 57 150, 62 163 C69 165, 76 160, 78 152 C78 139, 75 132, 64 129 Z',
          'Left Gluteus Maximus'
        )}
        {/* Right Gluteus Maximus */}
        {renderMusclePath(
          'gluteus_maximus',
          'M96 129 C102 137, 103 150, 98 163 C91 165, 84 160, 82 152 C82 139, 85 132, 96 129 Z',
          'Right Gluteus Maximus'
        )}

        {/* HAMSTRINGS */}
        {/* Left Hamstrings (Biceps Femoris) */}
        {renderMusclePath(
          'hamstrings_biceps_femoris',
          'M62 166 C57 178, 56 193, 61 206 C64 206, 68 202, 69 194 C70 184, 70 174, 70 166 Z',
          'Left Biceps Femoris'
        )}
        {/* Right Hamstrings (Biceps Femoris) */}
        {renderMusclePath(
          'hamstrings_biceps_femoris',
          'M98 166 C103 178, 104 193, 99 206 C96 206, 92 202, 91 194 C90 184, 90 174, 90 166 Z',
          'Right Biceps Femoris'
        )}
        {/* Left Semitendinosus / Semimembranosus (Inner Hamstring) */}
        {renderMusclePath(
          'hamstrings_semitendinosus',
          'M71 166 C71 176, 71 187, 70 197 C72 201, 75 202, 76 198 C78 188, 77 177, 76 166 Z',
          'Left Semitendinosus'
        )}
        {/* Right Semitendinosus / Semimembranosus (Inner Hamstring) */}
        {renderMusclePath(
          'hamstrings_semitendinosus',
          'M89 166 C89 176, 89 187, 90 197 C88 201, 85 202, 84 198 C82 188, 83 177, 84 166 Z',
          'Right Semitendinosus'
        )}

        {/* POPLITEAL FOSSA (KNEE BACK) */}
        <ellipse cx="66" cy="211" rx="5" ry="3.5" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
        <ellipse cx="94" cy="211" rx="5" ry="3.5" fill="#202430" stroke="#32394A" strokeWidth="0.6" />

        {/* CALVES (GASTROCNEMIUS & SOLEUS) */}
        {/* Left Gastrocnemius */}
        {renderMusclePath(
          'gastrocnemius',
          'M66 216 C59 224, 57 236, 60 252 C64 254, 69 252, 72 245 C73 234, 72 224, 66 216 Z',
          'Left Gastrocnemius'
        )}
        {/* Right Gastrocnemius */}
        {renderMusclePath(
          'gastrocnemius',
          'M94 216 C101 224, 103 236, 100 252 C96 254, 91 252, 88 245 C87 234, 88 224, 94 216 Z',
          'Right Gastrocnemius'
        )}
        {/* Left Soleus / Achilles */}
        {renderMusclePath(
          'soleus',
          'M62 254 C61 262, 62 271, 64 278 L68 278 C68 270, 68 261, 66 254 Z',
          'Left Soleus & Achilles'
        )}
        {/* Right Soleus / Achilles */}
        {renderMusclePath(
          'soleus',
          'M98 254 C99 262, 98 271, 96 278 L92 278 C92 270, 92 261, 94 254 Z',
          'Right Soleus & Achilles'
        )}

        {/* HEELS */}
        <path d="M60 280 L69 280 L67 296 L59 296 Z" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
        <path d="M100 280 L91 280 L93 296 L101 296 Z" fill="#202430" stroke="#32394A" strokeWidth="0.6" />
      </svg>
    );
  };

  return view === 'anterior' ? renderAnterior() : renderPosterior();
};
