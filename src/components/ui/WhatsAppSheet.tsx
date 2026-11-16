import React, { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { buildWhatsAppChatUrl } from '../../lib/commerce';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';

interface WhatsAppSheetProps {
  open: boolean;
  onClose: () => void;
  coachName: string;
  whatsappE164?: string;
  isDemoSandbox?: boolean;
  customMessage?: string;
}

export const WhatsAppSheet: React.FC<WhatsAppSheetProps> = ({
  open,
  onClose,
  coachName,
  whatsappE164,
  isDemoSandbox = false,
  customMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const message = customMessage || formatCopy(COPY.discovery.sampleMessage, { coachName });
  const whatsappUrl = !isDemoSandbox ? buildWhatsAppChatUrl(whatsappE164, message) : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={whatsappUrl ? `Message ${coachName} on WhatsApp` : COPY.discovery.whatsappTitle}
      description={
        whatsappUrl
          ? 'Opens your message directly in WhatsApp using the coach’s published business number.'
          : isDemoSandbox
            ? 'External WhatsApp links stay sandboxed inside the demo preview.'
            : `${coachName} has not added a WhatsApp Business number yet. Copy this message to reach out via FitPlus.`
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[16px] bg-[#101218] border border-white/[0.08] p-4">
          <p className="text-[12px] text-[#7C8393] mb-1.5">
            {isDemoSandbox ? 'Sample message (demo)' : 'Pre-filled message'}
          </p>
          <p className="text-[14px] text-[#F5F5F7] leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-2.5">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[44px] px-4 py-2 rounded-[14px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#FF9259] transition-colors shadow-[0_8px_20px_-6px_rgba(255,128,62,0.5)]"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              Open WhatsApp chat
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          ) : (
            <GlassButton
              variant="secondary"
              fullWidth
              disabled
              title={isDemoSandbox ? 'WhatsApp links are disabled in demo mode' : 'Coach WhatsApp number not configured'}
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              {isDemoSandbox ? 'WhatsApp disabled in demo' : 'No WhatsApp number listed'}
            </GlassButton>
          )}

          <GlassButton variant="secondary" onClick={handleCopy} fullWidth>
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                Copied message
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                Copy message
              </>
            )}
          </GlassButton>
        </div>
      </div>
    </GlassSheet>
  );
};
