'use client';

import { useState, useTransition } from 'react';
import { changePassword, type ActionResult } from '@/app/admin/(panel)/actions';
import { Notice } from './ui';

export function PasswordForm() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        if (data.get('next') !== data.get('confirm')) return setResult({ ok: false, error: 'The new passwords don’t match.' });
        start(async () => {
          const r = await changePassword({ current: String(data.get('current')), next: String(data.get('next')) });
          setResult(r);
          if (r.ok) form.reset();
        });
      }}
    >
      <h2 className="font-bold">Change password</h2>
      <label className="block"><span className="label">Current password</span><input name="current" type="password" required autoComplete="current-password" className="input" /></label>
      <label className="block"><span className="label">New password</span><input name="next" type="password" required minLength={10} autoComplete="new-password" className="input" /></label>
      <label className="block"><span className="label">Confirm new password</span><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="input" /></label>
      <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Update password'}</button>
      <Notice result={result} />
    </form>
  );
}
