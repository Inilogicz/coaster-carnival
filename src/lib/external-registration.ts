import crypto from 'node:crypto';
import { db } from './db';
import { BookingError } from './booking';
import type { RegistrationInput } from './validation';
import { zodiacForBirthday } from './zodiac';

export function validPrivateKey(expected: string | null, supplied: string) {
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function submitExternalRegistration(eventId: string, key: string, input: RegistrationInput, paymentNote: string, receipt: { data: Uint8Array<ArrayBuffer>; mimeType: string; name: string }) {
  return db.$transaction(async (tx) => {
    // Same lock used by booking and approval; no places are reserved at submission.
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${eventId}))) AS lock`;
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event?.isActive || !validPrivateKey(event.externalRegistrationKey, key)) throw new BookingError('This private registration link is unavailable.', 404);
    const ticket = await tx.ticketType.findFirst({ where: { id: input.ticketTypeId, eventId, active: true } });
    if (!ticket) throw new BookingError('Choose an available ticket.');
    const existing = await tx.registration.findUnique({ where: { eventId_email: { eventId, email: input.email } } });
    if (existing) throw new BookingError('This email already has a registration or approval request. Contact the organiser for help.', 409);
    const zodiac = zodiacForBirthday(input.birthMonth, input.birthDay)!;
    await tx.registration.create({ data: {
      eventId, ticketTypeId: ticket.id, reference: `CC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      status: 'AWAITING_APPROVAL', amount: ticket.price, email: input.email,
      fullName: input.fullName, phone: input.phone, gender: input.gender,
      birthMonth: input.birthMonth, birthDay: input.birthDay, zodiacSign: zodiac.sign, zodiacElement: zodiac.element,
      emergencyContact: input.emergencyContact, instagram: input.instagram || null,
      externalPaymentNote: paymentNote, holdExpiresAt: new Date(),
      externalReceipt: { create: receipt },
    } });
  });
}
