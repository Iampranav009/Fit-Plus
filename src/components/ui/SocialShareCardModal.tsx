import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2, Sparkles, X } from 'lucide-react';
import {
  renderShareCardToCanvas,
  type ShareCardAspect,
  type ShareCardData,
} from '../../lib/shareCardEngine';
import { buildReferralWhatsAppUrl } from '../../lib/referralEngine';
import { GlassButton } from './GlassButton';
import { GlassSegmentedControl } from './GlassSegmentedControl';

interface SocialShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: ShareCardData;
}

export const SocialShareCardModal: React.FC<SocialShareCardModalProps> = ({
  isOpen,
  onClose,
  cardData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspect, setAspect] = useState<ShareCardAspect>('story');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    renderShareCardToCanvas(canvasRef.current, cardData, aspect);
  }, [isOpen, cardData, aspect]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitplus-${cardData.type}-${Date.now()}.png`;
    a.click();
  };

  const handleWebShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSharing(true);
    try {
      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            handleDownload();
            setIsSharing(false);
            return;
          }
          const file = new File([blob], `fitplus-${cardData.type}.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: 'FitPlus Fitness Milestone',
              text: `Check out my progress on FitPlus with my coach! ${cardData.referralCode ? `Use code ${cardData.referralCode} for ₹500 off.` : ''}`,
              files: [file],
            });
          } catch {
            // User cancelled or browser failed file share
            handleDownload();
          } finally {
            setIsSharing(false);
          }
        }, 'image/png');
      } else {
        handleDownload();
        setIsSharing(false);
      }
    } catch {
      handleDownload();
      setIsSharing(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (cardData.referralCode) {
      const waUrl = buildReferralWhatsAppUrl(cardData.referralCode, cardData.clientName);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else {
      const msg = `Crushing goals on FitPlus! Check out my ${cardData.type} progress.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
    >
      <div className="relative w-full max-w-lg glass-card border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF803E]/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#FF803E]" />
            </div>
            <div>
              <h2 id="share-card-title" className="text-lg font-semibold text-white">
                Share Your Progress
              </h2>
              <p className="text-xs text-zinc-400">Export high-res card for Stories & Posts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="my-4">
          <GlassSegmentedControl<ShareCardAspect>
            ariaLabel="Share card aspect ratio"
            options={[
              { id: 'story', label: '9:16 Story (Status)' },
              { id: 'square', label: '1:1 Square (Feed)' },
            ]}
            value={aspect}
            onChange={(v) => setAspect(v)}
          />
        </div>

        {/* Preview Canvas */}
        <div className="flex items-center justify-center my-2 p-2 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`rounded-xl shadow-lg border border-white/10 object-contain max-h-[380px] w-auto transition-all duration-300`}
          />
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <GlassButton variant="primary" onClick={handleWebShare} disabled={isSharing}>
              <Share2 className="w-4 h-4 mr-1.5" />
              {isSharing ? 'Preparing...' : 'Share Card'}
            </GlassButton>
            <GlassButton variant="glass" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1.5" />
              Download PNG
            </GlassButton>
          </div>

          <GlassButton variant="glass" onClick={handleWhatsAppShare} className="w-full text-emerald-400 hover:text-emerald-300">
            Share on WhatsApp
          </GlassButton>
        </div>
      </div>
    </div>
  );
};
