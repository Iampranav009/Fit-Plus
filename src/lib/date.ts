export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const AVAILABLE_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (Asia/Kolkata, IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Asia/Dubai, GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (Asia/Singapore, SGT)' },
  { value: 'Europe/London', label: 'London (Europe/London)' },
  { value: 'America/New_York', label: 'New York (America/New_York)' },
];

export function toLocalDateKey(date: Date, timezone = DEFAULT_TIMEZONE): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function getTodayKey(timezone = DEFAULT_TIMEZONE, now = new Date()): string {
  return toLocalDateKey(now, timezone);
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

export function addDaysToKey(dateKey: string, deltaDays: number): string {
  const dt = parseDateKey(dateKey);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekdayIndexMonFirst(dateKey: string): number {
  const day = parseDateKey(dateKey).getUTCDay(); // 0 = Sun .. 6 = Sat
  return (day + 6) % 7; // 0 = Mon .. 6 = Sun
}

export function formatIndiaDate(dateKey: string, style: 'long' | 'short' | 'weekday' = 'long'): string {
  const dt = parseDateKey(dateKey);
  if (style === 'weekday') {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(dt);
  }
  if (style === 'short') {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(dt);
  }
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(dt);
}

export function getGreetingPeriod(timezone = DEFAULT_TIMEZONE, now = new Date()): 'morning' | 'afternoon' | 'evening' {
  try {
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(now);
    const hour = Number(hourStr);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  } catch {
    const h = now.getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }
}

export function formatINR(amount: number): string {
  if (amount <= 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateDateRangeKeys(startKey: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    keys.push(addDaysToKey(startKey, i));
  }
  return keys;
}
