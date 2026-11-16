import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, KeyRound, Receipt, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { COPY } from '../../data/copy';
import type { ConsentType, NotificationPrefs } from '../../types/domain';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_TIMEZONES } from '../../lib/date';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassModal } from '../../components/ui/GlassModal';
import { InputField } from '../../components/ui/InputField';
import { PWAInstallButton } from '../../components/ui/PWAInstallButton';

const CONSENT_ITEMS: { type: ConsentType; label: string; description: string }[] = [
  {
    type: 'terms_privacy',
    label: 'Terms of Use & Privacy Policy (v2026.1)',
    description: 'Required for maintaining a FitPlus coaching account and data storage.',
  },
  {
    type: 'health_data',
    label: 'Activity, hydration & body metric tracking',
    description: 'Store daily check-ins, weight logs, and hydration progress in your private workspace.',
  },
  {
    type: 'ai_coaching',
    label: 'AI-assisted coaching summaries',
    description: 'Allow your coach to generate AI draft workout and meal suggestions for review.',
  },
  {
    type: 'notifications',
    label: 'Coaching reminders & session updates',
    description: 'Receive assignment alerts and consultation booking updates.',
  },
];

export const SettingsPage: React.FC = () => {
  const {
    store,
    activeUser,
    isCloudSynced,
    isPlatformAdmin,
    firebaseUser,
    authBusy,
    consents,
    notificationPrefs,
    updateNotificationPrefs,
    pushToast,
    recordConsent,
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
    return type === 'health_data';
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

  const clientPersonas = [
    { id: 'usr_client_aarav', label: 'Aarav Mehta — Active client with plan & streak' },
    { id: 'usr_client_ananya', label: 'Ananya Iyer — Recovery day fixture' },
    { id: 'usr_client_karan', label: 'Karan Malhotra — No commitments today' },
    { id: 'usr_client_kavya', label: 'Kavya Sharma — Independent client (no coach)' },
  ];

  return (
    <AppShell pageTitle={isCloudSynced ? 'Settings' : 'Demo settings'}>
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
              {isCloudSynced ? 'Account & preferences' : 'Settings & demo preview'}
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

        {/* Timezone */}
        <section className="rounded-[22px] surface-card p-5 flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Locale & timezone</h2>
          <p className="text-[13px] text-[#A2A8B5]">
            India locale (en-IN, INR, kg/cm) with Asia/Kolkata default.
          </p>
          <label className="flex flex-col gap-1.5 text-[13px] text-[#F5F5F7]">
            Timezone
            <select
              value={activeUser.timezone}
              onChange={(e) => updateTimezone(e.target.value)}
              className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px] text-[#F5F5F7] focus:border-[#FF803E]"
            >
              {AVAILABLE_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* Notification Preferences & App Install */}
        <section className="rounded-[22px] surface-card p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-[#F5F5F7] inline-flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                Notifications & install
              </h2>
              <p className="text-[13px] text-[#A2A8B5] mt-1">
                Choose which reminders FitPlus records and optionally enable browser alerts.
              </p>
            </div>
            <Link
              to="/app/payments"
              className="glass-control min-h-[38px] px-3.5 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] inline-flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5 text-[#FF803E]" aria-hidden="true" />
              Billing & receipts
            </Link>
          </div>

          <div className="divide-y divide-white/[0.08]">
            {(
              [
                {
                  key: 'assignmentReminders',
                  label: 'Daily assignment reminders',
                  desc: 'Surface pending workout, nutrition, and habit check-ins.',
                },
                {
                  key: 'consultationAlerts',
                  label: 'Consultation schedule updates',
                  desc: 'Receive alerts for booked sessions, reschedules, and meeting links.',
                },
                {
                  key: 'streakMilestones',
                  label: 'Consistency streak milestones',
                  desc: 'Celebrate multi-day consistency streaks when today wraps up.',
                },
                {
                  key: 'billingReceipts',
                  label: 'INR billing & receipt notices',
                  desc: 'Keep invoice confirmations and subscription renewal reminders active.',
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
        <section className="rounded-[22px] surface-card p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Privacy & data consent</h2>
            <p className="text-[13px] text-[#A2A8B5] mt-1">
              Manage how your FitPlus fitness and coaching preferences are stored and processed.
            </p>
          </div>
          <div className="divide-y divide-white/[0.08]">
            {CONSENT_ITEMS.map((item) => {
              const granted = isConsentGranted(item.type);
              return (
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
                    checked={granted}
                    onChange={(e) => void recordConsent(item.type, e.target.checked)}
                    className="mt-1 h-5 w-5 accent-[#FF803E] shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </section>

        {/* Account Security & Deletion */}
        {isCloudSynced && firebaseUser ? (
          <section className="rounded-[22px] surface-card p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Account security</h2>
              <p className="text-[13px] text-[#A2A8B5] mt-1">
                Verified email: {firebaseUser.email || activeUser.email}
              </p>
            </div>
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

        {/* Demo Sandbox Controls (never shown inside verified live cloud sessions) */}
        {!isCloudSynced ? (
          <>
            <section className="rounded-[22px] surface-card p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Quick demo preview switch</h2>
                <p className="text-[13px] text-[#A2A8B5] mt-1">
                  Test different fixtures or switch into the Trainer Studio workspace.
                </p>
              </div>

              <div className="grid gap-2">
                {clientPersonas.map((p) => {
                  const active = activeUser.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        switchDemoPersona(p.id);
                        navigate('/app/home');
                      }}
                      className={`min-h-[48px] px-4 py-2.5 rounded-[14px] border text-left text-[14px] font-medium cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                          : 'bg-[#101218] border-white/[0.08] text-[#A2A8B5] hover:text-[#F5F5F7]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    switchDemoPersona('usr_trainer_arjun');
                    navigate('/studio/overview');
                  }}
                  className={`min-h-[48px] px-4 py-2.5 rounded-[14px] border text-left text-[14px] font-medium cursor-pointer transition-colors ${
                    activeUser.role === 'trainer'
                      ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                      : 'bg-[#101218] border-white/[0.08] text-[#F5F5F7] hover:border-[#FF803E]'
                  }`}
                >
                  Switch to Trainer Studio — Arjun Kulkarni (7 linked clients)
                </button>
              </div>
            </section>

            <section className="rounded-[22px] surface-card p-5 flex flex-col gap-3">
              <h2 className="text-[17px] font-semibold text-[#F5F5F7]">QA state previews & reset</h2>
              <div className="flex flex-wrap gap-2.5">
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
              </div>
            </section>
          </>
        ) : null}
      </div>

      <GlassModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete FitPlus account"
        description="This permanently deletes your account, profile, workout history, and coaching records. This cannot be undone."
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
