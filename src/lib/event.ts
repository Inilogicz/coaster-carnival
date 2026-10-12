import type { Prisma } from '@prisma/client';
import { db } from './db';
import { resolveContent } from './content';
import { formatEventDate, formatMoney } from './format';
import { ELEMENTS } from './zodiac';

/** A pending registration holds its place this long while the guest pays. */
export const HOLD_MINUTES = 30;

const eventInclude = {
  tribes: { orderBy: { position: 'asc' } },
  ticketTypes: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.EventInclude;

export type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

export function getActiveEvent() {
  return db.event.findFirst({ where: { isActive: true }, include: eventInclude });
}

export function getEventById(id: string) {
  return db.event.findUnique({ where: { id }, include: eventInclude });
}

/** Places taken = paid registrations + pending ones whose hold has not expired. */
export async function getAvailability(eventId: string, tx: Prisma.TransactionClient = db) {
  const holding = { eventId, OR: [{ status: 'PAID' as const }, { status: 'PENDING' as const, holdExpiresAt: { gt: new Date() } }] };
  const [byTicket, byTribe, paid] = await Promise.all([
    tx.registration.groupBy({ by: ['ticketTypeId'], where: holding, _count: true }),
    tx.registration.groupBy({ by: ['tribeId'], where: { eventId, status: 'PAID' }, _count: true }),
    tx.registration.count({ where: { eventId, status: 'PAID' } }),
  ]);
  const ticketTaken = new Map(byTicket.map((r) => [r.ticketTypeId, r._count]));
  const tribeTaken = new Map(byTribe.map((r) => [r.tribeId ?? '', r._count]));
  const taken = byTicket.reduce((sum, r) => sum + r._count, 0);
  return { taken, paid, ticketTaken, tribeTaken };
}

export type PublicTicket = { id: string; name: string; description: string; price: number; priceLabel: string; soldOut: boolean };

/** Everything the public pages need, with tokens ready to fill admin copy. */
export async function getPublicEvent() {
  const event = await getActiveEvent();
  if (!event) return null;
  const availability = await getAvailability(event.id);
  const content = resolveContent(event.content);
  const remaining = Math.max(0, event.capacity - availability.taken);
  const closed = remaining === 0;

  const tickets: PublicTicket[] = event.ticketTypes
    .filter((t) => t.active)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.price,
      priceLabel: t.price === 0 ? 'Free' : formatMoney(t.price, event.currency),
      soldOut: closed || (t.quantity != null && (availability.ticketTaken.get(t.id) ?? 0) >= t.quantity),
    }));

  const prices = tickets.map((t) => t.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const priceLabel =
    !prices.length ? 'TBA'
    : prices.every((p) => p === minPrice) ? tickets[0].priceLabel
    : minPrice === 0 ? `Free to ${formatMoney(Math.max(...prices), event.currency)}`
    : `From ${formatMoney(minPrice, event.currency)}`;

  const tribeCapacities = new Set(event.tribes.map((t) => t.capacity));
  const dateLong = formatEventDate(event.date);
  const tokens: Record<string, string | number> = {
    name: event.name,
    nameUpper: event.name.toUpperCase(),
    host: event.host,
    hostUpper: event.host.toUpperCase(),
    theme: event.theme,
    date: dateLong,
    dateShort: dateLong.replace(/ \d{4}$/, ''),
    time: event.timeLabel,
    startTime: event.startTime,
    city: event.city,
    location: event.location,
    capacity: event.capacity,
    tribeCapacity: tribeCapacities.size === 1 ? [...tribeCapacities][0] : 'limited',
    price: priceLabel,
    contact: event.contactPhone,
    takeOff: event.takeOffPoint,
    destination: event.destination,
    tribeMap: event.tribes.map((t) => `${ELEMENTS[t.position]} → ${t.name}`).join(', '),
  };

  return {
    id: event.id,
    name: event.name,
    host: event.host,
    theme: event.theme,
    dateLong,
    startTime: event.startTime,
    timeLabel: event.timeLabel,
    city: event.city,
    location: event.location,
    takeOffPoint: event.takeOffPoint,
    destination: event.destination,
    capacity: event.capacity,
    contactPhone: event.contactPhone,
    refundPolicy: event.refundPolicy,
    bookingOpen: event.bookingOpen,
    closed,
    priceLabel,
    tickets,
    tribes: event.tribes.map((t) => ({ position: t.position, element: t.element, name: t.name, colorName: t.colorName, colorHex: t.colorHex, tagline: t.tagline, image: t.image, capacity: t.capacity })),
    content,
    tokens,
  };
}

export type PublicEvent = NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;
