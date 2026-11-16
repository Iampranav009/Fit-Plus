import React, { useMemo, useState } from 'react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { CoachCard } from '../../components/ui/CoachCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSearchBar } from '../../components/ui/GlassSearchBar';

export const DiscoverPage: React.FC = () => {
  const { store } = useApp();
  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'in_person' | 'hybrid'>('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(5000);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    store.trainers.forEach((t) => t.specialties.forEach((s) => set.add(s)));
    return Array.from(set);
  }, [store.trainers]);

  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    store.trainers.forEach((t) => t.languages.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [store.trainers]);

  const filtered = useMemo(() => {
    return store.trainers.filter((trainer) => {
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${trainer.displayName} ${trainer.city} ${trainer.headline} ${trainer.specialties.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
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
      const pkgs = store.packages.filter((p) => p.trainerId === trainer.id && p.status === 'active');
      if (pkgs.length > 0) {
        const minP = Math.min(...pkgs.map((p) => p.priceInr));
        if (minP > maxPrice) return false;
      }
      return true;
    });
  }, [store.trainers, store.packages, query, specialtyFilter, modeFilter, languageFilter, maxPrice]);

  const clearFilters = () => {
    setQuery('');
    setSpecialtyFilter('all');
    setModeFilter('all');
    setLanguageFilter('all');
    setMaxPrice(5000);
  };

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <PublicTopBar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-medium text-[#FFB06B]">
            Fictional demo coach directory · Sample INR prices
          </p>
          <h1 className="mt-1 text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
            {COPY.discovery.heading}
          </h1>
          <p className="mt-2 text-[15px] text-[#A2A8B5]">{COPY.discovery.subheading}</p>
        </div>

        {/* Search & Filters */}
        <section
          aria-label="Filter coaches"
          className="mt-6 rounded-[24px] surface-card p-4 sm:p-5 flex flex-col gap-4"
        >
          <GlassSearchBar
            value={query}
            onChange={setQuery}
            placeholder={COPY.discovery.searchPlaceholder}
            ariaLabel={COPY.discovery.searchPlaceholder}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1.5 text-[12px] text-[#A2A8B5]">
              Speciality
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="min-h-[44px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7] focus:border-[#FF803E]"
              >
                <option value="all">All specialties</option>
                {allSpecialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] text-[#A2A8B5]">
              Coaching mode
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as typeof modeFilter)}
                className="min-h-[44px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7] focus:border-[#FF803E]"
              >
                <option value="all">Online & in person</option>
                <option value="online">Online only</option>
                <option value="hybrid">Hybrid (online + in person)</option>
                <option value="in_person">In person</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] text-[#A2A8B5]">
              Language
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="min-h-[44px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7] focus:border-[#FF803E]"
              >
                <option value="all">Any language</option>
                {allLanguages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] text-[#A2A8B5]">
              Starting price
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="min-h-[44px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7] focus:border-[#FF803E]"
              >
                <option value={5000}>Any budget</option>
                <option value={500}>Up to ₹500/mo</option>
                <option value={1000}>Up to ₹1,000/mo</option>
                <option value={2000}>Up to ₹2,000/mo</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between text-[13px] text-[#7C8393]">
            <span className="tabular-nums">
              Showing {filtered.length} of {store.trainers.length} demo coaches
            </span>
            <GlassButton variant="tertiary" size="sm" onClick={clearFilters}>
              {COPY.discovery.clearFilters}
            </GlassButton>
          </div>
        </section>

        {/* Results */}
        <section className="mt-6">
          {filtered.length === 0 ? (
            <EmptyState
              artwork="coach"
              title={COPY.discovery.emptyTitle}
              description="Try broadening your language, coaching mode, or budget filter."
              actionLabel={COPY.discovery.clearFilters}
              onAction={clearFilters}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((trainer) => (
                <CoachCard
                  key={trainer.id}
                  trainer={trainer}
                  packages={store.packages}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
