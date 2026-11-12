import { ActionButton, PageHeader, StatusBadge } from '@/components/admin/ui';
import { resolveAdminEvent } from '@/lib/admin-queries';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTime, formatMoney } from '@/lib/format';
import { siteUrl } from '@/lib/ticket';
import { approveExternalRegistration, rejectExternalRegistration, setExternalRegistrationLink } from '../actions';

export default async function ExternalPaymentsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  await requireAdmin();
  const event = await resolveAdminEvent((await searchParams).event);
  if (!event) return <PageHeader title="External payments" subtitle="No event found." />;
  const requests = await db.registration.findMany({ where: { eventId: event.id, externalPaymentNote: { not: null } }, include: { ticketType: true, tribe: true, externalReceipt: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  const link = event.externalRegistrationKey ? `${siteUrl()}/external-registration/${event.id}?key=${event.externalRegistrationKey}` : null;
  return <>
    <PageHeader title="External payments" subtitle={`Private registration and approval · ${event.name}`} />
    <section className="card mb-5 space-y-3 p-5">
      <h2 className="font-bold">Private registration link</h2>
      <p className="text-sm">Share only with guests who paid outside the site. Requests do not reserve places or issue tickets until approved. Check the actual payment before approving.</p>
      {link ? <input className="input w-full" aria-label="Private registration link" value={link} readOnly /> : <p>Private registration is disabled.</p>}
      <div className="flex flex-wrap gap-3">
        <ActionButton action={setExternalRegistrationLink.bind(null, event.id, true)} confirm={link ? 'Replace this link? Previously shared links will stop working.' : undefined}>{link ? 'Replace link' : 'Create private link'}</ActionButton>
        {link && <ActionButton action={setExternalRegistrationLink.bind(null, event.id, false)} confirm="Disable this private link? Existing requests remain available for review.">Disable link</ActionButton>}
      </div>
    </section>
    <p className="mb-3 text-sm text-slate-500">Latest {requests.length} requests. Approved guests also appear in Attendees.</p>
    <div className="space-y-4">
      {!requests.length && <p className="card p-5">No external payment requests yet.</p>}
      {requests.map((r) => <article key={r.id} className="card space-y-3 p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{r.fullName}</h2><p className="text-sm">{r.email} · {r.phone}</p></div><StatusBadge status={r.status} /></div>
        <p className="text-sm">{r.ticketType.name} · Expected {formatMoney(r.amount, event.currency)} · {formatDateTime(r.createdAt)}</p>
        <p className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{r.externalPaymentNote}</p>
        {r.externalReceipt ? <a className="btn-secondary inline-block" href={`/api/admin/receipts/${r.id}`}>Download receipt · {r.externalReceipt.name}</a> : <p className="text-sm text-amber-700">No receipt attached (earlier submission).</p>}
        <p className="text-xs text-slate-500">Booking reference: {r.reference}</p>
        {r.approvedBy && <p className="text-sm">Approved by {r.approvedBy} on {formatDateTime(r.approvedAt)} · Team: {r.tribe?.name ?? '—'} · Email: {r.emailSentAt ? 'sent' : 'not sent; resend from Attendees'}</p>}
        {r.status === 'AWAITING_APPROVAL' && <div className="flex gap-3">
          <ActionButton action={approveExternalRegistration.bind(null, r.id)} className="btn-primary" confirm="Have you verified this payment was received for this ticket? Approve, assign a team and issue the ticket?">Approve payment</ActionButton>
          <ActionButton action={rejectExternalRegistration.bind(null, r.id)} className="btn-danger" confirm="Reject this request? No ticket will be issued.">Reject</ActionButton>
        </div>}
      </article>)}
    </div>
  </>;
}
