import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { AdminOverviewStats } from '../../types/domain';
import { formatINR } from '../../lib/date';
import { GlassButton } from '../../components/ui/GlassButton';
import { MetricCard } from '../../components/ui/MetricCard';

export const AdminOverviewPage: React.FC = () => {
  const { firebaseUser, fetchAdminOverview } = useApp();
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminOverview();
      if (res.ok && res.overview) setOverview(res.overview);
      else if (res.error) setError(res.error);
    } finally {
      setLoading(false);
    }
  }, [fetchAdminOverview]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 400);
    };
    const channel = supabase
      .channel('admin-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainer_profiles' }, refresh)
      .subscribe();
    return () => { window.clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [load]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[12px] font-medium text-[#FFB06B]">Admin: {firebaseUser?.email}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.025em]">Dashboard</h1>
          <p className="mt-1 text-[13px] text-[#A2A8B5]">
            Platform health, revenue, and key metrics at a glance.
          </p>
        </div>
        <GlassButton variant="secondary" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </GlassButton>
      </div>

      {error && (
        <div className="rounded-[20px] surface-card border-[#FFB86C]/35 p-4 text-[13px] text-[#FFB86C] mb-4">
          {error}
        </div>
      )}

      {overview && (
        <section aria-label="Platform metrics" className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard label="Total accounts" value={overview.totalUsers} subtitle={`${overview.totalClients} clients · ${overview.totalTrainers} coaches`} />
          <MetricCard label="Published coaches" value={overview.publishedTrainers} accentColor="#B8E66C" subtitle={`${overview.verifiedTrainers} verified badges`} />
          <MetricCard label="Active subscriptions" value={overview.activeSubscriptions} accentColor="#70C8ED" subtitle={`${overview.activeRelationships} active pairings`} />
          <MetricCard label="Captured revenue" value={formatINR(overview.capturedRevenueInr)} accentColor="#FF803E" subtitle={`${overview.capturedPaymentsCount} payments`} />
          <MetricCard label="Pending verifications" value={overview.pendingVerifications} subtitle="Credential queue" />
          <MetricCard label="Client reviews" value={overview.totalReviews} subtitle="Verified reviews" />
        </section>
      )}
    </>
  );
};
