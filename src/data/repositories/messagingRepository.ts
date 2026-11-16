import { supabase } from '../../lib/supabase';
import type { ChatConversation, ChatMessage } from '../../types/domain';

export async function getUserConversations(userId: string): Promise<ChatConversation[]> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .or(`client_user_id.eq.${userId},trainer_user_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    clientId: c.client_id,
    clientUserId: c.client_user_id,
    clientName: c.client_name,
    clientAvatar: c.client_avatar || undefined,
    trainerId: c.trainer_id,
    trainerUserId: c.trainer_user_id,
    trainerName: c.trainer_name,
    trainerAvatar: c.trainer_avatar || undefined,
    lastMessageText: c.last_message_text || undefined,
    lastMessageAt: c.last_message_at || undefined,
    lastMessageSenderId: c.last_message_sender_id || undefined,
    unreadCountClient: c.unread_count_client,
    unreadCountTrainer: c.unread_count_trainer,
    isBlocked: c.is_blocked,
    blockedByUserId: c.blocked_by_user_id || undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderUserId: m.sender_user_id,
    senderRole: (m.sender_role === 'admin' ? 'system' : m.sender_role) as 'client' | 'trainer' | 'system',
    text: m.text,
    replyTo: m.reply_to as unknown as ChatMessage['replyTo'],
    attachment: m.attachment as unknown as ChatMessage['attachment'],
    reference: m.reference as unknown as ChatMessage['reference'],
    status: (m.read_by_recipient ? 'read' : 'sent') as ChatMessage['status'],
    readByRecipient: m.read_by_recipient,
    createdAt: m.created_at,
  }));
}

export async function markConversationRead(conversationId: string, role: 'client' | 'trainer'): Promise<void> {
  const updates = role === 'client' ? { unread_count_client: 0 } : { unread_count_trainer: 0 };
  const { error } = await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId);

  if (error) {
    // Graceful handling — do not crash the UI if conversation document doesn't match RLS or doesn't exist
    console.warn('markConversationRead Supabase notice:', error.message);
  }
}

export async function sendMessage(params: {
  conversationId: string;
  senderUserId: string;
  senderRole: 'client' | 'trainer' | 'admin';
  text: string;
  replyTo?: ChatMessage['replyTo'];
  attachment?: ChatMessage['attachment'];
  reference?: ChatMessage['reference'];
}): Promise<string> {
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const { error: msgErr } = await supabase.from('chat_messages').insert({
    id: messageId,
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    sender_role: params.senderRole,
    text: params.text,
    reply_to: (params.replyTo as unknown as import('../../types/database.types').Json) || null,
    attachment: (params.attachment as unknown as import('../../types/database.types').Json) || null,
    reference: (params.reference as unknown as import('../../types/database.types').Json) || null,
    read_by_recipient: false,
  });

  if (msgErr) {
    throw new Error(`Failed to send message: ${msgErr.message}`);
  }

  // Update conversation lastMessage
  const convUpdates: Partial<import('../../types/database.types').Database['public']['Tables']['chat_conversations']['Update']> = {
    last_message_text: params.text,
    last_message_at: now,
    last_message_sender_id: params.senderUserId,
    updated_at: now,
  };

  await supabase.from('chat_conversations').update(convUpdates).eq('id', params.conversationId);

  return messageId;
}
