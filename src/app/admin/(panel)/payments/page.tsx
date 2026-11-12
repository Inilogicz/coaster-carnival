import { Pagination } from '@/components/admin/Pagination';
import { paginate } from '@/lib/pagination';
import Link from 'next/link';
import type { PaymentStatus, Prisma } from '@prisma/client';
import { PageHeader, StatusBadge } from '@/components/admin/ui';
import { resolveAdminEvent } from '@/lib/admin-queries';
import { db } from '@/lib/db';
import { formatDateTime, formatMoney } from '@/lib/format';

const PAGE_SIZE = 50;
const STATUSES: PaymentStatus[] = ['SUCCESS', 'INITIALIZED', 'FAILED', 'ABANDONED'];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ event?: string; status?: string; source?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const event = await resolveAdminEvent(params.event);
  if (!event) return <PageHeader title="Payments" subtitle="No event found." />;

  const where: Prisma.PaymentWhereInput = { registration: { eventId: event.id } };
  if (params.source === 'WEBSITE' || params.source === 'EXTERNAL') where.source = params.source;
  if (params.status && STATUSES.includes(params.status as PaymentStatus)) where.status = params.status as PaymentStatus;
  if (params.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { registration: { fullName: { contains: q, mode: 'insensitive' } } },
      { registration: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const total = await db.payment.count({ where });
  const paging = paginate(params.page, total, PAGE_SIZE);
  const { page } = paging;
  const [rows, totals] = await Promise.all([
    db.payment.findMany({
      where,
      include: { registration: { select: { id: true, fullName: true, email: true, reference: true, approvedBy: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.payment.groupBy({ by: ['status'], where: { registration: { eventId: event.id } }, _count: true, _sum: { amount: true } }),
  ]);
  const sum = (s: PaymentStatus) => totals.find((t) => t.status === s);
  const link = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ event: params.event, status: params.status, source: params.source, q: params.q, ...o })) if (v) p.set(k, v);
    return `?${p}`;
  };

  return (
    <>
      <PageHeader title="Payment history" subtitle={`Website and approved external payments for ${event.name}`} />

      <section className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <Link key={s} href={link({ status: params.status === s ? undefined : s, page: undefined })} className={`card p-4 transition hover:border-brand ${params.status === s ? 'border-brand ring-2 ring-brand/20' : ''}`}>
            <StatusBadge status={s} />
            <p className="mt-2 text-2xl font-extrabold tabular-nums">{sum(s)?._count ?? 0}</p>
            <p className="text-xs text-slate-500 tabular-nums">{formatMoney(sum(s)?._sum.amount ?? 0, event.currency)}</p>
          </Link>
        ))}
      </section>

      <form className="card mb-4 flex flex-wrap gap-3 p-4">
        {params.event && <input type="hidden" name="event" value={params.event} />}
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <input name="q" defaultValue={params.q} placeholder="Search reference, name or email" className="input max-w-md flex-1" aria-label="Search payments" />
        <select name="source" defaultValue={params.source ?? ''} className="input" aria-label="Payment source">
          <option value="">All payment sources</option>
          <option value="WEBSITE">Website · Paystack</option>
          <option value="EXTERNAL">External · Admin approved</option>
        </select>
        <button className="btn-primary">Search</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Payment reference</th>
              <th className="px-3 py-2.5">Guest</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="px-3 py-2.5">Source</th>
              <th className="px-3 py-2.5">Channel</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-4 py-2.5">Started / paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No payments found.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                <td className="px-3 py-3"><p className="font-medium">{p.registration.fullName}</p><p className="text-xs text-slate-500">{p.registration.email}</p></td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${p.source === 'EXTERNAL' ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'}`}>{p.source === 'EXTERNAL' ? 'External' : 'Website · Paystack'}</span>
                  {p.source === 'EXTERNAL' && <><p className="mt-1 text-xs text-slate-500">Approved by {p.registration.approvedBy ?? 'organiser'}</p><Link className="text-xs text-brand underline" href={`/admin/external-payments?event=${event.id}`}>Review evidence</Link></>}
                </td>
                <td className="px-3 py-3 capitalize">{p.source === 'EXTERNAL' ? 'Offline payment' : p.channel?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="px-3 py-3"><StatusBadge status={p.status} />{p.gatewayMessage && p.status !== 'SUCCESS' && <p className="mt-1 max-w-[220px] text-xs text-slate-500">{p.gatewayMessage}</p>}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{formatDateTime(p.createdAt)}{p.paidAt && <><br />Paid {formatDateTime(p.paidAt)}</>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination {...paging} pageSize={PAGE_SIZE} href={(page) => link({ page: String(page) })} />

    </>
  );
}
