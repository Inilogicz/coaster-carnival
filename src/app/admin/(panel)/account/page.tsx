import { PasswordForm } from '@/components/admin/PasswordForm';
import { PageHeader } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/auth';
import { paystackConfigured } from '@/lib/paystack';

export default async function AccountPage() {
  const admin = await requireAdmin();
  const checks = [
    { label: 'Paystack keys', ok: paystackConfigured(), hint: 'PAYSTACK_SECRET_KEY and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY' },
    { label: 'Confirmation emails (Resend)', ok: Boolean(process.env.RESEND_API_KEY), hint: 'RESEND_API_KEY and EMAIL_FROM' },
    { label: 'Media uploads (Cloudinary)', ok: Boolean(process.env.CLOUDINARY_URL), hint: 'CLOUDINARY_URL (optional; you can paste URLs instead)' },
    { label: 'Public site URL', ok: Boolean(process.env.APP_URL), hint: 'APP_URL, used for the Paystack return link' },
  ];
  return (
    <>
      <PageHeader title="Account & setup" subtitle={`Signed in as ${admin.email}`} />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <PasswordForm />
        <section className="card p-6">
          <h2 className="font-bold">Integrations</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${c.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{c.ok ? 'Ready' : 'Not set'}</span>
                <span><span className="font-semibold">{c.label}</span><span className="block text-xs text-slate-500">{c.hint}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Paystack webhook URL (Settings → API Keys &amp; Webhooks):<br />
            <code className="font-mono text-ink">{(process.env.APP_URL || 'https://your-domain').replace(/\/$/, '')}/api/paystack/webhook</code>
          </p>
        </section>
      </div>
    </>
  );
}
