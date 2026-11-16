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
import { PublicTopBar } from '../../components/layout/PublicTopBar';
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
    () => (trainer ? findEligibleReviewRelationship(activeClient?.id, trainer.id, store.relationships) : undefined),
    [trainer, activeClient?.id, store.relationships],
  );

  const existingClientReview = useMemo(
    () =>
      activeClient && trainer
        ? trainerReviews.find((r) => r.clientId === activeClient.id)
        : undefined,
    [activeClient, trainer, trainerReviews],
  );

  const availableSlots = useMemo(() => {
    if (!trainer) return [];
    return store.consultationSlots.filter(
      (s) => s.trainerId === trainer.id && s.status === 'available',
    );
  }, [trainer, store.consultationSlots]);

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
      <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7]">
        <PublicTopBar />
        <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-[26px] font-semibold">Trainer profile not found</h1>
          <p className="text-[14px] text-[#A2A8B5]">
            This coach profile is unavailable or has not been published yet.
          </p>
          <GlassButton onClick={() => navigate('/discover')}>Find a trainer</GlassButton>
        </main>
      </div>
    );
  }

  const isCurrentCoach = activeCoach?.id === trainer.id;
  const isPendingRequest = Boolean(
    activeClient &&
      store.relationships.some(
        (r) =>
          r.clientId === activeClient.id &&
          r.trainerId === trainer.id &&
          r.status === 'pending',
      ),
  );
  const isVerifiedBadge =
    trainer.verificationStatus === 'verified' || (isDemoSandbox && trainer.isDemoVerified);

  const handleRequestCoaching = async () => {
    if (!activeClient) {
      navigate(`/auth?redirect=${encodeURIComponent(`/trainers/${trainer.slug}`)}`);
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
    if (!activeClient) {
      setCheckoutPkg(null);
      navigate(`/auth?redirect=${encodeURIComponent(`/trainers/${trainer.slug}`)}`);
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
    if (!activeClient) {
      setConsultOpen(false);
      navigate(`/auth?redirect=${encodeURIComponent(`/trainers/${trainer.slug}`)}`);
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

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      ) : null}
      <PublicTopBar />

      <main className="flex-1 max-w-[1080px] w-full mx-auto px-4 sm:px-6 py-6 pb-16">
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          All coaches
        </Link>

        {/* Cover & Profile Header */}
        <section className="rounded-[28px] surface-card overflow-hidden">
          <div className="relative">
            <MediaImage
              assetKey={trainer.coverKey}
              alt={`${trainer.displayName} training studio`}
              aspectClass="aspect-[16/9] max-h-[300px] w-full"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C2029] via-[#1C2029]/25 to-transparent" />
          </div>

          <div className="px-5 sm:px-8 pb-8 -mt-12 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                {trainer.photoUrl ? (
                  <img
                    src={trainer.photoUrl}
                    alt={trainer.displayName}
                    className="w-24 h-24 rounded-[20px] border-4 border-[#1C2029] object-cover shrink-0 bg-[#1C2029]"
                  />
                ) : (
                  <MediaImage
                    assetKey={trainer.avatarKey}
                    alt={trainer.displayName}
                    aspectClass="w-24 h-24 rounded-[20px] border-4 border-[#1C2029] shrink-0"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                      {trainer.displayName}
                    </h1>
                    {isVerifiedBadge ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#FFB06B]">
                        <BadgeCheck className="w-4 h-4" aria-hidden="true" />
                        {isDemoSandbox ? 'Demo verified' : 'Verified coach'}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#7C8393]">
                        {isDemoSandbox
                          ? 'Demo profile'
                          : trainer.verificationStatus === 'pending'
                            ? 'Verification pending'
                            : 'Independent coach'}
                      </span>
                    )}
                    {reviewStats.count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#FFB06B]">
                        <Star className="w-3.5 h-3.5 fill-[#FFB06B]" aria-hidden="true" />
                        {reviewStats.averageRating} ({reviewStats.count}{' '}
                        {reviewStats.count === 1 ? 'review' : 'reviews'})
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[14px] text-[#A2A8B5]">{trainer.headline}</p>
                  <p className="mt-1.5 text-[12px] text-[#7C8393] flex flex-wrap items-center gap-x-2 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      {trainer.city}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{trainer.experienceYears} years experience</span>
                    <span aria-hidden="true">·</span>
                    <span>{trainer.languages.join(', ')}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {!isCurrentCoach ? (
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    disabled={isPendingRequest || requestBusy}
                    onClick={() => void handleRequestCoaching()}
                  >
                    {isPendingRequest
                      ? 'Request pending'
                      : requestBusy
                        ? 'Sending...'
                        : 'Request coaching'}
                  </GlassButton>
                ) : null}
                <GlassButton
                  variant="glass"
                  size="sm"
                  onClick={() => setWhatsAppOpen(true)}
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  {isDemoSandbox ? 'WhatsApp (demo)' : 'Message on WhatsApp'}
                </GlassButton>
                <GlassButton
                  size="sm"
                  onClick={() => {
                    setSelectedSlotId(availableSlots[0]?.id || '');
                    setConsultOpen(true);
                  }}
                >
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Book consultation
                </GlassButton>
              </div>
            </div>

            {/* Bio & Coaching Style */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/[0.08]">
              <div>
                <h2 className="text-[17px] font-semibold text-[#F5F5F7]">About</h2>
                <p className="mt-2 text-[15px] text-[#A2A8B5] leading-relaxed">{trainer.bio}</p>
                {trainer.certifications && trainer.certifications.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {trainer.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="px-2.5 py-1 rounded-[8px] bg-[#252A35] border border-white/[0.08] text-[12px] text-[#A2A8B5]"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Coaching style</h2>
                <p className="mt-2 text-[15px] text-[#A2A8B5] leading-relaxed">
                  {trainer.coachingStyle}
                </p>
                <p className="mt-3 text-[13px] text-[#7C8393]">
                  Specialties: {trainer.specialties.join(' · ')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Coaching Packages */}
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <h2 className="text-[22px] font-semibold text-[#F5F5F7]">Coaching packages</h2>
              <p className="text-[13px] text-[#7C8393]">
                {isDemoSandbox
                  ? 'Example INR packages for demo preview · No real payment processed'
                  : 'Transparent INR packages · Instant enrollment via Cashfree Payments or free tier'}
              </p>
            </div>
            {isCurrentCoach ? (
              <span className="text-[13px] font-medium text-[#B8E66C]">
                Your active coach
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trainerPackages.map((pkg) => {
              const durationDays = computePackageDurationDays(pkg);
              const consultCount = pkg.consultationsIncluded ?? 2;
              return (
                <div
                  key={pkg.id}
                  className="rounded-[22px] surface-card p-5 flex flex-col justify-between gap-5"
                >
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#F5F5F7]">{pkg.name}</h3>
                    <p className="mt-2 text-[28px] font-semibold text-[#F5F5F7] tabular-nums">
                      {pkg.priceInr === 0 ? 'Free' : formatINR(pkg.priceInr)}
                      <span className="text-[14px] font-normal text-[#7C8393]">
                        {pkg.priceInr === 0
                          ? ` · ${durationDays}d`
                          : `/${pkg.cadence === 'monthly' ? 'month' : pkg.cadence === 'quarterly' ? 'quarter' : `${durationDays}d`}`}
                      </span>
                    </p>
                    <p className="mt-1 text-[12px] text-[#7C8393] tabular-nums">
                      {durationDays} days · {consultCount} check-in {consultCount === 1 ? 'call' : 'calls'} included
                    </p>
                    <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">{pkg.summary}</p>
                    <ul className="mt-4 space-y-2 text-[13px] text-[#A2A8B5]">
                      {pkg.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#FF803E] shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <GlassButton
                    fullWidth
                    variant={isCurrentCoach ? 'secondary' : 'primary'}
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
                          : `Enroll · ${formatINR(pkg.priceInr)}`}
                  </GlassButton>
                </div>
              );
            })}
          </div>
        </section>

        {/* Verified Client Reviews */}
        <section className="mt-8 rounded-[26px] surface-card p-5 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-semibold text-[#F5F5F7]">Verified client reviews</h2>
              <p className="text-[13px] text-[#A2A8B5]">
                Reviews come strictly from clients with a confirmed FitPlus coaching relationship.
              </p>
            </div>
            {reviewStats.count > 0 ? (
              <div className="flex items-center gap-2 rounded-[14px] bg-[#101218] border border-white/[0.08] px-3.5 py-2">
                <Star className="w-4 h-4 text-[#FFB06B] fill-[#FFB06B]" aria-hidden="true" />
                <span className="text-[16px] font-semibold text-[#F5F5F7] tabular-nums">
                  {reviewStats.averageRating}
                </span>
                <span className="text-[12px] text-[#7C8393]">({reviewStats.count})</span>
              </div>
            ) : null}
          </div>

          {trainerReviews.length === 0 ? (
            <p className="text-[14px] text-[#7C8393]">
              No reviews posted yet for {trainer.displayName}.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {trainerReviews.map((rev) => {
                const isOwn = activeClient && rev.clientId === activeClient.id;
                return (
                  <article
                    key={rev.id}
                    className="rounded-[18px] bg-[#101218] border border-white/[0.08] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-semibold text-[#F5F5F7]">{rev.authorName}</p>
                        <p className="text-[11px] text-[#7C8393]">
                          Verified client · {formatIndiaDate(rev.createdAt.slice(0, 10), 'short')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 text-[#FFB06B] text-[13px] font-semibold tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-[#FFB06B]" aria-hidden="true" />
                          {rev.rating}.0
                        </span>
                        {isOwn ? (
                          <button
                            type="button"
                            onClick={() => void deleteTrainerReview(rev.id)}
                            aria-label="Delete your review"
                            className="p-1.5 rounded-lg text-[#7C8393] hover:text-[#FF6B70] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[14px] text-[#A2A8B5] leading-relaxed">{rev.comment}</p>
                  </article>
                );
              })}
            </div>
          )}

          {eligibleRelationship ? (
            <form
              onSubmit={(e) => void handleReviewSubmit(e)}
              className="pt-4 border-t border-white/[0.08] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-[#F5F5F7]">
                  {existingClientReview ? 'Update your verified review' : `Share feedback on ${trainer.displayName}`}
                </p>
                <div className="flex items-center gap-1" role="group" aria-label="Rating out of 5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} out of 5`}
                      className="p-1.5 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= reviewRating
                            ? 'text-[#FFB06B] fill-[#FFB06B]'
                            : 'text-[#7C8393]'
                        }`}
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
              {reviewError ? <p className="text-[12px] text-[#FF6B70]">{reviewError}</p> : null}
              <GlassButton type="submit" size="sm" disabled={reviewBusy}>
                {reviewBusy
                  ? 'Saving…'
                  : existingClientReview
                    ? 'Update review'
                    : 'Publish verified review'}
              </GlassButton>
            </form>
          ) : null}
        </section>
      </main>

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
            : COPY.discovery.checkoutNotice
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

            {!activeClient ? (
              <p className="text-[13px] text-[#FFB06B]">
                Sign in with a FitPlus client account to enroll with {trainer.displayName}.
              </p>
            ) : null}

            {checkoutError ? (
              <div className="rounded-[14px] bg-[#FF6B70]/12 border border-[#FF6B70]/35 p-3.5 text-[13px] text-[#FFB5B8]">
                <p>{checkoutError}</p>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <GlassButton
                fullWidth
                disabled={checkoutBusy}
                onClick={() => void handleConfirmEnrollment()}
              >
                {!activeClient ? (
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
                {!activeClient
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
            {!activeClient ? (
              <GlassButton
                type="button"
                fullWidth
                onClick={() => {
                  setConsultOpen(false);
                  navigate(`/auth?redirect=${encodeURIComponent(`/trainers/${trainer.slug}`)}`);
                }}
              >
                Sign in to book
              </GlassButton>
            ) : (
              <GlassButton type="submit" fullWidth disabled={availableSlots.length === 0}>
                {COPY.discovery.confirmBooking}
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
    </div>
  );
};
