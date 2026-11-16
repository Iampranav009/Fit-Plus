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
