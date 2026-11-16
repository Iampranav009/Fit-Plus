import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, ExternalLink, Link2, Plus, Video } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { addDaysToKey, formatIndiaDate } from '../../lib/date';
import { isValidHttpMeetingLink } from '../../lib/commerce';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSegmentedControl } from '../../components/ui/GlassSegmentedControl';
import { InputField } from '../../components/ui/InputField';
import { GlassSheet } from '../../components/ui/GlassSheet';

export const StudioConsultationsPage: React.FC = () => {
  const {
    store,
    todayKey,
    activeUser,
    activeTrainer,
    addConsultationSlot,
    cancelBooking,
    markBookingCompleted,
    updateConsultationMeetingLink,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'booked' | 'completed' | 'canceled'>('all');
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [dateKey, setDateKey] = useState(addDaysToKey(todayKey, 3));
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('17:30');
  const [mode, setMode] = useState<'online' | 'in_person'>('online');
  const [meetingLink, setMeetingLink] = useState('');
  const [slotLinkError, setSlotLinkError] = useState('');

  const [linkEditTarget, setLinkEditTarget] = useState<{
    bookingId?: string;
    slotId?: string;
    label: string;
    currentLink: string;
  } | null>(null);
  const [editLinkValue, setEditLinkValue] = useState('');
  const [editLinkError, setEditLinkError] = useState('');

  const trainerBookings = useMemo(() => {
    if (!activeTrainer) return [];
    return store.bookings
      .filter((b) => b.trainerId === activeTrainer.id)
      .filter((b) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'booked') return b.status === 'booked' || b.status === 'rescheduled';
        return b.status === statusFilter;
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [store.bookings, activeTrainer, statusFilter]);

  const trainerSlots = useMemo(() => {
    if (!activeTrainer) return [];
    return store.consultationSlots
      .filter((s) => s.trainerId === activeTrainer.id)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [store.consultationSlots, activeTrainer]);

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingLink.trim() && !isValidHttpMeetingLink(meetingLink)) {
      setSlotLinkError('Enter a valid http:// or https:// meeting URL.');
      return;
    }
    setSlotLinkError('');
    addConsultationSlot({
      dateKey,
      startTime,
      endTime,
      mode,
      meetingLink: meetingLink.trim() || undefined,
    });
    setMeetingLink('');
    setSlotModalOpen(false);
  };

  const handleSaveEditedLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEditTarget) return;
    if (editLinkValue.trim() && !isValidHttpMeetingLink(editLinkValue)) {
      setEditLinkError('Enter a valid http:// or https:// meeting URL.');
      return;
    }
    setEditLinkError('');
    updateConsultationMeetingLink({
      bookingId: linkEditTarget.bookingId,
      slotId: linkEditTarget.slotId,
      meetingLink: editLinkValue.trim(),
    });
    setLinkEditTarget(null);
  };

  return (
    <AppShell pageTitle="Schedule & consultations">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">Timezone: {activeUser.timezone}</p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.trainer.consultationsTitle}
            </h1>
          </div>
          <GlassButton size="sm" onClick={() => setSlotModalOpen(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add slot
          </GlassButton>
        </div>

        {/* Availability Slots */}
        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Availability slots</h2>
          {trainerSlots.length === 0 ? (
            <p className="text-[14px] text-[#A2A8B5]">Nothing on your schedule yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {trainerSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-[14px] bg-[#101218] border border-white/[0.08] p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold text-[#F5F5F7] tabular-nums">
                        {formatIndiaDate(slot.dateKey, 'short')}
                      </p>
                      <p className="text-[12px] text-[#A2A8B5] tabular-nums flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {slot.startTime}–{slot.endTime} · {slot.mode === 'in_person' ? 'In person' : 'Online'}
                      </p>
                    </div>
                    <span
                      className={`text-[12px] font-medium capitalize ${
                        slot.status === 'available' ? 'text-[#B8E66C]' : 'text-[#FFB06B]'
                      }`}
                    >
                      {slot.status}
                    </span>
                  </div>

                  {slot.mode === 'online' ? (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06] text-[12px]">
                      <span className="text-[#7C8393] truncate">
                        {slot.meetingLink ? 'Video link attached' : 'No video link'}
                      </span>
                      {slot.status !== 'booked' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkEditTarget({
                              slotId: slot.id,
                              label: `${formatIndiaDate(slot.dateKey, 'short')} · ${slot.startTime}`,
                              currentLink: slot.meetingLink || '',
                            });
                            setEditLinkValue(slot.meetingLink || '');
                            setEditLinkError('');
                          }}
                          className="text-[#FFB06B] hover:text-[#FF803E] font-medium shrink-0"
                        >
                          {slot.meetingLink ? 'Edit link' : 'Add link'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bookings Filter & List */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Client consultations</h2>
            <GlassSegmentedControl
              ariaLabel="Filter consultation status"
              value={statusFilter}
              onChange={setStatusFilter}
              size="sm"
              options={[
                { id: 'all', label: 'All' },
                { id: 'booked', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
                { id: 'canceled', label: 'Canceled' },
              ]}
            />
          </div>

          {trainerBookings.length === 0 ? (
            <div className="surface-card rounded-[20px] p-8 text-center text-[14px] text-[#A2A8B5]">
              {COPY.trainer.emptyConsultsTitle}
            </div>
          ) : (
            <div className="grid gap-3">
              {trainerBookings.map((b) => {
                const client = store.clients.find((c) => c.id === b.clientId);
                const active = b.status === 'booked' || b.status === 'rescheduled';
                const validLink =
                  Boolean(b.meetingLink?.trim()) && isValidHttpMeetingLink(b.meetingLink || '');
                return (
                  <div
                    key={b.id}
                    className="surface-card rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-[13px] text-[#7C8393] tabular-nums flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                        <span className="text-[#F5F5F7] font-medium">
                          {formatIndiaDate(b.dateKey, 'short')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {b.startTime}–{b.endTime}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{b.status}</span>
                      </p>
                      <p className="text-[16px] font-semibold text-[#F5F5F7]">
                        {client ? `${client.firstName} ${client.lastName}` : 'Client'} — {b.topic}
                      </p>
                      {validLink ? (
                        <a
                          href={b.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#FFB06B] hover:text-[#FF803E]"
                        >
                          <Video className="w-3.5 h-3.5" aria-hidden="true" />
                          Join session link
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                    {active ? (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setLinkEditTarget({
                              bookingId: b.id,
                              label: `${client ? `${client.firstName} ${client.lastName}` : 'Client'} · ${b.startTime}`,
                              currentLink: b.meetingLink || '',
                            });
                            setEditLinkValue(b.meetingLink || '');
                            setEditLinkError('');
                          }}
                        >
                          <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {validLink ? 'Edit link' : 'Add link'}
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          onClick={() => markBookingCompleted(b.id, b.meetingLink)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Mark completed
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelBooking(b.id)}
                        >
                          Cancel slot
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

      <GlassSheet
        open={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        title="Add availability slot"
        description={`Duplicate date/time slots are blocked. Timezone: ${activeUser.timezone}`}
      >
        <form onSubmit={handleAddSlot} className="flex flex-col gap-4">
          <InputField
            label="Date"
            type="date"
            min={todayKey}
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Start time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <InputField
              label="End time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'online' | 'in_person')}
              className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
            >
              <option value="online">Online</option>
              <option value="in_person">In person</option>
            </select>
          </label>
          {mode === 'online' ? (
            <InputField
              label="Video meeting link"
              optionalTag="Optional"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              error={slotLinkError}
            />
          ) : null}
          <div className="flex gap-2.5 pt-2">
            <GlassButton type="button" variant="secondary" fullWidth onClick={() => setSlotModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth>
              Save slot
            </GlassButton>
          </div>
        </form>
      </GlassSheet>

      <GlassSheet
        open={Boolean(linkEditTarget)}
        onClose={() => setLinkEditTarget(null)}
        title="Session meeting link"
        description={linkEditTarget?.label}
      >
        <form onSubmit={handleSaveEditedLink} className="flex flex-col gap-4">
          <InputField
            label="Meeting URL"
            value={editLinkValue}
            onChange={(e) => setEditLinkValue(e.target.value)}
            placeholder="https://meet.google.com/..."
            error={editLinkError}
          />
          <div className="flex gap-2.5">
            <GlassButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setLinkEditTarget(null)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth>
              Save link
            </GlassButton>
          </div>
        </form>
      </GlassSheet>
    </AppShell>
  );
};
