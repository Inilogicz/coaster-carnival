import { NextResponse } from 'next/server';
import { applyPaystackTransaction } from '@/lib/booking';
import { isValidWebhookSignature, type PaystackTransaction } from '@/lib/paystack';

/** Paystack webhook: the source of truth when the guest closes the tab before returning. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  const body = JSON.parse(raw) as { event: string; data: PaystackTransaction };
  try {
    if (body.event === 'charge.success') await applyPaystackTransaction({ ...body.data, status: 'success' });
  } catch (error) {
    console.error('[paystack webhook]', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 }); // Paystack retries
  }
  return NextResponse.json({ received: true });
}
