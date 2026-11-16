import React, { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';

interface WhatsAppSheetProps {
  open: boolean;
  onClose: () => void;
  coachName: string;
}

export const WhatsAppSheet: React.FC<WhatsAppSheetProps> = ({ open, onClose, coachName }) => {
  const [copied, setCopied] = useState(false);
  const sampleMessage = formatCopy(COPY.discovery.sampleMessage, { coachName });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sampleMessage);
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
      title={COPY.discovery.whatsappTitle}
      description={COPY.discovery.whatsappNotice}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[16px] bg-[#101218] border border-white/[0.08] p-4">
          <p className="text-[12px] text-[#7C8393] mb-1.5">Sample message (demo)</p>
          <p className="text-[14px] text-[#F5F5F7] leading-relaxed">{sampleMessage}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <GlassButton onClick={handleCopy} fullWidth>
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                Copied message
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                {COPY.discovery.copySampleMessage}
              </>
            )}
          </GlassButton>
          <GlassButton
            variant="secondary"
            fullWidth
            disabled
            title="External WhatsApp messaging requires a verified coach number in Stage 2/3"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            WhatsApp disabled in demo
          </GlassButton>
        </div>
      </div>
    </GlassSheet>
  );
};
