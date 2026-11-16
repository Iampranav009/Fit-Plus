import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  FileText,
  Printer,
  Receipt,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PaymentRecord } from '../../types/domain';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { computeGstBreakdown } from '../../lib/commerce';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSheet } from '../../components/ui/GlassSheet';

export const ClientPaymentsPage: React.FC = () => {
  const {
    store,
    activeUser,
    activeClient,
    activeCoach,
    activeRelationship,
    subscriptions,
    payments,
    isCloudSynced,
  } = useApp();

  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const clientSubscriptions = useMemo(() => {
    if (!activeClient) return [];
    return subscriptions
      .filter((s) => s.clientId === activeClient.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [subscriptions, activeClient]);

  const activeSubscription = useMemo(
    () => clientSubscriptions.find((s) => s.status === 'active') ?? clientSubscriptions[0],
    [clientSubscriptions],
  );

  const clientPayments = useMemo(() => {
    if (!activeClient) return [];
    return payments
      .filter((p) => p.clientId === activeClient.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [payments, activeClient]);

  const activePackage = useMemo(() => {
    if (activeSubscription) {
      return store.packages.find((p) => p.id === activeSubscription.packageId);
    }
    if (activeRelationship?.packageId) {
      return store.packages.find((p) => p.id === activeRelationship.packageId);
    }
    return undefined;
  }, [activeSubscription, activeRelationship, store.packages]);

  const consultationsUsed = useMemo(() => {
    if (!activeClient) return 0;
    return store.bookings.filter(
      (b) =>
        b.clientId === activeClient.id &&
        (b.status === 'booked' || b.status === 'rescheduled' || b.status === 'completed') &&
        (!activeSubscription || b.createdAt >= activeSubscription.currentPeriodStart),
    ).length;
  }, [store.bookings, activeClient, activeSubscription]);

  const handleCopyInvoice = async (payment: PaymentRecord) => {
    const receiptText = [
      `FitPlus Payment Receipt`,
      `Invoice: ${payment.invoiceNumber}`,
      `Member: ${activeUser.firstName} ${activeUser.lastName}`,
      `Package: ${payment.packageName}`,
      `Amount: ${formatINR(payment.amountInr)} (${payment.currency})`,
      `Status: ${payment.status.toUpperCase()}`,
      `Provider: ${payment.provider === 'cashfree' ? 'Cashfree Payments' : payment.provider === 'razorpay' ? 'Razorpay (Legacy)' : 'Free tier'}`,
      (payment.providerPaymentId || payment.razorpayPaymentId) ? `Payment ID: ${payment.providerPaymentId || payment.razorpayPaymentId}` : '',
      `Date: ${formatIndiaDate((payment.paidAt || payment.createdAt).slice(0, 10), 'short')}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(receiptText);
      setCopiedId(payment.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(payment.id);
    }
  };

  return (
    <AppShell pageTitle="Billing & receipts">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/app/coach"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#A2A8B5] hover:text-[#F5F5F7] mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Back to Coach
            </Link>
            <h1 className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              Billing & receipts
            </h1>
          </div>
          <Link
            to="/discover"
            className="glass-control min-h-[40px] px-4 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] inline-flex items-center"
          >
            Browse coaching plans
          </Link>
        </div>

        {/* Active Coaching Subscription */}
        <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-[#FFB06B]">
                Current coaching plan
              </p>
              <h2 className="mt-1 text-[20px] font-semibold text-[#F5F5F7]">
                {activeSubscription?.packageName || activePackage?.name || 'No active paid subscription'}
              </h2>
              {activeCoach ? (
                <p className="text-[13px] text-[#A2A8B5] mt-0.5">
                  Coach: {activeCoach.displayName}
                </p>
              ) : null}
            </div>

            {activeSubscription ? (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold capitalize ${
                  activeSubscription.status === 'active'
                    ? 'bg-[#B8E66C]/15 text-[#B8E66C]'
                    : 'bg-white/[0.08] text-[#A2A8B5]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {activeSubscription.status}
              </span>
            ) : null}
          </div>

          {activeSubscription ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-[16px] surface-elevated p-3.5">
                <p className="text-[12px] text-[#7C8393]">Plan rate</p>
                <p className="mt-1 text-[18px] font-semibold text-[#F5F5F7] tabular-nums">
                  {formatINR(activeSubscription.priceInr)}
                  <span className="text-[12px] font-normal text-[#7C8393]">
                    /{activeSubscription.cadence}
                  </span>
                </p>
              </div>

              <div className="rounded-[16px] surface-elevated p-3.5">
                <p className="text-[12px] text-[#7C8393]">Billing period</p>
                <p className="mt-1 text-[14px] font-medium text-[#F5F5F7] tabular-nums inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF803E]" aria-hidden="true" />
                  {formatIndiaDate(activeSubscription.currentPeriodStart.slice(0, 10), 'short')} –{' '}
                  {formatIndiaDate(activeSubscription.currentPeriodEnd.slice(0, 10), 'short')}
                </p>
              </div>

              <div className="rounded-[16px] surface-elevated p-3.5">
                <p className="text-[12px] text-[#7C8393]">Consultation allowance</p>
                <p className="mt-1 text-[14px] font-medium text-[#F5F5F7] tabular-nums">
                  {activeSubscription.consultationsIncluded > 0
                    ? `${Math.max(0, activeSubscription.consultationsIncluded - consultationsUsed)} of ${activeSubscription.consultationsIncluded} remaining`
                    : 'Standard check-ins'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-[#A2A8B5]">
              {isCloudSynced
                ? 'Enroll in a coach package or redeem a trainer invite to view your active billing cycle and INR receipts.'
                : 'Sign in with a verified FitPlus account to enroll via Cashfree INR checkout and track receipts.'}
            </p>
          )}
        </section>

        {/* Payment Receipts History */}
        <section className="surface-card rounded-[24px] p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[18px] font-semibold text-[#F5F5F7] inline-flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
              Payment history
            </h2>
            <span className="text-[12px] text-[#7C8393] tabular-nums">
              {clientPayments.length} {clientPayments.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {clientPayments.length === 0 ? (
            <div className="rounded-[16px] surface-elevated p-6 text-center space-y-2">
              <CreditCard className="w-6 h-6 text-[#7C8393] mx-auto" aria-hidden="true" />
              <p className="text-[14px] text-[#A2A8B5]">No payment receipts recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {clientPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#F5F5F7]">
                        {payment.packageName}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          payment.status === 'captured'
                            ? 'bg-[#B8E66C]/15 text-[#B8E66C]'
                            : payment.status === 'failed'
                              ? 'bg-[#FF6B70]/15 text-[#FF6B70]'
                              : 'bg-[#FF803E]/15 text-[#FFB06B]'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#7C8393] tabular-nums">
                      {payment.invoiceNumber} ·{' '}
                      {formatIndiaDate((payment.paidAt || payment.createdAt).slice(0, 10), 'short')} ·{' '}
                      {payment.provider === 'cashfree'
                        ? `Cashfree INR${payment.paymentMethod ? ` (${payment.paymentMethod.toUpperCase()})` : ''}`
                        : payment.provider === 'razorpay'
                          ? 'Razorpay INR (Legacy)'
                          : 'Free plan'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[16px] font-semibold text-[#F5F5F7] tabular-nums">
                      {formatINR(payment.amountInr)}
                    </span>
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedReceipt(payment)}
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      Receipt
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Invoice Receipt Modal Sheet */}
      <GlassSheet
        open={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        title="Payment receipt"
        description={selectedReceipt ? `Invoice ${selectedReceipt.invoiceNumber}` : undefined}
      >
        {selectedReceipt ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-[18px] bg-[#101218] border border-white/[0.08] p-4 space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
                <span className="text-[#7C8393]">Amount paid</span>
                <span className="text-[18px] font-semibold text-[#F5F5F7] tabular-nums">
                  {formatINR(selectedReceipt.amountInr)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#7C8393]">Package</span>
                <span className="text-[#F5F5F7] font-medium">{selectedReceipt.packageName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#7C8393]">Status</span>
                <span className="text-[#B8E66C] capitalize font-medium">
                  {selectedReceipt.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#7C8393]">Date</span>
                <span className="text-[#F5F5F7] tabular-nums">
                  {formatIndiaDate(
                    (selectedReceipt.paidAt || selectedReceipt.createdAt).slice(0, 10),
                    'short',
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#7C8393]">Provider</span>
                <span className="text-[#F5F5F7]">
                  {selectedReceipt.provider === 'cashfree'
                    ? 'Cashfree Payments'
                    : selectedReceipt.provider === 'razorpay'
                      ? 'Razorpay (Legacy)'
                      : 'Free tier'}
                </span>
              </div>
              {selectedReceipt.paymentMethod ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#7C8393]">Method</span>
                  <span className="text-[#A2A8B5] uppercase">{selectedReceipt.paymentMethod}</span>
                </div>
              ) : null}
              {selectedReceipt.providerOrderId || selectedReceipt.razorpayOrderId ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#7C8393]">Order ID</span>
                  <span className="text-[#A2A8B5] font-mono text-[12px]">
                    {selectedReceipt.providerOrderId || selectedReceipt.razorpayOrderId}
                  </span>
                </div>
              ) : null}
              {selectedReceipt.providerPaymentId || selectedReceipt.razorpayPaymentId ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#7C8393]">Payment ID</span>
                  <span className="text-[#A2A8B5] font-mono text-[12px]">
                    {selectedReceipt.providerPaymentId || selectedReceipt.razorpayPaymentId}
                  </span>
                </div>
              ) : null}
              {selectedReceipt.refundStatus && selectedReceipt.refundStatus !== 'none' ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#7C8393]">Refund</span>
                  <span className="text-[#FFB06B] capitalize">{selectedReceipt.refundStatus}</span>
                </div>
              ) : null}

              {/* Stage 4C GST Tax Breakdown */}
              {selectedReceipt.amountInr > 0 ? (() => {
                const gst = computeGstBreakdown(selectedReceipt.amountInr);
                return (
                  <div className="pt-2.5 mt-2.5 border-t border-white/10 space-y-1.5 text-[12px]">
                    <div className="flex items-center justify-between text-[#7C8393]">
                      <span>Taxable Value (Base)</span>
                      <span>₹{gst.baseAmountInr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#7C8393]">
                      <span>CGST (9%)</span>
                      <span>₹{gst.cgstInr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#7C8393]">
                      <span>SGST (9%)</span>
                      <span>₹{gst.sgstInr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#B8E66C] font-semibold pt-1 border-t border-white/5">
                      <span>Total Amount (Inclusive)</span>
                      <span>₹{selectedReceipt.amountInr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })() : null}
            </div>

            <p className="text-[12px] text-[#7C8393] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B8E66C] shrink-0" aria-hidden="true" />
              GST Tax invoice issued via Cashfree Payment Gateway on behalf of FitPlus.
            </p>

            <div className="flex gap-2.5">
              <GlassButton
                variant="secondary"
                fullWidth
                onClick={() => void handleCopyInvoice(selectedReceipt)}
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
                {copiedId === selectedReceipt.id ? 'Copied' : 'Copy details'}
              </GlassButton>
              <GlassButton
                variant="primary"
                fullWidth
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                Print Invoice
              </GlassButton>
            </div>
          </div>
        ) : null}
      </GlassSheet>
    </AppShell>
  );
};
