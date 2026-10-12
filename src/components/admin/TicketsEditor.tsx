'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteTicket, saveTicket, type ActionResult } from '@/app/admin/(panel)/actions';
import { Notice } from './ui';

type Ticket = { id?: string; name: string; description: string; priceNaira: number; quantity: number | ''; active: boolean; sortOrder: number; sold?: number };

function TicketRow({ eventId, ticket, onDone, onResult }: { eventId: string; ticket: Ticket; onDone?: () => void; onResult: (r: ActionResult) => void }) {
  const router = useRouter();
  const [t, setT] = useState(ticket);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r.ok ? null : r);
      onResult(r);
      if (r.ok) {
        onDone?.();
        router.refresh();
      }
    });

  return (
    <form
      className="grid gap-4 border-t border-slate-100 p-5 first:border-t-0 lg:grid-cols-[1.2fr_2fr_.8fr_.8fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        act(() => saveTicket(eventId, { ...t, quantity: t.quantity === '' ? '' : Number(t.quantity) }));
      }}
    >
      <label>
        <span className="label">Name</span>
        <input className="input" required value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Regular" />
      </label>
      <label>
        <span className="label">What’s included</span>
        <input className="input" value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} placeholder="Includes transport, food, drinks…" />
      </label>
      <label>
        <span className="label">Price (₦)</span>
        <input className="input" type="number" min={0} step="0.01" required value={t.priceNaira} onChange={(e) => setT({ ...t, priceNaira: Number(e.target.value) })} />
      </label>
      <label>
        <span className="label">Quantity</span>
        <input className="input" type="number" min={1} value={t.quantity} placeholder="No limit" onChange={(e) => setT({ ...t, quantity: e.target.value === '' ? '' : Number(e.target.value) })} />
      </label>
      <div className="flex flex-col justify-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-brand" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} /> On sale
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 lg:col-span-5">
        <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : t.id ? 'Save ticket' : 'Add ticket'}</button>
        {t.id && (
          <button type="button" className="btn-danger" disabled={pending} onClick={() => confirm(`Delete “${t.name}”?`) && act(() => deleteTicket(t.id!))}>
            Delete
          </button>
        )}
        {t.id && <span className="text-xs text-slate-500">{ticket.sold ?? 0} sold · price 0 = free (no Paystack)</span>}
        <Notice result={result} />
      </div>
    </form>
  );
}

export function TicketsEditor({ eventId, tickets }: { eventId: string; tickets: Ticket[] }) {
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <section className="card mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold">Tickets</h2>
          <p className="text-xs text-slate-500">With more than one ticket on sale, guests pick one on the form; the hero shows “From ₦…”.</p>
        </div>
        {!adding && <button className="btn-secondary" onClick={() => setAdding(true)}>+ Add ticket</button>}
      </div>
      {result?.ok && <div className="px-5 pt-4"><Notice result={result} /></div>}
      {tickets.map((t) => <TicketRow key={t.id} eventId={eventId} ticket={t} onResult={setResult} />)}
      {adding && (
        <div className="bg-slate-50/70">
          <TicketRow eventId={eventId} ticket={{ name: '', description: '', priceNaira: 0, quantity: '', active: true, sortOrder: tickets.length }} onDone={() => setAdding(false)} onResult={setResult} />
        </div>
      )}
      {!tickets.length && !adding && <p className="p-5 text-sm text-slate-500">No tickets yet. Add one so guests can book.</p>}
    </section>
  );
}
