import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, FolderPlus, Plus, Share2, Trash2, UserCheck, UserPlus, X, MessageSquare } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { GoalFocus } from '../../types/domain';
import { formatIndiaDate } from '../../lib/date';
import { computeClientAdherencePercent, computeStreakSummary } from '../../lib/streak';
import { computeClientPulse } from '../../lib/pulseEngine';
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
    isCloudSynced,
    linkedClientsForActiveTrainer,
    pendingRelationshipsForActiveTrainer,
    clientGroups,
    clientGroupMembers,
    subscriptions,
    getClientApprovedRecoveryDates,
    createClientGroup,
    deleteClientGroup,
    respondPendingRelationship,
    createInvite,
    revokeInvite,
  } = useApp();
  const navigate = useNavigate();

  const trainerPackages = useMemo(
    () => store.packages.filter((p) => p.trainerId === activeTrainer?.id && p.status === 'active'),
    [store.packages, activeTrainer?.id],
  );

  const [query, setQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<'all' | GoalFocus>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteLabel, setInviteLabel] = useState('');
  const [suggestedPkgId, setSuggestedPkgId] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [respondingRelId, setRespondingRelId] = useState<string | null>(null);

  const resolvedPkgId = suggestedPkgId || trainerPackages[0]?.id || '';

  const filteredClients = useMemo(() => {
    const groupMemberIds =
      groupFilter === 'all'
        ? null
        : new Set(
            clientGroupMembers
              .filter((m) => m.groupId === groupFilter)
              .map((m) => m.clientId),
          );

    return linkedClientsForActiveTrainer.filter((c) => {
      if (goalFilter !== 'all' && c.primaryGoal !== goalFilter) return false;
      if (groupMemberIds && !groupMemberIds.has(c.id)) return false;
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${c.firstName} ${c.lastName} ${c.primaryGoal} ${c.environment}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [linkedClientsForActiveTrainer, goalFilter, groupFilter, clientGroupMembers, query]);

  const trainerInvites = useMemo(
    () => store.invites.filter((i) => i.trainerId === activeTrainer?.id),
    [store.invites, activeTrainer?.id],
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
    createInvite(inviteLabel, resolvedPkgId || undefined);
    setInviteLabel('');
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    createClientGroup({ name: newGroupName, description: newGroupDesc });
    setNewGroupName('');
    setNewGroupDesc('');
  };

  const handleRespondPending = async (relationshipId: string, action: 'accept' | 'decline') => {
    setRespondingRelId(relationshipId);
    try {
      await respondPendingRelationship(relationshipId, action);
    } finally {
      setRespondingRelId(null);
    }
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

  const shareInviteLink = async (token: string, label: string) => {
    const url = `${window.location.origin}/join/${token}`;
    const text = `You're invited to train with ${activeTrainer?.displayName ?? 'your coach'} on FitPlus! Join here:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FitPlus Invitation', text, url });
        return;
      } catch { /* user cancelled or share failed — fall through to WhatsApp */ }
    }
    const waText = encodeURIComponent(`${text} ${url}`);
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener');
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
            <GlassButton variant="glass" size="sm" onClick={() => setGroupModalOpen(true)}>
              <FolderPlus className="w-4 h-4" aria-hidden="true" />
              Groups ({clientGroups.length})
            </GlassButton>
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

        {/* Pending Coaching Requests Queue */}
        {pendingRelationshipsForActiveTrainer.length > 0 ? (
          <section
            aria-label="Pending coaching requests"
            className="surface-card rounded-[22px] border-[#FF803E]/35 p-4 sm:p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                <h2 className="text-[16px] font-semibold text-[#F5F5F7]">
                  Pending coaching requests ({pendingRelationshipsForActiveTrainer.length})
                </h2>
              </div>
              <span className="text-[12px] text-[#7C8393]">Requires your approval</span>
            </div>
            <div className="divide-y divide-white/[0.08]">
              {pendingRelationshipsForActiveTrainer.map((rel) => {
                const reqClient = store.clients.find((c) => c.id === rel.clientId);
                const reqPkg = store.packages.find((p) => p.id === rel.packageId);
                const busy = respondingRelId === rel.id;
                return (
                  <div
                    key={rel.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-[#F5F5F7]">
                        {reqClient
                          ? `${reqClient.firstName} ${reqClient.lastName}`
                          : `Client ${rel.clientId.slice(0, 8)}`}
                      </p>
                      <p className="text-[12px] text-[#A2A8B5] capitalize">
                        {reqClient
                          ? `${reqClient.primaryGoal.replaceAll('_', ' ')} · ${reqClient.environment}`
                          : 'Incoming request'}
                        {reqPkg ? ` · Package: ${reqPkg.name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GlassButton
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void handleRespondPending(rel.id, 'decline')}
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        Decline
                      </GlassButton>
                      <GlassButton
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleRespondPending(rel.id, 'accept')}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        {busy ? 'Saving...' : 'Accept client'}
                      </GlassButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

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

          {clientGroups.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]" role="group" aria-label="Filter by custom client group">
              <span className="text-[12px] text-[#7C8393] mr-1">Custom groups:</span>
              <button
                type="button"
                onClick={() => setGroupFilter('all')}
                aria-pressed={groupFilter === 'all'}
                className={`min-h-[34px] px-3 rounded-[10px] text-[12px] font-medium border cursor-pointer transition-colors ${
                  groupFilter === 'all'
                    ? 'bg-white/12 border-white/25 text-[#F5F5F7]'
                    : 'bg-[#101218] border-white/[0.08] text-[#A2A8B5]'
                }`}
              >
                Any group
              </button>
              {clientGroups.map((grp) => {
                const count = clientGroupMembers.filter((m) => m.groupId === grp.id).length;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setGroupFilter(grp.id)}
                    aria-pressed={groupFilter === grp.id}
                    className={`min-h-[34px] px-3 rounded-[10px] text-[12px] font-medium border cursor-pointer transition-colors tabular-nums ${
                      groupFilter === grp.id
                        ? 'bg-[#FF803E]/20 border-[#FF803E] text-[#FFB06B]'
                        : 'bg-[#101218] border-white/[0.08] text-[#A2A8B5] hover:text-[#F5F5F7]'
                    }`}
                  >
                    {grp.name} ({count})
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Client Roster List */}
        {filteredClients.length === 0 ? (
          <EmptyState
            artwork="clients"
            title={
              linkedClientsForActiveTrainer.length === 0
                ? 'No linked clients yet'
                : 'No clients match this filter'
            }
            description={
              linkedClientsForActiveTrainer.length === 0
                ? 'Create an invite link or accept an incoming coaching request to start coaching clients.'
                : isCloudSynced
                  ? 'Clear your search or filter to see all linked clients.'
                  : 'Clear your search or filter to see all linked demo clients.'
            }
            actionLabel={linkedClientsForActiveTrainer.length === 0 ? 'Invite a client' : 'Show all clients'}
            onAction={() => {
              if (linkedClientsForActiveTrainer.length === 0) {
                setInviteModalOpen(true);
              } else {
                setQuery('');
                setGoalFilter('all');
                setGroupFilter('all');
              }
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
                const approvedRecovery = getClientApprovedRecoveryDates(client.id);
                const adherence = computeClientAdherencePercent(
                  client.id,
                  store.assignments,
                  store.completions,
                  todayKey,
                  7,
                  approvedRecovery,
                );
                const clientAsg = store.assignments.filter((a) => a.clientId === client.id);
                const clientCmp = store.completions.filter((c) => c.clientId === client.id);
                const streak = computeStreakSummary(
                  clientAsg,
                  clientCmp,
                  todayKey,
                  120,
                  approvedRecovery,
                );
                const rel = store.relationships.find(
                  (r) => r.clientId === client.id && r.status === 'active',
                );
                const pkg = store.packages.find((p) => p.id === rel?.packageId);
                const pulse = computeClientPulse({
                  client,
                  assignments: store.assignments,
                  completions: store.completions,
                  todayKey,
                  workoutSessions: store.workoutSessions ?? [],
                  weeklyCheckIns: store.weeklyCheckIns ?? [],
                  subscription: subscriptions.find((s) => s.clientId === client.id),
                  approvedRecoveryDates: approvedRecovery,
                });

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
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/studio/clients/${client.id}`}
                            className="text-[16px] font-semibold text-[#F5F5F7] hover:text-[#FF803E] transition-colors"
                          >
                            {client.firstName} {client.lastName}
                          </Link>
                          {pulse.status === 'on_track' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              On Track
                            </span>
                          )}
                          {pulse.status === 'needs_attention' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Attention
                            </span>
                          )}
                          {pulse.status === 'follow_up_recommended' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              Follow-up
                            </span>
                          )}
                          {pulse.status === 'insufficient_data' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/50 border border-white/10">
                              New
                            </span>
                          )}
                        </div>
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

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                      <div className="text-left sm:text-right tabular-nums">
                        <p className="text-[14px] font-semibold text-[#F5F5F7]">
                          {adherence}% adherence
                        </p>
                        <p className="text-[12px] text-[#7C8393]">
                          {streak.currentStreak} day streak
                        </p>
                      </div>
                      <Link
                        to={`/studio/messages?client=${client.id}`}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
                        title={`Message ${client.firstName}`}
                      >
                        <MessageSquare className="w-4 h-4 text-[#FF803E]" />
                      </Link>
                      <Link
                        to={`/studio/clients/${client.id}`}
                        className="glass-control min-h-[36px] px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center shrink-0 transition-colors"
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

      {/* Custom Client Groups Sheet */}
      <GlassSheet
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title="Custom client groups"
        description="Organize your roster into batches for targeted programming and bulk task assignment."
      >
        <div className="flex flex-col gap-5">
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-3">
            <InputField
              label="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g., Morning 7 AM Batch"
            />
            <InputField
              label="Description"
              optionalTag="Optional"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="e.g., Beginner home strength track"
            />
            <GlassButton type="submit" fullWidth>
              Create group
            </GlassButton>
          </form>

          <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
            <p className="text-[13px] font-semibold text-[#F5F5F7]">Your groups</p>
            {clientGroups.length === 0 ? (
              <p className="text-[13px] text-[#7C8393]">
                No custom groups yet. Create one above, then assign clients from any client profile.
              </p>
            ) : (
              clientGroups.map((grp) => {
                const count = clientGroupMembers.filter((m) => m.groupId === grp.id).length;
                return (
                  <div
                    key={grp.id}
                    className="rounded-[14px] surface-elevated p-3.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[14px] font-semibold text-[#F5F5F7]">{grp.name}</p>
                      <p className="text-[12px] text-[#7C8393] tabular-nums">
                        {count} member{count === 1 ? '' : 's'}
                        {grp.description ? ` · ${grp.description}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteClientGroup(grp.id)}
                      aria-label={`Delete ${grp.name}`}
                      className="min-h-[36px] min-w-[36px] rounded-[10px] border border-white/[0.08] flex items-center justify-center text-[#A2A8B5] hover:text-[#FF6B70] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </GlassSheet>

      {/* Invite Client Sheet */}
      <GlassSheet
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={COPY.trainer.inviteTitle}
        description={
          isCloudSynced
            ? 'Generate a cryptographic invitation link to onboard a prospective client.'
            : 'Generate a demo invitation link for a prospective client.'
        }
      >
        <div className="flex flex-col gap-5">
          <form onSubmit={handleCreateInvite} className="flex flex-col gap-3">
            <InputField
              label={isCloudSynced ? 'Client name or email label' : 'Client label or sample email'}
              value={inviteLabel}
              onChange={(e) => setInviteLabel(e.target.value)}
              placeholder="e.g., Meenakshi Rao (Weight Management)"
            />
            {trainerPackages.length > 0 ? (
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                Suggested package
                <select
                  value={resolvedPkgId}
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
            ) : null}
            <GlassButton type="submit" fullWidth>
              {isCloudSynced ? 'Create invitation link' : 'Generate demo invitation'}
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
                  <div className="flex flex-wrap gap-2 pt-1">
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
                          Copy client link
                        </>
                      )}
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      onClick={() => shareInviteLink(inv.token, inv.clientEmailOrLabel)}
                    >
                      <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Share
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
