import { Suspense } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const events = await db.event.findMany({ orderBy: [{ isActive: 'desc' }, { date: 'desc' }], select: { id: true, name: true, date: true, isActive: true } });
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <div className="bg-ink">
        <Suspense>
          <Sidebar events={events} adminEmail={admin.email} />
        </Suspense>
      </div>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}
