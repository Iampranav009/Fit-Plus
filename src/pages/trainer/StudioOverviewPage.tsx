import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Plus,
  UserPlus,
  MessageSquare,
  Dumbbell,
  Apple,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { computeClientAdherencePercent } from '../../lib/streak';
import { computeTrainerActionItems, computeTrainerBusinessAnalytics } from '../../lib/pulseEngine';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { ActivityRing } from '../../components/ui/ActivityRing';

export const StudioOverviewPage: React.FC = () => {
  const {
    store,
    todayKey,
    activeTrainer,
    subscriptions,
    payments,
    isCloudSynced,
    linkedClientsForActiveTrainer,
    pendingRelationshipsForActiveTrainer,
    getClientApprovedRecoveryDates,
    unreadMessagesCount,
  } = useApp();
  const navigate = useNavigate();

  const trainerActionItems = useMemo(() => {
    return computeTrainerActionItems({
      clients: linkedClientsForActiveTrainer,
      assignments: store.assignments,
      completions: store.completions,
      todayKey,
      workoutSessions: store.workoutSessions ?? [],
      weeklyCheckIns: store.weeklyCheckIns ?? [],
      subscriptions,
      conversations: store.conversations ?? [],
    });
  }, [
    linkedClientsForActiveTrainer,
    store.assignments,
    store.completions,
    todayKey,
    store.workoutSessions,
    store.weeklyCheckIns,
    subscriptions,
    store.conversations,
  ]);

  const businessAnalytics = useMemo(() => {
    return computeTrainerBusinessAnalytics({
      clients: linkedClientsForActiveTrainer,
      packages: store.packages,
      subscriptions,
      payments,
      bookings: store.bookings,
    });
  }, [linkedClientsForActiveTrainer, store.packages, subscriptions, payments, store.bookings]);

  const clientMetrics = useMemo(() => {
    return linkedClientsForActiveTrainer.map((client) => {
      const adherence = computeClientAdherencePercent(
        client.id,
        store.assignments,
        store.completions,
        todayKey,
        7,
        getClientApprovedRecoveryDates(client.id),
      );
      return { client, adherence };
    });
  }, [
    linkedClientsForActiveTrainer,
    store.assignments,
    store.completions,
    todayKey,
    getClientApprovedRecoveryDates,
  ]);

  const avgAdherence = useMemo(() => {
    if (clientMetrics.length === 0) return 0;
    const total = clientMetrics.reduce((sum, item) => sum + item.adherence, 0);
    return Math.round(total / clientMetrics.length);
  }, [clientMetrics]);

  const upcomingConsults = useMemo(() => {
    if (!activeTrainer) return [];
    return store.bookings
      .filter(
        (b) =>
          b.trainerId === activeTrainer.id &&
          (b.status === 'booked' || b.status === 'rescheduled') &&
          b.dateKey >= todayKey,
      )
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [store.bookings, activeTrainer, todayKey]);

  const trainerActiveSubscriptions = useMemo(() => {
    if (!activeTrainer) return [];
    return subscriptions.filter((s) => s.trainerId === activeTrainer.id && s.status === 'active');
  }, [subscriptions, activeTrainer]);

  const capturedRevenueInr = useMemo(() => {
    if (!activeTrainer) return 0;
    return payments
      .filter((p) => p.trainerId === activeTrainer.id && p.status === 'captured')
      .reduce((sum, p) => sum + p.amountInr, 0);
  }, [payments, activeTrainer]);

  const demoPackageValue = useMemo(() => {
    if (!activeTrainer) return 0;
    const activeRel = store.relationships.filter(
      (r) => r.trainerId === activeTrainer.id && r.status === 'active',
    );
    return activeRel.reduce((sum, rel) => {
      const pkg = store.packages.find((p) => p.id === rel.packageId);
      return sum + (pkg?.priceInr || 0);
    }, 0);
  }, [store.relationships, store.packages, activeTrainer]);

  const attentionList = useMemo(() => {
    return clientMetrics.filter(
      ({ client, adherence }) =>
        adherence < 75 ||
        (client.renewalDueDate &&
          client.renewalDueDate <= todayKey.slice(0, 8) + '31' &&
          client.scenarioTag?.toLowerCase().includes('renewal')),
    );
  }, [clientMetrics, todayKey]);

  return (
    <AppShell pageTitle="Studio overview">
      <div className="flex flex-col gap-6">
        {/* Header & Primary Action */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-[#7C8393]">
              {activeTrainer?.displayName} · Trainer Studio
              {pendingRelationshipsForActiveTrainer.length > 0
                ? ` · ${pendingRelationshipsForActiveTrainer.length} pending request${
                    pendingRelationshipsForActiveTrainer.length === 1 ? '' : 's'
                  }`
                : ''}
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.trainer.overviewTitle}
            </h1>
            <p className="mt-1 text-[15px] text-[#A2A8B5]">
              {COPY.trainer.overviewSupport}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => navigate('/studio/messages')}
            >
              <MessageSquare className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
              <span>Messages</span>
              {unreadMessagesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#FF803E] text-white text-[10px] font-bold">
                  {unreadMessagesCount}
                </span>
              )}
            </GlassButton>
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => navigate('/studio/workout-builder')}
            >
              <Dumbbell className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
              <span>Workout Studio</span>
            </GlassButton>
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => navigate('/studio/nutrition-builder')}
            >
              <Apple className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Nutrition Studio</span>
            </GlassButton>
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => navigate('/studio/clients')}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Invite client
            </GlassButton>
            <GlassButton size="sm" onClick={() => navigate('/studio/assign')}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Assign commitments
            </GlassButton>
          </div>
        </div>

        {/* Action Center (Stage 4B) */}
        {trainerActionItems.length > 0 && (
          <section className="glass-nav p-5 rounded-[22px] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF803E] [box-shadow:0_0_8px_rgba(255,128,62,0.8)] animate-pulse" />
                <h2 className="text-[12px] font-bold text-[#F5F5F7] uppercase tracking-[0.07em]">
                  Action Center ({trainerActionItems.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#7C8393]">Requires attention</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {trainerActionItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className={`surface-card p-3.5 rounded-[16px] flex flex-col justify-between transition-all ${
                    item.priority === 'high'
                      ? 'border-[#FF6B70]/24 hover:border-[#FF6B70]/38'
                      : 'hover:border-white/[0.14]'
                  }`}
                >
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#F5F5F7] truncate">{item.title}</span>
                      <span
                        className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          item.priority === 'high'
                            ? 'bg-[#FF6B70]/16 text-[#FF6B70]'
                            : 'bg-[#F5C25C]/14 text-[#F5C25C]'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7C8393] line-clamp-2">{item.description}</p>
                  </div>

                  <button
                    onClick={() => navigate(item.actionUrl)}
                    className="w-full py-1.5 px-3 rounded-[10px] glass-control text-[11.5px] font-semibold text-[#F5F5F7] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/[0.10] transition-colors"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3 h-3 text-[#FF803E]" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4 Derived KPI Cards */}
        <section
          aria-label="Studio KPIs"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <MetricCard
            label="Active clients"
            value={linkedClientsForActiveTrainer.length}
            subtitle="Linked roster"
          />
          <MetricCard
            label="Weekly adherence"
            value={`${avgAdherence}%`}
            accentColor="#FF803E"
            subtitle="Derived from 7-day tasks"
            icon={<ActivityRing percent={avgAdherence} size={42} strokeWidth={4} />}
          />
          <MetricCard
            label="Upcoming consultations"
            value={upcomingConsults.length}
            accentColor="#70C8ED"
            subtitle="Scheduled ahead"
          />
          <MetricCard
            label={isCloudSynced ? 'Captured INR revenue' : 'Demo package value'}
            value={formatINR(isCloudSynced ? capturedRevenueInr : demoPackageValue)}
            subtitle={
              isCloudSynced
                ? `${trainerActiveSubscriptions.length} active · Cashfree T+2 Rolling`
                : 'Example monthly total'
            }
          />
        </section>

        {linkedClientsForActiveTrainer.length === 0 ? (
          <EmptyState
            artwork="clients"
            title={COPY.trainer.emptyClientsTitle}
            description={
              isCloudSynced
                ? 'Generate an invitation link so clients can review your packages and join.'
                : 'Generate a demo invitation link so clients can review your packages and join.'
            }
            actionLabel="Create an invite"
            onAction={() => navigate('/studio/clients')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Priority Attention List */}
            <section className="lg:col-span-7 surface-card rounded-[22px] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-semibold text-[#F5F5F7]">
                  {COPY.trainer.attentionTitle}
                </h2>
                <Link
                  to="/studio/clients"
                  className="text-[13px] font-medium text-[#FFB06B] hover:text-[#FF803E] inline-flex items-center gap-1 transition-colors"
                >
                  All clients
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>

              {attentionList.length === 0 ? (
                <p className="text-[14px] text-[#A2A8B5]">
                  All linked clients are keeping steady this week.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.08]">
                  {attentionList.map(({ client, adherence }) => (
                    <li
                      key={client.id}
                      className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className="w-4 h-4 text-[#F5C25C] mt-1 shrink-0"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-[15px] font-semibold text-[#F5F5F7]">
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-[13px] text-[#A2A8B5] tabular-nums">
                            7-day adherence {adherence}% ·{' '}
                            {client.scenarioTag || 'Check-in recommended'}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/studio/clients/${client.id}`}
                        className="glass-control min-h-[40px] px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center transition-colors"
                      >
                        Review client
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* Client Adherence Mini-bars */}
              <div className="pt-3 border-t border-white/[0.08]">
                <p className="text-[12px] text-[#7C8393] mb-3">Roster 7-day adherence overview</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientMetrics.slice(0, 4).map(({ client, adherence }) => (
                    <Link
                      key={client.id}
                      to={`/studio/clients/${client.id}`}
                      className="rounded-[14px] surface-elevated p-3 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[13px] tabular-nums">
                        <span className="font-medium text-[#F5F5F7] truncate">
                          {client.firstName} {client.lastName}
                        </span>
                        <span className="text-[#FFB06B] font-semibold">{adherence}%</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#101218] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#FF803E]"
                          style={{ width: `${Math.min(100, Math.max(4, adherence))}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {/* Upcoming Consultations */}
            <section className="lg:col-span-5 surface-card rounded-[22px] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-semibold text-[#F5F5F7]">
                  Upcoming consultations
                </h2>
                <Link
                  to="/studio/consultations"
                  className="text-[13px] font-medium text-[#FFB06B] hover:text-[#FF803E] transition-colors"
                >
                  Schedule
                </Link>
              </div>

              {upcomingConsults.length === 0 ? (
                <p className="text-[14px] text-[#A2A8B5]">
                  Nothing on your schedule yet.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.08]">
                  {upcomingConsults.map((b) => {
                    const client = store.clients.find((c) => c.id === b.clientId);
                    return (
                      <li key={b.id} className="py-3 flex items-start gap-3">
                        <Calendar
                          className="w-4 h-4 text-[#FF803E] mt-1 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#F5F5F7]">
                            {client ? `${client.firstName} ${client.lastName}` : 'Client'}
                          </p>
                          <p className="text-[13px] text-[#A2A8B5] tabular-nums">
                            {formatIndiaDate(b.dateKey, 'short')} · {b.startTime}–{b.endTime}
                          </p>
                          <p className="text-[12px] text-[#7C8393] truncate">{b.topic}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
};
