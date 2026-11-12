import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from './db';

export const analyticsSchema = z.object({
  visitorId: z.uuid(), eventId: z.string().min(1).max(100),
  source: z.enum(['WEBSITE', 'EXTERNAL']), action: z.enum(['VISIT', 'START', 'ATTEMPT']),
});

function visitorHash(visitorId: string) {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be set.');
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(`analytics:${visitorId}`).digest('hex');
}

export async function recordAnalytics(input: z.infer<typeof analyticsSchema>) {
  const hash = visitorHash(input.visitorId);
  const where = { eventId: input.eventId, visitorHash: hash, source: input.source };
  await db.analyticsVisit.upsert({ where: { eventId_visitorHash_source: where }, create: where, update: {} });
  const now = new Date();
  if (input.action !== 'VISIT') await db.analyticsVisit.updateMany({ where: { ...where, startedAt: null }, data: { startedAt: now } });
  if (input.action === 'ATTEMPT') await db.analyticsVisit.updateMany({ where: { ...where, attemptedAt: null }, data: { attemptedAt: now } });
}

/** Analytics failure never prevents a guest from submitting or paying. */
export async function linkAnalyticsRegistration(visitorId: unknown, email: string, source: 'WEBSITE' | 'EXTERNAL', eventId?: string) {
  if (!z.uuid().safeParse(visitorId).success) return;
  try {
    const registration = await db.registration.findFirst({
      where: { email, ...(eventId ? { eventId } : { event: { isActive: true } }) }, select: { id: true, eventId: true },
    });
    if (!registration) return;
    const hash = visitorHash(visitorId as string);
    const where = { eventId: registration.eventId, visitorHash: hash, source };
    const now = new Date();
    await db.analyticsVisit.upsert({
      where: { eventId_visitorHash_source: where },
      create: { ...where, startedAt: now, attemptedAt: now, submittedAt: now, registrationId: registration.id },
      update: { submittedAt: now, registrationId: registration.id },
    });
    await db.analyticsVisit.updateMany({ where: { ...where, startedAt: null }, data: { startedAt: now } });
    await db.analyticsVisit.updateMany({ where: { ...where, attemptedAt: null }, data: { attemptedAt: now } });
  } catch { console.error('[analytics] Could not link registration.'); }
}
