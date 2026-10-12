import Link from 'next/link';
import { NewEventForm } from '@/components/admin/NewEventForm';
import { ActionButton, PageHeader } from '@/components/admin/ui';
import { db } from '@/lib/db';
import { formatEventDate, formatMoney } from '@/lib/format';
import { activateEvent, deleteEvent } from '../actions';

export default async function EventsPage() {
  const events = await db.event.findMany({
    orderBy: [{ isActive: 'desc' }, { date: 'desc' }],
    include: { _count: { select: { registrations: { where: { status: 'PAID' } } } } },
  });
  const revenue = await db.registration.groupBy({ by: ['eventId'], where: { status: 'PAID' }, _sum: { amount: true } });

  return (
    <>
      <PageHeader title="All events" subtitle="Only one event is live on the website at a time. Past events keep their attendees and payments." />
      <NewEventForm events={events.map((e) => ({ id: e.id, name: e.name }))} />
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((e) => (
          <article key={e.id} className={`card p-5 ${e.isActive ? 'border-brand ring-2 ring-brand/20' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{e.name}</h2>
                <p className="text-sm text-slate-500">{formatEventDate(e.date)} · {e.location}</p>
              </div>
              {e.isActive ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">LIVE</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">DRAFT</span>
              )}
            </div>
            <p className="mt-3 text-sm tabular-nums text-slate-600">
              {e._count.registrations} paid guests · {formatMoney(revenue.find((r) => r.eventId === e.id)?._sum.amount ?? 0, e.currency)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/admin?event=${e.id}`} className="btn-secondary">Open</Link>
              <Link href={`/admin/event?event=${e.id}`} className="btn-secondary">Edit</Link>
              {!e.isActive && (
                <ActionButton action={activateEvent.bind(null, e.id)} className="btn-primary" confirm={`Make “${e.name}” the live event on the website? The current live event will be taken down.`}>
                  Make live
                </ActionButton>
              )}
              {!e.isActive && e._count.registrations === 0 && (
                <ActionButton action={deleteEvent.bind(null, e.id)} className="btn-danger" confirm={`Delete “${e.name}” permanently?`}>Delete</ActionButton>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
