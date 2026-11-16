import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Calendar, Check, MapPin, MessageCircle } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { Package } from '../../types/domain';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { InputField } from '../../components/ui/InputField';
import { WhatsAppSheet } from '../../components/ui/WhatsAppSheet';

export const TrainerPublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    store,
    activeUser,
    activeClient,
    activeCoach,
    enrollWithCoachPackage,
    bookSlot,
    startDemoAsRole,
  } = useApp();
  const navigate = useNavigate();

  const trainer = useMemo(
    () => store.trainers.find((t) => t.slug === slug),
    [store.trainers, slug],
  );

  const trainerPackages = useMemo(() => {
    if (!trainer) return [];
    return store.packages.filter((p) => p.trainerId === trainer.id && p.status === 'active');
  }, [trainer, store.packages]);

  const availableSlots = useMemo(() => {
    if (!trainer) return [];
    return store.consultationSlots.filter(
      (s) => s.trainerId === trainer.id && s.status === 'available',
    );
  }, [trainer, store.consultationSlots]);

  const [checkoutPkg, setCheckoutPkg] = useState<Package | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [topic, setTopic] = useState('Goal discussion & routine fit');
  const [slotError, setSlotError] = useState('');
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  if (!trainer) {
    return (
      <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7]">
        <PublicTopBar />
        <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-[26px] font-semibold">Trainer profile not found</h1>
          <p className="text-[14px] text-[#A2A8B5]">
            This demo coach profile is unavailable. Explore active demo coaches instead.
          </p>
          <GlassButton onClick={() => navigate('/discover')}>Find a trainer</GlassButton>
        </main>
      </div>
    );
  }

  const isCurrentCoach = activeCoach?.id === trainer.id;

  const handleConfirmEnrollment = () => {
    if (!checkoutPkg) return;
    if (!activeClient) {
      startDemoAsRole('client', 'usr_client_kavya');
    }
    enrollWithCoachPackage(trainer.id, checkoutPkg);
    setCheckoutPkg(null);
    navigate('/app/coach');
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setSlotError('Select an available consultation time.');
      return;
    }
    if (!activeClient) {
      setSlotError('Switch to a Client demo profile in Demo Auth to book.');
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

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <PublicTopBar />

      <main className="flex-1 max-w-[1080px] w-full mx-auto px-4 sm:px-6 py-6 pb-16">
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          All demo coaches
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
                <MediaImage
                  assetKey={trainer.avatarKey}
                  alt={trainer.displayName}
                  aspectClass="w-24 h-24 rounded-[20px] border-4 border-[#1C2029] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                      {trainer.displayName}
                    </h1>
                    {trainer.isDemoVerified ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#FFB06B]">
                        <BadgeCheck className="w-4 h-4" aria-hidden="true" />
                        Demo verified
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#7C8393]">Demo profile</span>
                    )}
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
                <GlassButton
                  variant="glass"
                  size="sm"
                  onClick={() => setWhatsAppOpen(true)}
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  WhatsApp (demo)
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
                Example INR packages for demo preview · No real payment processed
              </p>
            </div>
            {isCurrentCoach ? (
              <span className="text-[13px] font-medium text-[#B8E66C]">
                Active coach in your demo
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trainerPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-[22px] surface-card p-5 flex flex-col justify-between gap-5"
              >
                <div>
                  <h3 className="text-[18px] font-semibold text-[#F5F5F7]">{pkg.name}</h3>
                  <p className="mt-2 text-[28px] font-semibold text-[#F5F5F7] tabular-nums">
                    {formatINR(pkg.priceInr)}
                    <span className="text-[14px] font-normal text-[#7C8393]">
                      /{pkg.cadence === 'monthly' ? 'month' : pkg.cadence}
                    </span>
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
                  onClick={() => setCheckoutPkg(pkg)}
                >
                  {isCurrentCoach ? 'Switch demo package' : 'Select package (demo)'}
                </GlassButton>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Mock Checkout Sheet */}
      <GlassSheet
        open={Boolean(checkoutPkg)}
        onClose={() => setCheckoutPkg(null)}
        title={COPY.discovery.checkoutTitle}
        description={COPY.discovery.checkoutNotice}
      >
        {checkoutPkg ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-[16px] surface-elevated p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[16px] font-semibold text-[#F5F5F7]">{checkoutPkg.name}</span>
                <span className="text-[16px] font-semibold text-[#FF803E] tabular-nums">
                  {formatINR(checkoutPkg.priceInr)}/mo
                </span>
              </div>
              <p className="text-[13px] text-[#A2A8B5]">Coach: {trainer.displayName}</p>
              <p className="text-[13px] text-[#A2A8B5]">{checkoutPkg.summary}</p>
            </div>

            {!activeClient ? (
              <p className="text-[13px] text-[#FFB06B]">
                Confirming will preview the connected Client experience using a demo client profile.
              </p>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <GlassButton fullWidth onClick={handleConfirmEnrollment}>
                {COPY.discovery.confirmEnrollment}
              </GlassButton>
              <GlassButton variant="secondary" fullWidth onClick={() => setCheckoutPkg(null)}>
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
                No open sample slots right now. Add slots in Trainer Studio Schedule to test more.
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
            <GlassButton type="submit" fullWidth disabled={availableSlots.length === 0}>
              {COPY.discovery.confirmBooking}
            </GlassButton>
          </div>
        </form>
      </GlassSheet>

      <WhatsAppSheet
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        coachName={trainer.displayName}
      />
    </div>
  );
};
