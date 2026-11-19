/**
 * Single source of truth for public CTA labels and destinations so the header,
 * hero, audience paths and closing section always say the same thing.
 *
 * Mode notes (verified against App.tsx / AuthPage.tsx):
 *  - /discover            Public coach directory. No account needed.
 *  - /demo                Sample client workspace (Demo Client). Offline sample data, no account.
 *  - /demo?role=coach     Sample Trainer Studio (Demo Trainer). Same sandbox entry as the
 *                         "Demo: Coach" option on /auth.
 *  - /auth                Live sign-in (Google or email).
 *  - /auth?mode=signup    Live account creation. After email verification the user picks
 *                         "I'm here to coach" or "I'm here to get fitter" on /onboarding/role.
 */
export const CTA = {
  findTrainer: { label: 'Find a trainer', to: '/discover' },
  forTrainers: { label: 'See FitPlus for trainers', to: '/#for-trainers' },
  howItWorks: { label: 'How it works', to: '/welcome' },
  demo: { label: 'Try the demo', to: '/demo' },
  clientDemo: { label: 'Try the client demo', to: '/demo' },
  coachDemo: { label: 'Try the coach demo', to: '/demo?role=coach' },
  signIn: { label: 'Sign in', to: '/auth' },
  createAccount: { label: 'Create an account', to: '/auth?mode=signup' },
} as const;

export const LEGAL_LINKS = [
  { label: 'Privacy policy', to: '/privacy' },
  { label: 'Terms of service', to: '/terms' },
  { label: 'Refund policy', to: '/refund-policy' },
  { label: 'Disclaimers', to: '/disclaimer' },
] as const;
