import { z } from 'zod';

export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
export const paymentEvidenceSchema = z.object({
  payerName: z.string().trim().min(2, 'Enter the name on the payment.').max(100),
  paidAmount: z.coerce.number().positive('Enter the amount paid.').max(10_000_000).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Use no more than two decimal places.'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the payment date.').refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today;
  }, 'Choose a valid payment date that is not in the future.'),
  paymentMethod: z.enum(['Bank transfer', 'Cash', 'POS', 'Other']),
  paymentReference: z.string().trim().min(2, 'Enter the transaction reference, or “Cash” for cash payments.').max(150),
  paymentNote: z.string().trim().max(1000).optional().default(''),
});

export function receiptType(data: Uint8Array): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => data[i] === b)) return 'image/png';
  if (new TextDecoder().decode(data.slice(0, 5)) === '%PDF-') return 'application/pdf';
  return null;
}
