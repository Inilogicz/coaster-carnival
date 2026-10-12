import { SignJWT, jwtVerify } from 'jose';

// Edge-safe: used by middleware and route handlers.
export const SESSION_COOKIE = 'cc_admin';
const MAX_AGE = 60 * 60 * 24 * 7;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters.');
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(adminId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(adminId).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
}

export async function readSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
};
