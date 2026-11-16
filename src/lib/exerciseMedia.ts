/**
 * FITPLUS — EXERCISE MEDIA RESOLVER
 * Resolves high-resolution demonstration images, thumbnails, and movement phases
 * for the exercise encyclopedia with graceful local and CDN fallback handling.
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

export function getExerciseImageUrl(
  imagePathOrUrl?: string,
  phase: 'start' | 'end' | 'thumbnail' = 'start',
): string {
  if (!imagePathOrUrl) {
    // High-contrast SVG placeholder fallback
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240" fill="%23141720"><rect width="100%" height="100%" fill="%23141720"/><path d="M140 100 L180 100 L180 140 L140 140 Z" fill="%23FF803E" fill-opacity="0.2"/><circle cx="160" cy="90" r="14" fill="%23FF803E" fill-opacity="0.4"/><text x="160" y="165" font-family="sans-serif" font-size="12" fill="%238E9BAE" text-anchor="middle" font-weight="600">FITPLUS DEMO</text></svg>`;
  }

  if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://') || imagePathOrUrl.startsWith('data:')) {
    return imagePathOrUrl;
  }

  // If path is relative like 'Incline_Dumbbell_Press/0.jpg'
  return `${GITHUB_RAW_BASE}/${imagePathOrUrl}`;
}
