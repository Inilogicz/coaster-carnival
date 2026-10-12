import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { getAvailability, HOLD_MINUTES } from './event';
import { formatEventDate, formatMoney } from './format';
import { initializeTransaction, type PaystackTransaction } from './paystack';
import { sendConfirmationEmail } from './email';
import { ticketImagePath, ticketPath } from './ticket';
import type { RegistrationInput } from './validation';
import { zodiacForBirthday } from './zodiac';

export class BookingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const code = (length: number) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(length), (b) => alphabet[b % alphabet.length]).join('');
};

/** Serialise all booking writes for one event so capacity and tribe counts never race. */
async function lockEvent(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${eventId}))) AS lock`;
}

export type StartBookingResult =
  | { kind: 'paystack'; accessCode: string; authorizationUrl: string; reference: string }
  | { kind: 'confirmed'; confirmation: Confirmation };

export async function startBooking(input: RegistrationInput, appUrl: string): Promise<StartBookingResult> {
  const zodiac = zodiacForBirthday(input.birthMonth, input.birthDay);
  if (!zodiac) throw new BookingError('Choose a valid birthday.');

  const registration = await db.$transaction(async (tx) => {
    const event = await tx.event.findFirst({ where: { isActive: true } });
    if (!event) throw new BookingError('There is no event open for booking right now.', 404);
    if (!event.bookingOpen) throw new BookingError('Bookings are not open yet. Contact the organiser for details.', 409);
    await lockEvent(tx, event.id);

    const ticket = await tx.ticketType.findFirst({ where: { id: input.ticketTypeId, eventId: event.id, active: true } });
    if (!ticket) throw new BookingError('That ticket is no longer available. Please choose another.', 409);

    const existing = await tx.registration.findUnique({ where: { eventId_email: { eventId: event.id, email: input.email } } });
    if (existing?.status === 'PAID') throw new BookingError('This email already has a confirmed booking. Check your inbox for your confirmation.', 409);

    // Count places held by everyone else, so a guest retrying payment does not block themselves.
    const { taken, ticketTaken } = await getAvailability(event.id, tx);
    const ownHold = existing && existing.status === 'PENDING' && existing.holdExpiresAt > new Date();
    const othersTaken = taken - (ownHold ? 1 : 0);
    const othersOnTicket = (ticketTaken.get(ticket.id) ?? 0) - (ownHold && existing.ticketTypeId === ticket.id ? 1 : 0);
    if (othersTaken >= event.capacity) throw new BookingError(`All ${event.capacity} places are taken. Registration is closed.`, 409);
    if (ticket.quantity != null && othersOnTicket >= ticket.quantity) throw new BookingError(`${ticket.name} tickets are sold out. Please choose another ticket.`, 409);

    const data = {
      ticketTypeId: ticket.id,
      status: 'PENDING' as const,
      amount: ticket.price,
      fullName: input.fullName,
      phone: input.phone,
      gender: input.gender,
      birthMonth: zodiac.month,
      birthDay: zodiac.day,
      zodiacSign: zodiac.sign,
      zodiacElement: zodiac.element,
      emergencyContact: input.emergencyContact,
      instagram: input.instagram ? '@' + input.instagram.replace(/^@/, '') : null,
      holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
    };
    return existing
      ? tx.registration.update({ where: { id: existing.id }, data, include: { event: true } })
      : tx.registration.create({ data: { ...data, eventId: event.id, email: input.email, reference: `CC-${code(8)}` }, include: { event: true } });
  });

  if (registration.amount === 0) {
    const confirmation = await confirmRegistration(registration.id, null);
    return { kind: 'confirmed', confirmation };
  }

  const reference = `${registration.reference}-${code(6)}`;
  await db.payment.create({
    data: { registrationId: registration.id, reference, amount: registration.amount, currency: registration.event.currency },
  });
  try {
    const tx = await initializeTransaction({
      email: registration.email,
      amount: registration.amount,
      currency: registration.event.currency,
      reference,
      callbackUrl: `${appUrl}/payment/callback`,
      metadata: {
        registration_reference: registration.reference,
        event: registration.event.name,
        custom_fields: [
          { display_name: 'Guest', variable_name: 'guest', value: registration.fullName },
          { display_name: 'Booking reference', variable_name: 'booking_reference', value: registration.reference },
        ],
      },
    });
    return { kind: 'paystack', accessCode: tx.access_code, authorizationUrl: tx.authorization_url, reference };
  } catch (error) {
    await db.payment.update({ where: { reference }, data: { status: 'FAILED', gatewayMessage: (error as Error).message } });
    throw new BookingError((error as Error).message, 502);
  }
}

/**
 * Apply a verified Paystack transaction. Safe to call repeatedly (callback + webhook both call it).
 * Returns the confirmation when the registration is paid, otherwise null.
 */
export async function applyPaystackTransaction(trx: PaystackTransaction): Promise<Confirmation | null> {
  const payment = await db.payment.findUnique({ where: { reference: trx.reference }, include: { registration: true } });
  if (!payment) return null;

  if (trx.status !== 'success') {
    if (payment.status === 'INITIALIZED' && (trx.status === 'failed' || trx.status === 'abandoned')) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: trx.status === 'failed' ? 'FAILED' : 'ABANDONED', gatewayMessage: trx.gateway_response, raw: trx as object },
      });
    }
    return null;
  }

  if (trx.amount < payment.amount || trx.currency !== payment.currency) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', gatewayMessage: `Amount mismatch: received ${trx.currency} ${trx.amount}, expected ${payment.currency} ${payment.amount}`, raw: trx as object },
    });
    return null;
  }

  if (payment.status !== 'SUCCESS') {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        channel: trx.channel,
        paystackId: String(trx.id),
        gatewayMessage: trx.gateway_response,
        paidAt: trx.paid_at ? new Date(trx.paid_at) : new Date(),
        raw: trx as object,
      },
    });
  }
  return confirmRegistration(payment.registrationId, trx.paid_at ? new Date(trx.paid_at) : new Date());
}

/** Mark a registration paid, assign its tribe, and send the confirmation email once. */
async function confirmRegistration(registrationId: string, paidAt: Date | null) {
  await db.$transaction(async (tx) => {
    const reg = await tx.registration.findUniqueOrThrow({ where: { id: registrationId } });
    await lockEvent(tx, reg.eventId);
    const current = await tx.registration.findUniqueOrThrow({ where: { id: registrationId }, include: { event: { include: { tribes: true } } } });
    if (current.status === 'PAID') return;

    const { paid, tribeTaken } = await getAvailability(current.eventId, tx);
    const tribes = current.event.tribes;
    const preferredPosition = zodiacForBirthday(current.birthMonth, current.birthDay)?.preferredPosition ?? 0;
    const preferred = tribes.find((t) => t.position === preferredPosition);
    const filled = (t: (typeof tribes)[number]) => tribeTaken.get(t.id) ?? 0;
    const byFill = [...tribes].sort((a, b) => filled(a) - filled(b) || a.position - b.position);
    const tribe =
      preferred && filled(preferred) < preferred.capacity ? preferred
      : byFill.find((t) => filled(t) < t.capacity) ?? byFill[0] ?? null;

    await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: 'PAID',
        paidAt: paidAt ?? new Date(),
        tribeId: tribe?.id ?? null,
        tribeReassigned: Boolean(tribe && preferred && tribe.id !== preferred.id),
        overCapacity: paid >= current.event.capacity,
      },
    });
  });

  const confirmation = await getConfirmation(registrationId);
  const claimed = await db.registration.updateMany({ where: { id: registrationId, emailSentAt: null }, data: { emailSentAt: new Date() } });
  if (claimed.count) {
    const sent = await sendConfirmationEmail(confirmation).catch(() => false);
    if (!sent) await db.registration.update({ where: { id: registrationId }, data: { emailSentAt: null } });
  }
  return confirmation;
}

export async function getConfirmation(registrationId: string) {
  const r = await db.registration.findUniqueOrThrow({ where: { id: registrationId }, include: { event: true, tribe: true, ticketType: true } });
  return {
    status: r.status,
    reference: r.reference,
    fullName: r.fullName,
    firstName: r.fullName.split(/\s+/)[0],
    email: r.email,
    ticketName: r.ticketType.name,
    amountLabel: r.amount === 0 ? 'Free' : formatMoney(r.amount, r.event.currency),
    zodiacSign: r.zodiacSign,
    zodiacElement: r.zodiacElement,
    tribe: r.tribe ? { name: r.tribe.name, colorName: r.tribe.colorName, colorHex: r.tribe.colorHex } : null,
    tribeReassigned: r.tribeReassigned,
    eventName: r.event.name,
    hostUpper: r.event.host.toUpperCase(),
    dateLong: formatEventDate(r.event.date),
    timeLabel: r.event.timeLabel,
    location: r.event.location,
    takeOffPoint: r.event.takeOffPoint,
    destination: r.event.destination,
    contactPhone: r.event.contactPhone,
    refundPolicy: r.event.refundPolicy,
    ticketUrl: ticketPath(r.reference),
    ticketImageUrl: ticketImagePath(r.reference),
  };
}

export type Confirmation = Awaited<ReturnType<typeof getConfirmation>>;

export async function resendConfirmation(registrationId: string) {
  const confirmation = await getConfirmation(registrationId);
  if (confirmation.status !== 'PAID') throw new BookingError('Only paid bookings have a confirmation to send.');
  const sent = await sendConfirmationEmail(confirmation);
  if (sent) await db.registration.update({ where: { id: registrationId }, data: { emailSentAt: new Date() } });
  return sent;
}
