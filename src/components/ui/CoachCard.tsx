import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import type { Package, TrainerProfile, TrainerReview } from '../../types/domain';
import { computeReviewStats } from '../../lib/commerce';
import { formatINR } from '../../lib/date';
import { MediaImage } from './MediaImage';

interface CoachCardProps {
  trainer: TrainerProfile;
  packages: Package[];
  reviews?: TrainerReview[];
  isDemoMode?: boolean;
}

export const CoachCard: React.FC<CoachCardProps> = ({
  trainer,
  packages,
  reviews = [],
  isDemoMode = false,
}) => {
  const activePackages = packages.filter((p) => p.trainerId === trainer.id && p.status === 'active');
  const lowestPrice =
    activePackages.length > 0 ? Math.min(...activePackages.map((p) => p.priceInr)) : undefined;

  const trainerReviews = reviews.filter((r) => r.trainerId === trainer.id);
  const { averageRating, count } = computeReviewStats(trainerReviews);

  const modeLabel =
    trainer.coachingMode === 'hybrid'
      ? 'Online & in person'
      : trainer.coachingMode === 'in_person'
        ? 'In person'
        : 'Online';

  const isVerified = trainer.verificationStatus === 'verified' || (isDemoMode && trainer.isDemoVerified);

  return (
    <article className="surface-card rounded-[22px] p-5 flex flex-col gap-4 transition-colors hover:border-white/[0.14]">
      <div className="flex items-start gap-4">
        {trainer.photoUrl ? (
          <img
            src={trainer.photoUrl}
            alt={trainer.displayName}
            loading="lazy"
            className="w-16 h-16 shrink-0 rounded-[16px] object-cover ring-1 ring-white/10"
          />
        ) : (
          <MediaImage
            assetKey={trainer.avatarKey}
            alt={trainer.displayName}
            aspectClass="w-16 h-16 shrink-0 rounded-[16px] ring-1 ring-white/10"
            lazy
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] font-semibold text-[#F5F5F7]">{trainer.displayName}</h3>
            {isVerified ? (
              <span
                title={trainer.demoVerificationNote}
                className="inline-flex items-center gap-1 text-[12px] text-[#FF803E]"
              >
                <BadgeCheck className="w-4 h-4" aria-hidden="true" />
                <span>{isDemoMode ? 'Demo verified' : 'Verified coach'}</span>
              </span>
            ) : (
              <span className="text-[12px] text-[#7C8393]">
                {isDemoMode
                  ? 'Demo profile'
                  : trainer.verificationStatus === 'pending'
                    ? 'Verification pending'
                    : 'Independent coach'}
              </span>
            )}
          </div>

          <p className="mt-1 text-[14px] text-[#A2A8B5] line-clamp-2">{trainer.headline}</p>

          <p className="mt-2 text-[12px] text-[#7C8393] flex flex-wrap items-center gap-x-1.5 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {trainer.city}
            </span>
            <span aria-hidden="true">·</span>
            <span>{modeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{trainer.experienceYears} years exp.</span>
            {count > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#FFB06B] font-medium">
                  <Star className="w-3.5 h-3.5 fill-[#FFB06B]" aria-hidden="true" />
                  {averageRating} ({count})
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] text-[#A2A8B5]">
          <span>{trainer.specialties.slice(0, 2).join(' · ')}</span>
          {lowestPrice !== undefined ? (
            <span className="block text-[12px] text-[#7C8393] tabular-nums mt-0.5">
              {isDemoMode ? 'Sample plans from' : 'Plans from'}{' '}
              {lowestPrice === 0 ? 'Free' : `${formatINR(lowestPrice)}/mo`}
            </span>
          ) : null}
        </div>

        <Link
          to={`/trainers/${trainer.slug}`}
          className="glass-control inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-[13px] text-[14px] font-semibold text-[#F5F5F7] hover:bg-[#2E3442]/80 transition-colors whitespace-nowrap shrink-0"
        >
          View profile
        </Link>
      </div>
    </article>
  );
};
