import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleError } from '@/lib/api';
import { requireVerifiedEmail } from '@/lib/email-verification';
import { submitExternalRegistration } from '@/lib/external-registration';
import { registrationSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = registrationSchema.parse(body);
    const { eventId, key, paymentNote, emailVerificationToken } = z.object({
      eventId: z.string().min(1), key: z.string().min(32).max(128),
      paymentNote: z.string().trim().min(5, 'Enter the payer name and payment reference.').max(1000),
      emailVerificationToken: z.string().min(1),
    }).parse(body);
    await requireVerifiedEmail(input.email, emailVerificationToken);
    await submitExternalRegistration(eventId, key, input, paymentNote);
    return NextResponse.json({ kind: 'approval' });
  } catch (error) { return handleError(error); }
}
