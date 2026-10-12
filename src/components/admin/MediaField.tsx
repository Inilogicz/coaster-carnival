'use client';

import { useEffect, useState } from 'react';

let uploadsEnabled: Promise<boolean> | null = null;
const checkUploads = () => (uploadsEnabled ??= fetch('/api/admin/upload').then((r) => r.json()).then((d) => Boolean(d.enabled)).catch(() => false));

/** A media URL input with optional Cloudinary upload and a small preview. */
export function MediaField({
  label,
  value,
  onChange,
  accept = 'image/*',
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  hint?: string;
}) {
  const [canUpload, setCanUpload] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => void checkUploads().then(setCanUpload), []);

  async function upload(file: File) {
    setBusy(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/admin/upload', { method: 'POST', body });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(result.error || 'Upload failed.');
    onChange(result.url);
  }

  const isImage = /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(value) || value.includes('/image/upload/');
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-start gap-3">
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-12 shrink-0 rounded-md border border-slate-200 object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or /assets/…" />
            {canUpload && (
              <label className={`btn-secondary shrink-0 ${busy ? 'opacity-60' : ''}`}>
                {busy ? 'Uploading…' : 'Upload'}
                <input type="file" accept={accept} className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            )}
          </div>
          {(hint || error) && <p className={`mt-1 text-xs ${error ? 'text-rose-700' : 'text-slate-500'}`}>{error || hint}</p>}
        </div>
      </div>
    </div>
  );
}
