import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { BookingError } from './booking';
import { PaystackError } from './paystack';

/** Uniform JSON errors for route handlers. */
export function handleError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof PaystackError) return NextResponse.json({ error: error.message }, { status: 502 });
  console.error(error);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

export function appUrl(request: Request) {
  return process.env.APP_URL?.replace(/\/$/, '') || new URL(request.url).origin;
}
