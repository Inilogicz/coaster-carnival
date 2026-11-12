import type { Prisma } from '@prisma/client';
import { Pagination } from '@/components/admin/Pagination';
import { paginate } from '@/lib/pagination';
import { ActionButton, PageHeader, StatusBadge } from '@/components/admin/ui';
import { resolveAdminEvent } from '@/lib/admin-queries';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDateTime, formatMoney } from '@/lib/format';
import { siteUrl } from '@/lib/ticket';
import { approveExternalRegistration, rejectExternalRegistration, setExternalRegistrationLink } from '../actions';

export default async function ExternalPaymentsPage({ searchParams }: { searchParams: Promise<{ event?: string; page?: string; q?: string; status?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const event = await resolveAdminEvent(params.event);
  if (!event) return <PageHeader title="External payments" subtitle="No event found." />;
  const where: Prisma.RegistrationWhereInput = { eventId: event.id, externalPaymentNote: { not: null } };
  if (params.status === 'AWAITING_APPROVAL' || params.status === 'PAID' || params.status === 'CANCELLED') where.status = params.status;
  const q = params.q?.trim();
  if (q) where.OR = [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { reference: { contains: q, mode: 'insensitive' } }];
  const total = await db.registration.count({ where });
  const paging = paginate(params.page, total);
  const requests = await db.registration.findMany({ where, include: { ticketType: true, tribe: true, externalReceipt: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: paging.skip, take: paging.take });
  const pageLink = (page: number) => {
    const query = new URLSearchParams({ event: event.id, page: String(page) });
    if (q) query.set('q', q);
    if (params.status) query.set('status', params.status);
    return `?${query}`;
  };
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
    <form className="card mb-4 flex flex-wrap gap-3 p-4">
      <input type="hidden" name="event" value={event.id} />
      <input name="q" defaultValue={params.q} placeholder="Search guest, email or booking reference" className="input min-w-0 flex-1" aria-label="Search external payments" />
      <select name="status" defaultValue={params.status ?? ''} className="input" aria-label="Request status">
        <option value="">All statuses</option><option value="AWAITING_APPROVAL">Awaiting approval</option><option value="PAID">Approved</option><option value="CANCELLED">Rejected</option>
      </select>
      <button className="btn-primary">Filter</button>
      <a href={`?event=${event.id}`} className="btn-secondary">Reset</a>
    </form>
    <p className="mb-3 text-sm text-slate-500">{total.toLocaleString()} matching requests. Select a guest to review payment evidence.</p>
    <div className="space-y-4">
      {!requests.length && <p className="card p-5">No external payment requests yet.</p>}
      {requests.map((r) => <details key={r.id} className="card group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-brand">
          <span className="min-w-0 flex-1"><strong className="block text-sm">{r.fullName}</strong><span className="block break-all text-xs text-slate-500">{r.email}</span></span>
          <span className="hidden text-xs text-slate-500 sm:block">{formatDateTime(r.createdAt)}</span>
          <StatusBadge status={r.status} />
          <span className="text-xs font-semibold text-brand group-open:hidden">View details ↓</span><span className="hidden text-xs font-semibold text-brand group-open:inline">Close ↑</span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-5">
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
        </div>
      </details>)}
    </div>
    <Pagination {...paging} pageSize={paging.take} href={pageLink} />
  </>;
}
