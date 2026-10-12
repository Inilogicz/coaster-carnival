import Link from 'next/link';
import { ActionButton, PageHeader, StatusBadge } from '@/components/admin/ui';
import { attendeeWhere, resolveAdminEvent, type AttendeeFilters } from '@/lib/admin-queries';
import { db } from '@/lib/db';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cancelRegistration, recheckPayment, resendEmail } from '../actions';

const PAGE_SIZE = 50;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function AttendeesPage({ searchParams }: { searchParams: Promise<AttendeeFilters & { event?: string; page?: string }> }) {
  const params = await searchParams;
  const event = await resolveAdminEvent(params.event);
  if (!event) return <PageHeader title="Attendees" subtitle="No event found." />;

  const page = Math.max(1, Number(params.page) || 1);
  const where = attendeeWhere(event.id, params);
  const [rows, total] = await Promise.all([
    db.registration.findMany({
      where,
      include: { tribe: true, ticketType: true, payments: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: [{ paidAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.registration.count({ where }),
  ]);

  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { event: params.event, q: params.q, status: params.status, tribe: params.tribe, ticket: params.ticket, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };
  const now = new Date();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Attendees"
        subtitle={`${total.toLocaleString()} matching · ${event.name}`}
        actions={<a href={`/api/admin/export${qs({})}`} className="btn-secondary">Export CSV</a>}
      />

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        {params.event && <input type="hidden" name="event" value={params.event} />}
        <input name="q" defaultValue={params.q} placeholder="Search name, email, phone, ref, Instagram" className="input" aria-label="Search" />
        <select name="status" defaultValue={params.status ?? ''} className="input" aria-label="Status">
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="HOLDING">Paying now</option>
          <option value="EXPIRED">Abandoned</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select name="tribe" defaultValue={params.tribe ?? ''} className="input" aria-label="Tribe">
          <option value="">All tribes</option>
          {event.tribes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select name="ticket" defaultValue={params.ticket ?? ''} className="input" aria-label="Ticket">
          <option value="">All tickets</option>
          {event.ticketTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="btn-primary">Filter</button>
          <Link href={params.event ? `?event=${params.event}` : '?'} className="btn-secondary">Reset</Link>
        </div>
      </form>

      <div className="card overflow-x-auto pb-2 lg:overflow-visible">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Guest</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">Tribe</th>
              <th className="px-3 py-2.5">Ticket</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-4 py-2.5"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          {rows.length === 0 && (
            <tbody><tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No attendees match these filters.</td></tr></tbody>
          )}
          {rows.map((r) => {
            const holding = r.status === 'PENDING' && r.holdExpiresAt > now;
            return (
              <tbody key={r.id} className="group border-t border-slate-100">
                <tr className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.fullName}</p>
                    <p className="text-xs text-slate-500">{r.email}</p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{r.phone}</td>
                  <td className="px-3 py-3">
                    {r.tribe ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ background: r.tribe.colorHex }} aria-hidden />
                        {r.tribe.name}
                        {r.tribeReassigned && <span title="Zodiac tribe was full" className="text-xs text-amber-700">↻</span>}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">{r.ticketType.name}<p className="text-xs text-slate-500">{r.amount ? formatMoney(r.amount) : 'Free'}</p></td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} holding={holding} />{r.overCapacity && <p className="mt-1 text-xs font-semibold text-rose-700">Over capacity</p>}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600">{formatDateTime(r.paidAt ?? r.createdAt)}</td>
                  <td className="relative px-4 py-3 text-right">
                    <details className="inline-block text-left [&[open]>summary]:text-brand">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-slate-600 underline">Details</summary>
                      <div className="absolute right-4 z-10 mt-2 w-[min(420px,90vw)] space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                          <dt className="text-slate-500">Reference</dt><dd className="font-mono">{r.reference}</dd>
                          <dt className="text-slate-500">Gender</dt><dd>{r.gender}</dd>
                          <dt className="text-slate-500">Birthday</dt><dd>{r.birthDay} {MONTHS[r.birthMonth - 1]} · {r.zodiacSign} ({r.zodiacElement})</dd>
                          <dt className="text-slate-500">Emergency</dt><dd>{r.emergencyContact}</dd>
                          <dt className="text-slate-500">Instagram</dt><dd>{r.instagram ?? '—'}</dd>
                          <dt className="text-slate-500">Registered</dt><dd>{formatDateTime(r.createdAt)}</dd>
                          <dt className="text-slate-500">Paid</dt><dd>{formatDateTime(r.paidAt)}</dd>
                          <dt className="text-slate-500">Email</dt><dd>{r.emailSentAt ? `Sent ${formatDateTime(r.emailSentAt)}` : r.status === 'PAID' ? 'Not sent' : '—'}</dd>
                        </dl>
                        {r.payments.length > 0 && (
                          <div>
                            <p className="label">Payment attempts</p>
                            <ul className="space-y-1 text-xs">
                              {r.payments.map((p) => (
                                <li key={p.id} className="flex justify-between gap-2"><span className="font-mono">{p.reference}</span><StatusBadge status={p.status} /></li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {r.status === 'PAID' && <ActionButton action={resendEmail.bind(null, r.id)}>Resend email</ActionButton>}
                          {r.status === 'PENDING' && <ActionButton action={recheckPayment.bind(null, r.id)}>Re-check with Paystack</ActionButton>}
                          {r.status === 'PENDING' && (
                            <ActionButton action={cancelRegistration.bind(null, r.id)} className="btn-danger" confirm="Cancel this registration and release its place?">Cancel</ActionButton>
                          )}
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              </tbody>
            );
          })}
        </table>
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page} of {pages}</span>
          <span className="flex gap-2">
            {page > 1 && <Link className="btn-secondary" href={qs({ page: String(page - 1) })}>Previous</Link>}
            {page < pages && <Link className="btn-secondary" href={qs({ page: String(page + 1) })}>Next</Link>}
          </span>
        </nav>
      )}
    </>
  );
}
