import React, { useState, useRef } from 'react';
import { Send, Paperclip, MessageCircle, X, Dumbbell, Utensils, Image as ImageIcon } from 'lucide-react';
import type { ChatMessage, WorkoutProgramTemplate, NutritionProgramTemplate } from '../../types/domain';
import { uploadChatAttachmentPhoto } from '../../data/firestoreService';

interface ChatComposerProps {
  conversationId: string;
  senderUserId: string;
  replyToMessage?: ChatMessage | null;
  onClearReply?: () => void;
  onSendMessage: (payload: {
    text: string;
    replyTo?: ChatMessage['replyTo'];
    attachment?: ChatMessage['attachment'];
    reference?: ChatMessage['reference'];
  }) => Promise<void>;
  onOpenWhatsApp?: () => void;
  workoutTemplates?: WorkoutProgramTemplate[];
  nutritionTemplates?: NutritionProgramTemplate[];
  canAttachPlans?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  conversationId,
  senderUserId,
  replyToMessage,
  onClearReply,
  onSendMessage,
  onOpenWhatsApp,
  workoutTemplates = [],
  nutritionTemplates = [],
  canAttachPlans = true,
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [selectedReference, setSelectedReference] = useState<ChatMessage['reference'] | null>(null);
  const [showReferencePicker, setShowReferencePicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5 MB');
        return;
      }
      setSelectedAttachment({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedAttachment && !selectedReference) || isSending) return;

    setIsSending(true);
    try {
      let attachmentPayload: ChatMessage['attachment'] | undefined = undefined;

      if (selectedAttachment) {
        try {
          const res = await uploadChatAttachmentPhoto({
            conversationId,
            senderUserId,
            file: selectedAttachment.file,
          });
          attachmentPayload = {
            url: res.url,
            type: 'image',
            storagePath: res.storagePath,
            fileSize: res.fileSize,
          };
        } catch {
          // If upload fails in local sandbox, fallback to object preview
          attachmentPayload = {
            url: selectedAttachment.previewUrl,
            type: 'image',
            fileSize: selectedAttachment.file.size,
          };
        }
      }

      await onSendMessage({
        text: text.trim(),
        replyTo: replyToMessage
          ? {
              messageId: replyToMessage.id,
              senderName: replyToMessage.senderName || 'Participant',
              snippet: replyToMessage.text.slice(0, 100),
            }
          : undefined,
        attachment: attachmentPayload,
        reference: selectedReference || undefined,
      });

      // Clear state
      setText('');
      setSelectedAttachment(null);
      setSelectedReference(null);
      onClearReply?.();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 bg-[#101218]/90 backdrop-blur-xl border-t border-white/5 relative">
      {/* Reply Banner */}
      {replyToMessage && (
        <div className="mb-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs text-white/80">
          <div className="min-w-0">
            <span className="font-semibold text-[#FF803E] block mb-0.5">
              Replying to {replyToMessage.senderName || 'message'}
            </span>
            <p className="truncate text-white/60">{replyToMessage.text}</p>
          </div>
          <button
            onClick={onClearReply}
            className="p-1 rounded-lg text-white/40 hover:text-white transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment / Reference Previews */}
      {(selectedAttachment || selectedReference) && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          {selectedAttachment && (
            <div className="relative inline-block rounded-xl overflow-hidden border border-white/20">
              <img
                src={selectedAttachment.previewUrl}
                alt="Selected attachment"
                className="w-16 h-16 object-cover"
              />
              <button
                onClick={() => setSelectedAttachment(null)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {selectedReference && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white">
              {selectedReference.type === 'workout_day' ? (
                <Dumbbell className="w-4 h-4 text-[#FF803E]" />
              ) : (
                <Utensils className="w-4 h-4 text-emerald-400" />
              )}
              <span className="truncate max-w-[200px]">{selectedReference.title}</span>
              <button
                onClick={() => setSelectedReference(null)}
                className="p-0.5 rounded-full text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {/* Attachment Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            className="p-2.5 rounded-xl bg-[#1C2029] border border-white/5 text-white/60 hover:text-white hover:border-white/15 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {canAttachPlans && (
            <button
              type="button"
              onClick={() => setShowReferencePicker(!showReferencePicker)}
              title="Attach workout or meal plan"
              className={`p-2.5 rounded-xl border transition-colors ${
                showReferencePicker
                  ? 'bg-[#FF803E]/10 border-[#FF803E] text-[#FF803E]'
                  : 'bg-[#1C2029] border-white/5 text-white/60 hover:text-white hover:border-white/15'
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}

          {onOpenWhatsApp && (
            <button
              type="button"
              onClick={onOpenWhatsApp}
              title="Send WhatsApp Nudge"
              className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Text Area */}
        <div className="flex-1 relative">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for newline)"
            className="w-full bg-[#1C2029] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FF803E]/60 transition-colors resize-none max-h-32 min-h-[42px]"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !selectedAttachment && !selectedReference) || isSending}
          className="p-2.5 rounded-xl bg-gradient-to-tr from-[#FF803E] to-[#FF9B5E] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#FF803E]/20 transition-all flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Plan Reference Picker Popover */}
      {showReferencePicker && (
        <div className="absolute bottom-16 left-12 w-80 bg-[#14171F] border border-white/10 rounded-2xl p-3 shadow-2xl z-40 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
            <span className="text-xs font-semibold text-white/80">Attach Plan Reference</span>
            <button
              onClick={() => setShowReferencePicker(false)}
              className="text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-2">
              Workout Templates
            </span>
            {workoutTemplates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  setSelectedReference({
                    type: 'workout_day',
                    id: tpl.id,
                    title: tpl.title,
                    subtitle: `${tpl.weekCount} Weeks · ${tpl.category}`,
                  });
                  setShowReferencePicker(false);
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-white/[0.05] text-xs text-white flex items-center gap-2 transition-colors"
              >
                <Dumbbell className="w-3.5 h-3.5 text-[#FF803E] flex-shrink-0" />
                <span className="truncate">{tpl.title}</span>
              </button>
            ))}

            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-2 pt-2 block">
              Nutrition Templates
            </span>
            {nutritionTemplates.map((ntpl) => (
              <button
                key={ntpl.id}
                onClick={() => {
                  setSelectedReference({
                    type: 'meal_plan',
                    id: ntpl.id,
                    title: ntpl.title,
                    subtitle: `${ntpl.targetKcal} kcal · ${ntpl.dietaryType}`,
                  });
                  setShowReferencePicker(false);
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-white/[0.05] text-xs text-white flex items-center gap-2 transition-colors"
              >
                <Utensils className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{ntpl.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
