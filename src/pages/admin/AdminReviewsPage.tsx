import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Star, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminOverviewStats } from '../../types/domain';
import { formatIndiaDate } from '../../lib/date';
import { GlassButton } from '../../components/ui/GlassButton';

export const AdminReviewsPage: React.FC = () => {
  const { fetchAdminOverview, moderateAdminContent } = useApp();
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminOverview();
      if (res.ok && res.overview) setOverview(res.overview);
    } finally { setLoading(false); }
  }, [fetchAdminOverview]);

  useEffect(() => { void load(); }, [load]);

  const reviews = overview?.recentReviews ?? [];

  const handleDelete = async (reviewId: string) => {
    setBusyId(reviewId);
    try {
      const res = await moderateAdminContent({ action: 'delete_review', reviewId });
      if (res.ok) {
        setOverview((prev) => prev ? {
          ...prev,
          totalReviews: Math.max(0, prev.totalReviews - 1),
          recentReviews: prev.recentReviews.filter((r) => r.id !== reviewId),
        } : prev);
      }
    } finally { setBusyId(null); }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Reviews</h1>
          <p className="mt-1 text-[13px] text-[#A2A8B5]">Moderate client reviews across the platform.</p>
        </div>
        <GlassButton variant="secondary" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </GlassButton>
      </div>

      <section className="surface-card rounded-[24px] p-5 sm:p-6">
        <h2 className="text-[16px] font-semibold mb-4">Recent reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-[13px] text-[#A2A8B5]">No reviews yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.08]">
            {reviews.map((r) => (
              <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="font-semibold text-[#F5F5F7]">{r.authorName}</span>
                    <span className="inline-flex items-center gap-1 text-[#FFB06B] tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-[#FF803E] text-[#FF803E]" aria-hidden="true" />
                      {r.rating}/5
                    </span>
                    <span className="text-[11px] text-[#7C8393]">
                      Trainer {r.trainerId} · {formatIndiaDate(r.createdAt.slice(0, 10), 'short')}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#A2A8B5]">{r.comment}</p>
                </div>
                <GlassButton size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => void handleDelete(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </GlassButton>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
