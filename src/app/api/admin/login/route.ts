import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

// Best-effort brute-force protection per IP (per server instance).
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 12);

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const record = attempts.get(ip);
  if (record && record.until > Date.now() && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  const parsed = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  const admin = parsed.success ? await db.admin.findUnique({ where: { email: parsed.data.email } }) : null;
  // Compare against a dummy hash when the email is unknown so timing doesn't reveal valid emails.
  const ok = await bcrypt.compare(parsed.success ? parsed.data.password : '', admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) {
    attempts.set(ip, { count: (record && record.until > Date.now() ? record.count : 0) + 1, until: Date.now() + WINDOW_MS });
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  attempts.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(admin.id), sessionCookieOptions);
  return response;
}
