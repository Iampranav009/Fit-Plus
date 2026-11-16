import React, { useState } from 'react';
import { Check, Copy, Gift, Share2, Users } from 'lucide-react';
import {
  buildReferralDeepLink,
  buildReferralWhatsAppUrl,
  generateReferralCode,
} from '../../lib/referralEngine';
import { GlassButton } from './GlassButton';

interface ReferralCardProps {
  displayName: string;
  userId: string;
  totalReferralsCount?: number;
  totalCreditsEarnedInr?: number;
  className?: string;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  displayName,
  userId,
  totalReferralsCount = 0,
  totalCreditsEarnedInr = 0,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const referralCode = generateReferralCode(displayName, userId);
  const deepLink = buildReferralDeepLink(referralCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = buildReferralWhatsAppUrl(referralCode, displayName);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 glass-card p-6 shadow-xl ${className}`}
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FF803E]/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF803E] to-[#FF4444] text-white shadow-lg shadow-[#FF803E]/20">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FF9D5C]">
              FitPlus Referral Program
            </span>
            <h3 className="text-lg font-bold text-white">Give ₹500, Get ₹500</h3>
          </div>
        </div>

        <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
          Invite friends to FitPlus! They get{' '}
          <strong className="text-white">₹500 off</strong> their first personal coaching package, and
          you receive{' '}
          <strong className="text-emerald-400">₹500 coaching credit</strong> when they subscribe.
        </p>

        {/* Code & Copy Box */}
        <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 mb-4">
          <div className="flex-1 px-3 py-2 text-center sm:text-left">
            <span className="text-[11px] text-zinc-400 block uppercase tracking-wider">Your Invite Code</span>
            <span className="text-base font-mono font-bold tracking-wide text-white">{referralCode}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <GlassButton
              variant="glass"
              onClick={handleCopy}
              className="flex-1 sm:flex-initial text-xs h-9 px-3.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                  Copy Link
                </>
              )}
            </GlassButton>

            <GlassButton
              variant="primary"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-initial text-xs h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              WhatsApp
            </GlassButton>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-center">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mb-0.5">
              <Users className="w-3.5 h-3.5 text-[#FF803E]" />
              Friends Joined
            </div>
            <span className="text-lg font-bold text-white">{totalReferralsCount}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mb-0.5">
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              Credits Earned
            </div>
            <span className="text-lg font-bold text-emerald-400">₹{totalCreditsEarnedInr.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
