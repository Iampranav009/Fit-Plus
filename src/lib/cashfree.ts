import { load } from '@cashfreepayments/cashfree-js';

export type CashfreeMode = 'sandbox' | 'production';

let checkoutInFlight = false;

export function getClientCashfreeMode(serverMode?: string): CashfreeMode {
  if (serverMode === 'production') return 'production';
  if (serverMode === 'sandbox') return 'sandbox';
  return import.meta.env.VITE_CASHFREE_ENV === 'production' ? 'production' : 'sandbox';
}

export function isCashfreeCheckoutBusy(): boolean {
  return checkoutInFlight;
}

/**
 * Launches Cashfree Hosted / Redirect Checkout using the official @cashfreepayments/cashfree-js v3 SDK.
 * Uses redirectTarget '_self' so mobile PWAs and Safari/iOS WebViews redirect reliably to
 * /payments/result without popup blocker interference.
 */
export async function launchCashfreeCheckout(params: {
  paymentSessionId: string;
  mode?: CashfreeMode;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!params.paymentSessionId.trim()) {
    return { ok: false, error: 'Missing Cashfree payment session ID from server.' };
  }
  if (checkoutInFlight) {
    return { ok: false, error: 'Checkout is already opening. Please wait a moment.' };
  }

  checkoutInFlight = true;
  try {
    const resolvedMode = getClientCashfreeMode(params.mode);
    const cashfree = await load({ mode: resolvedMode });
    if (!cashfree) {
      return {
        ok: false,
        error: 'Unable to initialize Cashfree Checkout SDK. Please check your connection and try again.',
      };
    }

    const result = (await cashfree.checkout({
      paymentSessionId: params.paymentSessionId,
      redirectTarget: '_self',
    })) as { error?: { message?: string }; redirect?: boolean } | undefined;

    if (result?.error) {
      return {
        ok: false,
        error: result.error.message || 'Cashfree checkout could not be started.',
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to launch Cashfree checkout.',
    };
  } finally {
    window.setTimeout(() => {
      checkoutInFlight = false;
    }, 1500);
  }
}
