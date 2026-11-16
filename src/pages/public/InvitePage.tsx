import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, CalendarX2, CheckCircle2 } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { validateInvite } from '../../lib/engines';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

export const InvitePage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const {
    store,
    todayKey,
    activeClient,
    setPendingInviteToken,
    acceptDemoInviteAndPackage,
    rejectInvite,
    lookupInviteToken,
  } = useApp();
  const navigate = useNavigate();
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');

  useEffect(() => {
    if (token) {
      void lookupInviteToken(token);
    }
  }, [token, lookupInviteToken]);

  const validation = useMemo(
    () => validateInvite(token, store.invites, todayKey),
    [token, store.invites, todayKey],
  );

  const trainer = useMemo(() => {
    if (validation.state !== 'valid') return undefined;
    return store.trainers.find((t) => t.id === validation.invite.trainerId);
  }, [validation, store.trainers]);

  const trainerPackages = useMemo(() => {
    if (!trainer) return [];
    return store.packages.filter((p) => p.trainerId === trainer.id && p.status === 'active');
  }, [trainer, store.packages]);

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
    navigate('/onboarding/client/basics');
  };

  const handleAcceptNow = () => {
    if (!activePackage) return;
    acceptDemoInviteAndPackage(token, activePackage);
    navigate('/app/coach');
  };

  const handleDecline = () => {
    rejectInvite(token);
    navigate('/discover');
  };

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <PublicTopBar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10">
        {validation.state !== 'valid' || !trainer ? (
          <div className="rounded-[28px] surface-card p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#252A35] border border-white/[0.1] flex items-center justify-center text-[#F5C25C]">
              <CalendarX2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-[26px] font-semibold text-[#F5F5F7]">
              {COPY.public.invalidInviteTitle}
            </h1>
            <p className="text-[15px] text-[#A2A8B5] max-w-md">
              {validation.state === 'expired'
                ? 'This sample invitation link has expired.'
                : validation.state === 'redeemed'
                  ? 'This sample invitation has already been redeemed.'
                  : validation.state === 'revoked'
                    ? 'This invitation was revoked by the coach.'
                    : 'No matching invitation token was found.'}{' '}
              {COPY.public.invalidInviteBody}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <GlassButton onClick={() => navigate('/discover')}>
                {COPY.public.findTrainer}
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => navigate('/join/FIT-ARJUN-2026')}>
                Try active sample invite
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
                    <span className="text-[13px] text-[#FFB06B]">Invitation</span>
                    {trainer.isDemoVerified ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#A2A8B5]">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#FFB06B]" aria-hidden="true" />
                        Demo verified
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
                    Select a demo coaching package
                  </h2>
                  <div className="grid gap-2.5">
                    {trainerPackages.map((pkg) => {
                      const isSelected = activePackage?.id === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPkgId(pkg.id)}
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
                              {formatINR(pkg.priceInr)}/mo
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] text-[#A2A8B5]">{pkg.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[12px] text-[#7C8393]">
                    {COPY.discovery.checkoutNotice} Accepting explicitly connects you to {trainer.displayName} in this local demo.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {activeClient ? (
                  <GlassButton fullWidth onClick={handleAcceptNow} disabled={!activePackage}>
                    Accept & confirm demo enrollment
                  </GlassButton>
                ) : (
                  <GlassButton fullWidth onClick={handleReviewAndContinue}>
                    {COPY.public.reviewInvitation}
                  </GlassButton>
                )}
                <GlassButton variant="secondary" fullWidth onClick={handleDecline}>
                  {COPY.public.notNow}
                </GlassButton>
              </div>

              {!activeClient ? (
                <p className="text-[12px] text-[#7C8393] text-center">
                  Already previewing a client?{' '}
                  <Link to="/auth" className="text-[#FFB06B] underline underline-offset-4">
                    Switch in Demo Auth
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
