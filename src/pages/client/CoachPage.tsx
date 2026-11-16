import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Calendar, MessageCircle, Search } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { MediaImage } from '../../components/ui/MediaImage';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { WhatsAppSheet } from '../../components/ui/WhatsAppSheet';
import { InputField } from '../../components/ui/InputField';

export const CoachPage: React.FC = () => {
  const {
    store,
    activeCoach,
    activeRelationship,
    disconnectActiveCoach,
  } = useApp();
  const navigate = useNavigate();

  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const activePackage = useMemo(() => {
    if (!activeRelationship?.packageId) return undefined;
    return store.packages.find((p) => p.id === activeRelationship.packageId);
  }, [activeRelationship, store.packages]);

  const handleOpenInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) return;
    navigate(`/join/${encodeURIComponent(trimmed)}`);
  };

  return (
    <AppShell pageTitle="Coach">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
            {COPY.client.coachTitle}
          </h1>
          <Link
            to="/discover"
            className="glass-control min-h-[44px] px-4 py-2 rounded-[12px] text-[14px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
            Discover coaches
          </Link>
        </div>

        {activeCoach && activeRelationship ? (
          <section className="rounded-[24px] surface-card overflow-hidden">
            <div className="relative h-36">
              <MediaImage
                assetKey={activeCoach.coverKey}
                alt=""
                aspectClass="h-36 w-full"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C2029] via-[#1C2029]/30 to-transparent" />
            </div>

            <div className="px-5 sm:px-6 pb-6 -mt-9 relative flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <MediaImage
                    assetKey={activeCoach.avatarKey}
                    alt={activeCoach.displayName}
                    aspectClass="w-20 h-20 rounded-[18px] border-2 border-[#1C2029] shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[22px] font-semibold text-[#F5F5F7]">
                        {activeCoach.displayName}
                      </h2>
                      {activeCoach.isDemoVerified ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-[#FFB06B]">
                          <BadgeCheck className="w-4 h-4" aria-hidden="true" />
                          Demo verified
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[14px] text-[#A2A8B5]">{activeCoach.headline}</p>
                  </div>
                </div>

                <Link
                  to={`/trainers/${activeCoach.slug}`}
                  className="text-[14px] font-medium text-[#FFB06B] hover:text-[#FF803E] min-h-[44px] inline-flex items-center"
                >
                  View public profile
                </Link>
              </div>

              {activePackage ? (
                <div className="rounded-[16px] surface-elevated p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] text-[#7C8393]">Active demo package</p>
                    <p className="text-[16px] font-semibold text-[#F5F5F7]">
                      {activePackage.name}
                    </p>
                    <p className="text-[12px] text-[#A2A8B5] mt-0.5">
                      Connected since {formatIndiaDate(activeRelationship.startedAt.slice(0, 10), 'short')}
                    </p>
                  </div>
                  <p className="text-[18px] font-semibold text-[#F5F5F7] tabular-nums">
                    {formatINR(activePackage.priceInr)}/mo
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GlassButton fullWidth onClick={() => navigate('/app/consultations')}>
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Book a consultation
                </GlassButton>
                <GlassButton
                  variant="glass"
                  fullWidth
                  onClick={() => setWhatsAppOpen(true)}
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  Contact on WhatsApp
                </GlassButton>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-[#7C8393]">
                  You can end coaching in this local demo any time.
                </p>
                <GlassButton
                  variant="destructive"
                  size="sm"
                  onClick={() => setDisconnectOpen(true)}
                >
                  Manage coaching
                </GlassButton>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-6">
            <EmptyState
              artwork="coach"
              title={COPY.client.noCoachTitle}
              description="Browse demo trainers, inspect sample packages, or redeem a trainer invitation code."
              actionLabel={COPY.client.exploreTrainers}
              onAction={() => navigate('/discover')}
            />

            <form
              onSubmit={handleOpenInvite}
              className="rounded-[20px] surface-card p-5 flex flex-col sm:flex-row sm:items-end gap-3"
            >
              <div className="flex-1">
                <InputField
                  label={COPY.client.enterInvitation}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Try FIT-ARJUN-2026 or FIT-MEERA-2026"
                />
              </div>
              <GlassButton type="submit" variant="secondary">
                Review invite
              </GlassButton>
            </form>
          </div>
        )}
      </div>

      {/* Disconnect Confirmation */}
      <GlassSheet
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        title={COPY.client.disconnectTitle}
        description={COPY.client.disconnectBody}
      >
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <GlassButton variant="secondary" fullWidth onClick={() => setDisconnectOpen(false)}>
            {COPY.client.keepCoaching}
          </GlassButton>
          <GlassButton
            variant="destructive"
            fullWidth
            onClick={() => {
              disconnectActiveCoach();
              setDisconnectOpen(false);
            }}
          >
            {COPY.client.endCoaching}
          </GlassButton>
        </div>
      </GlassSheet>

      {activeCoach ? (
        <WhatsAppSheet
          open={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          coachName={activeCoach.displayName}
        />
      ) : null}
    </AppShell>
  );
};
