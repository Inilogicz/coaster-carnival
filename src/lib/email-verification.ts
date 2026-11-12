import crypto from 'node:crypto';
import { verificationEmailHtml } from './email-templates';
import { Resend } from 'resend';
import { db } from './db';
import { BookingError } from './booking';

const hash = (value: string) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET must be set.');
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
};

export async function sendVerificationCode(email: string, ip: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new BookingError('Email verification is temporarily unavailable. Please try again later.', 503);
  }
  const code = crypto.randomInt(100000, 1000000).toString();
  const ipHash = hash(`ip:${ip}`);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`verification-ip:${ipHash}`}))) AS lock`;
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`verification:${email}`}))) AS lock`;
    const previous = await tx.emailVerification.findUnique({ where: { email } });
    if (previous && Date.now() - previous.sentAt.getTime() < 60_000) {
      throw new BookingError('Please wait one minute before requesting another code.', 429);
    }
    const rateKey = `ip:${ipHash}`;
    const rate = await tx.emailVerification.findUnique({ where: { email: rateKey } });
    const activeWindow = rate && rate.expiresAt > new Date();
    if (activeWindow && rate.attempts >= 10) throw new BookingError('Too many verification requests. Please try again later.', 429);
    const rateData = { codeHash: '', ipHash, attempts: activeWindow ? rate.attempts + 1 : 1, sentAt: new Date(), expiresAt: activeWindow ? rate.expiresAt : new Date(Date.now() + 3600_000), tokenHash: null };
    await tx.emailVerification.upsert({ where: { email: rateKey }, create: { email: rateKey, ...rateData }, update: rateData });
    const data = { codeHash: hash(`${email}:${code}`), ipHash, attempts: 0, sentAt: new Date(), expiresAt: new Date(Date.now() + 10 * 60_000), tokenHash: null };
    await tx.emailVerification.upsert({ where: { email }, create: { email, ...data }, update: data });
  });
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Coastal Carnival email verification code',
    html: verificationEmailHtml(code),
    text: `Your verification code is ${code}. It expires in 10 minutes. Enter it on the booking form to verify your email before submitting your registration. If you did not request this code, ignore this email.`,
  });
  if (error) throw new BookingError('We couldn’t send your code. Check the email address and try again in one minute.', 502);
}

export async function confirmVerificationCode(email: string, code: string) {
  // Commit failed attempts too, so parallel guesses cannot bypass the limit.
  const token = crypto.randomBytes(32).toString('base64url');
  const valid = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`verification:${email}`}))) AS lock`;
    const record = await tx.emailVerification.findUnique({ where: { email } });
    if (!record || record.expiresAt <= new Date() || record.attempts >= 5 || record.tokenHash) return false;
    const matches = record.codeHash === hash(`${email}:${code}`);
    await tx.emailVerification.update({ where: { email }, data: {
      attempts: { increment: 1 },
      ...(matches ? { tokenHash: hash(token), expiresAt: new Date(Date.now() + 60 * 60_000) } : {}),
    } });
    return matches;
  });
  if (!valid) throw new BookingError('Invalid or expired code. You have five attempts per code; request a new one if needed.');
  return token;
}

export async function requireVerifiedEmail(email: string, token: string) {
  const record = await db.emailVerification.findUnique({ where: { email } });
  if (!token || !record?.tokenHash || record.expiresAt <= new Date() || record.tokenHash !== hash(token)) {
    throw new BookingError('Please verify your email address before continuing to payment.', 403);
  }
}
