import { linkAnalyticsRegistration } from '@/lib/analytics';
import { NextResponse } from 'next/server';
import { appUrl, handleError } from '@/lib/api';
import { startBooking } from '@/lib/booking';
import { requireVerifiedEmail } from '@/lib/email-verification';
import { bookingSchema } from '@/lib/validation';

/** Save the guest's details, hold a place, and start a Paystack transaction (or confirm a free ticket). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = bookingSchema.parse(body);
    await requireVerifiedEmail(input.email, typeof body.emailVerificationToken === 'string' ? body.emailVerificationToken : '');
    const result = await startBooking(input, appUrl(request));
    await linkAnalyticsRegistration(body.visitorId, input.email, 'WEBSITE');
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
