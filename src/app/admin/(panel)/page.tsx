import Link from 'next/link';
import { ColumnChart } from '@/components/admin/ColumnChart';
import { ActionButton, PageHeader, StatusBadge } from '@/components/admin/ui';
import { resolveAdminEvent } from '@/lib/admin-queries';
import { db } from '@/lib/db';
import { formatDateTime, formatEventDate, formatMoney } from '@/lib/format';
import { setBookingOpen } from './actions';

const DAY = 86_400_000;
const lagosDay = (d: Date) => new Date(d.getTime() + 3_600_000).toISOString().slice(0, 10); // Africa/Lagos is UTC+1, no DST

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const event = await resolveAdminEvent((await searchParams).event);
  if (!event) return <PageHeader title="No events yet" subtitle="Run the seed script or create an event." />;

  const now = new Date();
  const [statusCounts, holding, paidRows, tribeCounts, ticketStats, recent] = await Promise.all([
    db.registration.groupBy({ by: ['status'], where: { eventId: event.id }, _count: true, _sum: { amount: true } }),
    db.registration.count({ where: { eventId: event.id, status: 'PENDING', holdExpiresAt: { gt: now } } }),
    db.registration.findMany({ where: { eventId: event.id, status: 'PAID' }, select: { paidAt: true, amount: true } }),
    db.registration.groupBy({ by: ['tribeId'], where: { eventId: event.id, status: 'PAID' }, _count: true }),
    db.registration.groupBy({ by: ['ticketTypeId'], where: { eventId: event.id, status: 'PAID' }, _count: true, _sum: { amount: true } }),
    db.payment.findMany({
      where: { registration: { eventId: event.id } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { registration: { select: { fullName: true, reference: true } } },
    }),
  ]);

  const count = (s: string) => statusCounts.find((r) => r.status === s)?._count ?? 0;
  const paid = count('PAID');
  const revenue = statusCounts.find((r) => r.status === 'PAID')?._sum.amount ?? 0;
  const pending = count('PENDING');
  const total = statusCounts.reduce((s, r) => s + r._count, 0);
  const conversion = total ? Math.round((paid / total) * 100) : 0;
  const fill = Math.min(100, Math.round((paid / event.capacity) * 100));

  // Paid bookings per day, from the first booking (or 14 days back) to today.
  const byDay = new Map<string, { count: number; amount: number }>();
  for (const r of paidRows) {
    if (!r.paidAt) continue;
    const key = lagosDay(r.paidAt);
    const cur = byDay.get(key) ?? { count: 0, amount: 0 };
    byDay.set(key, { count: cur.count + 1, amount: cur.amount + r.amount });
  }
  const first = paidRows.reduce((min, r) => (r.paidAt && r.paidAt < min ? r.paidAt : min), new Date(now.getTime() - 13 * DAY));
  const days: { label: string; value: number; detail: string }[] = [];
  for (let t = new Date(lagosDay(first)).getTime(); t <= new Date(lagosDay(now)).getTime() && days.length < 120; t += DAY) {
    const key = new Date(t).toISOString().slice(0, 10);
    const d = byDay.get(key);
    days.push({
      label: new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      value: d?.count ?? 0,
      detail: formatMoney(d?.amount ?? 0, event.currency),
    });
  }

  const kpis = [
    { label: 'Paid guests', value: `${paid.toLocaleString()}`, sub: `of ${event.capacity} places · ${fill}% full` },
    { label: 'Revenue', value: formatMoney(revenue, event.currency), sub: 'confirmed by Paystack' },
    { label: 'Paying right now', value: holding.toLocaleString(), sub: 'places held for 30 min' },
    { label: 'Conversion', value: `${conversion}%`, sub: `${total} sign-ups · ${pending - holding} abandoned` },
  ];
  const q = `?event=${event.id}`;

  return (
    <>
      <PageHeader
        title={event.name}
        subtitle={
          <>
            {formatEventDate(event.date)} · {event.location} ·{' '}
            {event.isActive ? <span className="font-semibold text-emerald-700">Live on website</span> : <span className="font-semibold text-amber-700">Draft</span>} ·{' '}
            Bookings {event.bookingOpen ? 'open' : 'paused'}
          </>
        }
        actions={
          <>
            <ActionButton action={setBookingOpen.bind(null, event.id, !event.bookingOpen)} className={event.bookingOpen ? 'btn-danger' : 'btn-primary'} confirm={event.bookingOpen ? 'Pause new bookings?' : undefined}>
              {event.bookingOpen ? 'Pause bookings' : 'Open bookings'}
            </ActionButton>
            <a href={`/api/admin/export${q}`} className="btn-secondary">Export CSV</a>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-ink tabular-nums">{k.value}</p>
            <p className="mt-1 text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </section>

      <section className="card mt-4 p-5">
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold">Capacity</span>
          <span className="tabular-nums text-slate-600">{paid} paid + {holding} holding / {event.capacity}</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={paid} aria-valuemax={event.capacity} aria-label="Capacity used">
          <div className="bg-brand" style={{ width: `${fill}%` }} />
          <div className="ml-0.5 bg-brand/35" style={{ width: `${Math.min(100 - fill, (holding / event.capacity) * 100)}%` }} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <h2 className="font-bold">Paid bookings per day</h2>
          <p className="mb-10 text-xs text-slate-500">Hover a day for its revenue. Times in Lagos.</p>
          <ColumnChart data={days} valueLabel="Bookings" unit={['booking', 'bookings']} />
        </section>

        <section className="card p-5">
          <h2 className="font-bold">Tribes</h2>
          <p className="mb-4 text-xs text-slate-500">Assigned when payment is confirmed.</p>
          <ul className="space-y-4">
            {event.tribes.map((t) => {
              const n = tribeCounts.find((r) => r.tribeId === t.id)?._count ?? 0;
              const pct = t.capacity ? Math.min(100, (n / t.capacity) * 100) : 0;
              return (
                <li key={t.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="size-2.5 rounded-full" style={{ background: t.colorHex }} aria-hidden />
                      {t.name} <span className="font-normal text-slate-500">· {t.element}</span>
                    </span>
                    <span className="tabular-nums text-slate-600">{n} / {t.capacity}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.colorHex }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="px-5 pt-5 font-bold">Tickets</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-5 py-2">Ticket</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Sold</th><th className="px-5 py-2 text-right">Revenue</th></tr>
            </thead>
            <tbody>
              {event.ticketTypes.map((t) => {
                const s = ticketStats.find((r) => r.ticketTypeId === t.id);
                return (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-5 py-2.5 font-medium">{t.name} {!t.active && <span className="text-xs text-slate-400">(hidden)</span>}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{t.price ? formatMoney(t.price, event.currency) : 'Free'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s?._count ?? 0}{t.quantity ? ` / ${t.quantity}` : ''}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(s?._sum.amount ?? 0, event.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-bold">Latest payments</h2>
            <Link href={`/admin/payments${q}`} className="text-xs font-semibold text-brand underline">All payments</Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.length === 0 && <li className="px-5 py-6 text-sm text-slate-500">No payments yet.</li>}
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.registration.fullName}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(p.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                  <StatusBadge status={p.status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
