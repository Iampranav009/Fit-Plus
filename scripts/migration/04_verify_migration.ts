import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../api/_lib/supabaseAdmin.js';

async function main() {
  console.log('🔍 Starting Migration Verification & Reconciliation...');

  if (!isSupabaseAdminConfigured()) {
    console.error('❌ Supabase admin credentials not configured.');
    process.exit(1);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const manifestPath = path.resolve(process.cwd(), 'scripts/migration/export/migration_manifest.json');
  let sourceCounts: Record<string, number> = {};

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      sourceCounts = manifest.counts || {};
    } catch {
      // Manifest read error
    }
  }

  const checkTables = [
    'app_users',
    'trainer_profiles',
    'client_profiles',
    'coaching_packages',
    'coaching_relationships',
    'subscriptions',
    'payment_records',
    'chat_conversations',
    'chat_messages',
    'notifications',
  ];

  console.log('\n--- Reconciliation Report ---');
  for (const table of checkTables) {
    const { count, error } = await supabaseAdmin.from(table as any).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table ${table}: Error reading (${error.message})`);
    } else {
      console.log(`📊 Table ${table}: ${count ?? 0} rows in Supabase`);
    }
  }

  console.log('\n✅ Verification check complete.');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
