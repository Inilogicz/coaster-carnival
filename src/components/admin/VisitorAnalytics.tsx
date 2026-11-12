import { db } from '@/lib/db';

type FunnelRow = { source: string | null; visitors: bigint; started: bigint; attempted: bigint; submitted: bigint; confirmed: bigint };

export async function VisitorAnalytics({ eventId }: { eventId: string }) {
  const rows = await db.$queryRaw<FunnelRow[]>`
    SELECT v."source" AS source,
      COUNT(DISTINCT v."visitorHash") AS visitors,
      COUNT(DISTINCT v."visitorHash") FILTER (WHERE v."startedAt" IS NOT NULL) AS started,
      COUNT(DISTINCT v."visitorHash") FILTER (WHERE v."attemptedAt" IS NOT NULL) AS attempted,
      COUNT(DISTINCT v."visitorHash") FILTER (WHERE v."submittedAt" IS NOT NULL) AS submitted,
      COUNT(DISTINCT v."visitorHash") FILTER (WHERE r."status" = 'PAID') AS confirmed
    FROM "AnalyticsVisit" v
    LEFT JOIN "Registration" r ON r."id" = v."registrationId"
    WHERE v."eventId" = ${eventId}
    GROUP BY ROLLUP(v."source")
  `;
  const totals = rows.find((r) => r.source === null);
  const visitors = Number(totals?.visitors ?? 0);
  const confirmed = Number(totals?.confirmed ?? 0);
  const metrics = [
    { label: 'Unique visitors', value: visitors, hint: 'Distinct browsers across both entry points' },
    { label: 'Started the form', value: Number(totals?.started ?? 0), hint: 'Interacted with a registration field' },
    { label: 'Tried submitting', value: Number(totals?.attempted ?? 0), hint: 'Includes incomplete or invalid forms' },
    { label: 'Submitted successfully', value: Number(totals?.submitted ?? 0), hint: 'Saved booking or external application' },
    { label: 'Confirmed visitors', value: confirmed, hint: 'Payment confirmed or external payment approved' },
  ];
  return <section className="card mt-5 overflow-hidden" aria-labelledby="visitor-analytics-title">
    <div className="flex flex-wrap items-start justify-between gap-3 p-5">
      <div><h2 id="visitor-analytics-title" className="font-bold">Visitor &amp; registration analytics</h2><p className="mt-1 text-xs text-slate-500">All time since tracking began · Anonymous browser counts for this event</p></div>
      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{visitors ? ((confirmed / visitors) * 100).toFixed(1) : '0'}% visitor conversion</span>
    </div>
    <div className="grid gap-px border-y border-slate-100 bg-slate-100 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => <div key={metric.label} className="bg-white p-5"><p className="text-xs font-semibold text-slate-500">{metric.label}</p><p className="my-2 text-3xl font-extrabold tabular-nums text-ink">{metric.value.toLocaleString()}</p><p className="text-xs leading-relaxed text-slate-500">{metric.hint}</p></div>)}
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
      <caption className="sr-only">Registration funnel by entry point</caption>
      <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Entry point</th>{['Visitors', 'Started', 'Attempted', 'Submitted', 'Confirmed'].map((label) => <th key={label} className="px-3 py-3 text-right">{label}</th>)}</tr></thead>
      <tbody>{(['WEBSITE', 'EXTERNAL'] as const).map((source) => {
        const row = rows.find((r) => r.source === source);
        return <tr key={source} className="border-t border-slate-100"><th className="px-5 py-3 text-left text-xs font-semibold">{source === 'WEBSITE' ? 'Main website' : 'External registration'}</th>{(['visitors', 'started', 'attempted', 'submitted', 'confirmed'] as const).map((key) => <td key={key} className="px-3 py-3 text-right tabular-nums">{Number(row?.[key] ?? 0).toLocaleString()}</td>)}</tr>;
      })}</tbody>
    </table></div>
    <p className="px-5 py-4 text-xs leading-relaxed text-slate-500">Confirmed visitors are tracked browsers linked to confirmed bookings. Older or untracked bookings still appear in Paid guests above. Returning visits on the same browser count once; clearing storage, blocked tracking, or switching devices affects counts. Both entry points are deduplicated in the totals. Refresh this dashboard for updates.</p>
  </section>;
}
