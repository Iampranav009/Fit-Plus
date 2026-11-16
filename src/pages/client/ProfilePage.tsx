import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Settings } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { DietaryPreference, GoalFocus } from '../../types/domain';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField } from '../../components/ui/InputField';

export const ProfilePage: React.FC = () => {
  const {
    activeUser,
    activeClient,
    isCloudSynced,
    updateClientDetails,
    resetDemoState,
    signOutDemo,
  } = useApp();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(activeClient?.firstName || activeUser.firstName);
  const [heightCm, setHeightCm] = useState(activeClient?.heightCm ? String(activeClient.heightCm) : '');
  const [weightKg, setWeightKg] = useState(activeClient?.weightKg ? String(activeClient.weightKg) : '');
  const [primaryGoal, setPrimaryGoal] = useState<GoalFocus>(
    activeClient?.primaryGoal || 'general_fitness',
  );
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(
    activeClient?.dietaryPreference || 'vegetarian',
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateClientDetails({
      firstName: firstName.trim() || activeUser.firstName,
      heightCm: heightCm.trim() ? Number(heightCm) : undefined,
      weightKg: weightKg.trim() ? Number(weightKg) : undefined,
      primaryGoal,
      dietaryPreference,
    });
  };

  return (
    <AppShell pageTitle="You">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">
              {isCloudSynced ? `Google synced · ${activeUser.email}` : 'Demo profile'} · {activeUser.timezone}
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.client.profileTitle}
            </h1>
          </div>
          <Link
            to="/app/settings"
            className="glass-control min-h-[44px] px-4 py-2 rounded-[12px] text-[14px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
            {isCloudSynced ? 'Settings' : 'Demo settings'}
          </Link>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-[22px] surface-card p-5 sm:p-6 flex flex-col gap-4"
        >
          <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Personal details & preferences</h2>

          <InputField
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Height"
              unit="cm"
              optionalTag="Optional"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
            <InputField
              label="Current weight"
              unit="kg"
              optionalTag="Optional"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
            Primary goal
            <select
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value as GoalFocus)}
              className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[15px] text-[#F5F5F7] focus:border-[#FF803E]"
            >
              <option value="weight_management">Weight management</option>
              <option value="healthy_weight_gain">Healthy weight gain</option>
              <option value="muscle_strength">Build muscle and strength</option>
              <option value="general_fitness">General fitness</option>
              <option value="exploring">Not sure yet</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
            Dietary preference
            <select
              value={dietaryPreference}
              onChange={(e) => setDietaryPreference(e.target.value as DietaryPreference)}
              className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[15px] text-[#F5F5F7] focus:border-[#FF803E]"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="non_vegetarian">Non-vegetarian</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>

          <GlassButton type="submit">Save changes</GlassButton>
        </form>

        {/* Stage 4A Shortcuts & Features */}
        <section className="rounded-[22px] surface-card divide-y divide-white/[0.08] overflow-hidden">
          <Link
            to="/app/wrapped"
            className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF803E]/15 border border-[#FF803E]/30 flex items-center justify-center text-[#FF803E]">
                ✨
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#F5F5F7] flex items-center gap-2">
                  <span>FitPlus Wrapped</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FF803E]/20 text-[#FF803E] uppercase font-bold">
                    New
                  </span>
                </p>
                <p className="text-[13px] text-[#7C8393]">
                  Your monthly training story, consistency records & shareable cards
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C8393]" aria-hidden="true" />
          </Link>

          <Link
            to="/app/check-in"
            className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
          >
            <div>
              <p className="text-[15px] font-medium text-[#F5F5F7]">Weekly Check-in & Review</p>
              <p className="text-[13px] text-[#7C8393]">
                Reflect on weekly energy, sleep, hunger and read your coach's guidance
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C8393]" aria-hidden="true" />
          </Link>

          <Link
            to="/app/nutrition"
            className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
          >
            <div>
              <p className="text-[15px] font-medium text-[#F5F5F7]">Daily Nutrition Diary</p>
              <p className="text-[13px] text-[#7C8393]">
                Estimated Indian meal tracking, macro estimates & hydration sync
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C8393]" aria-hidden="true" />
          </Link>

          <Link
            to="/app/exercises"
            className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
          >
            <div>
              <p className="text-[15px] font-medium text-[#F5F5F7]">Exercise Library</p>
              <p className="text-[13px] text-[#7C8393]">
                Browse 30+ structured exercises with anatomical muscle diagrams and cues
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C8393]" aria-hidden="true" />
          </Link>
        </section>

        {!isCloudSynced ? (
          <section className="rounded-[22px] surface-card divide-y divide-white/[0.08] overflow-hidden">
            <Link
              to="/app/settings"
              className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
            >
              <div>
                <p className="text-[15px] font-medium text-[#F5F5F7]">
                  Role preview switcher, timezone & QA states
                </p>
                <p className="text-[13px] text-[#7C8393]">
                  Preview Trainer Studio, recovery day, no-task day, or independent client
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#7C8393]" aria-hidden="true" />
            </Link>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-medium text-[#F5F5F7]">{COPY.client.resetDemo}</p>
                <p className="text-[12px] text-[#7C8393]">{COPY.states.resetWarning}</p>
              </div>
              <div className="flex gap-2">
                <GlassButton variant="secondary" size="sm" onClick={resetDemoState}>
                  {COPY.client.resetDemo}
                </GlassButton>
                <GlassButton
                  variant="tertiary"
                  size="sm"
                  onClick={() => {
                    signOutDemo();
                    navigate('/auth');
                  }}
                >
                  {COPY.client.signOutDemo}
                </GlassButton>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
};
