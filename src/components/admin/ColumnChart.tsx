'use client';

import { useMemo, useState } from 'react';

type Datum = { label: string; value: number; detail?: string };

function niceMax(max: number) {
  if (max <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

/**
 * Single-series column chart: thin columns with rounded data-ends, a recessive grid,
 * hover tooltip with a hit target larger than the mark, and a table view for accessibility.
 */
export function ColumnChart({ data, valueLabel, unit = ['item', 'items'], color = '#159fa3' }: { data: Datum[]; valueLabel: string; unit?: [string, string]; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data]);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];

  const W = 720;
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: 34 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(3, band * 0.6));
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const labelEvery = Math.ceil(data.length / 8);

  if (asTable) {
    return (
      <div>
        <button className="mb-2 text-xs font-semibold text-brand underline" onClick={() => setAsTable(false)}>Show chart</button>
        <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">{valueLabel}</th></tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-t border-slate-100">
                  <td className="px-3 py-1.5">{d.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.value.toLocaleString()}{d.detail ? ` · ${d.detail}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      <button className="absolute -top-8 right-0 text-xs font-semibold text-brand underline" onClick={() => setAsTable(true)}>View as table</button>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${valueLabel} per day`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#cbd5e1' : '#eef2f6'} strokeWidth={1} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="#64748b">{Number.isInteger(t) ? t.toLocaleString() : ''}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const top = y(d.value);
          const height = pad.top + innerH - top;
          const r = Math.min(4, height, barW / 2);
          return (
            <g key={d.label}>
              {d.value > 0 && (
                <path
                  d={`M${cx - barW / 2},${top + height} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${top + height} Z`}
                  fill={color}
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={10} fill="#64748b">{d.label}</text>
              )}
              <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: `${((pad.left + band * hover + band / 2) / W) * 100}%`, top: `${(y(h.value) / H) * 100}%` }}
        >
          <p className="font-semibold">{h.label}</p>
          <p className="tabular-nums text-white/80">{h.value.toLocaleString()} {h.value === 1 ? unit[0] : unit[1]}{h.detail ? ` · ${h.detail}` : ''}</p>
        </div>
      )}
    </div>
  );
}
