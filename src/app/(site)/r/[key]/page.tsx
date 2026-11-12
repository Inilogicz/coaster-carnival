import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Registration } from '@/components/site/Registration';
import { db } from '@/lib/db';
import { getPublicEvent } from '@/lib/event';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private registration', robots: { index: false, follow: false }, referrer: 'no-referrer',
};

export default async function ShortRegistrationPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[A-Za-z0-9_-]{22,128}$/.test(key)) notFound();
  const record = await db.event.findFirst({
    where: { externalRegistrationKey: key, isActive: true }, select: { id: true },
  });
  if (!record) notFound();
  const event = await getPublicEvent(record.id);
  if (!event) notFound();
  return <Registration event={{ ...event, tickets: event.tickets.map((ticket) => ({ ...ticket, soldOut: false })) }} hidden={false} external={{ key }} />;
}
