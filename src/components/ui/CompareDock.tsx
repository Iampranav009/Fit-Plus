import React from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { TrainerProfile } from '../../types/domain';
import { GlassButton } from './GlassButton';

interface CompareDockProps {
  selectedTrainers: TrainerProfile[];
  onRemoveTrainer: (trainerId: string) => void;
  onClearAll: () => void;
  onOpenCompare: () => void;
}

export const CompareDock: React.FC<CompareDockProps> = ({
  selectedTrainers,
  onRemoveTrainer,
  onClearAll,
  onOpenCompare,
}) => {
  if (selectedTrainers.length === 0) return null;

  return (
    <aside
      aria-label="Coach comparison bar"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl animate-slideUp"
    >
      <div className="glass-card border border-white/20 rounded-full px-5 py-3 shadow-2xl flex items-center justify-between gap-3 bg-black/85 backdrop-blur-xl">
        {/* Selected Coaches Chips */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FF9D5C] mr-1 hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 text-[#FF803E]" />
            Compare:
          </div>

          {selectedTrainers.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-white"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                {t.photoUrl ? (
                  <img src={t.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                    {t.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <span className="max-w-[80px] sm:max-w-[100px] truncate">{t.displayName}</span>
              <button
                onClick={() => onRemoveTrainer(t.id)}
                className="text-zinc-400 hover:text-white rounded-full transition-colors ml-0.5"
                aria-label={`Remove ${t.displayName}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {selectedTrainers.length < 3 && (
            <span className="text-[11px] text-zinc-400 italic hidden md:inline ml-1">
              Select {3 - selectedTrainers.length} more
            </span>
          )}
        </div>

        {/* CTA & Clear */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onClearAll}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1"
          >
            Clear
          </button>
          <GlassButton
            variant="primary"
            onClick={onOpenCompare}
            className="text-xs h-9 px-4 rounded-full"
            disabled={selectedTrainers.length < 2}
          >
            Compare ({selectedTrainers.length})
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </GlassButton>
        </div>
      </div>
    </aside>
  );
};
