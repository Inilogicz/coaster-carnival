import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { getAvailability, HOLD_MINUTES } from './event';
import { formatEventDate, formatMoney } from './format';
import { initializeTransaction, type PaystackTransaction } from './paystack';
import { sendConfirmationEmail } from './email';
import { ticketImagePath, ticketPath } from './ticket';
import type { BookingInput } from './validation';
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

export async function startBooking(input: BookingInput, appUrl: string): Promise<StartBookingResult> {
  const zodiac = zodiacForBirthday(input.birthMonth, input.birthDay);
  if (!zodiac) throw new BookingError('Choose a valid birthday.');

  const registration = await db.$transaction(async (tx) => {
    const event = await tx.event.findFirst({ where: { isActive: true } });
    if (!event) throw new BookingError('There is no event open for booking right now.', 404);
    if (!event.bookingOpen) throw new BookingError('Bookings are not open yet. Contact the organiser for details.', 409);
    await lockEvent(tx, event.id);
    const preparePayment = async <T extends { id: string; reference: string; total: number }>(registration: T) => {
      const paymentReference = `${registration.reference}-${code(6)}`;
      if (registration.total > 0) await tx.payment.create({
        data: { registrationId: registration.id, reference: paymentReference, amount: registration.total, currency: event.currency },
      });
      return { ...registration, paymentReference };
    };

    const ticket = await tx.ticketType.findFirst({ where: { id: input.ticketTypeId, eventId: event.id, active: true } });
    if (!ticket) throw new BookingError('That ticket is no longer available. Please choose another.', 409);

    const existing = await tx.registration.findFirst({ where: { eventId: event.id, email: input.email, bookingParentId: null }, include: { bookingGuests: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } });
    if (existing?.externalPaymentNote) throw new BookingError('This email has an external payment registration. Contact the organiser about its approval.', 409);
    if (existing?.status === 'PAID') throw new BookingError('This email already has a confirmed booking. Check your inbox for your confirmation.', 409);

    // Count places held by everyone else, so a guest retrying payment does not block themselves.
    const { taken, ticketTaken } = await getAvailability(event.id, tx);
    const ownHold = existing && existing.status === 'PENDING' && existing.holdExpiresAt > new Date();
    const ownCount = ownHold ? 1 + existing.bookingGuests.filter((g) => g.status === 'PENDING' && g.holdExpiresAt > new Date()).length : 0;
    const count = 1 + input.guests.length;
    const othersTaken = taken - ownCount;
    const othersOnTicket = (ticketTaken.get(ticket.id) ?? 0) - (ownHold && existing.ticketTypeId === ticket.id ? ownCount : 0);
    if (othersTaken + count > event.capacity) throw new BookingError(`All ${event.capacity} places are taken. Registration is closed.`, 409);
    if (ticket.quantity != null && othersOnTicket + count > ticket.quantity) throw new BookingError(`${ticket.name} tickets are sold out. Please choose another ticket.`, 409);

    // Once a payment has been opened, preserve its guest list and price on retries.
    if (existing && await tx.payment.count({ where: { registrationId: existing.id } })) {
      const saved = [existing, ...existing.bookingGuests];
      const requested = [input, ...input.guests];
      const keys = ['fullName', 'phone', 'gender', 'birthMonth', 'birthDay', 'emergencyContact'] as const;
      if (existing.ticketTypeId !== input.ticketTypeId || saved.length !== requested.length ||
          saved.some((guest, i) => keys.some((key) => guest[key] !== requested[i][key]) || guest.email !== (requested[i].email || input.email))) {
        throw new BookingError('A payment has already been started for this email. Keep the original ticket and guest details to retry, or contact the organiser to change them.', 409);
      }
      await tx.registration.updateMany({ where: { OR: [{ id: existing.id }, { bookingParentId: existing.id }] }, data: { holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000) } });
      return preparePayment({ ...existing, event, total: saved.reduce((sum, guest) => sum + guest.amount, 0) });
    }

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
    if (existing) await tx.registration.deleteMany({ where: { bookingParentId: existing.id } });
    const primary = existing
      ? await tx.registration.update({ where: { id: existing.id }, data, include: { event: true } })
      : await tx.registration.create({ data: { ...data, eventId: event.id, email: input.email, reference: `CC-${code(8)}` }, include: { event: true } });
    for (const guest of input.guests) {
      const birthday = zodiacForBirthday(guest.birthMonth, guest.birthDay)!;
      await tx.registration.create({ data: {
        ...data, ...guest, email: guest.email || input.email, eventId: event.id,
        instagram: guest.instagram ? '@' + guest.instagram.replace(/^@/, '') : null,
        zodiacSign: birthday.sign, zodiacElement: birthday.element,
        reference: `CC-${code(8)}`, bookingParentId: primary.id,
      } });
    }
    return preparePayment({ ...primary, total: ticket.price * count });
  });

  if (registration.total === 0) {
    const confirmation = await confirmRegistration(registration.id, null);
    return { kind: 'confirmed', confirmation };
  }

  const reference = registration.paymentReference;
  try {
    const tx = await initializeTransaction({
      email: registration.email,
      amount: registration.total,
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
export async function confirmRegistration(registrationId: string, paidAt: Date | null, externalAdmin?: string) {
  await db.$transaction(async (tx) => {
    const reg = await tx.registration.findUniqueOrThrow({ where: { id: registrationId } });
    await lockEvent(tx, reg.eventId);
    const members = await tx.registration.findMany({ where: { OR: [{ id: registrationId }, { bookingParentId: registrationId }] }, orderBy: { createdAt: 'asc' } });
    for (const member of members) {
      const current = await tx.registration.findUniqueOrThrow({ where: { id: member.id }, include: { event: { include: { tribes: true } } } });
      if (current.status === 'PAID') continue;
      if (externalAdmin && (current.status !== 'AWAITING_APPROVAL' || !current.externalPaymentNote)) {
        throw new BookingError('Only pending external payments can be approved.', 409);
      }
      if (!externalAdmin && current.status === 'AWAITING_APPROVAL') throw new BookingError('This booking needs admin approval.', 409);

      const { paid, tribeTaken } = await getAvailability(current.eventId, tx);
      if (externalAdmin) {
        const { taken, ticketTaken } = await getAvailability(current.eventId, tx);
        const ticket = await tx.ticketType.findUniqueOrThrow({ where: { id: current.ticketTypeId } });
        if (taken >= current.event.capacity || (ticket.quantity != null && (ticketTaken.get(ticket.id) ?? 0) >= ticket.quantity)) {
          throw new BookingError('There are no available places for this ticket. Update capacity before approving.', 409);
        }
      }
      const tribes = current.event.tribes;
      const preferredPosition = zodiacForBirthday(current.birthMonth, current.birthDay)?.preferredPosition ?? 0;
      const preferred = tribes.find((t) => t.position === preferredPosition);
      const filled = (t: (typeof tribes)[number]) => tribeTaken.get(t.id) ?? 0;
      const byFill = [...tribes].sort((a, b) => filled(a) - filled(b) || a.position - b.position);
      const tribe =
        preferred && filled(preferred) < preferred.capacity ? preferred
        : byFill.find((t) => filled(t) < t.capacity) ?? byFill[0] ?? null;

      if (externalAdmin && (!tribe || filled(tribe) >= tribe.capacity)) throw new BookingError('All teams are full. Update team capacity before approving.', 409);

      await tx.registration.update({
        where: { id: current.id },
        data: {
          status: 'PAID',
          ...(externalAdmin ? { approvedBy: externalAdmin, approvedAt: new Date() } : {}),
          paidAt: paidAt ?? new Date(),
          tribeId: tribe?.id ?? null,
          tribeReassigned: Boolean(tribe && preferred && tribe.id !== preferred.id),
          overCapacity: paid >= current.event.capacity,
        },
      });
      if (externalAdmin) {
        await tx.payment.upsert({
          where: { reference: `EXT-${current.reference}` },
          create: {
            registrationId, reference: `EXT-${current.reference}`, source: 'EXTERNAL',
            amount: current.amount, currency: current.event.currency, status: 'SUCCESS',
            paidAt: paidAt ?? new Date(), gatewayMessage: 'External payment approved by organiser',
          },
          update: {},
        });
      }
    }
  });

  const confirmation = await getConfirmation(registrationId);
  // Claim delivery independently so a failed guest email never blocks the buyer's copy.
  await sendClaimedConfirmation(registrationId, confirmation);
  const guests = await db.registration.findMany({
    where: { bookingParentId: registrationId, status: 'PAID', email: { not: confirmation.email } },
    select: { id: true },
  });
  for (const guest of guests) await sendClaimedConfirmation(guest.id);
  return confirmation;
}

async function sendClaimedConfirmation(registrationId: string, confirmation?: Confirmation) {
  const claimed = await db.registration.updateMany({ where: { id: registrationId, status: 'PAID', emailSentAt: null }, data: { emailSentAt: new Date() } });
  if (!claimed.count) return;
  try {
    const sent = await sendConfirmationEmail(confirmation ?? await getConfirmation(registrationId));
    if (!sent) await db.registration.update({ where: { id: registrationId }, data: { emailSentAt: null } });
  } catch {
    await db.registration.update({ where: { id: registrationId }, data: { emailSentAt: null } });
  }
}

export async function getConfirmation(registrationId: string) {
  const r = await db.registration.findUniqueOrThrow({ where: { id: registrationId }, include: { event: true, tribe: true, ticketType: true, bookingGuests: { include: { tribe: true }, orderBy: { createdAt: 'asc' } } } });
  return {
    guests: r.bookingGuests.map((g) => ({ fullName: g.fullName, reference: g.reference, ticketUrl: ticketPath(g.reference), ticketImageUrl: ticketImagePath(g.reference), tribe: g.tribe ? `${g.tribe.name} · ${g.tribe.colorName}` : '' })),
    status: r.status,
    reference: r.reference,
    fullName: r.fullName,
    firstName: r.fullName.split(/\s+/)[0],
    email: r.email,
    ticketName: r.ticketType.name,
    amountLabel: r.amount === 0 ? 'Free' : formatMoney(r.amount, r.event.currency),
    tribe: r.tribe ? { name: r.tribe.name, colorName: r.tribe.colorName, colorHex: r.tribe.colorHex } : null,
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
