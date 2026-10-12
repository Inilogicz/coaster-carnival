'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveTribes, type ActionResult } from '@/app/admin/(panel)/actions';
import { MediaField } from './MediaField';
import { Notice } from './ui';

type Tribe = { id: string; position: number; element: string; name: string; colorName: string; colorHex: string; tagline: string; image: string; capacity: number };

export function TribesEditor({ eventId, tribes: initial, eventCapacity }: { eventId: string; tribes: Tribe[]; eventCapacity: number }) {
  const router = useRouter();
  const [tribes, setTribes] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const update = (i: number, patch: Partial<Tribe>) => setTribes((all) => all.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const totalPlaces = tribes.reduce((s, t) => s + Number(t.capacity || 0), 0);

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setResult(await saveTribes(eventId, tribes));
          router.refresh();
        });
      }}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold">Tribes</h2>
        <p className="text-xs text-slate-500">
          A guest’s zodiac element picks their tribe. If it’s full they join the least-filled tribe. Tribe places total {totalPlaces} vs event capacity {eventCapacity}.
        </p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        {tribes.map((t, i) => (
          <fieldset key={t.id} className="space-y-3 rounded-xl border border-slate-200 p-4" style={{ borderTop: `6px solid ${t.colorHex}` }}>
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">{t.element} signs</legend>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Name</span><input className="input" required value={t.name} onChange={(e) => update(i, { name: e.target.value })} /></label>
              <label><span className="label">Places</span><input className="input" type="number" min={0} required value={t.capacity} onChange={(e) => update(i, { capacity: Number(e.target.value) })} /></label>
              <label><span className="label">Colour name</span><input className="input" required value={t.colorName} onChange={(e) => update(i, { colorName: e.target.value })} /></label>
              <label>
                <span className="label">Colour</span>
                <span className="flex gap-2">
                  <input type="color" className="h-[38px] w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300" value={t.colorHex} onChange={(e) => update(i, { colorHex: e.target.value.toUpperCase() })} />
                  <input className="input font-mono" value={t.colorHex} onChange={(e) => update(i, { colorHex: e.target.value })} />
                </span>
              </label>
            </div>
            <label className="block"><span className="label">Tagline</span><input className="input" value={t.tagline} onChange={(e) => update(i, { tagline: e.target.value })} /></label>
            <MediaField label="Card image" value={t.image} onChange={(image) => update(i, { image })} />
          </fieldset>
        ))}
      </div>
      <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-4">
        <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save tribes'}</button>
        <Notice result={result} />
      </div>
    </form>
  );
}
