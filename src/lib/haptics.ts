export function triggerHaptic(pattern: 'light' | 'success' | 'timer' = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  const prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  try {
    if (pattern === 'timer') {
      navigator.vibrate([35, 45, 55]);
    } else if (pattern === 'success') {
      navigator.vibrate([20, 30, 35]);
    } else {
      navigator.vibrate(14);
    }
  } catch {
    // Ignore vibration errors in restricted browsers/iframes
  }
}
