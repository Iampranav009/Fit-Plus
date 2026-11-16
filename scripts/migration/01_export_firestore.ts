import fs from 'node:fs';
import path from 'node:path';
import { getFirestoreAdminContext, isFirebaseAdminConfigured } from '../../api/_lib/firestoreAdmin.js';

const COLLECTIONS = [
  'users',
  'admins',
  'trainers',
  'clients',
  'relationships',
  'invites',
  'packages',
  'enrollments',
  'subscriptions',
  'payments',
  'coupons',
  'referrals',
  'task_templates',
  'assignments',
  'completions',
  'workoutPlans',
  'mealPlans',
  'workoutTemplates',
  'nutritionTemplates',
  'exercises',
  'workoutSessions',
  'nutritionLogs',
  'weeklyCheckIns',
  'progressEvents',
  'dailyActivity',
  'streaks',
  'achievements',
  'conversations',
  'notifications',
  'scheduledReminders',
  'consultationSlots',
  'bookings',
  'aiDrafts',
  'clientGroups',
  'consentRecords',
  'trainerVerificationRequests',
  'reviews',
  'auditLogs',
  'feature_flags',
];

async function main() {
  console.log('🚀 Starting Firestore Data Export for FitPlus Stage 4E...');
  const outDir = path.resolve(process.cwd(), 'scripts/migration/export');
  fs.mkdirSync(outDir, { recursive: true });

  if (!isFirebaseAdminConfigured()) {
    console.log('⚠️ Firebase Admin is not configured with a service account.');
    console.log('Generating empty manifest for initial setup or dry-run.');
    fs.writeFileSync(
      path.join(outDir, 'migration_manifest.json'),
      JSON.stringify({ exportedAt: new Date().toISOString(), totalCollections: 0, totalDocs: 0, status: 'unconfigured_source' }, null, 2),
    );
    return;
  }

  const { db } = getFirestoreAdminContext();
  const manifest: Record<string, number> = {};
  let totalDocs = 0;

  for (const collName of COLLECTIONS) {
    try {
      const snap = await db.collection(collName).get();
      const records = snap.docs.map((d) => ({
        _id: d.id,
        ...d.data(),
      }));

      manifest[collName] = records.length;
      totalDocs += records.length;

      fs.writeFileSync(path.join(outDir, `${collName}.json`), JSON.stringify(records, null, 2));
      console.log(`✅ Exported ${collName}: ${records.length} documents`);
    } catch (err: unknown) {
      console.warn(`⚠️ Collection ${collName} skip/error:`, err instanceof Error ? err.message : String(err));
      manifest[collName] = 0;
    }
  }

  fs.writeFileSync(
    path.join(outDir, 'migration_manifest.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), totalCollections: COLLECTIONS.length, totalDocs, counts: manifest }, null, 2),
  );

  console.log(`\n🎉 Firestore export complete! Total documents exported: ${totalDocs}`);
}

main().catch((err) => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
