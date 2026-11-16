import React, { useState } from 'react';
import { Check, CheckCheck, Reply, Dumbbell, Utensils, Calendar, ExternalLink, X } from 'lucide-react';
import type { ChatMessage } from '../../types/domain';
import { formatTimeIndian } from '../../lib/messagingEngine';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onReply?: (message: ChatMessage) => void;
  onNavigateReference?: (reference: NonNullable<ChatMessage['reference']>) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isCurrentUser,
  onReply,
  onNavigateReference,
}) => {
  const [showImageModal, setShowImageModal] = useState(false);

  const getReferenceIcon = (type: string) => {
    switch (type) {
      case 'workout_day':
        return <Dumbbell className="w-4 h-4 text-[#FF803E]" />;
      case 'meal_plan':
        return <Utensils className="w-4 h-4 text-emerald-400" />;
      case 'check_in':
      case 'assignment':
        return <Calendar className="w-4 h-4 text-cyan-400" />;
      default:
        return <ExternalLink className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div
      className={`group flex flex-col mb-3 ${
        isCurrentUser ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 transition-all shadow-md ${
          isCurrentUser
            ? 'bg-gradient-to-br from-[#FF803E]/20 to-[#FF803E]/10 border border-[#FF803E]/30 text-white rounded-br-sm'
            : 'bg-[#1C2029]/90 border border-white/10 text-white/90 rounded-bl-sm'
        }`}
      >
        {/* Reply Context Banner */}
        {message.replyTo && (
          <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-2 border-[#FF803E] text-xs text-white/70">
            <span className="font-semibold text-white/90 block mb-0.5">
              {message.replyTo.senderName}
            </span>
            <p className="truncate line-clamp-1">{message.replyTo.snippet}</p>
          </div>
        )}

        {/* Image Attachment */}
        {message.attachment && (
          <div className="mb-2 overflow-hidden rounded-xl border border-white/10">
            <img
              src={message.attachment.url}
              alt={message.attachment.caption || 'Chat attachment'}
              className="max-h-60 w-auto object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowImageModal(true)}
            />
            {message.attachment.caption && (
              <p className="text-xs text-white/80 mt-1 px-1">
                {message.attachment.caption}
              </p>
            )}
          </div>
        )}

        {/* Plan Reference Card */}
        {message.reference && (
          <div
            onClick={() => onNavigateReference?.(message.reference!)}
            className="mb-2 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between gap-3 group/ref"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                {getReferenceIcon(message.reference.type)}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">
                  {message.reference.title}
                </span>
                {message.reference.subtitle && (
                  <span className="text-[11px] text-white/50 block truncate">
                    {message.reference.subtitle}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover/ref:text-white transition-colors flex-shrink-0" />
          </div>
        )}

        {/* Message Body Text */}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed select-text">
            {message.text}
          </p>
        )}

        {/* Message Footer (Timestamp & Delivery Status) */}
        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-white/40 font-mono">
          <span>{formatTimeIndian(message.createdAt)}</span>
          {isCurrentUser && (
            <span>
              {message.status === 'read' || message.readByRecipient ? (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/40" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/30" />
              )}
            </span>
          )}
        </div>

        {/* Reply Action Button on Hover */}
        {onReply && (
          <button
            onClick={() => onReply(message)}
            title="Reply"
            className={`absolute top-2 -translate-y-1/2 p-1.5 rounded-full bg-[#101218] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-150 ${
              isCurrentUser ? '-left-8' : '-right-8'
            }`}
          >
            <Reply className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Fullscreen Image Preview Modal */}
      {showImageModal && message.attachment && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={message.attachment.url}
              alt="Attachment enlarged"
              className="max-h-[85vh] max-w-full rounded-xl object-contain border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};
