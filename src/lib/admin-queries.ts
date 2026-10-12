import type { Prisma, RegistrationStatus } from '@prisma/client';
import { db } from './db';

export type AttendeeFilters = { q?: string; status?: string; tribe?: string; ticket?: string };

/** Shared by the attendees page and the CSV export so both always show the same rows. */
export function attendeeWhere(eventId: string, f: AttendeeFilters): Prisma.RegistrationWhereInput {
  const where: Prisma.RegistrationWhereInput = { eventId };
  if (f.status === 'HOLDING') Object.assign(where, { status: 'PENDING', holdExpiresAt: { gt: new Date() } });
  else if (f.status === 'EXPIRED') Object.assign(where, { status: 'PENDING', holdExpiresAt: { lte: new Date() } });
  else if (f.status && ['PAID', 'PENDING', 'CANCELLED'].includes(f.status)) where.status = f.status as RegistrationStatus;
  if (f.tribe) where.tribeId = f.tribe;
  if (f.ticket) where.ticketTypeId = f.ticket;
  if (f.q?.trim()) {
    const q = f.q.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { reference: { contains: q, mode: 'insensitive' } },
      { instagram: { contains: q, mode: 'insensitive' } },
    ];
  }
  return where;
}

/** The event the admin is looking at: ?event=… or else the active one. */
export async function resolveAdminEvent(eventId?: string) {
  const include = { tribes: { orderBy: { position: 'asc' as const } }, ticketTypes: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] } };
  if (eventId) {
    const event = await db.event.findUnique({ where: { id: eventId }, include });
    if (event) return event;
  }
  return (await db.event.findFirst({ where: { isActive: true }, include })) ?? (await db.event.findFirst({ orderBy: { createdAt: 'desc' }, include }));
}
