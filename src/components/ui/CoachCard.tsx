import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Bookmark, BookmarkCheck, Heart, MapPin, Scale, Star } from 'lucide-react';
import type { Package, TrainerProfile, TrainerReview } from '../../types/domain';
import { computeReviewStats } from '../../lib/commerce';
import { formatINR } from '../../lib/date';
import { MediaImage } from './MediaImage';

interface CoachCardProps {
  trainer: TrainerProfile;
  packages: Package[];
  reviews?: TrainerReview[];
  isDemoMode?: boolean;
  isComparing?: boolean;
  onToggleCompare?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export const CoachCard: React.FC<CoachCardProps> = ({
  trainer,
  packages,
  reviews = [],
  isDemoMode = false,
  isComparing = false,
  onToggleCompare,
  isSaved = false,
  onToggleSave,
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
    <article className="rounded-[22px] p-5 flex flex-col gap-4 bg-[#111114] border border-white/[0.09] transition-colors duration-200 hover:border-white/[0.18] relative">
      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          className={`absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center rounded-full transition-colors duration-150 cursor-pointer ${
            isSaved
              ? 'text-[#FF803E] bg-[#FF803E]/12 hover:bg-[#FF803E]/20'
              : 'text-[#ABA59D] hover:text-white hover:bg-white/10'
          }`}
          title={isSaved ? 'Remove from saved coaches' : 'Save coach'}
          aria-label={`Save ${trainer.displayName}`}
          aria-pressed={isSaved}
        >
          <Heart className={`w-[18px] h-[18px] ${isSaved ? 'fill-[#FF803E]' : ''}`} aria-hidden="true" />
        </button>
      )}

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
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] font-semibold text-[#F3EEE7]">{trainer.displayName}</h3>
            {isVerified ? (
              <span
                title={trainer.demoVerificationNote}
                className="inline-flex items-center gap-1 text-[12px] text-[#FF803E]"
              >
                <BadgeCheck className="w-4 h-4" aria-hidden="true" />
                <span>{isDemoMode ? 'Demo verified (sample)' : 'Verified coach'}</span>
              </span>
            ) : (
              <span className="text-[12px] text-[#8E8880]">
                {isDemoMode
                  ? 'Demo profile'
                  : trainer.verificationStatus === 'pending'
                    ? 'Verification pending'
                    : 'Independent coach'}
              </span>
            )}
          </div>

          <p className="mt-1 text-[14px] text-[#ABA59D] line-clamp-2">{trainer.headline}</p>

          <p className="mt-2 text-[12px] text-[#ABA59D] flex flex-wrap items-center gap-x-1.5 tabular-nums">
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

      {trainer.languages.length > 0 ? (
        <p className="-mt-1 text-[12px] text-[#ABA59D]">
          <span className="text-[#8E8880]">Languages:</span> {trainer.languages.join(', ')}
        </p>
      ) : null}

      <div className="pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] text-[#F3EEE7]">
          <span>{trainer.specialties.slice(0, 2).join(' · ')}</span>
          {lowestPrice !== undefined ? (
            <span className="block text-[12px] text-[#ABA59D] tabular-nums mt-0.5">
              {isDemoMode ? 'Sample plans from' : 'Plans from'}{' '}
              {lowestPrice === 0 ? 'Free' : `${formatINR(lowestPrice)}/mo`}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {onToggleCompare && (
            <button
              type="button"
              onClick={onToggleCompare}
              aria-pressed={isComparing}
              aria-label={`Compare ${trainer.displayName}`}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                isComparing
                  ? 'bg-[#FF803E]/15 text-[#FFC08F] border border-[#FF803E]/50'
                  : 'bg-white/[0.05] text-[#ABA59D] hover:text-white hover:bg-white/[0.09] border border-white/10'
              }`}
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isComparing ? 'Comparing' : 'Compare'}</span>
            </button>
          )}

          <Link
            to={`/trainers/${trainer.slug}`}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-full bg-[#FF803E] text-[#0B0B0B] text-[14px] font-semibold hover:bg-[#FF9259] transition-colors duration-150 whitespace-nowrap shrink-0"
            aria-label={`View ${trainer.displayName}'s profile`}
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
};
