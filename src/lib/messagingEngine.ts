import type { ChatMessage, ChatConversation } from '../types/domain';

export function buildConversationId(clientId: string, trainerId: string): string {
  const c = (clientId || '').trim();
  const t = (trainerId || '').trim();
  return `conv_${c}_${t}`;
}

export function formatMessageTime(isoString: string): string {
  try {
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(dt);
  } catch {
    return '';
  }
}

export const formatTimeIndian = formatMessageTime;

export function buildWhatsAppChatUrl(phoneE164: string, messageText: string): string {
  const digits = (phoneE164 || '').replace(/\D+/g, '');
  const encoded = encodeURIComponent(messageText);
  return `https://wa.me/${digits}?text=${encoded}`;
}

export function formatConversationSnippetDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return '';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return formatMessageTime(isoString);
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(dt);
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(dt);
  } catch {
    return '';
  }
}

export interface MessageDateGroup {
  dateLabel: string;
  messages: ChatMessage[];
}

export function groupMessagesByDate(messages: ChatMessage[]): MessageDateGroup[] {
  const groups: MessageDateGroup[] = [];
  const map = new Map<string, ChatMessage[]>();

  for (const m of messages) {
    const dt = new Date(m.createdAt);
    const dateKey = !isNaN(dt.getTime())
      ? dt.toISOString().slice(0, 10)
      : 'Unknown';
    if (!map.has(dateKey)) {
      map.set(dateKey, []);
    }
    map.get(dateKey)!.push(m);
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterdayKey = yesterdayDate.toISOString().slice(0, 10);

  for (const [key, msgList] of map.entries()) {
    let dateLabel = key;
    if (key === todayKey) {
      dateLabel = 'Today';
    } else if (key === yesterdayKey) {
      dateLabel = 'Yesterday';
    } else {
      try {
        const d = new Date(key);
        dateLabel = new Intl.DateTimeFormat('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Kolkata',
        }).format(d);
      } catch {
        dateLabel = key;
      }
    }
    groups.push({ dateLabel, messages: msgList });
  }

  return groups;
}

// WhatsApp contextual quick-message templates (user-initiated click-to-chat deep link)
export function generateWhatsAppWorkoutReminder(clientName: string, workoutTitle: string): string {
  return `Hi ${clientName}! 💪 Just checking in for today's "${workoutTitle}" session on FitPlus. How are you feeling for the workout? Let me know if you need any adjustments or form cues!`;
}

export function generateWhatsAppCheckInReminder(clientName: string, weekLabel = 'this week'): string {
  return `Hi ${clientName}! 📋 Your weekly reflection on FitPlus is ready for ${weekLabel}. Taking 2 minutes to log your energy, sleep, and challenges helps us fine-tune next week's training.`;
}

export function generateWhatsAppConsultationReminder(
  clientName: string,
  meetingTime: string,
  meetingLink?: string,
): string {
  const linkText = meetingLink ? ` Here is our meeting link: ${meetingLink}` : '';
  return `Hi ${clientName}! 🎥 Quick reminder that our 1-on-1 coaching video consultation is scheduled for ${meetingTime}.${linkText} See you soon!`;
}

export function generateWhatsAppRenewalReminder(
  clientName: string,
  packageName: string,
  daysLeft: number,
): string {
  return `Hi ${clientName}! 🌟 Your ${packageName} coaching period has ${daysLeft} days remaining. Let me know if you would like to continue our momentum and renew for the upcoming month!`;
}
