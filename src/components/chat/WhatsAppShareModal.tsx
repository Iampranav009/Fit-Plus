import React, { useState } from 'react';
import { X, MessageCircle, Send, Check } from 'lucide-react';
import { buildWhatsAppChatUrl } from '../../lib/messagingEngine';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientPhone?: string;
  trainerName: string;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  clientName,
  clientPhone = '919876543210',
  trainerName,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<'workout' | 'checkin' | 'hydration' | 'streak' | 'custom'>('workout');
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const templates = {
    workout: `Namaste ${clientName}! 🏋️ Coach ${trainerName} here. Just checking in on your workout plan today on FitPlus. Let me know once you finish your sets!`,
    checkin: `Hey ${clientName}! 📋 Your weekly check-in is due today on FitPlus. Please take 2 minutes to submit your reflection so we can calibrate your upcoming week.`,
    hydration: `Quick reminder for ${clientName} 💧: Remember to hit your hydration target today! Log your water intake on your FitPlus daily diary.`,
    streak: `Incredible work ${clientName}! 🔥 You are crushing your consistency on FitPlus. Keep the momentum going!`,
    custom: customText || `Namaste ${clientName}! Quick message from Coach ${trainerName} via FitPlus.`,
  };

  const currentMessage = templates[selectedTemplate];
  const whatsAppUrl = buildWhatsAppChatUrl(clientPhone, currentMessage);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#14171F] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Send WhatsApp Nudge</h3>
              <p className="text-xs text-white/50">Message {clientName} directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector */}
        <div className="py-4">
          <label className="text-xs font-semibold text-white/70 uppercase tracking-wider block mb-2">
            Select Template
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setSelectedTemplate('workout')}
              className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                selectedTemplate === 'workout'
                  ? 'bg-[#FF803E]/10 border-[#FF803E] text-white font-medium'
                  : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10'
              }`}
            >
              🏋️ Workout Reminder
            </button>
            <button
              onClick={() => setSelectedTemplate('checkin')}
              className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                selectedTemplate === 'checkin'
                  ? 'bg-[#FF803E]/10 border-[#FF803E] text-white font-medium'
                  : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10'
              }`}
            >
              📋 Check-in Due
            </button>
            <button
              onClick={() => setSelectedTemplate('hydration')}
              className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                selectedTemplate === 'hydration'
                  ? 'bg-[#FF803E]/10 border-[#FF803E] text-white font-medium'
                  : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10'
              }`}
            >
              💧 Hydration Nudge
            </button>
            <button
              onClick={() => setSelectedTemplate('streak')}
              className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                selectedTemplate === 'streak'
                  ? 'bg-[#FF803E]/10 border-[#FF803E] text-white font-medium'
                  : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10'
              }`}
            >
              🔥 Streak Milestone
            </button>
          </div>

          {selectedTemplate === 'custom' && (
            <div className="mb-4">
              <textarea
                rows={3}
                placeholder="Type your custom WhatsApp message..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-[#1C2029] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FF803E]/60 transition-colors"
              />
            </div>
          )}

          {/* Message Preview */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                Preview
              </span>
              <button
                onClick={handleCopy}
                className="text-[11px] text-[#FF803E] hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                {copied ? 'Copied' : 'Copy text'}
              </button>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-sans select-all">
              {currentMessage}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <Send className="w-3.5 h-3.5" />
            Open WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
