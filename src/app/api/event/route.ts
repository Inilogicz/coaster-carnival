import { NextResponse } from 'next/server';
import { getPublicEvent } from '@/lib/event';

export const dynamic = 'force-dynamic';

/** Live booking state for the registration form. */
export async function GET() {
  const event = await getPublicEvent();
  if (!event) return NextResponse.json({ error: 'No active event.' }, { status: 404 });
  return NextResponse.json({ bookingOpen: event.bookingOpen, closed: event.closed, capacity: event.capacity, tickets: event.tickets });
}
