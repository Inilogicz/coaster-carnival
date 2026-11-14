import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

// Isolated database: never reads or migrates the configured application database.
const directory = await mkdtemp(join(tmpdir(), 'cc-group-test-'));
const pg = new EmbeddedPostgres({ databaseDir: join(directory, 'db'), user: 'postgres', password: 'postgres', port: 55439, persistent: false });
let db;
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('groups');
  process.env.DATABASE_URL = process.env.DIRECT_URL = 'postgresql://postgres:postgres@localhost:55439/groups';
  process.env.RESEND_API_KEY = '';
  process.env.PAYSTACK_SECRET_KEY = 'test-only';
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  ({ db } = await import('../src/lib/db.ts'));
  const { bookingSchema } = await import('../src/lib/validation.ts');
  const { startBooking, applyPaystackTransaction, confirmRegistration } = await import('../src/lib/booking.ts');
  const event = await db.event.create({ data: {
    slug: 'test', isActive: true, bookingOpen: true, name: 'Test', host: 'Test', theme: 'Test', date: '2026-12-19', startTime: '3pm', timeLabel: '3pm', city: 'Lagos', location: 'Lagos', takeOffPoint: 'Start', destination: 'End', capacity: 4, contactPhone: '08012345678', refundPolicy: 'No refunds', content: {},
    ticketTypes: { create: { name: 'Regular', price: 10000, quantity: 4 } },
    tribes: { create: [0, 1, 2, 3].map((position) => ({ position, element: 'Test', name: `Tribe ${position}`, colorName: 'Blue', colorHex: '#123456', tagline: '', image: '', capacity: 1 })) },
  }, include: { ticketTypes: true } });
  const guest = { fullName: 'Guest One', phone: '08012345678', gender: 'Female', birthMonth: 3, birthDay: 25, emergencyContact: '08012345679', instagram: '' };
  const input = bookingSchema.parse({ ...guest, fullName: 'Buyer One', email: 'buyer@example.com', ticketTypeId: event.ticketTypes[0].id, termsAccepted: true, guests: [{ ...guest, email: ' Guest@Example.com ' }, { ...guest, fullName: 'Guest Two' }] });
  assert.equal(bookingSchema.safeParse({ ...input, guests: [{ ...guest, birthMonth: 2, birthDay: 30 }] }).success, false);
  assert.equal(bookingSchema.safeParse({ ...input, guests: Array(10).fill(guest) }).success, false);
  assert.equal(input.guests[0].email, 'guest@example.com');
  assert.equal(bookingSchema.safeParse({ ...input, guests: [{ ...guest, email: 'invalid' }] }).success, false);
  assert.equal(bookingSchema.safeParse({ ...input, guests: [{ ...guest, email: '' }] }).success, true);
  const deliveries = [];
  let failGuestDelivery = true;
  globalThis.fetch = async (_url, options) => {
    if (String(_url).startsWith('https://api.resend.com/')) {
      const email = JSON.parse(options.body);
      if (email.to.includes('guest@example.com') && failGuestDelivery) {
        failGuestDelivery = false;
        return new Response(JSON.stringify({ name: 'application_error', message: 'Test failure' }), { status: 500 });
      }
      deliveries.push(email);
      return new Response(JSON.stringify({ id: `test-${deliveries.length}` }));
    }
    const body = JSON.parse(options.body);
    assert.equal(body.amount, 30000);
    return new Response(JSON.stringify({ status: true, data: { access_code: 'test', authorization_url: 'https://example.com', reference: body.reference } }));
  };
  const booking = await startBooking(input, 'https://example.com');
  assert.equal(booking.kind, 'paystack');
  assert.equal(await db.registration.count({ where: { status: 'PENDING' } }), 3);
  const retry = await startBooking(input, 'https://example.com');
  assert.equal(retry.kind, 'paystack');
  assert.equal(await db.registration.count(), 3);
  await assert.rejects(startBooking({ ...input, guests: [guest] }, 'https://example.com'), /original ticket and guest details/);
  await assert.rejects(startBooking({ ...input, email: 'other@example.com', guests: [guest] }, 'https://example.com'), /places are taken/);
  const transaction = { id: 1, reference: booking.reference, status: 'success', amount: 30000, currency: 'NGN' };
  process.env.RESEND_API_KEY = 'test-only';
  const confirmation = await applyPaystackTransaction(transaction);
  assert.equal(confirmation.guests.length, 2);
  assert.equal(await db.registration.count({ where: { status: 'PAID' } }), 3);
  const registrations = await db.registration.findMany();
  assert.equal(new Set(registrations.map((r) => r.reference)).size, 3);
  const guestRegistration = registrations.find((r) => r.email === 'guest@example.com');
  assert.ok(guestRegistration);
  assert.equal(guestRegistration.emailSentAt, null);
  assert.equal(deliveries.length, 1);
  assert.ok(deliveries[0].to.includes('buyer@example.com'));
  for (const registration of registrations) assert.ok(deliveries[0].html.includes(registration.reference));
  assert.equal(new Set(registrations.map((r) => r.tribeId)).size, 3);
  await applyPaystackTransaction(transaction);
  await confirmRegistration(registrations.find((r) => !r.bookingParentId).id, null);
  assert.equal(await db.registration.count({ where: { status: 'PAID' } }), 3);
  assert.equal(deliveries.length, 2, 'Repeated callbacks retry the failed guest without duplicating the buyer email');
  const guestEmail = deliveries.find((email) => email.to.includes('guest@example.com'));
  assert.ok(guestEmail.html.includes(guestRegistration.reference));
  for (const registration of registrations.filter((r) => r.id !== guestRegistration.id)) {
    assert.equal(guestEmail.html.includes(registration.reference), false, 'Guest email must only contain their own ticket');
  }
  await assert.rejects(startBooking(input, 'https://example.com'), /already has a confirmed booking/);
  // Free group purchases take the same atomic confirmation path.
  await db.ticketType.update({ where: { id: event.ticketTypes[0].id }, data: { price: 0, quantity: 6 } });
  await db.event.update({ where: { id: event.id }, data: { capacity: 6 } });
  const free = await startBooking({ ...input, email: 'free@example.com', guests: [guest] }, 'https://example.com');
  assert.equal(free.kind, 'confirmed');
  assert.equal(free.confirmation.guests.length, 1);
  assert.equal(await db.registration.count({ where: { status: 'PAID' } }), 5);
  console.log('Group booking tests passed: validation, totals, retries, capacity, individual tickets, tribes, repeated callbacks, and free bookings.');
} finally {
  if (db) await db.$disconnect();
  await pg.stop().catch(() => {});
  await rm(directory, { recursive: true, force: true });
}
