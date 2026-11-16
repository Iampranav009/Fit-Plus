# FitPlus Storage Migration Guide

## 1. Bucket Topology

| Bucket ID | Access Level | Max File Size | Allowed MIME Types | Purpose |
|---|---|---|---|---|
| `public-trainer-assets` | Public | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Trainer profile pictures, studio banner headers |
| `profile-avatars` | Public | 2 MB | `image/jpeg`, `image/png`, `image/webp` | User avatars |
| `progress-photos` | Private | 10 MB | `image/jpeg`, `image/png`, `image/webp` | Client progress photos, check-in pictures |
| `coaching-attachments` | Private | 20 MB | Any | Chat images, workout PDFs |
| `verification-documents` | Private | 10 MB | `image/jpeg`, `image/png`, `application/pdf` | Coach certification proofs |

---

## 2. File Path Mapping

When migrating existing files from Firebase Storage:

- `trainers/{trainerId}/photo_{timestamp}.jpg` -> `public-trainer-assets/{trainerId}/photo_{timestamp}.jpg`
- `trainers/{trainerId}/cover_{timestamp}.jpg` -> `public-trainer-assets/{trainerId}/cover_{timestamp}.jpg`
- `clients/{userId}/progress_{timestamp}.jpg` -> `progress-photos/{userId}/progress_{timestamp}.jpg`
- `verification/{userId}/{docName}` -> `verification-documents/{userId}/{docName}`
- `chat/{conversationId}/{filename}` -> `coaching-attachments/{conversationId}/{filename}`

---

## 3. Migration Script Execution

Run the storage migration script:
```bash
npx tsx scripts/migration/05_migrate_storage.ts
```
The script:
1. Verifies that all 5 buckets exist.
2. Creates any missing buckets with public/private flags.
3. Tests upload, signed URL generation, and cleanup permissions.
