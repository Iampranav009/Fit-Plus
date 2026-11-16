import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../api/_lib/supabaseAdmin.js';

const TABLE_ORDER = [
  'app_users',
  'platform_admins',
  'trainer_profiles',
  'client_profiles',
  'coaching_packages',
  'coaching_relationships',
  'trainer_invites',
  'enrollments',
  'subscriptions',
  'payment_records',
  'coupons',
  'referrals',
  'task_templates',
  'task_assignments',
  'task_completions',
  'workout_plans',
  'meal_plans',
  'workout_program_templates',
  'nutrition_program_templates',
  'exercise_definitions',
  'workout_sessions',
  'nutrition_diary_entries',
  'weekly_check_ins',
  'progress_events',
  'daily_activity',
  'streak_records',
  'achievement_unlocks',
  'chat_conversations',
  'chat_messages',
  'notifications',
  'scheduled_reminders',
  'consultation_slots',
  'consultation_bookings',
  'ai_plan_drafts',
  'client_groups',
  'consent_records',
  'trainer_verification_requests',
  'trainer_reviews',
  'audit_logs',
  'feature_flags',
];

async function main() {
  console.log('🚀 Starting Data Import into Supabase PostgreSQL...');

  if (!isSupabaseAdminConfigured()) {
    console.error('❌ Supabase admin credentials not configured.');
    process.exit(1);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const transformedDir = path.resolve(process.cwd(), 'scripts/migration/export/transformed');

  if (!fs.existsSync(transformedDir)) {
    console.log('No transformed data directory found. Skipping data import (fresh project).');
    return;
  }

  for (const table of TABLE_ORDER) {
    const filePath = path.join(transformedDir, `${table}.json`);
    if (!fs.existsSync(filePath)) continue;

    const rows = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Array<Record<string, unknown>>;
    if (rows.length === 0) continue;

    console.log(`📥 Importing ${rows.length} rows into ${table}...`);
    const { error } = await supabaseAdmin.from(table as any).upsert(rows);
    if (error) {
      console.warn(`⚠️ Error importing into ${table}:`, error.message);
    } else {
      console.log(`✅ Successfully imported ${table}`);
    }
  }

  console.log('🎉 Supabase data import finished.');
}

main().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
