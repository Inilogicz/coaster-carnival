'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveEventDetails, type ActionResult } from '@/app/admin/(panel)/actions';
import { Notice } from './ui';

type Details = {
  name: string; host: string; theme: string; date: string; startTime: string; timeLabel: string; city: string; location: string;
  takeOffPoint: string; destination: string; capacity: number; contactPhone: string; refundPolicy: string; bookingOpen: boolean;
};

const FIELDS: { key: keyof Details; label: string; hint?: string; type?: string; wide?: boolean }[] = [
  { key: 'name', label: 'Event name', hint: 'e.g. Coastal Carnival 4.0 (shown in capitals in the hero)' },
  { key: 'host', label: 'Host / brand', hint: 'e.g. The Wildings Hub' },
  { key: 'theme', label: 'Theme line', hint: 'e.g. Rhythm of the Coast' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'startTime', label: 'Start time (short)', hint: 'e.g. 3pm' },
  { key: 'timeLabel', label: 'Time (long)', hint: 'e.g. 3pm till dawn' },
  { key: 'city', label: 'City', hint: 'Short place name, e.g. Lagos' },
  { key: 'location', label: 'Location', hint: 'e.g. Lagos, Nigeria' },
  { key: 'takeOffPoint', label: 'Take-off point', hint: 'e.g. Ikeja City Mall' },
  { key: 'destination', label: 'Event destination', hint: 'e.g. Island, Lagos' },
  { key: 'capacity', label: 'Total capacity', type: 'number', hint: 'Maximum paid guests across all tickets' },
  { key: 'contactPhone', label: 'Organiser phone' },
  { key: 'refundPolicy', label: 'Refund policy', wide: true, hint: 'e.g. No refunds.' },
];

export function EventDetailsForm({ eventId, initial }: { eventId: string; initial: Details }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Details>(key: K, value: Details[K]) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <form
      className="card max-w-4xl space-y-6 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setResult(await saveEventDetails(eventId, values));
          router.refresh();
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
            <span className="label">{f.label}</span>
            <input
              className="input"
              type={f.type ?? 'text'}
              min={f.type === 'number' ? 1 : undefined}
              required={!['takeOffPoint', 'destination', 'theme'].includes(f.key)}
              value={String(values[f.key])}
              onChange={(e) => set(f.key, (f.type === 'number' ? Number(e.target.value) : e.target.value) as never)}
            />
            {f.hint && <span className="mt-1 block text-xs text-slate-500">{f.hint}</span>}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
        <input type="checkbox" className="size-4 accent-brand" checked={values.bookingOpen} onChange={(e) => set('bookingOpen', e.target.checked)} />
        <span>
          <span className="block text-sm font-semibold">Bookings open</span>
          <span className="text-xs text-slate-500">When off, the form shows “Booking Opens Soon” and no one can pay.</span>
        </span>
      </label>
      <div className="flex items-center gap-4">
        <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save details'}</button>
        <Notice result={result} />
      </div>
    </form>
  );
}
