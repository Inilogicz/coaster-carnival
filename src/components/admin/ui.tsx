'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ActionResult } from '@/app/admin/(panel)/actions';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p role="status" className={`rounded-lg px-3 py-2 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
      {result.ok ? result.message ?? 'Saved.' : result.error}
    </p>
  );
}

/** Button that runs a server action, shows its result, and refreshes server data. */
export function ActionButton({
  action,
  children,
  confirm,
  className = 'btn-secondary',
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            setResult(r);
            router.refresh();
          });
        }}
      >
        {pending ? 'Working…' : children}
      </button>
      <Notice result={result} />
    </span>
  );
}

export function StatusBadge({ status, holding }: { status: string; holding?: boolean }) {
  const map: Record<string, [string, string]> = {
    PAID: ['Paid', 'bg-emerald-100 text-emerald-800'],
    SUCCESS: ['Success', 'bg-emerald-100 text-emerald-800'],
    PENDING: holding ? ['Paying now', 'bg-amber-100 text-amber-800'] : ['Abandoned', 'bg-slate-100 text-slate-600'],
    INITIALIZED: ['Started', 'bg-amber-100 text-amber-800'],
    CANCELLED: ['Cancelled', 'bg-slate-100 text-slate-600'],
    FAILED: ['Failed', 'bg-rose-100 text-rose-800'],
    ABANDONED: ['Abandoned', 'bg-slate-100 text-slate-600'],
  };
  const [label, cls] = map[status] ?? [status, 'bg-slate-100 text-slate-700'];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}
