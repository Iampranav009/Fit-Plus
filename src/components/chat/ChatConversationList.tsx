import React, { useState, useMemo } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import type { ChatConversation, UserRole } from '../../types/domain';
import { formatTimeIndian } from '../../lib/messagingEngine';

interface ChatConversationListProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  activeRole: UserRole;
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  activeRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const name = activeRole === 'trainer' ? c.clientName : c.trainerName;
      return name.toLowerCase().includes(q) || (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q));
    });
  }, [conversations, searchQuery, activeRole]);

  return (
    <div className="flex flex-col h-full bg-[#101218]/80 backdrop-blur-xl border-r border-white/5">
      {/* Header & Search */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FF803E]" />
            Messages
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10 font-mono">
            {conversations.length}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C2029]/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FF803E]/60 transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-sm">
            {searchQuery ? 'No matching conversations found' : 'No conversations yet'}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            const displayName = activeRole === 'trainer' ? conv.clientName : conv.trainerName;
            const unreadCount = activeRole === 'trainer' ? conv.unreadCountTrainer : conv.unreadCountClient;
            const formattedTime = conv.lastMessageAt ? formatTimeIndian(conv.lastMessageAt) : '';

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-4 flex items-start gap-3.5 transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#FF803E]/10 border-l-2 border-[#FF803E]'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Avatar with fallback */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#1C2029] to-[#2B303C] border border-white/10 flex items-center justify-center text-white font-medium text-base shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF803E] text-white text-[11px] font-bold flex items-center justify-center shadow-lg border-2 border-[#101218]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`text-sm truncate font-medium ${unreadCount > 0 ? 'text-white font-semibold' : 'text-white/90'}`}>
                      {displayName}
                    </span>
                    {formattedTime && (
                      <span className="text-[11px] text-white/40 flex-shrink-0 ml-2 font-mono">
                        {formattedTime}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${unreadCount > 0 ? 'text-white/90 font-medium' : 'text-white/50'}`}>
                    {conv.lastMessageText || 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
