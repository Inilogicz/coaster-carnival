'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createEvent, type ActionResult } from '@/app/admin/(panel)/actions';
import { Notice } from './ui';

export function NewEventForm({ events }: { events: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [from, setFrom] = useState(events[0]?.id ?? '');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="card mb-6 flex flex-wrap items-end gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createEvent({ name, cloneFromId: from });
          setResult(r);
          if (r.ok) setName('');
          router.refresh();
        });
      }}
    >
      <label className="min-w-56 flex-1">
        <span className="label">New event name</span>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Coastal Carnival 5.0" />
      </label>
      <label className="min-w-56">
        <span className="label">Copy design, tickets & tribes from</span>
        <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
      <button className="btn-primary" disabled={pending}>{pending ? 'Creating…' : 'Create draft'}</button>
      <div className="basis-full"><Notice result={result} /></div>
    </form>
  );
}
