'use client';

import type { Confirmation } from '@/lib/booking';

type PopupCallbacks = {
  onSuccess?: (transaction: { reference: string }) => void;
  onCancel?: () => void;
  onError?: (error: { message: string }) => void;
};
declare global {
  interface Window {
    PaystackPop?: new () => { resumeTransaction(accessCode: string, callbacks?: PopupCallbacks): void };
  }
}

let loader: Promise<boolean> | null = null;
export function loadPaystack() {
  loader ??= new Promise<boolean>((resolve) => {
    if (window.PaystackPop) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.PaystackPop));
    script.onerror = () => {
      loader = null;
      resolve(false);
    };
    document.head.append(script);
  });
  return loader;
}

/** Opens the Paystack popup. Resolves "success" | "cancelled", or falls back to a full-page redirect. */
export async function payWithPaystack(accessCode: string, authorizationUrl: string) {
  const ready = await loadPaystack();
  if (!ready || !window.PaystackPop) {
    window.location.assign(authorizationUrl);
    return new Promise<never>(() => {});
  }
  return new Promise<'success' | 'cancelled'>((resolve, reject) => {
    new window.PaystackPop!().resumeTransaction(accessCode, {
      onSuccess: () => resolve('success'),
      onCancel: () => resolve('cancelled'),
      onError: (error) => reject(new Error(error?.message || 'Paystack could not start the payment.')),
    });
  });
}

/** Ask our server to verify with Paystack; retries briefly while Paystack settles the charge. */
export async function verifyPayment(reference: string): Promise<Confirmation> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'We couldn’t confirm your payment.');
    if (body.status === 'success') return body.confirmation;
    if (body.status !== 'ongoing' && body.status !== 'pending') throw new Error(body.message || 'Your payment was not completed.');
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Your payment is still processing. We’ll email your confirmation as soon as it clears.');
}
