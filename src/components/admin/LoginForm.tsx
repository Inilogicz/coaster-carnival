'use client';

import { useState } from 'react';

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    if (response.ok) return window.location.assign(next);
    setError((await response.json().catch(() => ({}))).error || 'Sign in failed.');
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Email</span>
        <input name="email" type="email" required autoComplete="username" className="input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
