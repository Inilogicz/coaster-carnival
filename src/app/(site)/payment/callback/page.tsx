import type { Metadata } from 'next';
import { PaymentCallback } from '@/components/site/PaymentCallback';

export const metadata: Metadata = { title: 'Confirming your payment' };

/** Paystack redirects here when the popup could not be used. */
export default async function CallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const params = await searchParams;
  return <PaymentCallback reference={params.reference ?? params.trxref ?? ''} />;
}
