import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Phone, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChatConversationList } from '../../components/chat/ChatConversationList';
import { ChatMessageBubble } from '../../components/chat/ChatMessageBubble';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { WhatsAppShareModal } from '../../components/chat/WhatsAppShareModal';
import type { ChatMessage } from '../../types/domain';

export const MessagesPage: React.FC = () => {
  const {
    store,
    activeUser,
    conversations,
    activeConversationMessages,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markConversationRead,
    workoutTemplates,
    nutritionTemplates,
  } = useApp();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeRole = store.session.activeRole;
  const isTrainer = activeRole === 'trainer';

  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // If URL has ?conversation=... or ?client=..., select that conversation
  useEffect(() => {
    const convParam = searchParams.get('conversation');
    const clientParam = searchParams.get('client');

    if (convParam) {
      setActiveConversationId(convParam);
      setMobileView('chat');
    } else if (clientParam) {
      const match = conversations.find((c) => c.clientId === clientParam);
      if (match) {
        setActiveConversationId(match.id);
        setMobileView('chat');
      }
    } else if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [searchParams, conversations, activeConversationId, setActiveConversationId]);

  // Mark conversation read on selection
  useEffect(() => {
    if (activeConversationId) {
      markConversationRead(activeConversationId);
    }
  }, [activeConversationId, markConversationRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversationMessages.length]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const partnerName = activeConv
    ? isTrainer
      ? activeConv.clientName
      : activeConv.trainerName
    : 'Conversation';

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileView('chat');
  };

  const handleNavigateReference = (ref: NonNullable<ChatMessage['reference']>) => {
    if (ref.type === 'workout_day') {
      navigate('/studio/workout-builder');
    } else if (ref.type === 'meal_plan') {
      navigate(isTrainer ? '/studio/nutrition-builder' : '/app/nutrition');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto overflow-hidden rounded-2xl border border-white/5 bg-[#0D0F14]/90 backdrop-blur-2xl shadow-2xl">
      {/* Left Column: Conversation List */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 md:block ${
          mobileView === 'list' ? 'block' : 'hidden'
        }`}
      >
        <ChatConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          activeRole={activeRole}
        />
      </div>

      {/* Right Column: Active Chat Thread */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#101218]/50 md:flex ${
          mobileView === 'chat' ? 'flex' : 'hidden'
        }`}
      >
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/5 bg-[#14171F]/80 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Back button on mobile */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1C2029] to-[#2B303C] border border-white/10 flex items-center justify-center text-white font-medium text-base shadow-sm">
                  {partnerName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    {partnerName}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10 font-mono">
                      {isTrainer ? 'Client' : 'Coach'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium">FitPlus Connect</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isTrainer && (
                  <button
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    title="Send WhatsApp Nudge"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (isTrainer) navigate(`/studio/clients/${activeConv.clientId}`);
                  }}
                  title="View Client Details"
                  className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Thread Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
              {activeConversationMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/30 mb-3">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-medium text-white/80">No messages in this chat yet</p>
                  <p className="text-xs text-white/40 mt-1 max-w-sm">
                    Say hello or share workout and nutrition targets to start collaborating.
                  </p>
                </div>
              ) : (
                activeConversationMessages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    isCurrentUser={msg.senderUserId === activeUser?.id || (isTrainer ? msg.senderRole === 'trainer' : msg.senderRole === 'client')}
                    onReply={(m) => setReplyToMessage(m)}
                    onNavigateReference={handleNavigateReference}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <ChatComposer
              conversationId={activeConv.id}
              senderUserId={activeUser?.id || 'usr_client_aarav'}
              replyToMessage={replyToMessage}
              onClearReply={() => setReplyToMessage(null)}
              onSendMessage={async (payload) => {
                await sendMessage({
                  conversationId: activeConv.id,
                  text: payload.text,
                  replyTo: payload.replyTo,
                  attachment: payload.attachment,
                  reference: payload.reference,
                });
              }}
              onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
              workoutTemplates={workoutTemplates}
              nutritionTemplates={nutritionTemplates}
              canAttachPlans={isTrainer}
            />

            {/* WhatsApp Share Modal */}
            <WhatsAppShareModal
              isOpen={isWhatsAppModalOpen}
              onClose={() => setIsWhatsAppModalOpen(false)}
              clientName={activeConv.clientName}
              trainerName={activeConv.trainerName}
            />
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white/80">Select a conversation</h3>
            <p className="text-xs text-white/40 mt-1 max-w-sm">
              Choose a client or coach from the list on the left to start real-time messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
