import crypto from 'node:crypto';

const API = 'https://api.paystack.co';

/** A Paystack API failure; surfaced to the guest as a 502 with Paystack's message. */
export class PaystackError extends Error {}

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError('Payments are not configured yet. Please contact the organiser.');
  return key;
}

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!response.ok || !body.status) throw new PaystackError(body.message || `Paystack request failed (${response.status})`);
  return body.data as T;
}

export type PaystackTransaction = {
  id: number;
  reference: string;
  status: 'success' | 'failed' | 'abandoned' | 'ongoing' | 'pending' | 'reversed' | string;
  amount: number;
  currency: string;
  channel?: string;
  paid_at?: string | null;
  gateway_response?: string;
};

export function initializeTransaction(input: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs webhook bodies with HMAC-SHA512 of the raw body using the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
