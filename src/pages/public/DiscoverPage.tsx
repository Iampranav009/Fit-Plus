import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { CoachCard } from '../../components/ui/CoachCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSearchBar } from '../../components/ui/GlassSearchBar';

export const DiscoverPage: React.FC = () => {
  const { store, reviews, isCloudSynced, isDemoSandbox, publicDirectory } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'in_person' | 'hybrid'>('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

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
  };

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <label className="flex flex-col gap-1.5 text-[12px] text-[#A2A8B5]">
              City
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="min-h-[44px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7] focus:border-[#FF803E]"
              >
                <option value="all">All cities</option>
                {allCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

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
                <option value={10000}>Any budget</option>
                <option value={1000}>Up to ₹1,000/mo</option>
                <option value={2500}>Up to ₹2,500/mo</option>
                <option value={5000}>Up to ₹5,000/mo</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#7C8393]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="tabular-nums">
                Showing {filtered.length} of {trainersSource.length}{' '}
                {isDemoSandbox ? 'demo coaches' : 'coaches'}
              </span>
              <button
                type="button"
                aria-pressed={verifiedOnly}
                onClick={() => setVerifiedOnly((v) => !v)}
                className={`min-h-[36px] px-3 py-1 rounded-[10px] border text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  verifiedOnly
                    ? 'bg-[#FF803E]/15 border-[#FF803E] text-[#FF803E]'
                    : 'bg-[#101218] border-white/[0.1] text-[#A2A8B5] hover:border-white/25'
                }`}
              >
                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Verified coaches only
              </button>
            </div>
            <GlassButton variant="tertiary" size="sm" onClick={clearFilters}>
              {COPY.discovery.clearFilters}
            </GlassButton>
          </div>
        </section>

        {/* Results */}
        <section className="mt-6">
          {!isCloudSynced && !isDemoSandbox && !publicDirectory.loaded ? (
            <div className="rounded-[24px] surface-card p-8 text-center text-[15px] text-[#A2A8B5]">
              Loading published coaches…
            </div>
          ) : trainersSource.length === 0 ? (
            <div className="rounded-[24px] surface-card p-8 text-center flex flex-col items-center gap-4">
              <h2 className="text-[22px] font-semibold text-[#F5F5F7]">No published coaches yet</h2>
              <p className="text-[14px] text-[#A2A8B5] max-w-md">
                Be one of the first independent coaches on FitPlus, or explore the interactive demo directory.
              </p>
              <div className="flex flex-wrap gap-3">
                <GlassButton onClick={() => navigate('/auth')}>Set up your Trainer Studio</GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={() => navigate('/demo')}
                >
                  Open interactive demo
                </GlassButton>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              artwork="coach"
              title={COPY.discovery.emptyTitle}
              description="Try broadening your city, verification, language, or budget filter."
              actionLabel={COPY.discovery.clearFilters}
              onAction={clearFilters}
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
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
