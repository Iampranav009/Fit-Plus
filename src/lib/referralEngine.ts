/**
 * FitPlus Stage 4C — Referral Engine
 * Powers client-to-client and trainer-to-client growth and viral acquisition.
 */

export const REFERRAL_CONSTANTS = {
  REFEREE_DISCOUNT_INR: 500,
  REFERRER_REWARD_INR: 500,
  MIN_ORDER_AMOUNT_INR: 1500,
};

/**
 * Generates a clean, memorable uppercase referral code
 * Format: FIT-<NAME>-<SUFFIX> (e.g. FIT-PRANAV-8F2K)
 */
export function generateReferralCode(displayName: string, userId: string): string {
  const cleanName = (displayName || 'MEMBER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'FIT';
  
  const cleanId = (userId || 'PLUS')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-4)
    .toUpperCase() || '7X9Q';

  return `FIT-${cleanName}-${cleanId}`;
}

/**
 * Builds the canonical referral deep link
 */
export function buildReferralDeepLink(referralCode: string, baseOrigin?: string): string {
  const origin = baseOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://fitplus-kappa.vercel.app');
  return `${origin}/auth?ref=${encodeURIComponent(referralCode.trim())}`;
}

/**
 * Generates structured social share text
 */
export function buildReferralShareContent(referralCode: string, referrerName: string, baseOrigin?: string): {
  title: string;
  text: string;
  url: string;
} {
  const link = buildReferralDeepLink(referralCode, baseOrigin);
  const name = referrerName ? referrerName.trim() : 'a friend';
  return {
    title: 'Get ₹500 off your personal fitness coach on FitPlus',
    text: `Join me on FitPlus! Train with top certified coaches across India. Use my invite code ${referralCode} to get ₹500 off your first coaching package:`,
    url: link,
  };
}

/**
 * Builds a direct WhatsApp click-to-chat URL with pre-filled invitation
 */
export function buildReferralWhatsAppUrl(referralCode: string, referrerName: string, baseOrigin?: string): string {
  const { text, url } = buildReferralShareContent(referralCode, referrerName, baseOrigin);
  const fullMessage = `${text} ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
}

/**
 * Evaluates referral reward qualification
 */
export function evaluateReferralReward(packagePriceInr: number): {
  isEligible: boolean;
  discountInr: number;
  rewardInr: number;
  message: string;
} {
  if (packagePriceInr < REFERRAL_CONSTANTS.MIN_ORDER_AMOUNT_INR) {
    return {
      isEligible: false,
      discountInr: 0,
      rewardInr: 0,
      message: `Referral discount applies to packages ₹${REFERRAL_CONSTANTS.MIN_ORDER_AMOUNT_INR.toLocaleString('en-IN')} and above.`,
    };
  }

  return {
    isEligible: true,
    discountInr: REFERRAL_CONSTANTS.REFEREE_DISCOUNT_INR,
    rewardInr: REFERRAL_CONSTANTS.REFERRER_REWARD_INR,
    message: `Referral applied! ₹${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_INR} off for you, and ₹${REFERRAL_CONSTANTS.REFERRER_REWARD_INR} coaching credit for your friend.`,
  };
}
