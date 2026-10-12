import { NextResponse } from 'next/server';
import { handleError } from '@/lib/api';
import { applyPaystackTransaction, getConfirmation } from '@/lib/booking';
import { db } from '@/lib/db';
import { verifyTransaction } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

/** Called by the browser after the Paystack popup or redirect. Always re-verifies with Paystack server-side. */
export async function GET(request: Request) {
  try {
    const reference = new URL(request.url).searchParams.get('reference')?.trim();
    if (!reference) return NextResponse.json({ error: 'Missing payment reference.' }, { status: 400 });
    const payment = await db.payment.findUnique({ where: { reference }, select: { status: true, registrationId: true } });
    if (!payment) return NextResponse.json({ error: 'We couldn’t find that payment.' }, { status: 404 });

    if (payment.status === 'SUCCESS') return NextResponse.json({ status: 'success', confirmation: await getConfirmation(payment.registrationId) });

    const trx = await verifyTransaction(reference);
    const confirmation = await applyPaystackTransaction(trx);
    if (confirmation) return NextResponse.json({ status: 'success', confirmation });
    return NextResponse.json({ status: trx.status, message: trx.gateway_response || 'Payment was not completed.' });
  } catch (error) {
    return handleError(error);
  }
}
