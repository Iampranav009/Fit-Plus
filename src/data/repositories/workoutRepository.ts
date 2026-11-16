import { supabase } from '../../lib/supabase';
import type { Assignment } from '../../types/domain';

export async function getUserAssignments(userId: string): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .or(`client_user_id.eq.${userId},trainer_user_id.eq.${userId}`);

  if (error || !data) return [];

  return data.map((a) => ({
    id: a.id,
    clientId: a.client_id,
    trainerId: a.trainer_id || undefined,
    templateId: a.template_id || undefined,
    title: a.title,
    category: a.category,
    instructions: a.instructions,
    durationMinutes: a.duration_minutes,
    dueTime: a.due_time,
    completionType: a.completion_type,
    targetLabel: a.target_label || undefined,
    scheduledDates: a.scheduled_dates || [],
    isOptional: a.is_optional,
    isRecovery: a.is_recovery,
    hasCustomOverride: a.has_custom_override,
    overrideNote: a.override_note || undefined,
    createdAt: a.created_at,
  }));
}

export async function upsertTaskCompletion(completion: {
  id: string;
  assignmentId: string;
  clientId: string;
  clientUserId: string;
  trainerUserId?: string;
  dateKey: string;
  loggedValue?: string;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.from('task_completions').upsert({
    id: completion.id,
    assignment_id: completion.assignmentId,
    client_id: completion.clientId,
    client_user_id: completion.clientUserId,
    trainer_user_id: completion.trainerUserId || null,
    date_key: completion.dateKey,
    logged_value: completion.loggedValue || null,
    notes: completion.notes || null,
  });

  if (error) {
    console.warn('upsertTaskCompletion error in Supabase:', error.message);
  }
}
