import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleError } from '@/lib/api';
import { BookingError } from '@/lib/booking';
import { requireVerifiedEmail } from '@/lib/email-verification';
import { submitExternalRegistration } from '@/lib/external-registration';
import { MAX_RECEIPT_BYTES, paymentEvidenceSchema, receiptType } from '@/lib/payment-evidence';
import { registrationSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length')) > MAX_RECEIPT_BYTES + 100_000) throw new BookingError('Receipt must be 2 MB or smaller.', 413);
    const form = await request.formData();
    const body = Object.fromEntries(form);
    const input = registrationSchema.parse(body);
    const { eventId, key, emailVerificationToken } = z.object({
      eventId: z.string().min(1), key: z.string().min(32).max(128),
      emailVerificationToken: z.string().min(1),
    }).parse(body);
    await requireVerifiedEmail(input.email, emailVerificationToken);
    const evidence = paymentEvidenceSchema.parse(body);
    const file = form.get('receipt');
    if (!(file instanceof File) || !file.size) throw new BookingError('Upload your payment receipt.');
    if (file.size > MAX_RECEIPT_BYTES) throw new BookingError('Receipt must be 2 MB or smaller.', 413);
    const data = new Uint8Array(await file.arrayBuffer());
    const mimeType = receiptType(data);
    if (!mimeType || mimeType !== file.type) throw new BookingError('Upload a JPG, PNG or PDF receipt.');
    const paymentNote = `Payer: ${evidence.payerName}\nAmount paid: ${evidence.paidAmount.toFixed(2)}\nDate: ${evidence.paymentDate}\nMethod: ${evidence.paymentMethod}\nReference: ${evidence.paymentReference}${evidence.paymentNote ? `\nNotes: ${evidence.paymentNote}` : ''}`;
    const registration = await submitExternalRegistration(eventId, key, input, paymentNote, { data, mimeType, name: file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 150) || 'receipt' });
    return NextResponse.json({ kind: 'approval', reference: registration.reference, acknowledgmentSent: registration.acknowledgmentSent });
  } catch (error) { return handleError(error); }
}
