import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SEOHelmet } from '../../components/seo/SEOHelmet';
import { BadgeCheck, CalendarX2, CheckCircle2, CreditCard, Lock } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { PublicInviteResolveResult } from '../../data/supabaseService';
import { validateInvite } from '../../lib/engines';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { launchCashfreeCheckout } from '../../lib/cashfree';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

export const InvitePage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const {
    store,
    todayKey,
    activeUser,
    activeClient,
    firebaseUser,
    isEmailVerified,
    isCloudSynced,
    isDemoSandbox,
    publicDirectory,
    setPendingInviteToken,
    acceptDemoInviteAndPackage,
    createPackageOrder,
    rejectInvite,
    lookupInviteToken,
    pushToast,
  } = useApp();
  const navigate = useNavigate();
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [resolved, setResolved] = useState<PublicInviteResolveResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!token) {
      setResolved({ source: 'client_fallback', state: 'not_found' });
      setLoading(false);
      return;
    }
    void lookupInviteToken(token)
      .then((res) => {
        if (active) setResolved(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, lookupInviteToken]);

  const mergedInvites = useMemo(() => {
    if (resolved?.invite && !store.invites.some((i) => i.id === resolved.invite!.id)) {
      return [resolved.invite, ...store.invites];
    }
    return store.invites;
  }, [resolved?.invite, store.invites]);

  const validation = useMemo(() => {
    if (resolved?.state === 'unverified_server' && mergedInvites.every((i) => i.token.toUpperCase() !== token.toUpperCase())) {
      return { state: 'unverified_server' as const };
    }
    return validateInvite(token, mergedInvites, todayKey);
  }, [resolved?.state, mergedInvites, token, todayKey]);

  const trainer = useMemo(() => {
    if (validation.state !== 'valid') return undefined;
    return (
      resolved?.trainer ??
      store.trainers.find((t) => t.id === validation.invite.trainerId) ??
      publicDirectory.trainers.find((t) => t.id === validation.invite.trainerId)
    );
  }, [validation, resolved?.trainer, store.trainers, publicDirectory.trainers]);

  const trainerPackages = useMemo(() => {
    if (!trainer) return [];
    if (resolved?.packages && resolved.packages.length > 0) return resolved.packages;
    const fromStore = store.packages.filter((p) => p.trainerId === trainer.id && p.status === 'active');
    if (fromStore.length > 0) return fromStore;
    return publicDirectory.packages.filter((p) => p.trainerId === trainer.id && p.status === 'active');
  }, [trainer, resolved?.packages, store.packages, publicDirectory.packages]);

  const activePackage = useMemo(() => {
    if (selectedPkgId) {
      return trainerPackages.find((p) => p.id === selectedPkgId) ?? trainerPackages[0];
    }
    if (validation.state === 'valid' && validation.invite.suggestedPackageId) {
      return (
        trainerPackages.find((p) => p.id === validation.invite.suggestedPackageId) ??
        trainerPackages[0]
      );
    }
    return trainerPackages[0];
  }, [selectedPkgId, validation, trainerPackages]);

  const handleReviewAndContinue = () => {
    setPendingInviteToken(token);
    if (firebaseUser && isEmailVerified) {
      navigate('/onboarding/client/basics');
    } else if (isDemoSandbox) {
      navigate('/onboarding/client/basics');
    } else {
      navigate(`/auth?redirect=${encodeURIComponent(`/join/${token}`)}`);
    }
  };

  const handleAcceptNow = async () => {
    if (!activePackage || !trainer) return;
    if (!isCloudSynced) {
      acceptDemoInviteAndPackage(token, activePackage);
      navigate('/app/coach');
      return;
    }

    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const inviteId = validation.state === 'valid' ? validation.invite.id : undefined;
      const orderRes = await createPackageOrder({
        trainerId: trainer.id,
        packageId: activePackage.id,
        inviteId,
      });

      if (!orderRes.ok) {
        setCheckoutError(orderRes.error || 'Unable to start enrollment.');
        return;
      }

      if (orderRes.mode === 'free_enrolled') {
        pushToast(`Connected with ${trainer.displayName} (${orderRes.invoiceNumber || 'Free tier'}).`);
        navigate('/app/coach');
        return;
      }

      if (!orderRes.paymentSessionId || !orderRes.orderId) {
        setCheckoutError('Incomplete Cashfree order details from server.');
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

  const handleDecline = () => {
    rejectInvite(token);
    navigate('/discover');
  };

  const isVerifiedBadge =
    trainer?.verificationStatus === 'verified' || (isDemoSandbox && trainer?.isDemoVerified);

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <SEOHelmet
        title="Accept invitation — FitPlus"
        description="Join your trainer on FitPlus."
        path={`/join/${token}`}
        noindex
      />
      <PublicTopBar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10">
        {loading ? (
          <div className="rounded-[28px] surface-card p-8 text-center text-[15px] text-[#A2A8B5]">
            Checking invitation {token.toUpperCase()}…
          </div>
        ) : validation.state === 'unverified_server' ? (
          <div className="rounded-[28px] surface-card p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#252A35] border border-white/[0.1] flex items-center justify-center text-[#FF803E]">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-[26px] font-semibold text-[#F5F5F7]">
              Sign in to open invitation {token.toUpperCase()}
            </h1>
            <p className="text-[15px] text-[#A2A8B5] max-w-md">
              This coaching invitation is protected. Sign in or create a verified FitPlus account to review your coach&apos;s plan and accept.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <GlassButton
                onClick={() => {
                  setPendingInviteToken(token);
                  navigate(`/auth?redirect=${encodeURIComponent(`/join/${token}`)}`);
                }}
              >
                Sign in & review invite
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => navigate('/discover')}>
                Browse coaches
              </GlassButton>
            </div>
          </div>
        ) : validation.state !== 'valid' || !trainer ? (
          <div className="rounded-[28px] surface-card p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#252A35] border border-white/[0.1] flex items-center justify-center text-[#F5C25C]">
              <CalendarX2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-[26px] font-semibold text-[#F5F5F7]">
              {COPY.public.invalidInviteTitle}
            </h1>
            <p className="text-[15px] text-[#A2A8B5] max-w-md">
              {validation.state === 'expired'
                ? 'This invitation link has expired.'
                : validation.state === 'redeemed'
                  ? 'This invitation has already been redeemed.'
                  : validation.state === 'revoked'
                    ? 'This invitation was revoked by the coach.'
                    : 'No matching invitation token was found.'}{' '}
              {COPY.public.invalidInviteBody}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <GlassButton onClick={() => navigate('/discover')}>
                {COPY.public.findTrainer}
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => navigate('/demo')}>
                Explore interactive demo
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] surface-card overflow-hidden">
            <div className="relative h-44">
              <MediaImage
                assetKey={trainer.coverKey}
                alt={`${trainer.displayName}'s studio`}
                aspectClass="h-44 w-full"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C2029] via-[#1C2029]/35 to-transparent" />
            </div>

            <div className="px-6 pb-8 -mt-10 relative flex flex-col gap-6">
              <div className="flex items-end gap-4">
                <MediaImage
                  assetKey={trainer.avatarKey}
                  alt={trainer.displayName}
                  aspectClass="w-20 h-20 rounded-[18px] border-2 border-[#1C2029] shrink-0"
                />
                <div className="pb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] text-[#FFB06B]">Coaching invitation</span>
                    {isVerifiedBadge ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#A2A8B5]">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#FFB06B]" aria-hidden="true" />
                        {isCloudSynced ? 'Verified coach' : 'Demo verified'}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                    {formatCopy(COPY.public.inviteHeadline, { coachName: trainer.displayName })}
                  </h1>
                </div>
              </div>

              <p className="text-[15px] text-[#A2A8B5] leading-relaxed">
                {COPY.public.inviteSupport} Invite token{' '}
                <span className="text-[#F5F5F7] font-medium tabular-nums">
                  {validation.invite.token}
                </span>{' '}
                expires {formatIndiaDate(validation.invite.expiresAt.slice(0, 10), 'short')}.
              </p>

              <div className="rounded-[18px] surface-elevated p-4">
                <p className="text-[12px] text-[#7C8393]">Coach summary</p>
                <p className="mt-1 text-[15px] font-medium text-[#F5F5F7]">{trainer.headline}</p>
                <p className="mt-1 text-[13px] text-[#A2A8B5]">
                  {trainer.city} · {trainer.languages.join(', ')} · {trainer.experienceYears} years experience
                </p>
              </div>

              {trainerPackages.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <h2 className="text-[16px] font-semibold text-[#F5F5F7]">
                    Select a coaching package
                  </h2>
                  <div className="grid gap-2.5">
                    {trainerPackages.map((pkg) => {
                      const isSelected = activePackage?.id === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => {
                            setCheckoutError('');
                            setSelectedPkgId(pkg.id);
                          }}
                          aria-pressed={isSelected}
                          className={`text-left rounded-[16px] p-4 border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#FF803E]/12 border-[#FF803E]'
                              : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[15px] font-semibold text-[#F5F5F7] flex items-center gap-2">
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                              ) : null}
                              {pkg.name}
                            </span>
                            <span className="text-[15px] font-semibold text-[#F5F5F7] tabular-nums">
                              {pkg.priceInr === 0 ? 'Free' : `${formatINR(pkg.priceInr)}/mo`}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] text-[#A2A8B5]">{pkg.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[12px] text-[#7C8393]">
                    {isCloudSynced
                      ? activePackage?.priceInr === 0
                        ? `Accepting activates your coaching relationship with ${trainer.displayName}.`
                        : `Paid packages are processed via Cashfree Payments before activating your coaching workspace.`
                      : `${COPY.discovery.checkoutNotice} Accepting explicitly connects you to ${trainer.displayName} in this local demo.`}
                  </p>
                </div>
              ) : null}

              {checkoutError ? (
                <p className="rounded-[12px] bg-[#FF6B70]/12 border border-[#FF6B70]/35 px-3.5 py-2.5 text-[13px] text-[#FFB5B8]">
                  {checkoutError}
                </p>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {activeClient ? (
                  <GlassButton
                    fullWidth
                    onClick={() => void handleAcceptNow()}
                    disabled={!activePackage || checkoutBusy}
                  >
                    {checkoutBusy ? (
                      'Processing…'
                    ) : isCloudSynced ? (
                      activePackage && activePackage.priceInr > 0 ? (
                        <>
                          <CreditCard className="w-4 h-4" aria-hidden="true" />
                          Accept & pay {formatINR(activePackage.priceInr)}
                        </>
                      ) : (
                        'Accept & connect with coach'
                      )
                    ) : (
                      'Accept & confirm demo enrollment'
                    )}
                  </GlassButton>
                ) : (
                  <GlassButton fullWidth onClick={handleReviewAndContinue}>
                    {firebaseUser && isEmailVerified
                      ? COPY.public.reviewInvitation
                      : 'Sign in to accept invitation'}
                  </GlassButton>
                )}
                <GlassButton variant="secondary" fullWidth onClick={handleDecline} disabled={checkoutBusy}>
                  {COPY.public.notNow}
                </GlassButton>
              </div>

              {!activeClient && !firebaseUser ? (
                <p className="text-[12px] text-[#7C8393] text-center">
                  Already have a FitPlus account?{' '}
                  <Link
                    to={`/auth?redirect=${encodeURIComponent(`/join/${token}`)}`}
                    onClick={() => setPendingInviteToken(token)}
                    className="text-[#FFB06B] underline underline-offset-4"
                  >
                    Sign in here
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
