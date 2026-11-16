import type { BillingCadence, CoachingRelationship, TrainerReview } from '../types/domain';
import { BLUEPRINT_PATTERNS } from './firestoreValidation';

export function buildWhatsAppChatUrl(e164: string | undefined, message: string): string | null {
  if (!e164) return null;
  const cleaned = e164.replace(/[\s\-()]/g, '').trim();
  if (!BLUEPRINT_PATTERNS.e164Phone.test(cleaned)) {
    return null;
  }
  const digits = cleaned.slice(1);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message.trim())}`;
}

export function computePackageDurationDays(pkg: {
  durationDays?: number;
  cadence: BillingCadence;
}): number {
  if (typeof pkg.durationDays === 'number' && pkg.durationDays >= 1) {
    return Math.min(366, Math.round(pkg.durationDays));
  }
  return pkg.cadence === 'quarterly' ? 90 : 30;
}

export function computeAuthoritativeOrderAmountPaise(pkg: {
  priceInr: number;
  cadence: BillingCadence;
}): number {
  if (pkg.cadence === 'free') return 0;
  const safeInr = Number.isFinite(pkg.priceInr) ? Math.max(0, Math.round(pkg.priceInr)) : 0;
  return safeInr * 100;
}

export function computeReviewStats(reviews: TrainerReview[]): {
  averageRating: number;
  count: number;
} {
  if (reviews.length === 0) return { averageRating: 0, count: 0 };
  const total = reviews.reduce((sum, r) => sum + Math.min(5, Math.max(1, r.rating)), 0);
  return {
    averageRating: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

export function findEligibleReviewRelationship(
  clientId: string | undefined,
  trainerId: string,
  relationships: CoachingRelationship[],
): CoachingRelationship | undefined {
  if (!clientId) return undefined;
  return relationships.find(
    (r) =>
      r.clientId === clientId &&
      r.trainerId === trainerId &&
      (r.status === 'active' || r.status === 'ended'),
  );
}

export function isValidHttpMeetingLink(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.length > 300) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Stage 4C — Monetization: GST, Invoicing, Coupons & Settlements
// -----------------------------------------------------------------------------

export interface CouponRule {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderInr: number;
  maxDiscountInr?: number;
  applicableCadences?: BillingCadence[];
  description: string;
}

export const PLATFORM_COUPONS: Record<string, CouponRule> = {
  WELCOME20: {
    code: 'WELCOME20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderInr: 1000,
    maxDiscountInr: 1000,
    description: '20% off (up to ₹1,000) on your first coaching package.',
  },
  FITPLUS500: {
    code: 'FITPLUS500',
    discountType: 'flat',
    discountValue: 500,
    minOrderInr: 2000,
    description: 'Flat ₹500 off on coaching packages ₹2,000 and above.',
  },
  TRANSFORM10: {
    code: 'TRANSFORM10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderInr: 3000,
    applicableCadences: ['quarterly'],
    description: '10% off long-term transformation coaching packages.',
  },
};

export function validateCouponCode(params: {
  code: string;
  originalAmountInr: number;
  cadence?: BillingCadence;
  trainerSlugOrInitials?: string;
}): {
  isValid: boolean;
  code: string;
  discountInr: number;
  finalAmountInr: number;
  message: string;
} {
  const normalizedCode = params.code.trim().toUpperCase();
  const original = Math.max(0, Math.round(params.originalAmountInr));

  if (!normalizedCode) {
    return {
      isValid: false,
      code: '',
      discountInr: 0,
      finalAmountInr: original,
      message: 'Enter a valid coupon code.',
    };
  }

  // Check known platform coupons
  const rule = PLATFORM_COUPONS[normalizedCode];
  if (rule) {
    if (original < rule.minOrderInr) {
      return {
        isValid: false,
        code: normalizedCode,
        discountInr: 0,
        finalAmountInr: original,
        message: `Coupon requires a minimum package price of ₹${rule.minOrderInr.toLocaleString('en-IN')}.`,
      };
    }

    if (rule.applicableCadences && params.cadence && !rule.applicableCadences.includes(params.cadence)) {
      return {
        isValid: false,
        code: normalizedCode,
        discountInr: 0,
        finalAmountInr: original,
        message: 'This coupon is valid only for quarterly or long-term packages.',
      };
    }

    let discount = 0;
    if (rule.discountType === 'flat') {
      discount = rule.discountValue;
    } else {
      discount = Math.round((original * rule.discountValue) / 100);
      if (rule.maxDiscountInr) {
        discount = Math.min(discount, rule.maxDiscountInr);
      }
    }

    discount = Math.min(discount, original);
    const finalAmount = Math.max(0, original - discount);

    return {
      isValid: true,
      code: normalizedCode,
      discountInr: discount,
      finalAmountInr: finalAmount,
      message: `Coupon applied: ${rule.description} Saved ₹${discount.toLocaleString('en-IN')}!`,
    };
  }

  // Check coach-specific promo code pattern: e.g. COACH10 or {INIT}10 (10% off)
  if (normalizedCode.endsWith('10') && normalizedCode.length >= 4) {
    const discount = Math.min(original, Math.round((original * 10) / 100));
    return {
      isValid: true,
      code: normalizedCode,
      discountInr: discount,
      finalAmountInr: original - discount,
      message: `Coach promo code applied! 10% off (saved ₹${discount.toLocaleString('en-IN')}).`,
    };
  }

  return {
    isValid: false,
    code: normalizedCode,
    discountInr: 0,
    finalAmountInr: original,
    message: 'Invalid or expired coupon code.',
  };
}

/**
 * Computes GST breakdown (18% Goods & Services Tax in India)
 * FitPlus prices are inclusive of GST.
 */
export function computeGstBreakdown(amountInr: number): {
  totalAmountInr: number;
  baseAmountInr: number;
  cgstInr: number;
  sgstInr: number;
  totalGstInr: number;
  gstRatePercent: number;
} {
  const safeTotal = Math.max(0, Math.round(amountInr));
  if (safeTotal === 0) {
    return {
      totalAmountInr: 0,
      baseAmountInr: 0,
      cgstInr: 0,
      sgstInr: 0,
      totalGstInr: 0,
      gstRatePercent: 18,
    };
  }

  // Base = Total / 1.18
  const base = Math.round((safeTotal / 1.18) * 100) / 100;
  const totalGst = Math.round((safeTotal - base) * 100) / 100;
  const halfGst = Math.round((totalGst / 2) * 100) / 100;

  return {
    totalAmountInr: safeTotal,
    baseAmountInr: base,
    cgstInr: halfGst,
    sgstInr: halfGst,
    totalGstInr: totalGst,
    gstRatePercent: 18,
  };
}

/**
 * Computes trainer settlement earnings with FitPlus 10% platform fee
 */
export function computeTrainerSettlement(grossAmountInr: number): {
  grossAmountInr: number;
  platformFeePercent: number;
  platformFeeInr: number;
  netPayableInr: number;
  settlementTimeline: string;
} {
  const gross = Math.max(0, Math.round(grossAmountInr));
  const feePercent = 10;
  const platformFeeInr = Math.round((gross * feePercent) / 100);
  const netPayableInr = Math.max(0, gross - platformFeeInr);

  return {
    grossAmountInr: gross,
    platformFeePercent: feePercent,
    platformFeeInr,
    netPayableInr,
    settlementTimeline: 'T+2 Banking Days (Cashfree Easy Split)',
  };
}

