import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Bell, KeyRound, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { COPY } from '../../data/copy';
import type { ConsentType, NotificationPrefs } from '../../types/domain';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_TIMEZONES } from '../../lib/date';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassModal } from '../../components/ui/GlassModal';
import { InputField } from '../../components/ui/InputField';
import { PWAInstallButton } from '../../components/ui/PWAInstallButton';

const TRAINER_CONSENTS: { type: ConsentType; label: string; description: string }[] = [
  {
    type: 'terms_privacy',
    label: 'Terms of Use & Coach Privacy Policy (v2026.1)',
    description: 'Applies to coach storefronts, client coaching records, and data retention.',
  },
  {
    type: 'ai_coaching',
    label: 'AI Plan Copilot drafting',
    description: 'Use Gemini-assisted plan drafting in AI Builder (always trainer-reviewed before publishing).',
  },
  {
    type: 'notifications',
    label: 'Booking & client alerts',
    description: 'Receive consultation booking and client completion notifications.',
  },
];

export const StudioSettingsPage: React.FC = () => {
  const {
    store,
    activeUser,
    activeTrainer,
    isCloudSynced,
    isPlatformAdmin,
    firebaseUser,
    authBusy,
    consents,
    notificationPrefs,
    updateNotificationPrefs,
    pushToast,
    verificationRequests,
    recordConsent,
    submitVerificationRequest,
    sendPasswordReset,
    deleteMyAccount,
    signOutGoogle,
    switchDemoPersona,
    updateTimezone,
    setDemoSimulationFlags,
    resetDemoState,
  } = useApp();
  const navigate = useNavigate();

  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported',
  );

  const [qualTitle, setQualTitle] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [credentialRef, setCredentialRef] = useState('');
  const [verifError, setVerifError] = useState('');
  const [verifBusy, setVerifBusy] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const hasPasswordProvider = useMemo(
    () => Boolean(firebaseUser?.providerData?.some((p) => p.providerId === 'password')),
    [firebaseUser],
  );

  const isConsentGranted = (type: ConsentType): boolean => {
    const match = consents.find((c) => c.consentType === type);
    if (match) return match.granted;
    if (type === 'terms_privacy') return Boolean(activeUser.privacyConsentAccepted);
    return true;
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualTitle.trim() || !issuingBody.trim()) {
      setVerifError('Enter both your qualification title and issuing organization.');
      return;
    }
    setVerifError('');
    setVerifBusy(true);
    try {
      await submitVerificationRequest({
        qualificationTitle: qualTitle.trim(),
        issuingBody: issuingBody.trim(),
        credentialRef: credentialRef.trim() || undefined,
      });
      setQualTitle('');
      setIssuingBody('');
      setCredentialRef('');
    } catch (err) {
      setVerifError(err instanceof Error ? err.message : 'Unable to submit verification request.');
    } finally {
      setVerifBusy(false);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE to permanently confirm account removal.');
      return;
    }
    setDeleteError('');
    const res = await deleteMyAccount();
    if (res.ok) {
      setDeleteModalOpen(false);
      navigate('/welcome', { replace: true });
    } else if (res.error) {
      setDeleteError(res.error);
    }
  };

  const latestReq = verificationRequests.find((r) => r.trainerId === activeTrainer?.id);

  return (
    <AppShell pageTitle="Studio settings">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-[#FFB06B] inline-flex items-center gap-1.5">
              {isCloudSynced && firebaseUser ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#B8E66C]" aria-hidden="true" />
                  <span>
                    Signed in ({firebaseUser.email || activeUser.email}) · Cloud synced
                  </span>
                </>
              ) : (
                'Demo controls only · Role preview switch is not real authorization'
              )}
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              Studio settings & tools
            </h1>
          </div>
          {firebaseUser ? (
            <GlassButton
              variant="secondary"
              size="sm"
              disabled={authBusy}
              onClick={() => {
                void signOutGoogle().then(() => navigate('/auth'));
              }}
            >
              Sign out
            </GlassButton>
          ) : null}
        </div>

        {/* Mobile Quick Links to Extra Studio Areas */}
        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Studio shortcuts</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Link
              to="/studio/templates"
              className="glass-control min-h-[44px] px-3 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 flex items-center justify-center transition-colors"
            >
              Templates
            </Link>
            <Link
              to="/studio/ai-builder"
              className="glass-control min-h-[44px] px-3 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 flex items-center justify-center transition-colors"
            >
              AI Builder
            </Link>
            <Link
              to="/studio/packages"
              className="glass-control min-h-[44px] px-3 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 flex items-center justify-center transition-colors"
            >
              Packages
            </Link>
            <Link
              to="/studio/storefront"
              className="glass-control min-h-[44px] px-3 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 flex items-center justify-center transition-colors"
            >
              Storefront
            </Link>
          </div>
        </section>

        {/* Coach Credential Verification */}
        {isCloudSynced && activeTrainer ? (
          <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Coach verification</h2>
                <p className="text-[13px] text-[#A2A8B5] mt-0.5">
                  Verified badge status is reviewed by FitPlus platform admins.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full ${
                  activeTrainer.verificationStatus === 'verified'
                    ? 'bg-[#B8E66C]/15 text-[#B8E66C]'
                    : activeTrainer.verificationStatus === 'pending'
                      ? 'bg-[#FF803E]/15 text-[#FFB06B]'
                      : 'bg-white/[0.06] text-[#A2A8B5]'
                }`}
              >
                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {activeTrainer.verificationStatus === 'verified'
                  ? 'Verified'
                  : activeTrainer.verificationStatus === 'pending'
                    ? 'Under review'
                    : 'Unverified'}
              </span>
            </div>

            {latestReq ? (
              <div className="rounded-[14px] surface-elevated p-3.5 text-[13px] text-[#A2A8B5]">
                <p className="text-[#F5F5F7] font-medium">
                  Latest submission: {latestReq.qualificationTitle} ({latestReq.issuingBody})
                </p>
                <p className="mt-1">
                  Status: <span className="capitalize text-[#FFB06B]">{latestReq.status}</span>
                  {latestReq.reviewNote ? ` · ${latestReq.reviewNote}` : ''}
                </p>
              </div>
            ) : null}

            {activeTrainer.verificationStatus !== 'verified' &&
            activeTrainer.verificationStatus !== 'pending' ? (
              <form onSubmit={(e) => void handleSubmitVerification(e)} className="flex flex-col gap-3">
                <InputField
                  label="Certification or qualification"
                  value={qualTitle}
                  onChange={(e) => setQualTitle(e.target.value)}
                  placeholder="e.g., ACE Certified Personal Trainer / K11 Diploma"
                />
                <InputField
                  label="Issuing body"
                  value={issuingBody}
                  onChange={(e) => setIssuingBody(e.target.value)}
                  placeholder="e.g., ACE Fitness, K11 School of Fitness Sciences"
                />
                <InputField
                  label="Certificate / registry reference"
                  optionalTag="Optional"
                  value={credentialRef}
                  onChange={(e) => setCredentialRef(e.target.value)}
                  placeholder="Certificate ID or verification link"
                />
                {verifError ? (
                  <p role="alert" className="text-[13px] text-[#FF6B70]">
                    {verifError}
                  </p>
                ) : null}
                <GlassButton type="submit" size="sm" disabled={verifBusy}>
                  {verifBusy ? 'Submitting…' : 'Submit for verification'}
                </GlassButton>
              </form>
            ) : null}
          </section>
        ) : null}

        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Timezone</h2>
          <select
            value={activeUser.timezone}
            onChange={(e) => updateTimezone(e.target.value)}
            aria-label="Timezone"
            className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7]"
          >
            {AVAILABLE_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </section>

        {/* Notification Preferences & App Install */}
        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-[#F5F5F7] inline-flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
              Notifications & install
            </h2>
            <p className="text-[13px] text-[#A2A8B5] mt-1">
              Manage booking reminders, billing receipts, and install FitPlus as a standalone studio app.
            </p>
          </div>

          <div className="divide-y divide-white/[0.08]">
            {(
              [
                {
                  key: 'assignmentReminders',
                  label: 'Client check-in & task digests',
                  desc: 'Track client task completions and review flags.',
                },
                {
                  key: 'consultationAlerts',
                  label: 'Consultation bookings & reschedules',
                  desc: 'Receive updates when clients book or modify consultation slots.',
                },
                {
                  key: 'streakMilestones',
                  label: 'Client consistency milestones',
                  desc: 'Highlight multi-day client consistency milestones in notifications.',
                },
                {
                  key: 'billingReceipts',
                  label: 'Cashfree INR payment notices',
                  desc: 'Receive alerts when package checkouts are captured.',
                },
              ] as { key: keyof NotificationPrefs; label: string; desc: string }[]
            ).map((item) => (
              <label
                key={item.key}
                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4 cursor-pointer"
              >
                <div>
                  <p className="text-[14px] font-medium text-[#F5F5F7]">{item.label}</p>
                  <p className="text-[12px] text-[#7C8393] mt-0.5">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(notificationPrefs[item.key])}
                  onChange={(e) =>
                    void updateNotificationPrefs({
                      ...notificationPrefs,
                      [item.key]: e.target.checked,
                    })
                  }
                  className="mt-1 h-5 w-5 accent-[#FF803E] shrink-0"
                />
              </label>
            ))}
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-[#A2A8B5] inline-flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#70C8ED]" aria-hidden="true" />
              <span>
                Browser alerts:{' '}
                <strong className="text-[#F5F5F7] capitalize">
                  {browserPerm === 'unsupported' ? 'Not supported' : browserPerm}
                </strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {browserPerm !== 'unsupported' && browserPerm !== 'granted' ? (
                <GlassButton
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void window.Notification.requestPermission().then((perm) => {
                      setBrowserPerm(perm);
                      const enabled = perm === 'granted';
                      void updateNotificationPrefs({
                        ...notificationPrefs,
                        browserPushEnabled: enabled,
                      });
                      if (!enabled) {
                        pushToast('Browser notifications were not enabled.', 'info');
                      }
                    });
                  }}
                >
                  Enable browser alerts
                </GlassButton>
              ) : null}
              <PWAInstallButton compact />
            </div>
          </div>
        </section>

        {/* Privacy & Consent Controls */}
        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Privacy & consent</h2>
          <div className="divide-y divide-white/[0.08]">
            {TRAINER_CONSENTS.map((item) => (
              <label
                key={item.type}
                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4 cursor-pointer"
              >
                <div>
                  <p className="text-[14px] font-medium text-[#F5F5F7]">{item.label}</p>
                  <p className="text-[12px] text-[#7C8393] mt-0.5">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isConsentGranted(item.type)}
                  onChange={(e) => void recordConsent(item.type, e.target.checked)}
                  className="mt-1 h-5 w-5 accent-[#FF803E] shrink-0"
                />
              </label>
            ))}
          </div>
        </section>

        {isCloudSynced && firebaseUser ? (
          <section className="surface-card rounded-[22px] p-5 flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Account security</h2>
            <div className="flex flex-wrap gap-2.5">
              {hasPasswordProvider && firebaseUser.email ? (
                <GlassButton
                  variant="secondary"
                  size="sm"
                  disabled={authBusy}
                  onClick={() => void sendPasswordReset(firebaseUser.email!)}
                >
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  Send password reset email
                </GlassButton>
              ) : null}
              {isPlatformAdmin ? (
                <Link
                  to="/admin"
                  className="glass-control min-h-[40px] px-4 rounded-[12px] text-[13px] font-medium text-[#FFB06B] inline-flex items-center"
                >
                  Open Admin Console
                </Link>
              ) : null}
              <GlassButton
                variant="destructive"
                size="sm"
                disabled={authBusy}
                onClick={() => {
                  setDeleteConfirmText('');
                  setDeleteError('');
                  setDeleteModalOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Delete account & data
              </GlassButton>
            </div>
          </section>
        ) : null}

        {!isCloudSynced ? (
          <>
            <section className="surface-card rounded-[22px] p-5 flex flex-col gap-3">
              <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Preview client views</h2>
              <div className="grid gap-2">
                <GlassButton
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    switchDemoPersona('usr_demo_client');
                    navigate('/app/home');
                  }}
                >
                  Preview Client App
                </GlassButton>
              </div>
            </section>

            <section className="surface-card rounded-[22px] p-5 flex flex-wrap gap-2.5">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDemoSimulationFlags({ simulateLoading: !store.session.simulateLoading })
                }
              >
                Preview loading state
              </GlassButton>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDemoSimulationFlags({ simulateError: !store.session.simulateError })
                }
              >
                Preview error state
              </GlassButton>
              <GlassButton variant="destructive" size="sm" onClick={resetDemoState}>
                {COPY.client.resetDemo}
              </GlassButton>
            </section>
          </>
        ) : null}
      </div>

      <GlassModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete FitPlus studio account"
        description="This permanently deletes your trainer profile, packages, invitations, and account data."
      >
        <form onSubmit={(e) => void handleConfirmDelete(e)} className="flex flex-col gap-4">
          <InputField
            label="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            error={deleteError}
          />
          <div className="flex gap-2.5">
            <GlassButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="destructive" fullWidth disabled={authBusy}>
              {authBusy ? 'Deleting…' : 'Permanently delete'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </AppShell>
  );
};
