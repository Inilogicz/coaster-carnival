import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Registration } from '@/components/site/Registration';
import { db } from '@/lib/db';
import { getPublicEvent } from '@/lib/event';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'External payment registration', robots: { index: false, follow: false }, referrer: 'no-referrer',
};

export default async function ExternalRegistrationPage() {
  const record = await db.event.findFirst({
    where: { isActive: true }, select: { id: true, externalRegistrationKey: true },
  });
  if (!record?.externalRegistrationKey) notFound();
  const event = await getPublicEvent(record.id);
  if (!event) notFound();
  return <Registration event={{ ...event, tickets: event.tickets.map((ticket) => ({ ...ticket, soldOut: false })) }} hidden={false} external={{ key: record.externalRegistrationKey }} />;
}
