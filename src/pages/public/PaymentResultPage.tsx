import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Lock,
  Receipt,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../lib/date';
import { getClientCashfreeMode } from '../../lib/cashfree';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { GlassButton } from '../../components/ui/GlassButton';

type PaymentResultState = 'verifying' | 'paid' | 'pending' | 'failed' | 'cancelled';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const {
    isAuthReady,
    firebaseUser,
    isEmailVerified,
    isCloudSynced,
    verifyPackageOrder,
  } = useApp();

  const orderId = searchParams.get('order_id')?.trim() || '';
  const paymentId = searchParams.get('payment_id')?.trim() || undefined;
  const cashfreeMode = getClientCashfreeMode();

  const [status, setStatus] = useState<PaymentResultState>('verifying');
  const [busy, setBusy] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [packageName, setPackageName] = useState<string>('Coaching Package');
  const [amountInr, setAmountInr] = useState<number>(0);
  const [providerPaymentId, setProviderPaymentId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [detailMessage, setDetailMessage] = useState<string>('');

  const autoTriggeredRef = useRef<string | null>(null);

  const runVerification = useCallback(async () => {
    if (!orderId) {
      setStatus('failed');
      setDetailMessage('No payment order reference was provided in the return link.');
      return;
    }

    setBusy(true);
    setStatus('verifying');
    try {
      const res = await verifyPackageOrder({ orderId, paymentId });
      if (res.invoiceNumber) setInvoiceNumber(res.invoiceNumber);
      if (res.packageName) setPackageName(res.packageName);
      if (typeof res.amountInr === 'number') setAmountInr(res.amountInr);
      if (res.providerPaymentId) setProviderPaymentId(res.providerPaymentId);
      if (res.paymentMethod) setPaymentMethod(res.paymentMethod);

      if (res.status === 'paid') {
        setStatus('paid');
        setDetailMessage('Your coaching subscription and relationship are now active.');
      } else if (res.status === 'pending') {
        setStatus('pending');
        setDetailMessage(
          res.message ||
            'Your bank or UPI app has not finalized this payment yet. Refresh in a few seconds without paying again.',
        );
      } else if (res.status === 'cancelled') {
        setStatus('cancelled');
        setDetailMessage(
          res.error || 'Checkout was exited before payment completion. No active charge was captured.',
        );
      } else {
        setStatus('failed');
        setDetailMessage(
          res.error || 'We could not confirm this payment with Cashfree. Please review and try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  }, [orderId, paymentId, verifyPackageOrder]);

  useEffect(() => {
    if (!isAuthReady || !isCloudSynced || !firebaseUser || !isEmailVerified) return;
    if (!orderId) {
      setStatus('failed');
      setDetailMessage('No payment order reference was found in the URL.');
      return;
    }
    const triggerKey = `${orderId}:${paymentId || ''}`;
    if (autoTriggeredRef.current === triggerKey) return;
    autoTriggeredRef.current = triggerKey;
    void runVerification();
  }, [isAuthReady, isCloudSynced, firebaseUser, isEmailVerified, orderId, paymentId, runVerification]);

  const redirectBackUrl = `${location.pathname}${location.search}`;

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <PublicTopBar />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex items-center justify-center">
        {!isAuthReady ? (
          <div className="w-full rounded-[28px] surface-card p-7 sm:p-8 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-[#FF803E] mx-auto animate-spin" aria-hidden="true" />
            <h1 className="text-[22px] font-semibold">Checking session…</h1>
            <p className="text-[14px] text-[#A2A8B5]">
              Verifying your FitPlus account before checking Cashfree payment status.
            </p>
          </div>
        ) : !firebaseUser || !isEmailVerified ? (
          <div className="w-full rounded-[28px] surface-card p-7 sm:p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#252A35] border border-white/[0.1] flex items-center justify-center text-[#FF803E] mx-auto">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-[24px] font-semibold">Sign in to confirm payment</h1>
            <p className="text-[14px] text-[#A2A8B5]">
              Sign in with your FitPlus account to verify order{' '}
              <span className="font-mono text-[#F5F5F7]">{orderId || 'reference'}</span> against Cashfree and unlock your coaching plan.
            </p>
            <Link
              to={`/auth?redirect=${encodeURIComponent(redirectBackUrl)}`}
              className="min-h-[46px] px-5 py-2.5 rounded-[14px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#FF9259] transition-colors"
            >
              Sign in & verify payment
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="w-full rounded-[28px] surface-card p-7 sm:p-8 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3">
              {status === 'verifying' ? (
                <div className="w-14 h-14 rounded-full bg-[#FF803E]/15 border border-[#FF803E]/30 flex items-center justify-center text-[#FF803E]">
                  <RefreshCw className="w-7 h-7 animate-spin" aria-hidden="true" />
                </div>
              ) : status === 'paid' ? (
                <div className="w-14 h-14 rounded-full bg-[#B8E66C]/15 border border-[#B8E66C]/30 flex items-center justify-center text-[#B8E66C]">
                  <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
                </div>
              ) : status === 'pending' ? (
                <div className="w-14 h-14 rounded-full bg-[#70C8ED]/15 border border-[#70C8ED]/30 flex items-center justify-center text-[#70C8ED]">
                  <Clock3 className="w-7 h-7" aria-hidden="true" />
                </div>
              ) : status === 'cancelled' ? (
                <div className="w-14 h-14 rounded-full bg-white/[0.08] border border-white/[0.15] flex items-center justify-center text-[#A2A8B5]">
                  <XCircle className="w-7 h-7" aria-hidden="true" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#FF6B70]/15 border border-[#FF6B70]/30 flex items-center justify-center text-[#FF6B70]">
                  <AlertCircle className="w-7 h-7" aria-hidden="true" />
                </div>
              )}

              <div>
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#FFB06B]">
                  Cashfree Payments · {cashfreeMode === 'sandbox' ? 'Sandbox' : 'Live'}
                </p>
                <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">
                  {status === 'verifying'
                    ? 'Confirming payment…'
                    : status === 'paid'
                      ? 'Enrollment confirmed'
                      : status === 'pending'
                        ? 'Payment confirmation pending'
                        : status === 'cancelled'
                          ? 'Checkout cancelled'
                          : 'Payment not completed'}
                </h1>
                <p className="mt-1.5 text-[14px] text-[#A2A8B5]">
                  {status === 'verifying'
                    ? 'Verifying transaction status directly with Cashfree servers.'
                    : detailMessage}
                </p>
              </div>
            </div>

            {orderId ? (
              <div className="rounded-[18px] bg-[#101218] border border-white/[0.08] p-4 space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#7C8393]">Order ID</span>
                  <span className="font-mono text-[#F5F5F7] text-[12px]">{orderId}</span>
                </div>
                {packageName ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#7C8393]">Package</span>
                    <span className="text-[#F5F5F7] font-medium">{packageName}</span>
                  </div>
                ) : null}
                {amountInr > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#7C8393]">Amount</span>
                    <span className="text-[#F5F5F7] font-semibold tabular-nums">
                      {formatINR(amountInr)}
                    </span>
                  </div>
                ) : null}
                {invoiceNumber ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#7C8393]">Invoice</span>
                    <span className="text-[#B8E66C] font-mono text-[12px]">{invoiceNumber}</span>
                  </div>
                ) : null}
                {providerPaymentId ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#7C8393]">Cashfree Payment ID</span>
                    <span className="text-[#A2A8B5] font-mono text-[12px]">{providerPaymentId}</span>
                  </div>
                ) : null}
                {paymentMethod ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#7C8393]">Method</span>
                    <span className="text-[#A2A8B5] uppercase">{paymentMethod}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-2.5">
              {status === 'paid' ? (
                <>
                  <Link
                    to="/app/coach"
                    className="flex-1 min-h-[46px] px-5 rounded-[14px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#FF9259] transition-colors"
                  >
                    Open coach workspace
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/app/payments"
                    className="flex-1 min-h-[46px] px-5 rounded-[14px] glass-control text-[#F5F5F7] text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:border-white/20 transition-colors"
                  >
                    <Receipt className="w-4 h-4" aria-hidden="true" />
                    View receipt
                  </Link>
                </>
              ) : status === 'pending' ? (
                <>
                  <GlassButton
                    fullWidth
                    disabled={busy}
                    onClick={() => void runVerification()}
                  >
                    <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Check status again
                  </GlassButton>
                  <Link
                    to="/app/payments"
                    className="flex-1 min-h-[46px] px-5 rounded-[14px] glass-control text-[#F5F5F7] text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:border-white/20 transition-colors"
                  >
                    View billing
                  </Link>
                </>
              ) : status !== 'verifying' ? (
                <>
                  <Link
                    to="/discover"
                    className="flex-1 min-h-[46px] px-5 rounded-[14px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#FF9259] transition-colors"
                  >
                    Browse coaches
                  </Link>
                  <Link
                    to="/app/payments"
                    className="flex-1 min-h-[46px] px-5 rounded-[14px] glass-control text-[#F5F5F7] text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:border-white/20 transition-colors"
                  >
                    Billing & receipts
                  </Link>
                </>
              ) : null}
            </div>

            <p className="text-[12px] text-[#7C8393] flex items-center justify-center gap-1.5 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B8E66C] shrink-0" aria-hidden="true" />
              Authoritative server-side verification via Cashfree PG APIs.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
