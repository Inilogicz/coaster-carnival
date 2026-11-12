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
  const tx = { $queryRaw: async () => [], registration: {
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
  return { booking, record, emails: () => emails };
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
  assert.equal(f.emails(), 1);
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
  const { validPrivateKey } = load('src/lib/external-registration.ts', { './db': {}, './booking': {}, './zodiac': {} });
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
