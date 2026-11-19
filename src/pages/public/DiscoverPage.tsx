import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { CoachCard } from '../../components/ui/CoachCard';
import { CoachComparisonModal } from '../../components/ui/CoachComparisonModal';
import { CompareDock } from '../../components/ui/CompareDock';
import { MarketingLayout } from '../../components/marketing/MarketingLayout';
import { CTA } from '../../components/marketing/links';
import { SEOHelmet } from '../../components/seo/SEOHelmet';

export const DiscoverPage: React.FC = () => {
  const { store, reviews, isDemoSandbox, publicDirectory } = useApp();
  const [searchParams] = useSearchParams();
  // `?q=` pre-fills the search (used by the homepage coaching-track cards).
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

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
      return `${trainer.displayName} ${trainer.city} ${trainer.headline} ${trainer.specialties.join(' ')}`
        .toLowerCase()
        .includes(q);
    });
  }, [trainersSource, query]);

  const publishedCount = trainersSource.filter((t) => t.isPublished !== false).length;
  const isTrainer = store.session.activeRole === 'trainer';
  const isLoading = !isDemoSandbox && !publicDirectory.loaded;

  return (
    <MarketingLayout>
      <SEOHelmet
        title="Find a fitness coach in India — FitPlus Trainer Directory"
        description="Browse independent personal trainers by goal, city or name. Compare profiles, check INR packages and book a consultation — all on FitPlus."
        path="/discover"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fitplus-kappa.vercel.app/' },
            { '@type': 'ListItem', position: 2, name: 'Trainer Directory' },
          ],
        }}
      />
      <div className="mkt-container pt-8 pb-24 lg:pt-12">
        <header>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="mkt-display text-[clamp(2.25rem,1.7rem+2.2vw,3.25rem)] leading-none">
              {COPY.discovery.heading}
            </h1>
            <span className={`mkt-chip ${isDemoSandbox ? 'mkt-chip-sample' : ''}`}>
              {isDemoSandbox ? 'Demo directory · example prices' : 'Live directory · prices in INR'}
            </span>
          </div>
          <p className="mt-2 text-[0.9375rem] text-[#ABA59D] max-w-[44rem]">
            {COPY.discovery.subheading}{' '}
            {isDemoSandbox
              ? 'You’re in the demo: any profiles, reviews, verification and package prices are examples, and nothing is charged.'
              : 'Prices are packages set by each coach.'}
          </p>
        </header>

        {/* Search (matte, not glass: a dense control) */}
        <section aria-label="Search coaches" className="mt-6 rounded-[22px] mkt-matte p-3 sm:p-4">
          <label className="relative block">
            <span className="sr-only">{COPY.discovery.searchPlaceholder}</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8E8880]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={COPY.discovery.searchPlaceholder}
              className="w-full min-h-[48px] rounded-full bg-[#080808] border border-white/[0.16] pl-11 pr-11 text-[0.9375rem] text-[#F3EEE7] placeholder:text-[#8E8880] hover:border-white/30 focus-visible:border-[#FF803E] transition-colors"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-full text-[#ABA59D] hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <p className="mt-3 px-1 text-[0.875rem] text-[#F3EEE7] tabular-nums" role="status" aria-live="polite">
            {isLoading
              ? 'Loading coaches…'
              : `Showing ${filtered.length} of ${publishedCount} ${publishedCount === 1 ? 'coach' : 'coaches'}`}
          </p>
        </section>

        {/* Results */}
        <section aria-label="Coaches" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[220px] rounded-[22px] bg-[#111114] border border-white/[0.07] animate-pulse" />
              ))}
              <span className="sr-only">Loading published coaches…</span>
            </div>
          ) : publishedCount === 0 ? (
            <div className="rounded-[22px] mkt-matte p-8 sm:p-10 flex flex-col items-start gap-4 max-w-2xl">
              <h2 className="mkt-h3">No published coaches yet</h2>
              <p className="mkt-body">
                {isTrainer
                  ? 'Be one of the first independent coaches on FitPlus.'
                  : 'Be one of the first independent coaches on FitPlus, or explore the interactive demo.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to={CTA.createAccount.to} className="mkt-btn mkt-btn-primary">
                  Set up your Trainer Studio
                </Link>
                {!isTrainer ? (
                  <Link to={CTA.demo.to} className="mkt-btn mkt-btn-secondary">
                    {CTA.demo.label}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[22px] mkt-matte p-8 sm:p-10 flex flex-col items-start gap-4 max-w-2xl">
              <h2 className="mkt-h3">{COPY.discovery.emptyTitle}</h2>
              <p className="mkt-body">Try a different search: a city, a specialty like “strength”, or a coach’s name.</p>
              <button type="button" onClick={() => setQuery('')} className="mkt-btn mkt-btn-primary">
                Clear search
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((trainer) => (
                <li key={trainer.id}>
                  <CoachCard
                    trainer={trainer}
                    packages={packagesSource}
                    reviews={reviews}
                    isDemoMode={isDemoSandbox}
                    isComparing={comparingIds.includes(trainer.id)}
                    onToggleCompare={() => toggleCompare(trainer.id)}
                    isSaved={savedTrainerIds.includes(trainer.id)}
                    onToggleSave={() => toggleSave(trainer.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

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
    </MarketingLayout>
  );
};
