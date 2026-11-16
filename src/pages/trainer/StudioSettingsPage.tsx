import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { AVAILABLE_TIMEZONES } from '../../lib/date';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';

export const StudioSettingsPage: React.FC = () => {
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

  return (
    <AppShell pageTitle="Studio settings">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-[#FFB06B]">
              {isCloudSynced && firebaseUser
                ? `Signed in with Google (${firebaseUser.email || activeUser.email}) · Cloud synced`
                : 'Demo controls only · Role preview switch is not real authorization'}
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              Studio settings & tools
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

        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Preview client views</h2>
          <div className="grid gap-2">
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() => {
                switchDemoPersona('usr_client_aarav');
                navigate('/app/home');
              }}
            >
              Preview Client App (Aarav Mehta)
            </GlassButton>
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() => {
                switchDemoPersona('usr_client_kavya');
                navigate('/app/home');
              }}
            >
              Preview Independent Client (Kavya Sharma)
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
      </div>
    </AppShell>
  );
};
