import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Check,
  CreditCard,
  MapPin,
  MessageCircle,
  Star,
  Trash2,
} from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { Package } from '../../types/domain';
import {
  computePackageDurationDays,
  computeReviewStats,
  findEligibleReviewRelationship,
} from '../../lib/commerce';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { launchCashfreeCheckout } from '../../lib/cashfree';
import { MarketingLayout } from '../../components/marketing/MarketingLayout';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { InputField, TextAreaField } from '../../components/ui/InputField';
import { WhatsAppSheet } from '../../components/ui/WhatsAppSheet';

export const TrainerPublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    store,
    activeUser,
    activeClient,
    activeCoach,
    reviews,
    isCloudSynced,
    isDemoSandbox,
    publicDirectory,
    enrollWithCoachPackage,
    requestCoachConnection,
    createPackageOrder,
    verifyPackageOrder,
    submitTrainerReview,
    deleteTrainerReview,
    bookSlot,
    pushToast,
  } = useApp();
  const navigate = useNavigate();

  // A plain public visit has neither a live session nor the demo sandbox. In that
  // case the local demo store still holds a sample client (Aarav) with an active
  // coach, which must not leak into the page as "Your active coach" etc.
  const hasSession = isCloudSynced || isDemoSandbox;
  const viewerClient = hasSession ? activeClient : undefined;
  const viewerCoach = hasSession ? activeCoach : undefined;

  const trainersSource = isCloudSynced || isDemoSandbox ? store.trainers : publicDirectory.trainers;
  const packagesSource = isCloudSynced || isDemoSandbox ? store.packages : publicDirectory.packages;

  const trainer = useMemo(
    () => trainersSource.find((t) => t.slug === slug),
    [trainersSource, slug],
  );

  const trainerPackages = useMemo(() => {
    if (!trainer) return [];
    return packagesSource.filter((p) => p.trainerId === trainer.id && p.status === 'active');
  }, [trainer, packagesSource]);

  const trainerReviews = useMemo(() => {
    if (!trainer) return [];
    return reviews.filter((r) => r.trainerId === trainer.id);
  }, [trainer, reviews]);

  const reviewStats = useMemo(() => computeReviewStats(trainerReviews), [trainerReviews]);

  const eligibleRelationship = useMemo(
    () => (trainer ? findEligibleReviewRelationship(viewerClient?.id, trainer.id, store.relationships) : undefined),
    [trainer, viewerClient?.id, store.relationships],
  );

  const existingClientReview = useMemo(
    () =>
      viewerClient && trainer
        ? trainerReviews.find((r) => r.clientId === viewerClient.id)
        : undefined,
    [viewerClient, trainer, trainerReviews],
  );

  const availableSlots = useMemo(() => {
    // Anonymous visitors must not see the local demo store's slots.
    if (!trainer || !hasSession) return [];
    return store.consultationSlots.filter(
      (s) => s.trainerId === trainer.id && s.status === 'available',
    );
  }, [trainer, hasSession, store.consultationSlots]);

  const [checkoutPkg, setCheckoutPkg] = useState<Package | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [consultOpen, setConsultOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [topic, setTopic] = useState('Goal discussion & routine fit');
  const [slotError, setSlotError] = useState('');
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);

  const [reviewRating, setReviewRating] = useState<number>(existingClientReview?.rating ?? 5);
  const [reviewComment, setReviewComment] = useState<string>(existingClientReview?.comment ?? '');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (existingClientReview) {
      setReviewRating(existingClientReview.rating);
      setReviewComment(existingClientReview.comment);
    }
  }, [existingClientReview]);

  useEffect(() => {
    if (!trainer) return;
    const prevTitle = document.title;
    document.title = `${trainer.displayName} — FitPlus Coach (${trainer.city})`;
    return () => {
      document.title = prevTitle;
    };
  }, [trainer]);

  const jsonLd = useMemo(() => {
    if (!trainer) return null;
    const base: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: trainer.displayName,
      description: trainer.headline || trainer.bio,
      areaServed: trainer.city,
      url: typeof window !== 'undefined' ? window.location.href : `https://fitplus-kappa.vercel.app/trainers/${trainer.slug}`,
    };
    if (reviewStats.count > 0) {
      base.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: reviewStats.averageRating,
        reviewCount: reviewStats.count,
      };
    }
    return JSON.stringify(base);
  }, [trainer, reviewStats]);

  if (!trainer) {
    return (
      <MarketingLayout>
        <div className="mkt-container max-w-xl py-20 text-center flex flex-col items-center gap-4">
          {!hasSession && !publicDirectory.loaded ? (
            <p className="mkt-body" role="status">
              Loading coach profile…
            </p>
          ) : (
            <>
              <h1 className="mkt-h2">Trainer profile not found</h1>
              <p className="mkt-body">This coach profile is unavailable or has not been published yet.</p>
            </>
          )}
          <Link to="/discover" className="mkt-btn mkt-btn-primary">
            Find a trainer
          </Link>
        </div>
      </MarketingLayout>
    );
  }

  const isCurrentCoach = viewerCoach?.id === trainer.id;
  const isPendingRequest = Boolean(
    viewerClient &&
      store.relationships.some(
        (r) =>
          r.clientId === viewerClient.id &&
          r.trainerId === trainer.id &&
          r.status === 'pending',
      ),
  );
  const isVerifiedBadge =
    trainer.verificationStatus === 'verified' || (isDemoSandbox && trainer.isDemoVerified);

  const modeLabel =
    trainer.coachingMode === 'hybrid'
      ? 'Online + in person'
      : trainer.coachingMode === 'in_person'
        ? 'In person'
        : 'Online';
  const lowestPkg = trainerPackages.reduce<Package | undefined>(
    (min, p) => (!min || p.priceInr < min.priceInr ? p : min),
    undefined,
  );
  const intervalLabel = (pkg: Package) =>
    pkg.cadence === 'monthly' ? 'month' : pkg.cadence === 'quarterly' ? 'quarter' : `${computePackageDurationDays(pkg)} days`;
  const signInPath = `/auth?redirect=${encodeURIComponent(`/trainers/${trainer.slug}`)}`;

  const handleRequestCoaching = async () => {
    if (!viewerClient) {
      navigate(signInPath);
      return;
    }
    setRequestBusy(true);
    try {
      await requestCoachConnection(trainer.id, trainerPackages[0]?.id);
    } finally {
      setRequestBusy(false);
    }
  };

  const handleConfirmEnrollment = async () => {
    if (!checkoutPkg) return;
    if (!viewerClient) {
      setCheckoutPkg(null);
      navigate(signInPath);
      return;
    }

    if (!isCloudSynced) {
      enrollWithCoachPackage(trainer.id, checkoutPkg);
      setCheckoutPkg(null);
      navigate('/app/coach');
      return;
    }

    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const orderRes = await createPackageOrder({
        trainerId: trainer.id,
        packageId: checkoutPkg.id,
      });

      if (!orderRes.ok) {
        setCheckoutError(orderRes.error || 'Could not start package checkout.');
        return;
      }

      if (orderRes.mode === 'free_enrolled') {
        pushToast(`Enrolled in ${checkoutPkg.name} (${orderRes.invoiceNumber || 'Free plan'}).`);
        setCheckoutPkg(null);
        navigate('/app/coach');
        return;
      }

      if (!orderRes.paymentSessionId || !orderRes.orderId) {
        setCheckoutError('Incomplete Cashfree session details from server.');
        return;
      }

      const cfRes = await launchCashfreeCheckout({
        paymentSessionId: orderRes.paymentSessionId,
        mode: orderRes.cashfreeEnv,
      });

      if (!cfRes.ok) {
        setCheckoutError('error' in cfRes ? cfRes.error : 'Unable to start Cashfree checkout.');
        return;
      }
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerClient) {
      setConsultOpen(false);
      navigate(signInPath);
      return;
    }
    if (!selectedSlotId) {
      setSlotError('Select an available consultation time.');
      return;
    }
    const res = bookSlot(selectedSlotId, topic);
    if (!res.ok) {
      setSlotError(res.error || COPY.discovery.slotConflict);
      return;
    }
    setSlotError('');
    setConsultOpen(false);
    navigate('/app/consultations');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewBusy(true);
    try {
      const res = await submitTrainerReview({
        trainerId: trainer.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      if (!res.ok) {
        setReviewError(res.error || 'Could not publish review.');
      }
    } finally {
      setReviewBusy(false);
    }
  };

  const facts: Array<[string, React.ReactNode]> = [
    ['Location & mode', `${trainer.city} · ${modeLabel}`],
    ['Languages', trainer.languages.join(', ') || '—'],
    ['Experience', `${trainer.experienceYears} years`],
    [
      isDemoSandbox ? 'Sample price from' : 'Packages from',
      lowestPkg ? (
        <>
          {lowestPkg.priceInr === 0 ? 'Free' : formatINR(lowestPkg.priceInr)}
          {lowestPkg.priceInr === 0 ? '' : ` / ${intervalLabel(lowestPkg)}`}
        </>
      ) : (
        'No packages yet'
      ),
    ],
  ];

  return (
    <MarketingLayout>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      ) : null}

      <div className="mkt-container max-w-[1120px] pt-4 pb-20">
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-[0.9375rem] text-[#ABA59D] hover:text-[#F3EEE7] min-h-[44px] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          All coaches
        </Link>

        {isDemoSandbox ? (
          <p className="mt-2 rounded-[14px] border border-[#FF803E]/30 bg-[#FF803E]/[0.07] px-4 py-3 text-[0.875rem] text-[#F3EEE7]">
            <span className="font-semibold">Sample profile in the demo.</span>{' '}
            <span className="text-[#ABA59D]">
              Verification, reviews, consultation slots, WhatsApp and package prices are examples. Nothing is charged.
            </span>
          </p>
        ) : null}

        {/* Identity */}
        <section aria-labelledby="coach-name" className="mt-4 rounded-[28px] mkt-matte overflow-hidden">
          <div className="mkt-media aspect-[16/7] sm:aspect-[16/5]">
            <MediaImage
              assetKey={trainer.coverKey}
              alt={`${trainer.displayName} training studio`}
              aspectClass="w-full h-full"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111114] via-[#111114]/30 to-transparent" />
          </div>

          <div className="px-5 sm:px-8 pb-7 -mt-14 sm:-mt-16 relative">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                {trainer.photoUrl ? (
                  <img
                    src={trainer.photoUrl}
                    alt=""
                    className="w-24 h-24 rounded-[22px] border-4 border-[#111114] object-cover shrink-0 bg-[#1E1E23]"
                  />
                ) : (
                  <MediaImage
                    assetKey={trainer.avatarKey}
                    alt=""
                    aspectClass="w-24 h-24 rounded-[22px] border-4 border-[#111114] shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h1 id="coach-name" className="mkt-display text-[clamp(2rem,1.6rem+1.8vw,2.75rem)] leading-none">
                    {trainer.displayName}
                  </h1>
                  <p className="mt-2 text-[1rem] text-[#F3EEE7]">{trainer.headline}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {isVerifiedBadge ? (
                      <span className={`mkt-chip ${isDemoSandbox ? 'mkt-chip-sample' : ''}`}>
                        <BadgeCheck className="w-3.5 h-3.5 text-[#FF803E]" aria-hidden="true" />
                        {isDemoSandbox ? 'Demo verified (sample)' : 'Verified coach'}
                      </span>
                    ) : (
                      <span className="mkt-chip">
                        {isDemoSandbox
                          ? 'Demo profile'
                          : trainer.verificationStatus === 'pending'
                            ? 'Verification pending'
                            : 'Independent coach'}
                      </span>
                    )}
                    {reviewStats.count > 0 ? (
                      <span className="mkt-chip">
                        <Star className="w-3.5 h-3.5 fill-[#FFC08F] text-[#FFC08F]" aria-hidden="true" />
                        {reviewStats.averageRating} · {reviewStats.count}{' '}
                        {reviewStats.count === 1 ? 'review' : 'reviews'}
                        {isDemoSandbox ? ' (sample)' : ''}
                      </span>
                    ) : null}
                    {isCurrentCoach ? (
                      <span className="mkt-chip !text-[#B8E66C] !border-[#B8E66C]/30">
                        {isDemoSandbox ? 'Your coach in this demo' : 'Your active coach'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:items-end shrink-0">
                <div className="flex flex-wrap gap-2.5">
                  {!isCurrentCoach ? (
                    <button
                      type="button"
                      className="mkt-btn mkt-btn-primary disabled:opacity-50"
                      disabled={isPendingRequest || requestBusy}
                      onClick={() => void handleRequestCoaching()}
                    >
                      {isPendingRequest ? 'Request pending' : requestBusy ? 'Sending…' : 'Request coaching'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`mkt-btn ${isCurrentCoach ? 'mkt-btn-primary' : 'mkt-btn-secondary'}`}
                    onClick={() => {
                      setSelectedSlotId(availableSlots[0]?.id || '');
                      setConsultOpen(true);
                    }}
                  >
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    {isDemoSandbox ? 'Book consultation (demo)' : 'Book consultation'}
                  </button>
                  <button type="button" className="mkt-btn mkt-btn-secondary" onClick={() => setWhatsAppOpen(true)}>
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    {isDemoSandbox ? 'WhatsApp (demo)' : 'WhatsApp'}
                  </button>
                </div>
                {!viewerClient ? (
                  <p className="mkt-small lg:text-right">Requesting or booking asks you to sign in with a client account first.</p>
                ) : null}
              </div>
            </div>

            <dl className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-[18px] overflow-hidden bg-white/[0.08] border border-white/[0.08]">
              {facts.map(([label, value]) => (
                <div key={label} className="bg-[#111114] px-4 py-3.5">
                  <dt className="text-[0.75rem] text-[#ABA59D]">{label}</dt>
                  <dd className="mt-0.5 text-[0.9375rem] font-semibold text-[#F3EEE7] tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            {/* Coaching fit */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-[1.125rem] font-semibold text-[#F3EEE7]">About</h2>
                <p className="mt-2 mkt-body max-w-[60ch]">{trainer.bio}</p>
                {trainer.certifications && trainer.certifications.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Certifications">
                    {trainer.certifications.map((cert) => (
                      <li key={cert} className="mkt-chip">
                        {cert}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <h2 className="text-[1.125rem] font-semibold text-[#F3EEE7]">Coaching style & fit</h2>
                <p className="mt-2 mkt-body max-w-[60ch]">{trainer.coachingStyle}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Specialties">
                  {trainer.specialties.map((sp) => (
                    <li key={sp} className="mkt-chip !text-[#F3EEE7]">
                      {sp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Coaching packages */}
        <section aria-labelledby="packages-title" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
            <div>
              <h2 id="packages-title" className="mkt-h3">
                Coaching packages
              </h2>
              <p className="mt-1 text-[0.875rem] text-[#ABA59D]">
                {isDemoSandbox
                  ? 'Example INR packages for the demo · No real payment is processed'
                  : 'Prices in INR · Paid packages check out through Cashfree Payments; free tiers activate instantly'}
              </p>
            </div>
          </div>

          {trainerPackages.length === 0 ? (
            <p className="rounded-[18px] mkt-matte p-5 mkt-body">
              {trainer.displayName} hasn’t published packages yet. Request coaching or book a consultation to discuss options.
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trainerPackages.map((pkg) => {
                const durationDays = computePackageDurationDays(pkg);
                const consultCount = pkg.consultationsIncluded ?? 2;
                return (
                  <li key={pkg.id} className="rounded-[22px] mkt-matte p-5 flex flex-col justify-between gap-5">
                    <div>
                      <h3 className="text-[1.125rem] font-semibold text-[#F3EEE7]">{pkg.name}</h3>
                      <p className="mt-3 tabular-nums">
                        <span className="mkt-display text-[2.25rem] leading-none">
                          {pkg.priceInr === 0 ? 'Free' : formatINR(pkg.priceInr)}
                        </span>
                        {pkg.priceInr === 0 ? null : (
                          <span className="ml-1 text-[0.9375rem] text-[#ABA59D]">/ {intervalLabel(pkg)}</span>
                        )}
                        {isDemoSandbox ? <span className="ml-2 mkt-chip mkt-chip-sample align-middle">Example</span> : null}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.8125rem]">
                        <div className="rounded-[12px] bg-white/[0.04] px-3 py-2">
                          <dt className="text-[#ABA59D]">Length</dt>
                          <dd className="text-[#F3EEE7] font-medium tabular-nums">{durationDays} days</dd>
                        </div>
                        <div className="rounded-[12px] bg-white/[0.04] px-3 py-2">
                          <dt className="text-[#ABA59D]">Check-in calls</dt>
                          <dd className="text-[#F3EEE7] font-medium tabular-nums">{consultCount} included</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-[0.9375rem] text-[#ABA59D] leading-relaxed">{pkg.summary}</p>
                      <ul className="mt-4 space-y-2 text-[0.875rem] text-[#ABA59D]">
                        {pkg.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-[#FF803E] shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className={`mkt-btn w-full ${isCurrentCoach ? 'mkt-btn-secondary' : 'mkt-btn-primary'}`}
                      onClick={() => {
                        setCheckoutError('');
                        setCheckoutPkg(pkg);
                      }}
                    >
                      {isCurrentCoach
                        ? 'Switch package'
                        : isDemoSandbox
                          ? 'Select package (demo)'
                          : pkg.priceInr === 0
                            ? 'Start free plan'
                            : `Enrol · ${formatINR(pkg.priceInr)}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Client reviews */}
        <section aria-labelledby="reviews-title" className="mt-10 rounded-[26px] mkt-matte p-5 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="reviews-title" className="mkt-h3">
                {isDemoSandbox ? 'Client reviews (sample)' : 'Verified client reviews'}
              </h2>
              <p className="mt-1 text-[0.875rem] text-[#ABA59D]">
                {isDemoSandbox
                  ? 'Example reviews for the demo. On live profiles, only clients with a confirmed FitPlus coaching relationship can review.'
                  : 'Reviews come strictly from clients with a confirmed FitPlus coaching relationship.'}
              </p>
            </div>
            {reviewStats.count > 0 ? (
              <div className="flex items-center gap-2 rounded-full bg-[#080808] border border-white/[0.1] px-4 py-2">
                <Star className="w-4 h-4 text-[#FFC08F] fill-[#FFC08F]" aria-hidden="true" />
                <span className="text-[1rem] font-semibold text-[#F3EEE7] tabular-nums">{reviewStats.averageRating}</span>
                <span className="text-[0.8125rem] text-[#ABA59D]">({reviewStats.count})</span>
              </div>
            ) : null}
          </div>

          {trainerReviews.length === 0 ? (
            <p className="text-[0.9375rem] text-[#ABA59D]">No reviews posted yet for {trainer.displayName}.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {trainerReviews.map((rev) => {
                const isOwn = viewerClient && rev.clientId === viewerClient.id;
                return (
                  <li key={rev.id} className="rounded-[18px] bg-[#080808] border border-white/[0.08] p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[0.9375rem] font-semibold text-[#F3EEE7]">{rev.authorName}</p>
                        <p className="text-[0.75rem] text-[#ABA59D]">
                          {isDemoSandbox ? 'Sample review' : 'Verified client'} ·{' '}
                          {formatIndiaDate(rev.createdAt.slice(0, 10), 'short')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 text-[#FFC08F] text-[0.875rem] font-semibold tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-[#FFC08F]" aria-hidden="true" />
                          {rev.rating}.0
                          <span className="sr-only"> out of 5</span>
                        </span>
                        {isOwn ? (
                          <button
                            type="button"
                            onClick={() => void deleteTrainerReview(rev.id)}
                            aria-label="Delete your review"
                            className="w-10 h-10 inline-flex items-center justify-center rounded-full text-[#ABA59D] hover:text-[#FF6B70] hover:bg-white/5 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[0.9375rem] text-[#ABA59D] leading-relaxed">{rev.comment}</p>
                  </li>
                );
              })}
            </ul>
          )}

          {eligibleRelationship ? (
            <form onSubmit={(e) => void handleReviewSubmit(e)} className="pt-4 border-t border-white/[0.08] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.9375rem] font-semibold text-[#F3EEE7]">
                  {existingClientReview ? 'Update your verified review' : `Share feedback on ${trainer.displayName}`}
                </p>
                <div className="flex items-center gap-1" role="group" aria-label="Rating out of 5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} out of 5`}
                      aria-pressed={star === reviewRating}
                      className="w-10 h-10 inline-flex items-center justify-center cursor-pointer rounded-full"
                    >
                      <Star
                        className={`w-5 h-5 ${star <= reviewRating ? 'text-[#FFC08F] fill-[#FFC08F]' : 'text-[#8E8880]'}`}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <TextAreaField
                label="Your experience"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={2}
                placeholder="How has coaching structure, adherence, and support felt?"
              />
              {reviewError ? <p className="text-[0.8125rem] text-[#FF6B70]">{reviewError}</p> : null}
              <button type="submit" className="mkt-btn mkt-btn-primary mkt-btn-sm" disabled={reviewBusy}>
                {reviewBusy ? 'Saving…' : existingClientReview ? 'Update review' : 'Publish verified review'}
              </button>
            </form>
          ) : null}
        </section>
      </div>

      {/* Enrollment & Cashfree Checkout Sheet */}
      <GlassSheet
        open={Boolean(checkoutPkg)}
        onClose={() => !checkoutBusy && setCheckoutPkg(null)}
        title={isCloudSynced ? 'Coaching enrollment & checkout' : COPY.discovery.checkoutTitle}
        description={
          isCloudSynced
            ? checkoutPkg?.priceInr === 0
              ? 'Activate your free coaching tier immediately.'
              : 'Secure INR payment processed via Cashfree Payments. Your coaching workspace activates upon verification.'
            : isDemoSandbox
              ? COPY.discovery.checkoutNotice
              : 'Sign in with a FitPlus client account to enrol.'
        }
      >
        {checkoutPkg ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-[16px] surface-elevated p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[16px] font-semibold text-[#F5F5F7]">{checkoutPkg.name}</span>
                <span className="text-[16px] font-semibold text-[#FF803E] tabular-nums">
                  {checkoutPkg.priceInr === 0 ? 'Free' : formatINR(checkoutPkg.priceInr)}
                </span>
              </div>
              <p className="text-[13px] text-[#A2A8B5]">
                Coach: {trainer.displayName} · {computePackageDurationDays(checkoutPkg)} days
              </p>
              <p className="text-[13px] text-[#A2A8B5]">{checkoutPkg.summary}</p>
            </div>

            {!viewerClient ? (
              <p className="text-[13px] text-[#FFB06B]">
                Sign in with a FitPlus client account to enroll with {trainer.displayName}.
              </p>
            ) : null}

            {checkoutError ? (
              <div className="rounded-[14px] bg-[#FF6B70]/12 border border-[#FF6B70]/35 p-3.5 text-[13px] text-[#FFB5B8]">
                <p>{checkoutError}</p>
              </div>
            ) : null}

            <div className="flex gap-2.5">
              <GlassButton
                fullWidth
                disabled={checkoutBusy}
                onClick={() => void handleConfirmEnrollment()}
              >
                {!viewerClient ? (
                  'Sign in & enroll'
                ) : checkoutBusy ? (
                  'Opening Cashfree checkout…'
                ) : isCloudSynced ? (
                  checkoutPkg.priceInr === 0 ? (
                    'Activate free plan'
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" aria-hidden="true" />
                      Pay {formatINR(checkoutPkg.priceInr)} with Cashfree
                    </>
                  )
                ) : (
                  COPY.discovery.confirmEnrollment
                )}
              </GlassButton>
              <GlassButton
                variant="secondary"
                fullWidth
                disabled={checkoutBusy}
                onClick={() => setCheckoutPkg(null)}
              >
                Cancel
              </GlassButton>
            </div>
          </div>
        ) : null}
      </GlassSheet>

      {/* Consultation Slot Sheet */}
      <GlassSheet
        open={consultOpen}
        onClose={() => setConsultOpen(false)}
        title={COPY.discovery.consultTitle}
        description={formatCopy(COPY.discovery.bookingTimezone, {
          timezone: activeUser.timezone,
        })}
      >
        <form onSubmit={handleConfirmBooking} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-[#F5F5F7]">Select a time</p>
            {availableSlots.length === 0 ? (
              <p className="text-[14px] text-[#A2A8B5]">
                {!viewerClient
                  ? 'Sign in as a client to view and book live consultation slots.'
                  : 'No open consultation slots right now.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableSlots.map((slot) => {
                  const selected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      aria-pressed={selected}
                      className={`text-left rounded-[14px] p-3.5 border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#FF803E]/12 border-[#FF803E]'
                          : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <p className="text-[14px] font-semibold text-[#F5F5F7] tabular-nums">
                        {formatIndiaDate(slot.dateKey, 'short')}
                      </p>
                      <p className="text-[13px] text-[#A2A8B5] tabular-nums mt-0.5">
                        {slot.startTime}–{slot.endTime} · {slot.mode === 'in_person' ? 'In person' : 'Online'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <InputField
            label="Discussion topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Fat loss plan & home meals"
          />

          {slotError ? (
            <p role="alert" className="text-[13px] text-[#FF6B70]">
              {slotError}
            </p>
          ) : null}

          <div className="flex gap-2.5 pt-1">
            <GlassButton type="button" variant="secondary" fullWidth onClick={() => setConsultOpen(false)}>
              Cancel
            </GlassButton>
            {!viewerClient ? (
              <GlassButton
                type="button"
                fullWidth
                onClick={() => {
                  setConsultOpen(false);
                  navigate(signInPath);
                }}
              >
                Sign in to book
              </GlassButton>
            ) : (
              <GlassButton type="submit" fullWidth disabled={availableSlots.length === 0}>
                {isDemoSandbox ? COPY.discovery.confirmBooking : 'Confirm booking'}
              </GlassButton>
            )}
          </div>
        </form>
      </GlassSheet>

      <WhatsAppSheet
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        coachName={trainer.displayName}
        whatsappE164={trainer.whatsappBusinessE164}
        isDemoSandbox={isDemoSandbox}
      />
    </MarketingLayout>
  );
};
