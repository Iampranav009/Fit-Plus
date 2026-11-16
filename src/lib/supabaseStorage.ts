import { supabase } from './supabase';

export const STORAGE_BUCKETS = {
  PUBLIC_TRAINER_ASSETS: 'public-trainer-assets',
  PROFILE_AVATARS: 'profile-avatars',
  PROGRESS_PHOTOS: 'progress-photos',
  COACHING_ATTACHMENTS: 'coaching-attachments',
  VERIFICATION_DOCUMENTS: 'verification-documents',
} as const;

export type StorageBucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export interface UploadOptions {
  bucket: StorageBucketName;
  path: string;
  file: File | Blob;
  contentType?: string;
  maxSizeMb?: number;
}

export interface UploadResult {
  path: string;
  url: string;
  bucket: string;
}

const DEFAULT_MAX_MB: Record<StorageBucketName, number> = {
  'public-trainer-assets': 5,
  'profile-avatars': 2,
  'progress-photos': 10,
  'coaching-attachments': 20,
  'verification-documents': 10,
};

export async function uploadToStorage(options: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, contentType } = options;
  const maxMb = options.maxSizeMb || DEFAULT_MAX_MB[bucket] || 5;

  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`File size exceeds maximum permitted limit of ${maxMb} MB.`);
  }

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: contentType || (file instanceof File ? file.type : 'application/octet-stream'),
  });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  // If public bucket, get public URL; otherwise get signed URL
  if (bucket === STORAGE_BUCKETS.PUBLIC_TRAINER_ASSETS || bucket === STORAGE_BUCKETS.PROFILE_AVATARS) {
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return {
      path: data.path,
      url: publicUrlData.publicUrl,
      bucket,
    };
  }

  // Private buckets: generate signed URL (valid for 1 hour by default)
  const { data: signedData, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 3600);

  if (signError || !signedData) {
    throw new Error(`Failed to generate signed URL for private upload: ${signError?.message}`);
  }

  return {
    path: data.path,
    url: signedData.signedUrl,
    bucket,
  };
}

export async function getStorageSignedUrl(
  bucket: StorageBucketName,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }
  return data.signedUrl;
}

export async function deleteFromStorage(bucket: StorageBucketName, paths: string[]): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.warn(`Failed to delete files from ${bucket}:`, error.message);
  }
}
