import React, { useState } from 'react';
import { BadgeCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndiaDate } from '../../lib/date';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField } from '../../components/ui/InputField';

export const AdminVerificationsPage: React.FC = () => {
  const { verificationRequests, resolveVerificationRequest } = useApp();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = verificationRequests.filter((r) => r.status === 'pending');
  const resolved = verificationRequests.filter((r) => r.status !== 'pending');

  const handleDecision = async (requestId: string, trainerId: string, approve: boolean) => {
    setBusyId(requestId);
    try {
      await resolveVerificationRequest({
        requestId, trainerId, approve,
        reviewNote: reviewNotes[requestId]?.trim() || undefined,
      });
    } finally { setBusyId(null); }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Verifications</h1>
        <p className="mt-1 text-[13px] text-[#A2A8B5]">Review trainer credential submissions.</p>
      </div>

      <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4 mb-6">
        <h2 className="text-[16px] font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-[13px] text-[#A2A8B5]">No pending credential submissions.</p>
        ) : (
          <div className="grid gap-4">
            {pending.map((req) => (
              <div key={req.id} className="rounded-[18px] surface-elevated p-4 flex flex-col gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-[#F5F5F7] flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                    {req.qualificationTitle}
                  </p>
                  <p className="text-[12px] text-[#A2A8B5] mt-0.5">
                    Issuing body: {req.issuingBody}{req.credentialRef ? ` · Ref: ${req.credentialRef}` : ''}
                  </p>
                  <p className="text-[11px] text-[#7C8393] mt-0.5 tabular-nums">
                    Trainer ID: {req.trainerId} · Submitted {formatIndiaDate(req.createdAt.slice(0, 10), 'short')}
                  </p>
                </div>
                <InputField
                  label="Review note" optionalTag="Optional"
                  value={reviewNotes[req.id] || ''}
                  onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="Reason for approval or rejection"
                />
                <div className="flex flex-wrap gap-2.5">
                  <GlassButton size="sm" disabled={busyId === req.id} onClick={() => void handleDecision(req.id, req.trainerId, true)}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </GlassButton>
                  <GlassButton variant="destructive" size="sm" disabled={busyId === req.id} onClick={() => void handleDecision(req.id, req.trainerId, false)}>
                    <XCircle className="w-4 h-4" /> Decline
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="surface-card rounded-[24px] p-5 sm:p-6">
          <h2 className="text-[16px] font-semibold mb-3">Recent decisions</h2>
          <div className="divide-y divide-white/[0.08]">
            {resolved.slice(0, 20).map((req) => (
              <div key={req.id} className="text-[13px] text-[#A2A8B5] flex flex-wrap justify-between gap-2 py-2">
                <span>{req.qualificationTitle} ({req.trainerId})</span>
                <span className={req.status === 'approved' ? 'text-[#B8E66C] capitalize' : 'text-[#FF6B70] capitalize'}>
                  {req.status}{req.reviewNote ? ` · ${req.reviewNote}` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
};
