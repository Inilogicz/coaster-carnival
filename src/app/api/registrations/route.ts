import { NextResponse } from 'next/server';
import { appUrl, handleError } from '@/lib/api';
import { startBooking } from '@/lib/booking';
import { registrationSchema } from '@/lib/validation';

/** Save the guest's details, hold a place, and start a Paystack transaction (or confirm a free ticket). */
export async function POST(request: Request) {
  try {
    const input = registrationSchema.parse(await request.json());
    return NextResponse.json(await startBooking(input, appUrl(request)));
  } catch (error) {
    return handleError(error);
  }
}
