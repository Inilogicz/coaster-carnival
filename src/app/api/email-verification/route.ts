import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleError } from '@/lib/api';
import { confirmVerificationCode, sendVerificationCode } from '@/lib/email-verification';

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  code: z.string().regex(/^\d{6}$/).optional(),
});

export async function POST(request: Request) {
  try {
    const { email, code } = schema.parse(await request.json());
    if (code) return NextResponse.json({ token: await confirmVerificationCode(email, code) }, { headers: { 'Cache-Control': 'no-store' } });
    // Vercel overwrites x-real-ip; avoid trusting a caller-supplied forwarded chain.
    await sendVerificationCode(email, request.headers.get('x-real-ip') || 'unknown');
    return NextResponse.json({ sent: true });
  } catch (error) {
    return handleError(error);
  }
}
