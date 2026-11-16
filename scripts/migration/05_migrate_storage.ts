import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../api/_lib/supabaseAdmin.js';
import { STORAGE_BUCKETS } from '../../src/lib/supabaseStorage.js';

async function main() {
  console.log('📦 Starting Storage Migration: Firebase Storage -> Supabase Storage...');

  if (!isSupabaseAdminConfigured()) {
    console.error('❌ Supabase admin credentials not configured.');
    process.exit(1);
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // Verify buckets exist or create them
  console.log('Checking required storage buckets...');
  const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets();
  const existingNames = new Set((existingBuckets || []).map((b) => b.name));

  for (const bucketName of Object.values(STORAGE_BUCKETS)) {
    if (!existingNames.has(bucketName)) {
      const isPublic =
        bucketName === STORAGE_BUCKETS.PUBLIC_TRAINER_ASSETS ||
        bucketName === STORAGE_BUCKETS.PROFILE_AVATARS;

      console.log(`Creating bucket: ${bucketName} (public: ${isPublic})...`);
      const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: isPublic,
      });
      if (error) {
        console.warn(`Bucket ${bucketName} creation notice:`, error.message);
      } else {
        console.log(`✅ Bucket ${bucketName} verified.`);
      }
    } else {
      console.log(`✅ Bucket ${bucketName} already exists.`);
    }
  }

  console.log('🎉 Storage setup and bucket verification complete.');
}

main().catch((err) => {
  console.error('Fatal storage migration error:', err);
  process.exit(1);
});
