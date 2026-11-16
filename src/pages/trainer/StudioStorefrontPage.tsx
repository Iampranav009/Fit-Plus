import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';

export const StudioStorefrontPage: React.FC = () => {
  const { activeTrainer, updateTrainerProfile } = useApp();

  const [headline, setHeadline] = useState(activeTrainer?.headline || '');
  const [city, setCity] = useState(activeTrainer?.city || '');
  const [bio, setBio] = useState(activeTrainer?.bio || '');
  const [coachingStyle, setCoachingStyle] = useState(activeTrainer?.coachingStyle || '');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!activeTrainer) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTrainerProfile({
      headline: headline.trim() || activeTrainer.headline,
      city: city.trim() || activeTrainer.city,
      bio: bio.trim() || activeTrainer.bio,
      coachingStyle: coachingStyle.trim() || activeTrainer.coachingStyle,
    });
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/trainers/${activeTrainer.slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <AppShell pageTitle="Storefront">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">Public demo listing</p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.trainer.storefrontTitle}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <GlassButton variant="glass" size="sm" onClick={handleCopyLink}>
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Copied link
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  Copy demo profile link
                </>
              )}
            </GlassButton>
            <Link
              to={`/trainers/${activeTrainer.slug}`}
              className="min-h-[40px] px-4 py-2 rounded-[12px] bg-[#FF803E] text-[#101218] text-[13px] font-semibold hover:bg-[#FF9259] inline-flex items-center gap-1.5 transition-colors"
            >
              Preview public profile
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="surface-card rounded-[22px] p-5 sm:p-6 flex flex-col gap-4"
        >
          <InputField
            label="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <InputField
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <TextAreaField
            label="About your coaching"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <TextAreaField
            label="Coaching style"
            value={coachingStyle}
            onChange={(e) => setCoachingStyle(e.target.value)}
          />
          <GlassButton type="submit">Save storefront changes</GlassButton>
        </form>
      </div>
    </AppShell>
  );
};
