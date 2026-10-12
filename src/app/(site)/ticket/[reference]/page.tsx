import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/site/PrintButton';
import { getConfirmation } from '@/lib/booking';
import { db } from '@/lib/db';
import { isValidTicketKey, ticketQrSvg } from '@/lib/ticket';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your ticket', robots: { index: false } };

/** A guest's ticket: booking details plus a QR code staff can scan to confirm the booking is paid. */
export default async function TicketPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ k?: string }> }) {
  const { reference } = await params;
  const { k } = await searchParams;
  const ref = decodeURIComponent(reference);
  if (!isValidTicketKey(ref, k)) notFound();
  const registration = await db.registration.findUnique({ where: { reference: ref }, select: { id: true } });
  if (!registration) notFound();
  const c = await getConfirmation(registration.id);
  const paid = c.status === 'PAID';
  const qr = paid ? await ticketQrSvg(c.reference) : null;

  return (
    <main className="cc-ticket-page">
      <article className="cc-ticket" style={{ '--tribe-color': c.tribe?.colorHex ?? '#4abbbd' } as React.CSSProperties}>
        <header className="cc-ticket-head">
          <span>{c.hostUpper} PRESENTS</span>
          <h1>{c.eventName}</h1>
          <p>
            {c.dateLong} · {c.timeLabel}
          </p>
        </header>
        <div className="cc-ticket-body">
          <p className={paid ? 'cc-ticket-status is-valid' : 'cc-ticket-status'}>{paid ? '✓ Valid ticket · Paid' : 'Not paid, this ticket is not valid'}</p>
          <p className="cc-ticket-name">{c.fullName}</p>
          {c.tribe && (
            <div className="cc-tribe">
              <span>TRIBE</span>
              <strong>
                {c.tribe.name} · {c.tribe.colorName}
              </strong>
              <small>
                {c.zodiacSign} · {c.zodiacElement}
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
              <dt>TAKE-OFF</dt>
              <dd>{c.takeOffPoint}</dd>
            </div>
            <div>
              <dt>DESTINATION</dt>
              <dd>{c.destination}</dd>
            </div>
          </dl>
          {qr && (
            <figure className="cc-ticket-qr">
              <div dangerouslySetInnerHTML={{ __html: qr }} />
              <figcaption>Show this at take-off</figcaption>
            </figure>
          )}
          <p className="cc-ticket-note">
            Questions? Call the organiser on {c.contactPhone}. {c.refundPolicy}
          </p>
        </div>
      </article>
      {paid && (
        <div className="cc-ticket-actions">
          <a className="button primary" href={c.ticketImageUrl} download={`${c.reference}.png`}>
            Download ticket
          </a>
          <PrintButton />
        </div>
      )}
      <a className="cc-ticket-back" href="/">
        Back to the invite
      </a>
    </main>
  );
}
