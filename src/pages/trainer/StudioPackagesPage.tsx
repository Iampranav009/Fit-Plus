import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, ExternalLink, Pause, Play, Plus } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { BillingCadence, Package } from '../../types/domain';
import { formatINR } from '../../lib/date';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { InputField, TextAreaField } from '../../components/ui/InputField';

export const StudioPackagesPage: React.FC = () => {
  const { store, activeTrainer, savePackage, togglePackageStatus } = useApp();

  const trainerPackages = useMemo(
    () => store.packages.filter((p) => p.trainerId === activeTrainer?.id),
    [store.packages, activeTrainer?.id],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [priceInr, setPriceInr] = useState(999);
  const [cadence, setCadence] = useState<BillingCadence>('monthly');
  const [summary, setSummary] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);

  const openNew = () => {
    setEditingId(undefined);
    setName('');
    setPriceInr(999);
    setCadence('monthly');
    setSummary('');
    setFeaturesText('Weekly check-in\nStructured workout & nutrition guidance');
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setName(pkg.name);
    setPriceInr(pkg.priceInr);
    setCadence(pkg.cadence);
    setSummary(pkg.summary);
    setFeaturesText(pkg.features.join('\n'));
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    savePackage({
      id: editingId,
      name: name.trim(),
      priceInr: Math.max(0, Number(priceInr) || 0),
      cadence,
      summary: summary.trim() || 'Demo coaching package.',
      features: featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      status: 'active',
    });
    setModalOpen(false);
  };

  const handleCopyInvite = async () => {
    const activeInvite = store.invites.find(
      (i) => i.trainerId === activeTrainer?.id && i.status === 'active',
    );
    const token = activeInvite?.token || 'FIT-ARJUN-2026';
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${token}`);
    } catch {
      // ignore
    }
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <AppShell pageTitle="Packages">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">
              Example INR pricing only · No live payment processing
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.trainer.packagesTitle}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <GlassButton variant="glass" size="sm" onClick={handleCopyInvite}>
              {copiedInvite ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Copied invite
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  Copy demo invite
                </>
              )}
            </GlassButton>
            {activeTrainer ? (
              <Link
                to={`/trainers/${activeTrainer.slug}`}
                className="glass-control min-h-[40px] px-4 py-2 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center gap-1.5 transition-colors"
              >
                Preview storefront
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            ) : null}
            <GlassButton size="sm" onClick={openNew}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Create package
            </GlassButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trainerPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`surface-card rounded-[22px] p-5 flex flex-col justify-between gap-4 ${
                pkg.status === 'paused' ? 'opacity-70' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[18px] font-semibold text-[#F5F5F7]">{pkg.name}</h2>
                  <span className="text-[12px] text-[#7C8393] capitalize">{pkg.status}</span>
                </div>
                <p className="mt-2 text-[26px] font-semibold text-[#F5F5F7] tabular-nums">
                  {formatINR(pkg.priceInr)}
                  <span className="text-[13px] font-normal text-[#7C8393]">/{pkg.cadence}</span>
                </p>
                <p className="mt-2 text-[14px] text-[#A2A8B5]">{pkg.summary}</p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/[0.08]">
                <GlassButton size="sm" variant="secondary" fullWidth onClick={() => openEdit(pkg)}>
                  Edit
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="tertiary"
                  fullWidth
                  onClick={() => togglePackageStatus(pkg.id)}
                >
                  {pkg.status === 'active' ? (
                    <>
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                      Resume
                    </>
                  )}
                </GlassButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GlassSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit demo package' : 'Create demo package'}
        description="Sample pricing shown on your public demo storefront."
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <InputField
            label="Package name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Price"
              unit="INR"
              type="number"
              min={0}
              value={priceInr}
              onChange={(e) => setPriceInr(Math.max(0, Number(e.target.value) || 0))}
            />
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
              Cadence
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as BillingCadence)}
                className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="free">Free</option>
              </select>
            </label>
          </div>
          <TextAreaField
            label="Summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <TextAreaField
            label="Included features (one per line)"
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
          />
          <div className="flex gap-2.5 pt-2">
            <GlassButton type="button" variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth>
              Save package
            </GlassButton>
          </div>
        </form>
      </GlassSheet>
    </AppShell>
  );
};
