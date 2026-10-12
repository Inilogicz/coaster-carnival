'use client';

import { useEffect, useRef } from 'react';
import type { Confirmation } from '@/lib/booking';

/** Success modal shown once Paystack confirms payment (or a free ticket is booked). */
export function ConfirmationModal({ confirmation, onClose }: { confirmation: Confirmation; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const c = confirmation;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="cc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal" role="dialog" aria-modal="true" aria-labelledby="cc-modal-title">
        <div className="cc-modal-head">
          <p className="eyebrow">YOU’RE IN!</p>
          <h2 id="cc-modal-title">Welcome to the coast, {c.firstName}.</h2>
          <button ref={closeRef} className="cc-modal-close" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="cc-modal-body">
          <p>
            Your payment is confirmed and your place at {c.eventName} is booked. We’ve sent your confirmation to <strong>{c.email}</strong>.
          </p>
          {c.tribe && (
            <div className="cc-tribe" style={{ '--tribe-color': c.tribe.colorHex } as React.CSSProperties}>
              <span>YOUR TRIBE</span>
              <strong>
                {c.tribe.name} · {c.tribe.colorName}
              </strong>
              <small>
                {c.zodiacSign} · {c.zodiacElement}
                {c.tribeReassigned && ' · Your zodiac tribe was full, so you’ve joined an available tribe.'}
              </small>
            </div>
          )}
          <dl className="cc-facts">
            <div>
              <dt>BOOKING REF</dt>
              <dd>{c.reference}</dd>
            </div>
            <div>
              <dt>TICKET</dt>
              <dd>
                {c.ticketName} · {c.amountLabel}
              </dd>
            </div>
            <div>
              <dt>DATE</dt>
              <dd>
                {c.dateLong} · {c.timeLabel}
              </dd>
            </div>
            <div>
              <dt>TAKE-OFF</dt>
              <dd>{c.takeOffPoint}</dd>
            </div>
          </dl>
          <div className="cc-modal-ticket">
            <a className="button primary" href={c.ticketUrl} target="_blank" rel="noopener">
              View my ticket
            </a>
            <a className="button cc-ticket-print" href={c.ticketImageUrl} download={`${c.reference}.png`}>
              Download ticket
            </a>
          </div>
          <button className="button cc-ticket-print" type="button" onClick={onClose}>
            Back to the invite
          </button>
        </div>
      </div>
    </div>
  );
}
