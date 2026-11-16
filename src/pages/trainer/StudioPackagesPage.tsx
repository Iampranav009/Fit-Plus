import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, ExternalLink, Pause, Play, Plus, Receipt } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { BillingCadence, Package } from '../../types/domain';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { computePackageDurationDays } from '../../lib/commerce';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { InputField, TextAreaField } from '../../components/ui/InputField';

export const StudioPackagesPage: React.FC = () => {
  const {
    store,
    activeTrainer,
    payments,
    isCloudSynced,
    savePackage,
    togglePackageStatus,
  } = useApp();

  const trainerPackages = useMemo(
    () => store.packages.filter((p) => p.trainerId === activeTrainer?.id),
    [store.packages, activeTrainer?.id],
  );

  const trainerCapturedPayments = useMemo(() => {
    if (!activeTrainer) return [];
    return payments
      .filter((p) => p.trainerId === activeTrainer.id && p.status === 'captured')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [payments, activeTrainer]);

  const totalCapturedInr = useMemo(
    () => trainerCapturedPayments.reduce((sum, p) => sum + p.amountInr, 0),
    [trainerCapturedPayments],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [priceInr, setPriceInr] = useState(999);
  const [cadence, setCadence] = useState<BillingCadence>('monthly');
  const [durationDays, setDurationDays] = useState(30);
  const [consultationsIncluded, setConsultationsIncluded] = useState(4);
  const [summary, setSummary] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);

  const openNew = () => {
    setEditingId(undefined);
    setName('');
    setPriceInr(999);
    setCadence('monthly');
    setDurationDays(30);
    setConsultationsIncluded(4);
    setSummary('');
    setFeaturesText('Weekly check-in\nStructured workout & nutrition guidance');
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setName(pkg.name);
    setPriceInr(pkg.priceInr);
    setCadence(pkg.cadence);
    setDurationDays(computePackageDurationDays(pkg));
    setConsultationsIncluded(pkg.consultationsIncluded ?? (pkg.cadence === 'free' ? 0 : 4));
    setSummary(pkg.summary);
    setFeaturesText(pkg.features.join('\n'));
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const clampedDuration = Math.min(366, Math.max(1, Math.round(Number(durationDays) || 30)));
    const clampedConsults = Math.min(60, Math.max(0, Math.round(Number(consultationsIncluded) || 0)));
    savePackage({
      id: editingId,
      name: name.trim(),
      priceInr: cadence === 'free' ? 0 : Math.max(0, Number(priceInr) || 0),
      cadence,
      durationDays: clampedDuration,
      consultationsIncluded: clampedConsults,
      summary: summary.trim() || 'Structured 1-on-1 coaching package.',
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
              {isCloudSynced
                ? 'Server-verified INR packages · Cashfree checkout & free-tier enrollments'
                : 'Example INR pricing only · No live payment processing in demo'}
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
                  {isCloudSynced ? 'Copy invite link' : 'Copy demo invite'}
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
                  {pkg.cadence === 'free' || pkg.priceInr === 0 ? 'Free' : formatINR(pkg.priceInr)}
                  <span className="text-[13px] font-normal text-[#7C8393]">
                    {pkg.cadence === 'free' ? '' : `/${pkg.cadence}`}
                  </span>
                </p>
                <p className="mt-1 text-[12px] text-[#7C8393] tabular-nums">
                  {computePackageDurationDays(pkg)} days · {pkg.consultationsIncluded ?? 0} consultations
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

        {/* Captured Client Payments & Invoices */}
        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-[#F5F5F7] inline-flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
              Captured package receipts
            </h2>
            <span className="text-[14px] font-semibold text-[#B8E66C] tabular-nums">
              {formatINR(totalCapturedInr)} total
            </span>
          </div>

          {trainerCapturedPayments.length === 0 ? (
            <p className="text-[14px] text-[#A2A8B5]">
              {isCloudSynced
                ? 'Verified Cashfree checkouts, historical receipts, and client enrollments will appear here.'
                : 'Sign in with a cloud-synced trainer account to view live Cashfree INR receipts.'}
            </p>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {trainerCapturedPayments.slice(0, 12).map((p) => (
                <div key={p.id} className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-medium text-[#F5F5F7]">{p.packageName}</p>
                    <p className="text-[12px] text-[#7C8393] tabular-nums">
                      {p.invoiceNumber} · {formatIndiaDate((p.paidAt || p.createdAt).slice(0, 10), 'short')}
                    </p>
                  </div>
                  <span className="text-[15px] font-semibold text-[#F5F5F7] tabular-nums">
                    {formatINR(p.amountInr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <GlassSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? isCloudSynced
              ? 'Edit package'
              : 'Edit demo package'
            : isCloudSynced
              ? 'Create package'
              : 'Create demo package'
        }
        description={
          isCloudSynced
            ? 'Published packages appear on your public FitPlus storefront with server-verified INR pricing.'
            : 'Sample pricing shown on your public demo storefront.'
        }
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
                onChange={(e) => {
                  const next = e.target.value as BillingCadence;
                  setCadence(next);
                  setDurationDays(next === 'quarterly' ? 90 : 30);
                  if (next === 'free') {
                    setPriceInr(0);
                    setConsultationsIncluded(0);
                  }
                }}
                className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="free">Free</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Duration"
              unit="days"
              type="number"
              min={1}
              max={366}
              value={durationDays}
              onChange={(e) => setDurationDays(Math.max(1, Math.min(366, Number(e.target.value) || 30)))}
            />
            <InputField
              label="1-on-1 consults"
              unit="sessions"
              type="number"
              min={0}
              max={60}
              value={consultationsIncluded}
              onChange={(e) =>
                setConsultationsIncluded(Math.max(0, Math.min(60, Number(e.target.value) || 0)))
              }
            />
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
