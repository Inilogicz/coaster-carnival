'use client';

import { useEffect, useState } from 'react';
import type { Confirmation } from '@/lib/booking';
import { ConfirmationModal } from './ConfirmationModal';
import { verifyPayment } from './paystack-client';

export function PaymentCallback({ reference }: { reference: string }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState(reference ? '' : 'Missing payment reference.');

  useEffect(() => {
    if (!reference) return;
    verifyPayment(reference).then(setConfirmation, (e: Error) => setError(e.message));
  }, [reference]);

  return (
    <main className="plain-page">
      <a className="back" href="/">Back to the invite</a>
      <h1>{error ? 'We couldn’t confirm your payment.' : confirmation ? 'You’re in!' : 'Confirming your payment…'}</h1>
      {error && (
        <p>
          {error} If you were charged, your booking will be confirmed automatically and emailed to you. Otherwise,{' '}
          <a href="/#register" style={{ textDecoration: 'underline' }}>try booking again</a>.
        </p>
      )}
      {confirmation && <ConfirmationModal confirmation={confirmation} onClose={() => window.location.assign('/')} />}
    </main>
  );
}
