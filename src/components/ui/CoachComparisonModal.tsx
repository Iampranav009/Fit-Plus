import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Check, Clock, Globe, MapPin, Star, UserCheck, X } from 'lucide-react';
import type { Package, TrainerProfile, TrainerReview } from '../../types/domain';
import { computeReviewStats } from '../../lib/commerce';
import { formatINR } from '../../lib/date';
import { GlassButton } from './GlassButton';

interface CoachComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainers: TrainerProfile[];
  allPackages: Package[];
  allReviews: TrainerReview[];
}

export const CoachComparisonModal: React.FC<CoachComparisonModalProps> = ({
  isOpen,
  onClose,
  trainers,
  allPackages,
  allReviews,
}) => {
  const navigate = useNavigate();

  if (!isOpen || trainers.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
    >
      <div className="relative w-full max-w-5xl glass-card border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 id="compare-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#FF803E]">Compare Coaches</span> ({trainers.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Side-by-side comparison to help you find your ideal fitness mentor.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto my-4 pr-1">
          <div
            className="grid gap-4 min-w-[680px]"
            style={{ gridTemplateColumns: `repeat(${trainers.length}, minmax(220px, 1fr))` }}
          >
            {trainers.map((trainer) => {
              const trainerPkgs = allPackages.filter(
                (p) => p.trainerId === trainer.id && p.status === 'active',
              );
              const minPrice = trainerPkgs.length > 0
                ? Math.min(...trainerPkgs.map((p) => p.priceInr))
                : 0;
              const trainerRevs = allReviews.filter((r) => r.trainerId === trainer.id);
              const stats = computeReviewStats(trainerRevs);

              return (
                <div
                  key={trainer.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col justify-between hover:border-white/20 transition-all"
                >
                  {/* Coach Identity */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/15 bg-zinc-800 flex-shrink-0">
                        {trainer.photoUrl ? (
                          <img
                            src={trainer.photoUrl}
                            alt={trainer.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-lg text-white">
                            {trainer.displayName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-white line-clamp-1">
                            {trainer.displayName}
                          </h3>
                          {trainer.verificationStatus === 'verified' && (
                            <UserCheck className="w-4 h-4 text-[#FF803E] flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          {trainer.city || 'India (Online)'}
                        </p>
                      </div>
                    </div>

                    {/* Headline */}
                    <p className="text-xs text-zinc-300 italic mb-4 line-clamp-2">
                      "{trainer.headline || 'Dedicated personal fitness coach'}"
                    </p>

                    {/* Key Attributes Table */}
                    <div className="space-y-3 pt-3 border-t border-white/10 text-xs">
                      {/* Rating */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Rating</span>
                        <div className="flex items-center gap-1 font-semibold text-white">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          {stats.count > 0 ? `${stats.averageRating} (${stats.count})` : 'New Coach'}
                        </div>
                      </div>

                      {/* Experience */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Experience</span>
                        <span className="font-medium text-white flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {trainer.experienceYears} Years
                        </span>
                      </div>

                      {/* Mode */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Coaching Mode</span>
                        <span className="font-medium text-white capitalize">
                          {trainer.coachingMode.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Languages */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Languages</span>
                        <span className="font-medium text-white line-clamp-1 text-right flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                          {trainer.languages.join(', ')}
                        </span>
                      </div>

                      {/* Starting Price */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-zinc-400">Plans from</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {minPrice > 0 ? `${formatINR(minPrice)}/mo` : 'Free trial'}
                        </span>
                      </div>
                    </div>

                    {/* Specialties Pills */}
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                        Specialties
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {trainer.specialties.slice(0, 4).map((spec) => (
                          <span
                            key={spec}
                            className="px-2 py-0.5 rounded-lg bg-white/[0.06] text-[11px] text-zinc-200 border border-white/5"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Certifications */}
                    {trainer.certifications && trainer.certifications.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <Award className="w-3 h-3 text-[#FF9D5C]" /> Credentials
                        </span>
                        <p className="text-[11px] text-zinc-300 line-clamp-2">
                          {trainer.certifications.join(' • ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action CTA */}
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <GlassButton
                      variant="primary"
                      className="w-full text-xs h-9 justify-center"
                      onClick={() => {
                        onClose();
                        navigate(`/trainers/${trainer.id}`);
                      }}
                    >
                      View Profile & Plans
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </GlassButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span>Compare up to 3 coaches side by side.</span>
          <GlassButton variant="glass" onClick={onClose} className="text-xs h-8 px-4">
            Close
          </GlassButton>
        </div>
      </div>
    </div>
  );
};
