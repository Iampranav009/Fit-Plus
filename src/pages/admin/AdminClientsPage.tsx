import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminOverviewStats } from '../../types/domain';
import { formatIndiaDate } from '../../lib/date';
import { GlassButton } from '../../components/ui/GlassButton';

export const AdminClientsPage: React.FC = () => {
  const { fetchAdminOverview } = useApp();
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTrainer, setFilterTrainer] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminOverview();
      if (res.ok && res.overview) setOverview(res.overview);
    } finally { setLoading(false); }
  }, [fetchAdminOverview]);

  useEffect(() => { void load(); }, [load]);

  const clients = overview?.clientsSummary ?? [];
  const trainers = overview?.trainersSummary ?? [];

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.trainerName || '').toLowerCase().includes(q);
    const matchesTrainer = filterTrainer === 'all' || (filterTrainer === 'none' ? !c.trainerProfileId : c.trainerProfileId === filterTrainer);
    return matchesSearch && matchesTrainer;
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Clients</h1>
          <p className="mt-1 text-[13px] text-[#A2A8B5]">
            View all clients and their associated trainers.
          </p>
        </div>
        <GlassButton variant="secondary" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </GlassButton>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C8393] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or trainer…"
            className="w-full h-[42px] pl-9 pr-4 rounded-[14px] bg-white/[0.06] border border-white/[0.10] text-[13px] text-[#F5F5F7] placeholder:text-[#7C8393] outline-none focus:border-[#B8E66C]/40 transition-colors"
          />
        </div>
        <select
          value={filterTrainer}
          onChange={(e) => setFilterTrainer(e.target.value)}
          className="h-[42px] px-3 rounded-[14px] bg-white/[0.06] border border-white/[0.10] text-[13px] text-[#F5F5F7] outline-none focus:border-[#B8E66C]/40 transition-colors cursor-pointer"
        >
          <option value="all">All trainers</option>
          <option value="none">No trainer</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>{t.displayName}</option>
          ))}
        </select>
      </div>

      {/* Client list */}
      <section className="surface-card rounded-[24px] p-5 sm:p-6">
        <h2 className="text-[16px] font-semibold mb-4">All clients ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <p className="text-[13px] text-[#A2A8B5]">No clients found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#7C8393] border-b border-white/[0.08]">
                  <th className="py-2.5 pr-4 font-semibold">Client</th>
                  <th className="py-2.5 pr-4 font-semibold">Email</th>
                  <th className="py-2.5 pr-4 font-semibold">Goal</th>
                  <th className="py-2.5 pr-4 font-semibold">Trainer</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-[#F5F5F7]">{c.firstName} {c.lastName}</span>
                    </td>
                    <td className="py-3 pr-4 text-[#70C8ED] break-all">{c.email}</td>
                    <td className="py-3 pr-4 text-[#A2A8B5] capitalize">{c.primaryGoal.replace(/_/g, ' ')}</td>
                    <td className="py-3 pr-4">
                      {c.trainerName ? (
                        <div>
                          <span className="text-[#F5F5F7]">{c.trainerName}</span>
                          {c.trainerEmail && <span className="block text-[11px] text-[#7C8393]">{c.trainerEmail}</span>}
                        </div>
                      ) : (
                        <span className="text-[#7C8393]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        c.relationshipStatus === 'active'
                          ? 'bg-[#B8E66C]/15 text-[#B8E66C]'
                          : c.relationshipStatus === 'none'
                            ? 'bg-white/[0.06] text-[#7C8393]'
                            : 'bg-[#FFB86C]/15 text-[#FFB86C]'
                      }`}>
                        {c.relationshipStatus === 'none' ? 'Unassigned' : c.relationshipStatus}
                      </span>
                    </td>
                    <td className="py-3 text-[#7C8393] tabular-nums whitespace-nowrap">
                      {c.createdAt ? formatIndiaDate(c.createdAt.slice(0, 10), 'short') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};
