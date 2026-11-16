import React, { useState } from 'react';
import { Download, Share2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { GlassButton } from './GlassButton';
import { GlassSheet } from './GlassSheet';

interface PWAInstallButtonProps {
  compact?: boolean;
  fullWidth?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  fullWidth = false,
}) => {
  const { canInstall, isInstalled, isIos, promptInstall } = usePWAInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  if (isInstalled || (!canInstall && !isIos)) {
    return null;
  }

  return (
    <>
      <GlassButton
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        fullWidth={fullWidth}
        onClick={() => {
          if (canInstall) {
            void promptInstall();
          } else if (isIos) {
            setIosGuideOpen(true);
          }
        }}
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        {compact ? 'Install App' : 'Install FitPlus App'}
      </GlassButton>

      <GlassSheet
        open={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
        title="Install FitPlus on iPhone / iPad"
        description="Add FitPlus to your Home Screen for full-screen coaching access."
      >
        <div className="space-y-3 text-[14px] text-[#A2A8B5]">
          <div className="rounded-[14px] bg-[#101218] border border-white/[0.08] p-3.5 flex items-start gap-3">
            <Share2 className="w-4 h-4 text-[#FF803E] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              1. Tap the <strong className="text-[#F5F5F7]">Share</strong> button in Safari&apos;s toolbar.
            </p>
          </div>
          <div className="rounded-[14px] bg-[#101218] border border-white/[0.08] p-3.5 flex items-start gap-3">
            <Smartphone className="w-4 h-4 text-[#FF803E] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              2. Scroll down and select <strong className="text-[#F5F5F7]">Add to Home Screen</strong>.
            </p>
          </div>
          <GlassButton fullWidth onClick={() => setIosGuideOpen(false)}>
            Done
          </GlassButton>
        </div>
      </GlassSheet>
    </>
  );
};
