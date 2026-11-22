import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminOverviewStats } from '../../types/domain';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField } from '../../components/ui/InputField';
import { MetricCard } from '../../components/ui/MetricCard';

export const AdminDashboardPage: React.FC = () => {
  const {
    firebaseUser,
    activeUser,
    verificationRequests,
    auditLogs,
    resolveVerificationRequest,
    fetchAdminOverview,
    moderateAdminContent,
    signOutGoogle,
  } = useApp();
  const navigate = useNavigate();

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [modBusyId, setModBusyId] = useState<string | null>(null);
  const [trainerInviteEmail, setTrainerInviteEmail] = useState('');
  const [trainerInviteLink, setTrainerInviteLink] = useState('');

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const res = await fetchAdminOverview();
      if (res.ok && res.overview) {
        setOverview(res.overview);
      } else if (res.error) {
        setOverviewError(res.error);
      }
    } finally {
      setOverviewLoading(false);
    }
  }, [fetchAdminOverview]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const pendingRequests = verificationRequests.filter((r) => r.status === 'pending');
  const resolvedRequests = verificationRequests.filter((r) => r.status !== 'pending');

  const handleDecision = async (requestId: string, trainerId: string, approve: boolean) => {
    setBusyId(requestId);
    try {
      await resolveVerificationRequest({
        requestId,
        trainerId,
        approve,
        reviewNote: reviewNotes[requestId]?.trim() || undefined,
      });
      void loadOverview();
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePublish = async (trainerId: string, nextPublished: boolean) => {
    setModBusyId(trainerId);
    try {
      const res = await moderateAdminContent({
        action: 'toggle_trainer_publish',
        trainerId,
        isPublished: nextPublished,
      });
      if (res.ok) {
        setOverview((prev) =>
          prev
            ? {
                ...prev,
                publishedTrainers: prev.publishedTrainers + (nextPublished ? 1 : -1),
                trainersSummary: prev.trainersSummary.map((t) =>
                  t.id === trainerId ? { ...t, isPublished: nextPublished } : t,
                ),
              }
            : prev,
        );
      }
    } finally {
      setModBusyId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setModBusyId(reviewId);
    try {
      const res = await moderateAdminContent({
        action: 'delete_review',
        reviewId,
      });
      if (res.ok) {
        setOverview((prev) =>
          prev
            ? {
                ...prev,
                totalReviews: Math.max(0, prev.totalReviews - 1),
                recentReviews: prev.recentReviews.filter((r) => r.id !== reviewId),
              }
            : prev,
        );
      }
    } finally {
      setModBusyId(null);
    }
  };

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <header className="sticky top-0 z-30 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
        <div className="glass-nav max-w-[1280px] mx-auto h-15 rounded-[18px] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="FitPlus home">
              <BrandMark />
            </Link>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#B8E66C]">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Platform Admin
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to={activeUser.role === 'trainer' ? '/studio/overview' : '/app/home'}
              className="glass-control min-h-[40px] px-3.5 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] inline-flex items-center"
            >
              Workspace
            </Link>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => void signOutGoogle().then(() => navigate('/auth'))}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign out
            </GlassButton>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1080px] w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium text-[#FFB06B]">
              Admin: {firebaseUser?.email}
            </p>
            <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.025em]">
              Trust, moderation & revenue console
            </h1>
            <p className="mt-1 text-[14px] text-[#A2A8B5]">
              Platform health, coach qualification approvals, storefront moderation, and audit logs.
            </p>
          </div>
          <GlassButton
            variant="secondary"
            size="sm"
            disabled={overviewLoading}
            onClick={() => void loadOverview()}
          >
            <RefreshCw className={`w-4 h-4 ${overviewLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh overview
          </GlassButton>
        </div>

        {/* Platform Metrics Overview */}
        {overviewError ? (
          <div className="rounded-[20px] surface-card border-[#FFB86C]/35 p-4 text-[13px] text-[#FFB86C]">
            {overviewError}
          </div>
        ) : null}

        {overview ? (
          <section aria-label="Platform overview metrics" className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <MetricCard
              label="Total accounts"
              value={overview.totalUsers}
              subtitle={`${overview.totalClients} clients · ${overview.totalTrainers} coaches`}
            />
            <MetricCard
              label="Published coaches"
              value={overview.publishedTrainers}
              accentColor="#B8E66C"
              subtitle={`${overview.verifiedTrainers} verified badges`}
            />
            <MetricCard
              label="Active subscriptions"
              value={overview.activeSubscriptions}
              accentColor="#70C8ED"
              subtitle={`${overview.activeRelationships} active pairings`}
            />
            <MetricCard
              label="Captured INR revenue"
              value={formatINR(overview.capturedRevenueInr)}
              accentColor="#FF803E"
              subtitle={`${overview.capturedPaymentsCount} verified payments`}
            />
            <MetricCard
              label="Pending verifications"
              value={overview.pendingVerifications}
              subtitle="Credential queue"
            />
            <MetricCard
              label="Client reviews"
              value={overview.totalReviews}
              subtitle="Verified relationship reviews"
            />
          </section>
        ) : null}

        {/* Invite Trainer */}
        <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-[18px] font-semibold flex items-center gap-2">
              <Send className="w-4.5 h-4.5 text-[#FFB06B]" aria-hidden="true" />
              Invite a new trainer
            </h2>
            <p className="mt-1 text-[13px] text-[#A2A8B5]">
              Generate a private sign-up link for a new coach. Only people with this link can register as trainers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <InputField
                label="Trainer email"
                optionalTag="For your reference"
                type="email"
                value={trainerInviteEmail}
                onChange={(e) => setTrainerInviteEmail(e.target.value)}
                placeholder="coach@example.com"
              />
            </div>
            <GlassButton
              size="sm"
              onClick={() => {
                const base = window.location.origin;
                const link = `${base}/trainer/login?invite=admin${trainerInviteEmail ? `&email=${encodeURIComponent(trainerInviteEmail)}` : ''}`;
                setTrainerInviteLink(link);
              }}
            >
              Generate link
            </GlassButton>
          </div>

          {trainerInviteLink ? (
            <div className="rounded-[14px] surface-elevated p-3.5 flex items-center gap-3">
              <code className="flex-1 text-[12px] text-[#A2A8B5] break-all select-all">
                {trainerInviteLink}
              </code>
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => void navigator.clipboard.writeText(trainerInviteLink)}
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy
              </GlassButton>
            </div>
          ) : null}
        </section>

        {/* Pending Verification Queue */}
        <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">
              Pending trainer verifications ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="text-[14px] text-[#A2A8B5]">
              No pending credential submissions right now.
            </p>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-[18px] surface-elevated p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[16px] font-semibold text-[#F5F5F7] flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                        {req.qualificationTitle}
                      </p>
                      <p className="text-[13px] text-[#A2A8B5] mt-0.5">
                        Issuing body: {req.issuingBody}
                        {req.credentialRef ? ` · Ref: ${req.credentialRef}` : ''}
                      </p>
                      <p className="text-[12px] text-[#7C8393] mt-0.5 tabular-nums">
                        Trainer ID: {req.trainerId} · Submitted{' '}
                        {formatIndiaDate(req.createdAt.slice(0, 10), 'short')}
                      </p>
                    </div>
                  </div>

                  <InputField
                    label="Review note"
                    optionalTag="Optional"
                    value={reviewNotes[req.id] || ''}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    placeholder="Reason for approval or rejection"
                  />

                  <div className="flex flex-wrap gap-2.5">
                    <GlassButton
                      size="sm"
                      disabled={busyId === req.id}
                      onClick={() => void handleDecision(req.id, req.trainerId, true)}
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Approve & mark verified
                    </GlassButton>
                    <GlassButton
                      variant="destructive"
                      size="sm"
                      disabled={busyId === req.id}
                      onClick={() => void handleDecision(req.id, req.trainerId, false)}
                    >
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                      Decline
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolvedRequests.length > 0 ? (
            <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2">
              <h3 className="text-[14px] font-semibold text-[#A2A8B5]">Recent decisions</h3>
              {resolvedRequests.slice(0, 10).map((req) => (
                <div
                  key={req.id}
                  className="text-[13px] text-[#A2A8B5] flex flex-wrap justify-between gap-2 py-1"
                >
                  <span>
                    {req.qualificationTitle} ({req.trainerId})
                  </span>
                  <span
                    className={
                      req.status === 'approved' ? 'text-[#B8E66C] capitalize' : 'text-[#FF6B70] capitalize'
                    }
                  >
                    {req.status}
                    {req.reviewNote ? ` · ${req.reviewNote}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Coach Storefront Moderation */}
        {overview && overview.trainersSummary.length > 0 ? (
          <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-[18px] font-semibold">
              Coach directory moderation ({overview.trainersSummary.length})
            </h2>
            <div className="divide-y divide-white/[0.08]">
              {overview.trainersSummary.map((t) => (
                <div
                  key={t.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-[#F5F5F7]">
                      {t.displayName}
                    </p>
                    <p className="text-[12px] text-[#7C8393]">
                      {t.city || 'India'} · {t.activeClientsCount} active clients · Verification:{' '}
                      <span className="capitalize text-[#A2A8B5]">{t.verificationStatus}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${
                        t.isPublished
                          ? 'bg-[#B8E66C]/15 text-[#B8E66C]'
                          : 'bg-white/[0.06] text-[#A2A8B5]'
                      }`}
                    >
                      {t.isPublished ? 'Published' : 'Hidden'}
                    </span>
                    <GlassButton
                      size="sm"
                      variant={t.isPublished ? 'secondary' : 'primary'}
                      disabled={modBusyId === t.id}
                      onClick={() => void handleTogglePublish(t.id, !t.isPublished)}
                    >
                      {t.isPublished ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          Hide storefront
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          Publish storefront
                        </>
                      )}
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Client Reviews Moderation */}
        {overview && overview.recentReviews.length > 0 ? (
          <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-[18px] font-semibold">
              Recent client reviews ({overview.recentReviews.length})
            </h2>
            <div className="divide-y divide-white/[0.08]">
              {overview.recentReviews.map((r) => (
                <div
                  key={r.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-semibold text-[#F5F5F7]">{r.authorName}</span>
                      <span className="inline-flex items-center gap-1 text-[#FFB06B] tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-[#FF803E] text-[#FF803E]" aria-hidden="true" />
                        {r.rating}/5
                      </span>
                      <span className="text-[12px] text-[#7C8393]">
                        Trainer {r.trainerId} · {formatIndiaDate(r.createdAt.slice(0, 10), 'short')}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#A2A8B5]">{r.comment}</p>
                  </div>
                  <GlassButton
                    size="sm"
                    variant="destructive"
                    disabled={modBusyId === r.id}
                    onClick={() => void handleDeleteReview(r.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Remove
                  </GlassButton>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Audit Logs */}
        <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-3">
          <h2 className="text-[18px] font-semibold">Security & compliance audit log</h2>
          {auditLogs.length === 0 ? (
            <p className="text-[14px] text-[#A2A8B5]">
              Audit events appear here when server-side admin actions occur.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {auditLogs.slice(0, 25).map((log) => (
                <div key={log.id} className="py-2.5 flex flex-wrap justify-between gap-2 text-[13px]">
                  <div>
                    <span className="font-medium text-[#F5F5F7]">{log.action}</span>
                    <span className="text-[#A2A8B5]"> · {log.summary}</span>
                  </div>
                  <span className="text-[#7C8393] tabular-nums">
                    {log.targetType}/{log.targetId} · {formatIndiaDate(log.createdAt.slice(0, 10), 'short')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
