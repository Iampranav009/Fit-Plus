import type { ScheduledReminder, Notification } from '../types/domain';

/**
 * Checks whether a given timestamp falls within Indian Quiet Hours
 * (10:00 PM to 7:00 AM IST).
 */
export function isInIndianQuietHours(now = new Date()): boolean {
  try {
    const istTimeStr = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(now);
    const hour = parseInt(istTimeStr, 10);
    return hour >= 22 || hour < 7;
  } catch {
    return false;
  }
}

export interface ReminderEvaluationResult {
  dispatchedReminders: ScheduledReminder[];
  generatedNotifications: Notification[];
  skippedQuietHours: ScheduledReminder[];
}

/**
 * Evaluates pending scheduled reminders against current time,
 * enforcing Indian quiet hours and idempotency.
 */
export function evaluateScheduledReminders(params: {
  reminders: ScheduledReminder[];
  nowIso?: string;
  enforceQuietHours?: boolean;
}): ReminderEvaluationResult {
  const now = params.nowIso ? new Date(params.nowIso) : new Date();
  const enforceQuiet = params.enforceQuietHours !== false;
  const inQuietHours = enforceQuiet && isInIndianQuietHours(now);

  const dispatchedReminders: ScheduledReminder[] = [];
  const generatedNotifications: Notification[] = [];
  const skippedQuietHours: ScheduledReminder[] = [];

  const nowMs = now.getTime();

  for (const reminder of params.reminders) {
    if (reminder.triggerStatus !== 'scheduled') {
      continue;
    }

    const scheduledTime = new Date(reminder.scheduledFor).getTime();
    if (isNaN(scheduledTime) || scheduledTime > nowMs) {
      // Future reminder, not due yet
      continue;
    }

    if (inQuietHours && reminder.channel !== 'in_app') {
      // Delay external nudges during Indian sleep hours
      skippedQuietHours.push(reminder);
      continue;
    }

    const notifCategory =
      reminder.category === 'workout'
        ? 'assignment'
        : reminder.category === 'consultation'
          ? 'consultation'
          : 'system';

    const actionRoute =
      reminder.category === 'workout'
        ? '/app/workout'
        : reminder.category === 'check_in'
          ? '/app/check-in'
          : '/app/home';

    dispatchedReminders.push({
      ...reminder,
      triggerStatus: 'sent',
    });

    generatedNotifications.push({
      id: `notif_${reminder.id}_${Date.now().toString(36)}`,
      recipientUserId: reminder.recipientUserId,
      title: reminder.title,
      body: reminder.body,
      category: notifCategory,
      read: false,
      actionRoute,
      createdAt: now.toISOString(),
    });
  }

  return {
    dispatchedReminders,
    generatedNotifications,
    skippedQuietHours,
  };
}
