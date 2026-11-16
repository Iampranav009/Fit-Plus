declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, cb: (payload: { error?: { description?: string } }) => void) => void;
    };
  }
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
}

export async function openRazorpayCheckout(params: {
  keyId: string;
  orderId: string;
  amountPaise: number;
  packageName: string;
  trainerName: string;
  customerName?: string;
  customerEmail?: string;
}): Promise<
  | {
      ok: true;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  | { ok: false; canceled?: boolean; error: string }
> {
  const loaded = await loadRazorpayCheckoutScript();
  if (!loaded || !window.Razorpay) {
    return {
      ok: false,
      error: 'Unable to load Razorpay Checkout. Check your internet connection or content blocker.',
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const rzp = new window.Razorpay!({
      key: params.keyId,
      amount: params.amountPaise,
      currency: 'INR',
      name: 'FitPlus Coaching',
      description: `${params.packageName} · ${params.trainerName}`,
      order_id: params.orderId,
      prefill: {
        name: params.customerName,
        email: params.customerEmail,
      },
      theme: {
        color: '#FF803E',
      },
      handler: (response) => {
        if (settled) return;
        settled = true;
        resolve({
          ok: true,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, canceled: true, error: 'Payment window closed before completion.' });
        },
      },
    });

    rzp.on('payment.failed', (evt) => {
      if (settled) return;
      settled = true;
      resolve({
        ok: false,
        error: evt?.error?.description || 'Payment failed at gateway. Please try again.',
      });
    });

    rzp.open();
  });
}
