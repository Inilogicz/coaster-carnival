import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Registration } from '@/components/site/Registration';
import { db } from '@/lib/db';
import { getPublicEvent } from '@/lib/event';
import { validPrivateKey } from '@/lib/external-registration';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private registration', robots: { index: false, follow: false }, referrer: 'no-referrer',
};

export default async function ExternalRegistrationPage({ params, searchParams }: {
  params: Promise<{ eventId: string }>; searchParams: Promise<{ key?: string }>;
}) {
  const { eventId } = await params;
  const { key = '' } = await searchParams;
  const record = await db.event.findUnique({ where: { id: eventId }, select: { externalRegistrationKey: true, isActive: true } });
  if (!record?.isActive || !validPrivateKey(record.externalRegistrationKey, key)) notFound();
  const event = await getPublicEvent(eventId);
  if (!event) notFound();
  // Requests are reviewed separately, so public booking pauses/fullness don't block submission.
  return <Registration event={{ ...event, tickets: event.tickets.map((t) => ({ ...t, soldOut: false })) }} hidden={false} external={{ key }} />;
}
