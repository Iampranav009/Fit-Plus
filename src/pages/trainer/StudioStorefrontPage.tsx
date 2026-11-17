import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import * as supabaseService from '../../data/supabaseService';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';

export const StudioStorefrontPage: React.FC = () => {
  const { activeTrainer, isCloudSynced, firebaseUser, pushToast, updateTrainerProfile } = useApp();

  const [headline, setHeadline] = useState(activeTrainer?.headline || '');
  const [city, setCity] = useState(activeTrainer?.city || '');
  const [bio, setBio] = useState(activeTrainer?.bio || '');
  const [coachingStyle, setCoachingStyle] = useState(activeTrainer?.coachingStyle || '');
  const [certsInput, setCertsInput] = useState((activeTrainer?.certifications || []).join(', '));
  const [whatsappE164, setWhatsappE164] = useState(activeTrainer?.whatsappBusinessE164 || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!activeTrainer) return null;

  const handlePhotoUpload = async (file?: File | null) => {
    if (!file || !isCloudSynced || !firebaseUser) return;
    setUploadingPhoto(true);
    try {
      const { photoUrl } = await supabaseService.uploadTrainerPhotoToStorage({
        uid: firebaseUser.uid,
        file,
      });
      updateTrainerProfile({ photoUrl });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to upload profile photo.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedWa = whatsappE164.trim();
    if (cleanedWa && !/^\+[1-9]\d{6,14}$/.test(cleanedWa)) {
      pushToast('Enter WhatsApp Business number in E.164 format (e.g., +919876543210).', 'error');
      return;
    }
    const certifications = certsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateTrainerProfile({
      headline: headline.trim() || activeTrainer.headline,
      city: city.trim() || activeTrainer.city,
      bio: bio.trim() || activeTrainer.bio,
      coachingStyle: coachingStyle.trim() || activeTrainer.coachingStyle,
      certifications,
      whatsappBusinessE164: cleanedWa || undefined,
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
            <p className="text-[13px] text-[#7C8393]">
              {isCloudSynced ? 'Public coaching profile' : 'Public demo listing'}
            </p>
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
                  {isCloudSynced ? 'Copy profile link' : 'Copy demo profile link'}
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

        {/* Publish visibility banner */}
        <div className={`rounded-[18px] p-4 flex items-center justify-between gap-3 border ${activeTrainer.isPublished ? 'bg-[#1A2B1A] border-[#4CAF50]/30' : 'bg-[#2A1A0E] border-[#FF803E]/25'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {activeTrainer.isPublished ? (
              <Eye className="w-4 h-4 text-[#4CAF50] shrink-0" aria-hidden="true" />
            ) : (
              <EyeOff className="w-4 h-4 text-[#FF803E] shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#F5F5F7]">
                {activeTrainer.isPublished ? 'Visible in Discover' : 'Hidden from Discover'}
              </p>
              <p className="text-[12px] text-[#A2A8B5]">
                {activeTrainer.isPublished
                  ? 'Your profile is listed in the public trainer directory.'
                  : 'Only people with your direct invite link can find you.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateTrainerProfile({ isPublished: !activeTrainer.isPublished })}
            className={`shrink-0 min-h-[36px] px-3.5 rounded-[10px] text-[12px] font-semibold transition-colors cursor-pointer ${activeTrainer.isPublished ? 'bg-white/[0.07] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.1]' : 'bg-[#FF803E]/15 text-[#FFB06B] hover:bg-[#FF803E]/25 border border-[#FF803E]/25'}`}
          >
            {activeTrainer.isPublished ? 'Hide' : 'Publish'}
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="surface-card rounded-[22px] p-5 sm:p-6 flex flex-col gap-4"
        >
          {isCloudSynced ? (
            <div className="flex items-center gap-4 pb-2 border-b border-white/[0.08]">
              {activeTrainer.photoUrl ? (
                <img
                  src={activeTrainer.photoUrl}
                  alt={activeTrainer.displayName}
                  className="w-16 h-16 rounded-[14px] object-cover border border-white/15 shrink-0"
                />
              ) : null}
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-[#F5F5F7]">Profile photo</p>
                <label className="glass-control min-h-[38px] px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-[#F5F5F7] cursor-pointer inline-flex items-center">
                  <span>{uploadingPhoto ? 'Uploading...' : 'Upload new photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingPhoto}
                    onChange={(e) => void handlePhotoUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          ) : null}

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
          <InputField
            label="Certifications"
            optionalTag="Optional · comma-separated"
            value={certsInput}
            onChange={(e) => setCertsInput(e.target.value)}
            placeholder="e.g., ACE CPT, Precision Nutrition L1"
          />
          <InputField
            label="WhatsApp Business number"
            optionalTag="Optional · E.164 format"
            value={whatsappE164}
            onChange={(e) => setWhatsappE164(e.target.value)}
            placeholder="+919876543210"
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
