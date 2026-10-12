'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { applyPaystackTransaction, resendConfirmation } from '@/lib/booking';
import { contentSchema } from '@/lib/content';
import { db } from '@/lib/db';
import { verifyTransaction } from '@/lib/paystack';

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function run(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    await requireAdmin();
    const message = await fn();
    revalidatePath('/', 'layout');
    return { ok: true, message: message || undefined };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)[0] };
    if (error && typeof error === 'object' && 'digest' in error) throw error; // let redirect() through
    return { ok: false, error: (error as Error).message || 'Something went wrong.' };
  }
}

/* ---------- Event details ---------- */

const detailsSchema = z.object({
  name: z.string().trim().min(2),
  host: z.string().trim().min(2),
  theme: z.string().trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date'),
  startTime: z.string().trim().min(1),
  timeLabel: z.string().trim().min(1),
  city: z.string().trim().min(1),
  location: z.string().trim().min(1),
  takeOffPoint: z.string().trim(),
  destination: z.string().trim(),
  capacity: z.coerce.number().int().min(1).max(100000),
  contactPhone: z.string().trim(),
  refundPolicy: z.string().trim(),
  bookingOpen: z.boolean(),
});

export async function saveEventDetails(eventId: string, input: z.input<typeof detailsSchema>) {
  return run(async () => {
    const data = detailsSchema.parse(input);
    await db.event.update({ where: { id: eventId }, data });
    return 'Event details saved.';
  });
}

export async function saveEventContent(eventId: string, content: unknown) {
  return run(async () => {
    await db.event.update({ where: { id: eventId }, data: { content: contentSchema.parse(content) } });
    return 'Page content saved.';
  });
}

export async function setBookingOpen(eventId: string, bookingOpen: boolean) {
  return run(async () => {
    await db.event.update({ where: { id: eventId }, data: { bookingOpen } });
    return bookingOpen ? 'Bookings are open.' : 'Bookings are paused.';
  });
}

/* ---------- Events ---------- */

export async function createEvent(input: { name: string; cloneFromId?: string }) {
  return run(async () => {
    const name = z.string().trim().min(2, 'Give the event a name').parse(input.name);
    const source = input.cloneFromId
      ? await db.event.findUnique({ where: { id: input.cloneFromId }, include: { tribes: true, ticketTypes: true } })
      : await db.event.findFirst({ where: { isActive: true }, include: { tribes: true, ticketTypes: true } });
    if (!source) throw new Error('There is no event to copy settings from.');
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const { id: _id, slug: _slug, isActive: _a, createdAt: _c, updatedAt: _u, tribes, ticketTypes, content, ...fields } = source;
    await db.event.create({
      data: {
        ...fields,
        content: content as object,
        name,
        slug,
        isActive: false,
        bookingOpen: false,
        tribes: { create: tribes.map(({ id: _t, eventId: _e, ...t }) => t) },
        ticketTypes: { create: ticketTypes.map(({ id: _t, eventId: _e, createdAt: _tc, updatedAt: _tu, ...t }) => t) },
      },
    });
    return `“${name}” created as a draft. Edit it, then make it live.`;
  });
}

export async function activateEvent(eventId: string) {
  return run(async () => {
    await db.$transaction([
      db.event.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      db.event.update({ where: { id: eventId }, data: { isActive: true } }),
    ]);
    return 'This event is now live on the website.';
  });
}

export async function deleteEvent(eventId: string) {
  return run(async () => {
    const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, include: { _count: { select: { registrations: true } } } });
    if (event.isActive) throw new Error('You can’t delete the live event. Make another event live first.');
    if (event._count.registrations) throw new Error('This event has registrations, so it is kept for your records.');
    await db.event.delete({ where: { id: eventId } });
    return 'Event deleted.';
  });
}

/* ---------- Tickets ---------- */

const ticketSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Ticket name is required'),
  description: z.string().trim().max(500),
  priceNaira: z.coerce.number().min(0).max(10_000_000),
  quantity: z.union([z.literal(''), z.coerce.number().int().min(1)]).transform((v) => (v === '' ? null : v)),
  active: z.boolean(),
  sortOrder: z.coerce.number().int(),
});

export async function saveTicket(eventId: string, input: z.input<typeof ticketSchema>) {
  return run(async () => {
    const { id, priceNaira, ...t } = ticketSchema.parse(input);
    const data = { ...t, price: Math.round(priceNaira * 100) };
    if (priceNaira > 0 && priceNaira < 50) throw new Error('Paystack’s minimum charge is ₦50. Use 0 for a free ticket.');
    if (id) await db.ticketType.update({ where: { id, eventId }, data });
    else await db.ticketType.create({ data: { ...data, eventId } });
    return 'Ticket saved.';
  });
}

export async function deleteTicket(ticketId: string) {
  return run(async () => {
    const used = await db.registration.count({ where: { ticketTypeId: ticketId } });
    if (used) {
      await db.ticketType.update({ where: { id: ticketId }, data: { active: false } });
      return 'This ticket has bookings, so it was hidden from the website instead of deleted.';
    }
    await db.ticketType.delete({ where: { id: ticketId } });
    return 'Ticket deleted.';
  });
}

/* ---------- Tribes ---------- */

const tribeSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  colorName: z.string().trim().min(1),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour'),
  tagline: z.string().trim(),
  image: z.string().trim().min(1),
  capacity: z.coerce.number().int().min(0),
});

export async function saveTribes(eventId: string, input: z.input<typeof tribeSchema>[]) {
  return run(async () => {
    const tribes = z.array(tribeSchema).parse(input);
    await db.$transaction(tribes.map(({ id, ...t }) => db.tribe.update({ where: { id, eventId }, data: t })));
    return 'Tribes saved.';
  });
}

/* ---------- Attendees ---------- */

export async function resendEmail(registrationId: string) {
  return run(async () => {
    const sent = await resendConfirmation(registrationId);
    if (!sent) throw new Error('Email could not be sent. Check RESEND_API_KEY and EMAIL_FROM.');
    return 'Confirmation email sent.';
  });
}

/** Re-check the latest Paystack attempt for a pending registration (e.g. if a webhook was missed). */
export async function recheckPayment(registrationId: string) {
  return run(async () => {
    const payments = await db.payment.findMany({ where: { registrationId }, orderBy: { createdAt: 'desc' }, take: 5 });
    if (!payments.length) throw new Error('No payment attempts found for this guest.');
    for (const p of payments) {
      const trx = await verifyTransaction(p.reference).catch(() => null);
      if (!trx) continue;
      if (await applyPaystackTransaction(trx)) return 'Payment confirmed with Paystack. Booking marked paid.';
    }
    return 'Paystack shows no successful payment for this guest yet.';
  });
}

export async function cancelRegistration(registrationId: string) {
  return run(async () => {
    const reg = await db.registration.findUniqueOrThrow({ where: { id: registrationId } });
    if (reg.status === 'PAID') throw new Error('Paid bookings can’t be cancelled here. Refund in Paystack first if needed.');
    await db.registration.update({ where: { id: registrationId }, data: { status: 'CANCELLED', holdExpiresAt: new Date() } });
    return 'Registration cancelled and its place released.';
  });
}

/* ---------- Account ---------- */

export async function changePassword(input: { current: string; next: string }) {
  return run(async () => {
    const admin = await requireAdmin();
    const record = await db.admin.findUniqueOrThrow({ where: { id: admin.id } });
    if (!(await bcrypt.compare(input.current, record.passwordHash))) throw new Error('Your current password is incorrect.');
    if (input.next.length < 10) throw new Error('Use at least 10 characters for the new password.');
    await db.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(input.next, 12) } });
    return 'Password updated.';
  });
}
