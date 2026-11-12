import { test } from 'node:test';
import { createRequire } from 'node:module';
const nativeRequire = createRequire(import.meta.url);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';

function load(file, dependencies) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const testModule = { exports: {} };
  new Function('require', 'module', 'exports', js)((id) => {
    if (id in dependencies) return dependencies[id];
    if (id === 'node:crypto') return nativeRequire(id);
    throw new Error(`Unexpected dependency: ${id}`);
  }, testModule, testModule.exports);
  return testModule.exports;
}

function bookingFixture({ status = 'AWAITING_APPROVAL', taken = 0, fullTeam = false } = {}) {
  const tribe = { id: 'team', position: 0, capacity: fullTeam ? 0 : 10, name: 'Hot' };
  const record = { id: 'guest', eventId: 'event', ticketTypeId: 'ticket', status, externalPaymentNote: 'Bank transfer REF1', amount: 5000, fullName: 'Test Guest', reference: 'CC-TEST', event: { tribes: [tribe], capacity: 10, host: 'Test host' }, tribe: null, ticketType: { name: 'Standard' } };
  let emails = 0;
  const payments = [];
  const tx = { payment: { upsert: async ({ create }) => { payments.push(create); } }, $queryRaw: async () => [], registration: {
    findUniqueOrThrow: async () => record,
    update: async ({ data }) => { Object.assign(record, data); record.tribe = tribe; return record; },
  }, ticketType: { findUniqueOrThrow: async () => ({ quantity: 10 }) } };
  const db = { $transaction: async (fn) => fn(tx), registration: {
    findUniqueOrThrow: async () => record,
    updateMany: async () => ({ count: 1 }),
  } };
  const booking = load('src/lib/booking.ts', {
    './db': { db }, './event': { HOLD_MINUTES: 30, getAvailability: async () => ({ taken, paid: taken, ticketTaken: new Map(), tribeTaken: new Map() }) },
    './format': { formatEventDate: () => '', formatMoney: () => '' }, './paystack': {},
    './email': { sendConfirmationEmail: async () => { emails++; return true; } },
    './ticket': { ticketPath: () => '/ticket/test', ticketImagePath: () => '/ticket/test/image' },
    './zodiac': { zodiacForBirthday: () => ({ preferredPosition: 0 }) },
  });
  return { booking, record, payments, emails: () => emails };
}

test('external request cannot be confirmed without admin approval', async () => {
  const f = bookingFixture();
  await assert.rejects(f.booking.confirmRegistration('guest', null), /needs admin approval/);
  assert.equal(f.record.status, 'AWAITING_APPROVAL');
  assert.equal(f.emails(), 0);
});
test('approval assigns team and records reviewer before sending ticket', async () => {
  const f = bookingFixture();
  await f.booking.confirmRegistration('guest', new Date(), 'admin@example.com');
  assert.equal(f.record.status, 'PAID');
  assert.equal(f.record.tribeId, 'team');
  assert.equal(f.record.approvedBy, 'admin@example.com');
  assert.equal(f.payments.length, 1);
  assert.equal(f.payments[0].source, 'EXTERNAL');
  assert.equal(f.payments[0].status, 'SUCCESS');
  assert.equal(f.payments[0].reference, 'EXT-CC-TEST');
  await f.booking.confirmRegistration('guest', new Date(), 'admin@example.com');
  assert.equal(f.payments.length, 1);
  assert.equal(f.emails(), 2);
});
test('approval rejects full event and full teams without issuing tickets', async () => {
  for (const options of [{ taken: 10 }, { fullTeam: true }]) {
    const f = bookingFixture(options);
    await assert.rejects(f.booking.confirmRegistration('guest', new Date(), 'admin'), /no available places|teams are full/);
    assert.equal(f.record.status, 'AWAITING_APPROVAL');
    assert.equal(f.emails(), 0);
  }
});
test('rejected request cannot be approved', async () => {
  const f = bookingFixture({ status: 'CANCELLED' });
  await assert.rejects(f.booking.confirmRegistration('guest', new Date(), 'admin'), /Only pending/);
  assert.equal(f.emails(), 0);
});
test('private links reject missing, wrong and replaced keys', () => {
  const { validPrivateKey } = load('src/lib/external-registration.ts', { './db': {}, './booking': {}, './zodiac': {}, './email': {} });
  assert.equal(validPrivateKey(null, 'abc'), false);
  assert.equal(validPrivateKey('secret', ''), false);
  assert.equal(validPrivateKey('new-secret', 'old-secret'), false);
  assert.equal(validPrivateKey('secret', 'secret'), true);
});


test('receipt validator recognizes supported signatures and rejects disguised files', () => {
  const { receiptType } = load('src/lib/payment-evidence.ts', { zod: { z } });
  assert.equal(receiptType(Uint8Array.from([255, 216, 255, 0])), 'image/jpeg');
  assert.equal(receiptType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
  assert.equal(receiptType(new TextEncoder().encode('%PDF-1.7')), 'application/pdf');
  assert.equal(receiptType(new TextEncoder().encode('<svg><script>alert(1)</script></svg>')), null);
  assert.equal(receiptType(new Uint8Array()), null);
});

test('payment evidence requires useful fields and valid amounts and dates', () => {
  const { paymentEvidenceSchema } = load('src/lib/payment-evidence.ts', { zod: { z } });
  const valid = { payerName: 'Test Guest', paidAmount: '5000.50', paymentDate: '2026-01-01', paymentMethod: 'Bank transfer', paymentReference: 'BANK-123' };
  assert.equal(paymentEvidenceSchema.parse(valid).paidAmount, 5000.50);
  for (const bad of [{ paidAmount: '0' }, { paidAmount: '1.001' }, { payerName: '' }, { paymentDate: '2026-02-30' }, { paymentDate: '2999-01-01' }, { paymentReference: '' }, { paymentMethod: 'unknown' }]) {
    assert.equal(paymentEvidenceSchema.safeParse({ ...valid, ...bad }).success, false);
  }
});

test('external submission acknowledges after commit and remains saved if mail fails', async () => {
  for (const delivered of [true, false]) {
    let committed = false;
    let saved = false;
    let sent = false;
    const tx = {
      $queryRaw: async () => [],
      event: { findUnique: async () => ({ isActive: true, externalRegistrationKey: 'private-key', name: 'Coastal Carnival', contactPhone: '+2341234567' }) },
      ticketType: { findFirst: async () => ({ id: 'ticket', price: 5000, name: 'Standard' }) },
      registration: {
        findUnique: async () => null,
        create: async ({ data }) => { saved = true; assert.equal(data.status, 'AWAITING_APPROVAL'); return data; },
      },
    };
    const { submitExternalRegistration } = load('src/lib/external-registration.ts', {
      './db': { db: { $transaction: async (fn) => { const result = await fn(tx); committed = true; return result; } } },
      './booking': { BookingError: Error },
      './zodiac': { zodiacForBirthday: () => ({ sign: 'Aries', element: 'Fire' }) },
      './email': { sendPendingRegistrationEmail: async (input) => {
        assert.equal(committed, true);
        assert.equal(input.email, 'guest@example.com');
        assert.equal(input.firstName, 'Test');
        assert.equal(input.eventName, 'Coastal Carnival');
        sent = true;
        return delivered;
      } },
    });
    const result = await submitExternalRegistration('event', 'private-key', { email: 'guest@example.com', fullName: 'Test Guest', birthMonth: 4, birthDay: 1 }, 'Transfer REF1', { data: new Uint8Array(), name: 'receipt.pdf', mimeType: 'application/pdf' });
    assert.equal(saved, true);
    assert.equal(sent, true);
    assert.equal(result.acknowledgmentSent, delivered);
    assert.match(result.reference, /^CC-/);
  }
});

test('pending email includes status and escapes guest content', () => {
  const { pendingRegistrationEmailHtml } = load('src/lib/email-templates.ts', {});
  const html = pendingRegistrationEmailHtml({ firstName: '<script>test</script>', email: 'guest@example.com', reference: 'CC-123', eventName: 'Coastal Carnival', ticketName: 'Standard', contactPhone: '+2341234567' });
  assert.match(html, /AWAITING ORGANISER APPROVAL/);
  assert.match(html, /CC-123/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /not a ticket or payment approval/);
});

test('pagination bounds invalid pages and computes database limits', () => {
  const { paginate } = load('src/lib/pagination.ts', {});
  for (const input of [undefined, '', 'NaN', '-3', '1.2', 'Infinity', '9007199254740992']) {
    assert.equal(paginate(input, 100).page, 1);
  }
  assert.deepEqual(paginate('3', 76), { page: 3, pages: 4, skip: 50, take: 25, total: 76 });
  assert.deepEqual(paginate('999', 26), { page: 2, pages: 2, skip: 25, take: 25, total: 26 });
  assert.deepEqual(paginate('2', 0), { page: 1, pages: 1, skip: 0, take: 25, total: 0 });
  assert.equal(paginate('2', 24, 12).skip, 12);
  assert.equal(paginate('2', 50, 50).page, 1);
});

test('analytics deduplicates browsers and preserves first funnel timestamps', async () => {
  process.env.SESSION_SECRET ||= 'local-test-secret-for-analytics-only';
  const records = new Map();
  const visits = {
    upsert: async ({ where, create, update }) => {
      const key = JSON.stringify(where.eventId_visitorHash_source);
      if (!records.has(key)) records.set(key, { ...create });
      else Object.assign(records.get(key), update);
    },
    updateMany: async ({ where, data }) => {
      for (const row of records.values()) {
        if (Object.entries(where).every(([key, value]) => value === null ? row[key] == null : row[key] === value)) Object.assign(row, data);
      }
    },
  };
  const { recordAnalytics } = load('src/lib/analytics.ts', { zod: { z }, './db': { db: { analyticsVisit: visits } } });
  const input = { eventId: 'event', visitorId: '9da31c38-2389-4a5a-97b8-76b3565d4de5', source: 'WEBSITE' };
  await recordAnalytics({ ...input, action: 'VISIT' });
  await recordAnalytics({ ...input, action: 'VISIT' });
  assert.equal(records.size, 1);
  assert.notEqual([...records.values()][0].visitorHash, input.visitorId);
  await recordAnalytics({ ...input, action: 'ATTEMPT' });
  const first = [...records.values()][0].startedAt;
  assert.ok(first instanceof Date);
  assert.ok([...records.values()][0].attemptedAt instanceof Date);
  await recordAnalytics({ ...input, action: 'START' });
  assert.equal([...records.values()][0].startedAt, first);
  await recordAnalytics({ ...input, source: 'EXTERNAL', action: 'VISIT' });
  assert.equal(records.size, 2);
});

test('analytics rejects invalid identifiers and cannot block a successful booking', async () => {
  const { analyticsSchema, linkAnalyticsRegistration } = load('src/lib/analytics.ts', {
    zod: { z }, './db': { db: { registration: { findFirst: async () => { throw new Error('analytics unavailable'); } } } },
  });
  assert.equal(analyticsSchema.safeParse({ visitorId: 'bad', eventId: 'event', source: 'WEBSITE', action: 'VISIT' }).success, false);
  await linkAnalyticsRegistration(undefined, 'guest@example.com', 'WEBSITE');
  const previous = console.error;
  try {
    console.error = () => {};
    await assert.doesNotReject(linkAnalyticsRegistration('9da31c38-2389-4a5a-97b8-76b3565d4de5', 'guest@example.com', 'EXTERNAL'));
  } finally { console.error = previous; }
});
