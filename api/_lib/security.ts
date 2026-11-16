import type { VercelResponse } from '@vercel/node';

/**
 * Standard security headers applied across all FitPlus serverless endpoints and express server.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.cashfree.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://sandbox.cashfree.com https://api.cashfree.com; frame-src 'self' https://sdk.cashfree.com https://sandbox.cashfree.com;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Applies standard security headers to a VercelResponse or Express response.
 */
export function applySecurityHeaders(res: VercelResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    try {
      res.setHeader(key, value);
    } catch {
      // Ignore if headers already sent
    }
  }
}

/**
 * In-memory sliding window rate limiter for serverless environments.
 */
interface RateLimitBucket {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitBucket>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeStaleBuckets(now: number, windowMs: number) {
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [key, bucket] of rateLimitStore.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
      if (bucket.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
    lastCleanup = now;
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  purgeStaleBuckets(now, windowMs);

  let bucket = rateLimitStore.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitStore.set(key, bucket);
  }

  // Filter timestamps within current window
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] || now;
    const resetTime = oldest + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - bucket.timestamps.length,
    resetTime: now + windowMs,
  };
}

/**
 * Sanitizes errors so internal secrets, database connection details, or raw stack traces are never leaked.
 */
export function sanitizeErrorMessage(error: unknown, fallback = 'Internal server error'): string {
  if (error instanceof Error) {
    // Redact internal secrets or connection strings
    const raw = error.message;
    if (
      raw.includes('secret') ||
      raw.includes('password') ||
      raw.includes('Bearer') ||
      raw.includes('DATABASE_URL') ||
      raw.includes('SUPABASE_SECRET_KEY')
    ) {
      return fallback;
    }
    return raw;
  }
  return fallback;
}
