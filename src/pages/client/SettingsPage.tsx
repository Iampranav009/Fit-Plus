import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_TIMEZONES } from '../../lib/date';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';

export const SettingsPage: React.FC = () => {
  const {
    store,
    activeUser,
    isCloudSynced,
    firebaseUser,
    signOutGoogle,
    switchDemoPersona,
    updateTimezone,
    setDemoSimulationFlags,
    resetDemoState,
  } = useApp();
  const navigate = useNavigate();

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
            <p className="text-[13px] font-medium text-[#FFB06B]">
              {isCloudSynced && firebaseUser
                ? `Signed in with Google (${firebaseUser.email || activeUser.email}) · Cloud synced`
                : 'Demo controls only · Role preview switch is not real authorization'}
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              Settings & demo preview
            </h1>
          </div>
          {firebaseUser ? (
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                void signOutGoogle().then(() => navigate('/auth'));
              }}
            >
              Sign out of Google
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

        {/* Role & Fixture Scenario Preview Switcher */}
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

        {/* QA Loading / Error States & Reset */}
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
      </div>
    </AppShell>
  );
};
