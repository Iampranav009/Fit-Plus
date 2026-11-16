import type { MuscleGroup } from '../../types/domain';

export type AnatomicalView = 'anterior' | 'posterior' | 'both';

export type AnatomicalGender = 'male' | 'female';

export type AnatomicalMuscleId =
  // Anterior (Front)
  | 'pectoralis_major'
  | 'pectoralis_minor'
  | 'deltoid_anterior'
  | 'deltoid_lateral'
  | 'biceps_brachii'
  | 'brachialis'
  | 'forearms_anterior'
  | 'rectus_abdominis'
  | 'obliques_external'
  | 'quadriceps_rectus_femoris'
  | 'quadriceps_vastus_lateralis'
  | 'quadriceps_vastus_medialis'
  | 'tibialis_anterior'
  | 'adductors'
  
  // Posterior (Back)
  | 'trapezius_upper'
  | 'trapezius_middle_lower'
  | 'deltoid_posterior'
  | 'infraspinatus_teres'
  | 'latissimus_dorsi'
  | 'erector_spinae'
  | 'triceps_brachii'
  | 'forearms_posterior'
  | 'gluteus_maximus'
  | 'gluteus_medius'
  | 'hamstrings_biceps_femoris'
  | 'hamstrings_semitendinosus'
  | 'gastrocnemius'
  | 'soleus';

export interface AnatomicalHighlightConfig {
  primaryColor?: string;     // Default #FF803E
  secondaryColor?: string;   // Default #FFBB86
  inactiveColor?: string;    // Default #222733
  inactiveStroke?: string;   // Default #32394A
  showLabels?: boolean;
}
