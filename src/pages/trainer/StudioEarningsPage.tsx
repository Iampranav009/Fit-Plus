import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Filter,
  HelpCircle,
  IndianRupee,
  Receipt,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSearchBar } from '../../components/ui/GlassSearchBar';
import { formatIndiaDate, formatINR } from '../../lib/date';
import { computeGstBreakdown, computeTrainerSettlement } from '../../lib/commerce';
import type { PaymentRecord } from '../../types/domain';

export const StudioEarningsPage: React.FC = () => {
  const { activeTrainer, payments, store } = useApp();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'processing' | 'captured'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentRecord | null>(null);

  // Filter payments for this trainer
  const trainerPayments = useMemo(() => {
    if (!activeTrainer) return [];
    return payments
      .filter((p) => p.trainerId === activeTrainer.id && p.status === 'captured')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [payments, activeTrainer]);

  // Financial aggregates
  const financialTotals = useMemo(() => {
    const grossInr = trainerPayments.reduce((acc, p) => acc + p.amountInr, 0);
    const settlement = computeTrainerSettlement(grossInr);
    const settledPayments = trainerPayments.filter((p) => p.settlementStatus === 'settled');
    const settledInr = settledPayments.reduce((acc, p) => acc + p.amountInr, 0);
    const settledNetInr = computeTrainerSettlement(settledInr).netPayableInr;
    const pendingNetInr = Math.max(0, settlement.netPayableInr - settledNetInr);

    return {
      grossInr,
      platformFeeInr: settlement.platformFeeInr,
      netPayableInr: settlement.netPayableInr,
      settledNetInr,
      pendingNetInr,
      txCount: trainerPayments.length,
    };
  }, [trainerPayments]);

  // Filtered rows for the ledger
  const filteredLedger = useMemo(() => {
    return trainerPayments.filter((p) => {
      if (statusFilter !== 'all') {
        const currentSettlement = p.settlementStatus || 'processing';
        if (statusFilter === 'settled' && currentSettlement !== 'settled') return false;
        if (statusFilter === 'processing' && currentSettlement === 'settled') return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const client = store.clients.find((c) => c.id === p.clientId);
        const name = `${client?.firstName || ''} ${client?.lastName || ''}`.toLowerCase();
        const hay = `${p.invoiceNumber} ${p.packageName} ${name} ${p.paymentMethod || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [trainerPayments, statusFilter, query, store.clients]);

  // Client lookup helper
  const getClientName = (clientId: string) => {
    const client = store.clients.find((c) => c.id === clientId);
    if (!client) return 'FitPlus Member';
    return `${client.firstName} ${client.lastName}`.trim();
  };

  const handlePrintReceipt = (payment: PaymentRecord) => {
    const clientName = getClientName(payment.clientId);
    const gst = computeGstBreakdown(payment.amountInr);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GST Tax Invoice - ${payment.invoiceNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: #FF803E; }
            .title { font-size: 20px; font-weight: 700; margin-top: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
            th { background: #f9f9f9; }
            .total { font-size: 18px; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">FitPlus India</div>
              <div class="title">TAX INVOICE / PAYMENT RECEIPT</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Invoice No:</strong> ${payment.invoiceNumber}</div>
              <div><strong>Date:</strong> ${formatIndiaDate(payment.createdAt)}</div>
              <div><strong>Payment Ref:</strong> ${payment.providerPaymentId || payment.id}</div>
            </div>
          </div>

          <div class="grid">
            <div>
              <strong>Billed To:</strong><br/>
              ${clientName}<br/>
              FitPlus Member
            </div>
            <div>
              <strong>Coached By:</strong><br/>
              ${activeTrainer?.displayName || 'Personal Coach'}<br/>
              FitPlus Certified Trainer
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Cadence</th>
                <th style="text-align: right;">Base Amount</th>
                <th style="text-align: right;">GST (18%)</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${payment.packageName}</strong></td>
                <td>Coaching Package</td>
                <td style="text-align: right;">₹${gst.baseAmountInr.toLocaleString('en-IN')}</td>
                <td style="text-align: right;">₹${gst.totalGstInr.toLocaleString('en-IN')}</td>
                <td style="text-align: right;"><strong>₹${payment.amountInr.toLocaleString('en-IN')}</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align: right;"><strong>CGST (9%):</strong></td>
                <td style="text-align: right;">₹${gst.cgstInr.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td colspan="4" style="text-align: right;"><strong>SGST (9%):</strong></td>
                <td style="text-align: right;">₹${gst.sgstInr.toLocaleString('en-IN')}</td>
              </tr>
              <tr class="total">
                <td colspan="4" style="text-align: right;">Total Paid (INR):</td>
                <td style="text-align: right; color: #FF803E;">₹${payment.amountInr.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>This is a computer-generated tax invoice issued via Cashfree Payment Gateway on behalf of FitPlus India.</p>
            <p>GSTIN: 27AABCF1234F1Z8 • Support: support@fitplus.in • All amounts in Indian Rupees (INR)</p>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AppShell pageTitle="Earnings & settlements">
      <div className="space-y-8 animate-fadeIn max-w-[1200px] mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#FF9D5C]">
                Commercial Operations
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Cashfree Payouts Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Earnings & Settlements
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Transparent breakdown of your client coaching gross revenue, 10% platform take rate, and T+2 banking settlements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="glass"
              className="text-xs h-9"
              onClick={() => {
                alert('Bank details are linked via Cashfree Easy Split (T+2 direct bank transfer). To update IFSC or account number, contact support@fitplus.in.');
              }}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
              Payout Settings
            </GlassButton>
          </div>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Volume */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Gross Coaching Revenue</span>
              <IndianRupee className="w-4 h-4 text-[#FF803E]" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {formatINR(financialTotals.grossInr)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {financialTotals.txCount} captured {financialTotals.txCount === 1 ? 'subscription' : 'subscriptions'}
            </p>
          </div>

          {/* Net Earnings */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-emerald-500/[0.05]">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="text-emerald-400 font-medium">Net Take-Home (90%)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
              {formatINR(financialTotals.netPayableInr)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              After ₹{financialTotals.platformFeeInr.toLocaleString('en-IN')} (10% FitPlus fee)
            </p>
          </div>

          {/* Settled to Bank */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Settled to Bank</span>
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {formatINR(financialTotals.settledNetInr)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Deposited to your verified bank account
            </p>
          </div>

          {/* Pending Settlements */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>In-Transit / T+2</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-300">
              {formatINR(financialTotals.pendingNetInr)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Settles within 48 Indian banking hours
            </p>
          </div>
        </div>

        {/* Commercial Model Explainer Banner */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF803E]/10 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-[#FF803E]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                How FitPlus Settlements & GST Invoicing Work
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                FitPlus charges a flat 10% platform fee on captured subscriptions. Client invoices are inclusive of 18% GST (CGST 9% + SGST 9%). Payouts are transferred automatically via Cashfree Easy Split into your registered account within T+2 banking days.
              </p>
            </div>
          </div>

          <div className="flex-shrink-0 text-xs text-zinc-400 bg-white/[0.04] px-3.5 py-2 rounded-xl border border-white/5">
            <span className="text-white font-semibold">T+2 Settlement Cycle</span>
            <span className="block text-[11px] text-zinc-500">Mon–Fri excluding RTGS holidays</span>
          </div>
        </div>

        {/* Ledger Section */}
        <div className="glass-card rounded-3xl border border-white/10 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Payment & Settlement Ledger</h2>
              <p className="text-xs text-zinc-400">All client transactions, tax receipts, and payout statuses.</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="w-48 sm:w-60">
                <GlassSearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search invoice or client..."
                />
              </div>

              <div className="flex rounded-xl bg-white/[0.05] p-0.5 border border-white/10 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-[#FF803E] text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('settled')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'settled' ? 'bg-[#FF803E] text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
                >
                  Settled
                </button>
                <button
                  onClick={() => setStatusFilter('processing')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'processing' ? 'bg-[#FF803E] text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
                >
                  T+2 Pending
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredLedger.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400 font-medium">No transactions found</p>
              <p className="text-xs text-zinc-500 mt-1">
                When clients subscribe to your packages, your transactions and payouts will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Date & Invoice</th>
                    <th className="py-3 px-3">Client</th>
                    <th className="py-3 px-3">Package</th>
                    <th className="py-3 px-3 text-right">Gross Amount</th>
                    <th className="py-3 px-3 text-right">FitPlus (10%)</th>
                    <th className="py-3 px-3 text-right">Net Settlement</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLedger.map((payment) => {
                    const clientName = getClientName(payment.clientId);
                    const settlement = computeTrainerSettlement(payment.amountInr);
                    const isSettled = payment.settlementStatus === 'settled';

                    return (
                      <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-white">{payment.invoiceNumber}</div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            {formatIndiaDate(payment.createdAt)}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-medium text-white">{clientName}</div>
                          <div className="text-[11px] text-zinc-500 capitalize">
                            {payment.paymentMethod || 'UPI / Online'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-medium text-zinc-200 line-clamp-1">
                            {payment.packageName}
                          </span>
                          {payment.couponCode && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20">
                              Promo: {payment.couponCode}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-medium text-white">
                          ₹{payment.amountInr.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-3 text-right text-zinc-400">
                          -₹{settlement.platformFeeInr.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                          ₹{settlement.netPayableInr.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {isSettled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-medium border border-amber-500/20">
                              <Clock className="w-3 h-3" /> T+2 In-Transit
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => handlePrintReceipt(payment)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors inline-flex items-center gap-1 text-xs"
                            title="Download GST Invoice Receipt"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Receipt</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
