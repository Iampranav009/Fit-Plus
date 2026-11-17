import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { CoachCard } from '../../components/ui/CoachCard';
import { CoachComparisonModal } from '../../components/ui/CoachComparisonModal';
import { CompareDock } from '../../components/ui/CompareDock';
import { EmptyState } from '../../components/ui/EmptyState';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSearchBar } from '../../components/ui/GlassSearchBar';

export const DiscoverPage: React.FC = () => {
  const { store, reviews, isDemoSandbox, publicDirectory } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const [comparingIds, setComparingIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [savedTrainerIds, setSavedTrainerIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('fitplus_saved_coaches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleSave = (trainerId: string) => {
    setSavedTrainerIds((prev) => {
      const next = prev.includes(trainerId)
        ? prev.filter((id) => id !== trainerId)
        : [...prev, trainerId];
      try {
        localStorage.setItem('fitplus_saved_coaches', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleCompare = (trainerId: string) => {
    setComparingIds((prev) => {
      if (prev.includes(trainerId)) {
        return prev.filter((id) => id !== trainerId);
      }
      if (prev.length >= 3) {
        alert('You can compare up to 3 coaches side-by-side.');
        return prev;
      }
      return [...prev, trainerId];
    });
  };

  // Always use publicDirectory for real data; store only for demo sandbox
  const trainersSource = isDemoSandbox ? store.trainers : publicDirectory.trainers;
  const packagesSource = isDemoSandbox ? store.packages : publicDirectory.packages;

  const filtered = useMemo(() => {
    return trainersSource.filter((trainer) => {
      if (trainer.isPublished === false) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${trainer.displayName} ${trainer.city} ${trainer.headline} ${trainer.specialties.join(' ')}`.toLowerCase().includes(q);
    });
  }, [trainersSource, query]);

  const isTrainer = store.session.activeRole === 'trainer';

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <PublicTopBar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-medium text-[#FFB06B]">
            {isDemoSandbox
              ? 'Interactive demo directory · Sample INR prices'
              : 'Independent personal coaching directory · India'}
          </p>
          <h1 className="mt-1 text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
            {COPY.discovery.heading}
          </h1>
          <p className="mt-2 text-[15px] text-[#A2A8B5]">{COPY.discovery.subheading}</p>
        </div>

        {/* Search */}
        <section aria-label="Search coaches" className="mt-6">
          <GlassSearchBar
            value={query}
            onChange={setQuery}
            placeholder={COPY.discovery.searchPlaceholder}
            ariaLabel={COPY.discovery.searchPlaceholder}
          />
        </section>

        {/* Results */}
        <section className="mt-6">
          {!isDemoSandbox && !publicDirectory.loaded ? (
            <div className="rounded-[24px] surface-card p-8 text-center text-[15px] text-[#A2A8B5]">
              Loading published coaches…
            </div>
          ) : trainersSource.length === 0 ? (
            <div className="rounded-[24px] surface-card p-8 text-center flex flex-col items-center gap-4">
              <h2 className="text-[22px] font-semibold text-[#F5F5F7]">No published coaches yet</h2>
              <p className="text-[14px] text-[#A2A8B5] max-w-md">
                {isTrainer
                  ? 'Be one of the first independent coaches on FitPlus.'
                  : 'Be one of the first independent coaches on FitPlus, or explore the interactive demo directory.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <GlassButton onClick={() => navigate('/auth')}>Set up your Trainer Studio</GlassButton>
                {!isTrainer && (
                  <GlassButton variant="secondary" onClick={() => navigate('/demo')}>
                    Open interactive demo
                  </GlassButton>
                )}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              artwork="coach"
              title={COPY.discovery.emptyTitle}
              description="Try a different search."
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((trainer) => (
                <CoachCard
                  key={trainer.id}
                  trainer={trainer}
                  packages={packagesSource}
                  reviews={reviews}
                  isDemoMode={isDemoSandbox}
                  isComparing={comparingIds.includes(trainer.id)}
                  onToggleCompare={() => toggleCompare(trainer.id)}
                  isSaved={savedTrainerIds.includes(trainer.id)}
                  onToggleSave={() => toggleSave(trainer.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating Compare Dock */}
      <CompareDock
        selectedTrainers={trainersSource.filter((t) => comparingIds.includes(t.id))}
        onRemoveTrainer={(id) => setComparingIds((prev) => prev.filter((tid) => tid !== id))}
        onClearAll={() => setComparingIds([])}
        onOpenCompare={() => setIsCompareModalOpen(true)}
      />

      {/* Side-by-Side Coach Comparison Modal */}
      <CoachComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        trainers={trainersSource.filter((t) => comparingIds.includes(t.id))}
        allPackages={packagesSource}
        allReviews={reviews}
      />
    </div>
  );
};
