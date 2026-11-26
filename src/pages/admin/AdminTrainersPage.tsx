import React, { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminOverviewStats } from '../../types/domain';
import { formatIndiaDate } from '../../lib/date';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField } from '../../components/ui/InputField';

export const AdminTrainersPage: React.FC = () => {
  const { fetchAdminOverview, moderateAdminContent } = useApp();
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminOverview();
      if (res.ok && res.overview) setOverview(res.overview);
    } finally {
      setLoading(false);
    }
  }, [fetchAdminOverview]);

  useEffect(() => { void load(); }, [load]);

  const trainers = overview?.trainersSummary ?? [];
  const filtered = trainers.filter((t) => {
    const q = search.toLowerCase();
    return !q || t.displayName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.city.toLowerCase().includes(q);
  });

  const handleTogglePublish = async (id: string, next: boolean) => {
    setBusyId(id);
    try {
      const res = await moderateAdminContent({ action: 'toggle_trainer_publish', trainerId: id, isPublished: next });
      if (res.ok) void load();
    } finally { setBusyId(null); }
  };

  const handleSuspend = async (id: string, suspended: boolean) => {
    setBusyId(id);
    try {
      const res = await moderateAdminContent({ action: 'suspend_trainer', trainerId: id, suspended });
      if (res.ok) void load();
    } finally { setBusyId(null); }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await moderateAdminContent({ action: 'delete_trainer', trainerId: id });
      if (res.ok) { setConfirmDeleteId(null); void load(); }
    } finally { setBusyId(null); }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Trainers</h1>
          <p className="mt-1 text-[13px] text-[#A2A8B5]">
            Manage all trainers — view emails, publish/hide, suspend, or remove.
          </p>
        </div>
        <GlassButton variant="secondary" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </GlassButton>
      </div>

      {/* Invite trainer */}
      <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4 mb-6">
        <div>
          <h2 className="text-[16px] font-semibold flex items-center gap-2">
            <Send className="w-4 h-4 text-[#FFB06B]" aria-hidden="true" />
            Invite a new trainer
          </h2>
          <p className="mt-1 text-[12px] text-[#A2A8B5]">Generate a private sign-up link.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <InputField label="Trainer email" optionalTag="For reference" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="coach@example.com" />
          </div>
          <GlassButton size="sm" onClick={() => {
            const link = `${window.location.origin}/trainer/login?invite=admin${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ''}`;
            setInviteLink(link);
          }}>
            Generate link
          </GlassButton>
        </div>
        {inviteLink && (
          <div className="rounded-[14px] surface-elevated p-3.5 flex items-center gap-3">
            <code className="flex-1 text-[12px] text-[#A2A8B5] break-all select-all">{inviteLink}</code>
            <GlassButton size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(inviteLink)}>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy
            </GlassButton>
          </div>
        )}
      </section>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C8393] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or city…"
            className="w-full h-[42px] pl-9 pr-4 rounded-[14px] bg-white/[0.06] border border-white/[0.10] text-[13px] text-[#F5F5F7] placeholder:text-[#7C8393] outline-none focus:border-[#B8E66C]/40 transition-colors"
          />
        </div>
      </div>

      {/* Trainer list */}
      <section className="surface-card rounded-[24px] p-5 sm:p-6">
        <h2 className="text-[16px] font-semibold mb-4">All trainers ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <p className="text-[13px] text-[#A2A8B5]">No trainers found.</p>
        ) : (
          <div className="divide-y divide-white/[0.08]">
            {filtered.map((t) => (
              <div key={t.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#F5F5F7]">{t.displayName}</p>
                    <p className="text-[12px] text-[#70C8ED] break-all">{t.email}</p>
                    <p className="text-[12px] text-[#7C8393] mt-0.5">
                      {t.city || 'India'} · {t.activeClientsCount} active clients ·{' '}
                      <span className="capitalize">{t.verificationStatus}</span>
                      {t.createdAt ? ` · Joined ${formatIndiaDate(t.createdAt.slice(0, 10), 'short')}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                      t.isPublished ? 'bg-[#B8E66C]/15 text-[#B8E66C]' : 'bg-white/[0.06] text-[#A2A8B5]'
                    }`}>
                      {t.isPublished ? 'Published' : 'Hidden'}
                    </span>
                    {!t.acceptingClients && (
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FFB86C]/15 text-[#FFB86C]">Suspended</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GlassButton size="sm" variant={t.isPublished ? 'secondary' : 'primary'} disabled={busyId === t.id} onClick={() => void handleTogglePublish(t.id, !t.isPublished)}>
                    {t.isPublished ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                  </GlassButton>
                  <GlassButton size="sm" variant="secondary" disabled={busyId === t.id} onClick={() => void handleSuspend(t.id, t.acceptingClients)}>
                    {t.acceptingClients ? <><PauseCircle className="w-3.5 h-3.5" /> Suspend</> : <><PlayCircle className="w-3.5 h-3.5" /> Reactivate</>}
                  </GlassButton>
                  {confirmDeleteId === t.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#FF6B70]">Confirm delete?</span>
                      <GlassButton size="sm" variant="destructive" disabled={busyId === t.id} onClick={() => void handleDelete(t.id)}>
                        Yes, delete
                      </GlassButton>
                      <GlassButton size="sm" variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </GlassButton>
                    </div>
                  ) : (
                    <GlassButton size="sm" variant="destructive" disabled={busyId === t.id} onClick={() => setConfirmDeleteId(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </GlassButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
