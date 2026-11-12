import Link from 'next/link';

export function Pagination({ page, pages, total, pageSize, href }: {
  page: number; pages: number; total: number; pageSize: number; href: (page: number) => string;
}) {
  if (!total) return null;
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
    <p className="text-slate-500">{((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()} · Page {page} of {pages}</p>
    {pages > 1 && <div className="flex flex-wrap items-center gap-2">
      {page > 1 ? <Link className="btn-secondary" href={href(page - 1)} aria-label="Previous page">Previous</Link> : <span className="btn-secondary opacity-40" aria-disabled="true">Previous</span>}
      {numbers.map((n, i) => <span key={n} className="inline-flex items-center gap-2">
        {i > 0 && n - numbers[i - 1] > 1 && <span aria-hidden="true">…</span>}
        <Link className={n === page ? 'btn-primary' : 'btn-secondary'} href={href(n)} aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined}>{n}</Link>
      </span>)}
      {page < pages ? <Link className="btn-secondary" href={href(page + 1)} aria-label="Next page">Next</Link> : <span className="btn-secondary opacity-40" aria-disabled="true">Next</span>}
    </div>}
  </nav>;
}
