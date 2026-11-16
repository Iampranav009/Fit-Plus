import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Plus, UserPlus } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { GoalFocus } from '../../types/domain';
import { formatIndiaDate } from '../../lib/date';
import { computeClientAdherencePercent, computeStreakSummary } from '../../lib/streak';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { GlassSearchBar } from '../../components/ui/GlassSearchBar';
import { InputField } from '../../components/ui/InputField';
import { EmptyState } from '../../components/ui/EmptyState';

const GOAL_FILTERS: { value: 'all' | GoalFocus; label: string }[] = [
  { value: 'all', label: 'All clients' },
  { value: 'weight_management', label: 'Weight management' },
  { value: 'muscle_strength', label: 'Muscle gain' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'healthy_weight_gain', label: 'Healthy weight gain' },
];

export const StudioClientsPage: React.FC = () => {
  const {
    store,
    todayKey,
    activeTrainer,
    linkedClientsForActiveTrainer,
    createInvite,
    revokeInvite,
  } = useApp();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<'all' | GoalFocus>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLabel, setInviteLabel] = useState('');
  const [suggestedPkgId, setSuggestedPkgId] = useState('pkg_arjun_weight');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    return linkedClientsForActiveTrainer.filter((c) => {
      if (goalFilter !== 'all' && c.primaryGoal !== goalFilter) return false;
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${c.firstName} ${c.lastName} ${c.primaryGoal} ${c.environment}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [linkedClientsForActiveTrainer, goalFilter, query]);

  const trainerInvites = useMemo(
    () => store.invites.filter((i) => i.trainerId === activeTrainer?.id),
    [store.invites, activeTrainer?.id],
  );

  const trainerPackages = useMemo(
    () => store.packages.filter((p) => p.trainerId === activeTrainer?.id && p.status === 'active'),
    [store.packages, activeTrainer?.id],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredClients.map((c) => c.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...ids])));
    }
  };

  const handleAssignSelected = () => {
    navigate('/studio/assign', { state: { preselectedClientIds: selectedIds } });
  };

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    createInvite(inviteLabel, suggestedPkgId || undefined);
    setInviteLabel('');
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1800);
  };

  return (
    <AppShell pageTitle="Clients">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-[#7C8393]">
              Role-scoped roster · Showing {linkedClientsForActiveTrainer.length} linked clients
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.trainer.clientsTitle}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <GlassButton variant="glass" size="sm" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Invite client
            </GlassButton>
            <GlassButton size="sm" onClick={handleAssignSelected}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              {selectedIds.length > 0
                ? `Assign to ${selectedIds.length} selected`
                : 'Assign commitments'}
            </GlassButton>
          </div>
        </div>

        {/* Search & Group Filter */}
        <div className="surface-card rounded-[22px] p-4 flex flex-col gap-3">
          <GlassSearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search linked clients by name or setting"
            ariaLabel="Search clients"
          />

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by goal group">
            {GOAL_FILTERS.map((gf) => (
              <button
                key={gf.value}
                type="button"
                onClick={() => setGoalFilter(gf.value)}
                aria-pressed={goalFilter === gf.value}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-[12px] text-[13px] font-medium border cursor-pointer whitespace-nowrap transition-colors ${
                  goalFilter === gf.value
                    ? 'bg-[#FF803E] border-[#FF803E] text-[#101218] font-semibold'
                    : 'bg-[#101218] border-white/[0.08] text-[#A2A8B5] hover:text-[#F5F5F7]'
                }`}
              >
                {gf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Client Roster List */}
        {filteredClients.length === 0 ? (
          <EmptyState
            artwork="clients"
            title="No clients match this filter"
            description="Clear your search or filter to see all linked demo clients."
            actionLabel="Show all clients"
            onAction={() => {
              setQuery('');
              setGoalFilter('all');
            }}
          />
        ) : (
          <div className="surface-card rounded-[22px] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#252A35]/60">
              <label className="inline-flex items-center gap-2.5 text-[13px] font-medium text-[#F5F5F7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    filteredClients.length > 0 &&
                    filteredClients.every((c) => selectedIds.includes(c.id))
                  }
                  onChange={selectAllFiltered}
                  className="h-4 w-4 accent-[#FF803E]"
                />
                Select all ({filteredClients.length})
              </label>
              {selectedIds.length > 0 ? (
                <span className="text-[13px] text-[#FFB06B] tabular-nums">
                  {selectedIds.length} selected
                </span>
              ) : null}
            </div>

            <div className="divide-y divide-white/[0.08]">
              {filteredClients.map((client) => {
                const isSelected = selectedIds.includes(client.id);
                const adherence = computeClientAdherencePercent(
                  client.id,
                  store.assignments,
                  store.completions,
                  todayKey,
                  7,
                );
                const clientAsg = store.assignments.filter((a) => a.clientId === client.id);
                const clientCmp = store.completions.filter((c) => c.clientId === client.id);
                const streak = computeStreakSummary(clientAsg, clientCmp, todayKey);
                const rel = store.relationships.find(
                  (r) => r.clientId === client.id && r.status === 'active',
                );
                const pkg = store.packages.find((p) => p.id === rel?.packageId);

                return (
                  <div
                    key={client.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(client.id)}
                        aria-label={`Select ${client.firstName} ${client.lastName}`}
                        className="mt-1 sm:mt-0 h-5 w-5 accent-[#FF803E] shrink-0 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/studio/clients/${client.id}`}
                          className="text-[16px] font-semibold text-[#F5F5F7] hover:text-[#FF803E] transition-colors"
                        >
                          {client.firstName} {client.lastName}
                        </Link>
                        <p className="mt-0.5 text-[13px] text-[#7C8393] flex flex-wrap items-center gap-x-1.5">
                          <span className="capitalize">
                            {client.primaryGoal.replaceAll('_', ' ')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{client.environment}</span>
                          {pkg ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{pkg.name}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 pl-8 sm:pl-0">
                      <div className="text-left sm:text-right tabular-nums">
                        <p className="text-[14px] font-semibold text-[#F5F5F7]">
                          {adherence}% adherence
                        </p>
                        <p className="text-[12px] text-[#7C8393]">
                          {streak.currentStreak} day streak
                        </p>
                      </div>
                      <Link
                        to={`/studio/clients/${client.id}`}
                        className="glass-control min-h-[40px] px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center shrink-0 transition-colors"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Invite Client Sheet */}
      <GlassSheet
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={COPY.trainer.inviteTitle}
        description="Generate a demo invitation link for a prospective client."
      >
        <div className="flex flex-col gap-5">
          <form onSubmit={handleCreateInvite} className="flex flex-col gap-3">
            <InputField
              label="Client label or sample email"
              value={inviteLabel}
              onChange={(e) => setInviteLabel(e.target.value)}
              placeholder="e.g., Meenakshi Rao (Weight Management)"
            />
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
              Suggested package
              <select
                value={suggestedPkgId}
                onChange={(e) => setSuggestedPkgId(e.target.value)}
                className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7]"
              >
                {trainerPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <GlassButton type="submit" fullWidth>
              Generate demo invitation
            </GlassButton>
          </form>

          <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
            <p className="text-[13px] font-semibold text-[#F5F5F7]">Recent invitations</p>
            {trainerInvites.map((inv) => (
              <div
                key={inv.id}
                className="rounded-[14px] surface-elevated p-3.5 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-[#F5F5F7] tabular-nums">
                    {inv.token}
                  </span>
                  <span className="text-[12px] text-[#A2A8B5] capitalize">{inv.status}</span>
                </div>
                <p className="text-[12px] text-[#7C8393]">
                  {inv.clientEmailOrLabel} · Expires {formatIndiaDate(inv.expiresAt.slice(0, 10), 'short')}
                </p>
                {inv.status === 'active' ? (
                  <div className="flex gap-2 pt-1">
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      onClick={() => copyInviteLink(inv.token)}
                    >
                      {copiedToken === inv.token ? (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy demo invitation
                        </>
                      )}
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="tertiary"
                      onClick={() => revokeInvite(inv.id)}
                    >
                      Revoke
                    </GlassButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </GlassSheet>
    </AppShell>
  );
};
