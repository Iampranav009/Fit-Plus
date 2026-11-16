import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, ExternalLink, Video } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { formatIndiaDate } from '../../lib/date';
import { isValidHttpMeetingLink } from '../../lib/commerce';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { InputField } from '../../components/ui/InputField';
import { MediaImage } from '../../components/ui/MediaImage';

export const ConsultationsPage: React.FC = () => {
  const {
    store,
    activeUser,
    activeClient,
    activeCoach,
    activeRelationship,
    subscriptions,
    isCloudSynced,
    bookSlot,
    rescheduleBooking,
    cancelBooking,
  } = useApp();

  const [bookOpen, setBookOpen] = useState(false);
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [topic, setTopic] = useState('Monthly plan check-in');
  const [errorMsg, setErrorMsg] = useState('');

  const clientBookings = useMemo(() => {
    if (!activeClient) return [];
    return store.bookings
      .filter((b) => b.clientId === activeClient.id)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [store.bookings, activeClient]);

  const activeSubscription = useMemo(() => {
    if (!activeClient) return undefined;
    return subscriptions.find((s) => s.clientId === activeClient.id && s.status === 'active');
  }, [subscriptions, activeClient]);

  const activePackage = useMemo(() => {
    const pkgId = activeSubscription?.packageId || activeRelationship?.packageId;
    if (!pkgId) return undefined;
    return store.packages.find((p) => p.id === pkgId);
  }, [activeSubscription, activeRelationship, store.packages]);

  const includedConsults = activeSubscription?.consultationsIncluded ?? activePackage?.consultationsIncluded ?? 0;
  const usedConsultsCount = useMemo(() => {
    return clientBookings.filter(
      (b) =>
        (b.status === 'booked' || b.status === 'rescheduled' || b.status === 'completed') &&
        (!activeSubscription || b.createdAt >= activeSubscription.currentPeriodStart),
    ).length;
  }, [clientBookings, activeSubscription]);

  const targetCoach = activeCoach ?? store.trainers[0];

  const availableSlots = useMemo(() => {
    if (!targetCoach) return [];
    return store.consultationSlots.filter(
      (s) => s.trainerId === targetCoach.id && s.status === 'available',
    );
  }, [store.consultationSlots, targetCoach]);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setErrorMsg('Choose an available time slot.');
      return;
    }
    const res = bookSlot(selectedSlotId, topic);
    if (!res.ok) {
      setErrorMsg(res.error || COPY.discovery.slotConflict);
      return;
    }
    setErrorMsg('');
    setBookOpen(false);
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTargetId || !selectedSlotId) {
      setErrorMsg('Choose a new time slot.');
      return;
    }
    const res = rescheduleBooking(rescheduleTargetId, selectedSlotId);
    if (!res.ok) {
      setErrorMsg(res.error || COPY.discovery.slotConflict);
      return;
    }
    setErrorMsg('');
    setRescheduleTargetId(null);
  };

  return (
    <AppShell pageTitle="Consultations">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">
              {formatCopy(COPY.discovery.bookingTimezone, { timezone: activeUser.timezone })}
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              Consultations
            </h1>
          </div>

          <GlassButton
            size="sm"
            onClick={() => {
              setSelectedSlotId(availableSlots[0]?.id || '');
              setErrorMsg('');
              setBookOpen(true);
            }}
          >
            {isCloudSynced ? 'Book consultation' : 'Book demo slot'}
          </GlassButton>
        </div>

        {/* Consultation Context Card */}
        <section className="rounded-[24px] surface-card overflow-hidden grid grid-cols-1 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <MediaImage
              assetKey="consultation"
              alt="Coach and client during a quiet goal review session"
              aspectClass="aspect-[4/3] sm:h-full"
            />
          </div>
          <div className="sm:col-span-7 p-5 flex flex-col justify-center gap-2">
            <p className="text-[12px] font-medium text-[#FFB06B]">
              {isCloudSynced ? '1-on-1 check-ins' : '1-on-1 check-ins (demo)'}
            </p>
            <h2 className="text-[19px] font-semibold text-[#F5F5F7]">
              {COPY.discovery.consultTitle}
            </h2>
            <p className="text-[14px] text-[#A2A8B5] leading-relaxed">
              Review training adherence, meal swaps, and upcoming schedule blocks with{' '}
              {targetCoach?.displayName || 'your coach'}.
              {includedConsults > 0
                ? ` Plan allowance: ${Math.max(0, includedConsults - usedConsultsCount)} of ${includedConsults} consultations remaining.`
                : ''}
            </p>
            <Link
              to="/app/settings"
              className="text-[13px] font-medium text-[#FFB06B] hover:text-[#FF803E] mt-1 self-start"
            >
              Change timezone ({activeUser.timezone})
            </Link>
          </div>
        </section>

        {/* Bookings List */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Your bookings</h2>
          {clientBookings.length === 0 ? (
            <div className="rounded-[20px] surface-card p-6 text-center space-y-3">
              <p className="text-[15px] text-[#A2A8B5]">No consultations booked yet.</p>
              <GlassButton
                size="sm"
                onClick={() => {
                  setSelectedSlotId(availableSlots[0]?.id || '');
                  setBookOpen(true);
                }}
              >
                Choose a time
              </GlassButton>
            </div>
          ) : (
            <div className="grid gap-3">
              {clientBookings.map((booking) => {
                const trainer = store.trainers.find((t) => t.id === booking.trainerId);
                const isActive = booking.status === 'booked' || booking.status === 'rescheduled';
                const hasJoinLink =
                  Boolean(booking.meetingLink?.trim()) &&
                  isValidHttpMeetingLink(booking.meetingLink || '');
                return (
                  <div
                    key={booking.id}
                    className="rounded-[20px] surface-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#7C8393] tabular-nums">
                        <Calendar className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                        <span className="text-[#F5F5F7] font-medium">
                          {formatIndiaDate(booking.dateKey, 'short')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {booking.startTime}–{booking.endTime}
                        </span>
                        <span aria-hidden="true">·</span>
                        {booking.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-[#B8E66C] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Completed
                          </span>
                        ) : (
                          <span className="capitalize">
                            {booking.status === 'canceled'
                              ? 'Canceled'
                              : booking.status === 'rescheduled'
                                ? 'Rescheduled'
                                : isCloudSynced
                                  ? 'Confirmed'
                                  : 'Confirmed (demo)'}
                          </span>
                        )}
                      </div>
                      <p className="text-[16px] font-semibold text-[#F5F5F7]">{booking.topic}</p>
                      <p className="text-[13px] text-[#A2A8B5]">
                        With {trainer?.displayName || 'Coach'} · {booking.timezone}
                      </p>
                      {hasJoinLink && isActive ? (
                        <a
                          href={booking.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#FFB06B] hover:text-[#FF803E] pt-1"
                        >
                          <Video className="w-3.5 h-3.5" aria-hidden="true" />
                          Join session
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>

                    {isActive ? (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {hasJoinLink ? (
                          <a
                            href={booking.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[36px] px-3.5 rounded-[12px] bg-[#FF803E] text-[#101218] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#FF9259] transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" aria-hidden="true" />
                            Join session
                          </a>
                        ) : null}
                        <GlassButton
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRescheduleTargetId(booking.id);
                            setSelectedSlotId(availableSlots[0]?.id || '');
                            setErrorMsg('');
                          }}
                        >
                          Reschedule
                        </GlassButton>
                        <GlassButton
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelBooking(booking.id)}
                        >
                          Cancel booking
                        </GlassButton>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Book Sheet */}
      <GlassSheet
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Select a consultation slot"
        description={`With ${targetCoach?.displayName} · ${activeUser.timezone}`}
      >
        <form onSubmit={handleBook} className="flex flex-col gap-4">
          {availableSlots.length === 0 ? (
            <p className="text-[14px] text-[#A2A8B5]">
              No open slots right now. Add availability in Trainer Studio Schedule.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  aria-pressed={selectedSlotId === slot.id}
                  className={`text-left rounded-[14px] p-3.5 border cursor-pointer transition-colors ${
                    selectedSlotId === slot.id
                      ? 'bg-[#FF803E]/12 border-[#FF803E]'
                      : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <p className="text-[14px] font-semibold text-[#F5F5F7] tabular-nums">
                    {formatIndiaDate(slot.dateKey, 'short')}
                  </p>
                  <p className="text-[13px] text-[#A2A8B5] tabular-nums flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {slot.startTime}–{slot.endTime} · {slot.mode === 'in_person' ? 'In person' : 'Online'}
                  </p>
                </button>
              ))}
            </div>
          )}
          <InputField
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          {errorMsg ? (
            <p role="alert" className="text-[13px] text-[#FF6B70]">
              {errorMsg}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <GlassButton type="button" variant="secondary" fullWidth onClick={() => setBookOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth disabled={availableSlots.length === 0}>
              {COPY.discovery.confirmBooking}
            </GlassButton>
          </div>
        </form>
      </GlassSheet>

      {/* Reschedule Sheet */}
      <GlassSheet
        open={Boolean(rescheduleTargetId)}
        onClose={() => setRescheduleTargetId(null)}
        title="Reschedule consultation"
        description={formatCopy(COPY.discovery.bookingTimezone, { timezone: activeUser.timezone })}
      >
        <form onSubmit={handleReschedule} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                aria-pressed={selectedSlotId === slot.id}
                className={`text-left rounded-[14px] p-3.5 border cursor-pointer transition-colors ${
                  selectedSlotId === slot.id
                    ? 'bg-[#FF803E]/12 border-[#FF803E]'
                    : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                }`}
              >
                <p className="text-[14px] font-semibold text-[#F5F5F7] tabular-nums">
                  {formatIndiaDate(slot.dateKey, 'short')}
                </p>
                <p className="text-[13px] text-[#A2A8B5] tabular-nums">
                  {slot.startTime}–{slot.endTime}
                </p>
              </button>
            ))}
          </div>
          {errorMsg ? (
            <p role="alert" className="text-[13px] text-[#FF6B70]">
              {errorMsg}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <GlassButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setRescheduleTargetId(null)}
            >
              Keep current time
            </GlassButton>
            <GlassButton type="submit" fullWidth disabled={availableSlots.length === 0}>
              Confirm new time
            </GlassButton>
          </div>
        </form>
      </GlassSheet>
    </AppShell>
  );
};
