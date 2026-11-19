import React, { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Heart, Search, SlidersHorizontal, X } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { CoachCard } from '../../components/ui/CoachCard';
import { CoachComparisonModal } from '../../components/ui/CoachComparisonModal';
import { CompareDock } from '../../components/ui/CompareDock';
import { MarketingLayout } from '../../components/marketing/MarketingLayout';
import { MarketingDialog } from '../../components/marketing/MarketingDialog';
import { CTA } from '../../components/marketing/links';

type ModeFilter = 'all' | 'online' | 'in_person' | 'hybrid';

export const DiscoverPage: React.FC = () => {
  const { store, reviews, isCloudSynced, isDemoSandbox, publicDirectory } = useApp();
  const [searchParams] = useSearchParams();
  // `?q=` pre-fills the search (used by the homepage coaching-track cards).
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [cityFilter, setCityFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  // Stage 4C Coach Comparison & Bookmarking state
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

  const trainersSource = isCloudSynced || isDemoSandbox ? store.trainers : publicDirectory.trainers;
  const packagesSource = isCloudSynced || isDemoSandbox ? store.packages : publicDirectory.packages;

  const allCities = useMemo(() => {
    const set = new Set<string>();
    trainersSource.forEach((t) => {
      if (t.city?.trim()) set.add(t.city.trim());
    });
    return Array.from(set).sort();
  }, [trainersSource]);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    trainersSource.forEach((t) => t.specialties.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [trainersSource]);

  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    trainersSource.forEach((t) => t.languages.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [trainersSource]);

  const filtered = useMemo(() => {
    return trainersSource.filter((trainer) => {
      if (trainer.isPublished === false) return false;
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${trainer.displayName} ${trainer.city} ${trainer.headline} ${trainer.specialties.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cityFilter !== 'all' && trainer.city.trim() !== cityFilter) {
        return false;
      }
      if (specialtyFilter !== 'all' && !trainer.specialties.includes(specialtyFilter)) {
        return false;
      }
      if (modeFilter !== 'all' && trainer.coachingMode !== modeFilter) {
        return false;
      }
      if (languageFilter !== 'all' && !trainer.languages.includes(languageFilter)) {
        return false;
      }
      if (verifiedOnly) {
        const verified =
          trainer.verificationStatus === 'verified' || (isDemoSandbox && trainer.isDemoVerified);
        if (!verified) return false;
      }
      const pkgs = packagesSource.filter((p) => p.trainerId === trainer.id && p.status === 'active');
      if (pkgs.length > 0 && maxPrice < 10000) {
        const minP = Math.min(...pkgs.map((p) => p.priceInr));
        if (minP > maxPrice) return false;
      }
      if (showSavedOnly && !savedTrainerIds.includes(trainer.id)) {
        return false;
      }
      return true;
    });
  }, [
    trainersSource,
    packagesSource,
    query,
    cityFilter,
    specialtyFilter,
    modeFilter,
    languageFilter,
    verifiedOnly,
    showSavedOnly,
    savedTrainerIds,
    isDemoSandbox,
    maxPrice,
  ]);

  const clearFilters = () => {
    setQuery('');
    setCityFilter('all');
    setSpecialtyFilter('all');
    setModeFilter('all');
    setLanguageFilter('all');
    setMaxPrice(10000);
    setVerifiedOnly(false);
    setShowSavedOnly(false);
  };

  const activeFilterCount =
    Number(cityFilter !== 'all') +
    Number(specialtyFilter !== 'all') +
    Number(modeFilter !== 'all') +
    Number(languageFilter !== 'all') +
    Number(maxPrice < 10000) +
    Number(verifiedOnly) +
    Number(showSavedOnly);
  const hasAnyFilter = activeFilterCount > 0 || query.trim().length > 0;

  const coachNoun = isDemoSandbox ? 'sample coaches' : 'coaches';
  const resultLabel = `${filtered.length} of ${trainersSource.length} ${coachNoun}`;

  const selectClass = 'mkt-select';
  const labelClass = 'flex flex-col gap-1.5 text-[0.8125rem] font-medium text-[#ABA59D]';

  const filterFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <label className={labelClass}>
        City
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={selectClass}>
          <option value="all">All cities</option>
          {allCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Speciality
        <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)} className={selectClass}>
          <option value="all">All specialties</option>
          {allSpecialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Coaching mode
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
          className={selectClass}
        >
          <option value="all">Online & in person</option>
          <option value="online">Online only</option>
          <option value="hybrid">Hybrid (online + in person)</option>
          <option value="in_person">In person</option>
        </select>
      </label>
      <label className={labelClass}>
        Language
        <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className={selectClass}>
          <option value="all">Any language</option>
          {allLanguages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Starting price
        <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className={selectClass}>
          <option value={10000}>Any budget</option>
          <option value={1000}>Up to ₹1,000/mo</option>
          <option value={2500}>Up to ₹2,500/mo</option>
          <option value={5000}>Up to ₹5,000/mo</option>
        </select>
      </label>
    </div>
  );

  const toggleClass = (on: boolean) =>
    `min-h-[44px] px-3.5 rounded-full border text-[0.8125rem] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ${
      on
        ? 'bg-[#FF803E]/12 border-[#FF803E]/60 text-[#FFC08F]'
        : 'bg-transparent border-white/[0.14] text-[#ABA59D] hover:border-white/30 hover:text-[#F3EEE7]'
    }`;

  const toggles = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={verifiedOnly}
        onClick={() => setVerifiedOnly((v) => !v)}
        className={toggleClass(verifiedOnly)}
      >
        <BadgeCheck className="w-4 h-4" aria-hidden="true" />
        {isDemoSandbox ? 'Verified only (demo)' : 'Verified coaches only'}
      </button>
      <button
        type="button"
        aria-pressed={showSavedOnly}
        onClick={() => setShowSavedOnly((s) => !s)}
        className={toggleClass(showSavedOnly)}
      >
        <Heart className={`w-4 h-4 ${showSavedOnly ? 'fill-[#FF803E] text-[#FF803E]' : ''}`} aria-hidden="true" />
        Saved coaches ({savedTrainerIds.length})
      </button>
    </div>
  );

  const resetButton = (
    <button
      type="button"
      onClick={clearFilters}
      disabled={!hasAnyFilter}
      className="min-h-[44px] px-3 rounded-full text-[0.875rem] font-medium text-[#F3EEE7] underline decoration-[#FF803E]/60 underline-offset-4 hover:decoration-[#FF803E] disabled:opacity-40 disabled:no-underline cursor-pointer disabled:cursor-default"
    >
      {COPY.discovery.clearFilters}
    </button>
  );

  return (
    <MarketingLayout>
      <div className="mkt-container pt-8 pb-24 lg:pt-12">
        {/* Title + mode label */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="mkt-display text-[clamp(2.25rem,1.7rem+2.2vw,3.25rem)] leading-none">
                {COPY.discovery.heading}
              </h1>
              <span className={`mkt-chip ${isDemoSandbox ? 'mkt-chip-sample' : ''}`}>
                {isDemoSandbox ? 'Sample directory · example prices' : 'Live directory · prices in INR'}
              </span>
            </div>
            <p className="mt-2 text-[0.9375rem] text-[#ABA59D] max-w-[44rem]">
              {COPY.discovery.subheading}{' '}
              {isDemoSandbox
                ? 'You’re in the demo: profiles, reviews, verification and package prices are examples, and nothing is charged.'
                : 'Prices are monthly packages set by each coach.'}
            </p>
          </div>
        </header>

        {/* Search + filters (matte, not glass: dense controls) */}
        <section aria-label="Search and filter coaches" className="mt-6 rounded-[22px] mkt-matte p-3 sm:p-4">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{COPY.discovery.searchPlaceholder}</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8E8880]" aria-hidden="true" />
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
            <button
              ref={filtersButtonRef}
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              className="lg:hidden min-h-[48px] px-4 rounded-full border border-white/[0.16] text-[0.9375rem] font-medium text-[#F3EEE7] inline-flex items-center gap-2 hover:bg-white/[0.06] cursor-pointer"
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FF803E] text-[#0B0B0B] text-[0.75rem] font-bold inline-flex items-center justify-center tabular-nums">
                  {activeFilterCount}
                  <span className="sr-only"> active</span>
                </span>
              ) : null}
            </button>
          </div>

          <div className="hidden lg:block mt-4">{filterFields}</div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-[0.875rem] text-[#F3EEE7] tabular-nums" role="status" aria-live="polite">
              Showing {resultLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden lg:block">{toggles}</div>
              {resetButton}
            </div>
          </div>
        </section>

        {/* Results */}
        <section aria-label="Coaches" className="mt-6">
          {!isCloudSynced && !isDemoSandbox && !publicDirectory.loaded ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[220px] rounded-[22px] bg-[#111114] border border-white/[0.07] animate-pulse" />
              ))}
              <span className="sr-only">Loading published coaches…</span>
            </div>
          ) : trainersSource.length === 0 ? (
            <div className="rounded-[22px] mkt-matte p-8 sm:p-10 flex flex-col items-start gap-4 max-w-2xl">
              <h2 className="mkt-h3">No published coaches yet</h2>
              <p className="mkt-body">
                Coaches appear here once they publish a profile. Are you a trainer? Create an account and set up your
                studio, or explore the sample directory in the demo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to={CTA.createAccount.to} className="mkt-btn mkt-btn-primary">
                  {CTA.createAccount.label}
                </Link>
                <Link to={CTA.demo.to} className="mkt-btn mkt-btn-secondary">
                  {CTA.demo.label}
                </Link>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[22px] mkt-matte p-8 sm:p-10 flex flex-col items-start gap-4 max-w-2xl">
              <h2 className="mkt-h3">{COPY.discovery.emptyTitle}</h2>
              <p className="mkt-body">
                {showSavedOnly && savedTrainerIds.length === 0
                  ? 'You haven’t saved any coaches yet. Tap the heart on a coach to save them.'
                  : 'Try a broader search, or remove the city, language, verification or budget filter.'}
              </p>
              <button type="button" onClick={clearFilters} className="mkt-btn mkt-btn-primary">
                {COPY.discovery.clearFilters}
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

      {/* Mobile / tablet filter dialog */}
      <MarketingDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Filters'}
        returnFocusRef={filtersButtonRef}
        footer={
          <div className="flex items-center justify-between gap-3">
            {resetButton}
            <button type="button" onClick={() => setFiltersOpen(false)} className="mkt-btn mkt-btn-primary">
              Show {filtered.length} {filtered.length === 1 ? 'coach' : 'coaches'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {filterFields}
          {toggles}
        </div>
      </MarketingDialog>

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
