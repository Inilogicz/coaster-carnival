import { analyticsSchema, recordAnalytics } from '@/lib/analytics';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (Number(request.headers.get('content-length')) > 2048) return new Response(null, { status: 413 });
  try {
    const input = analyticsSchema.parse(await request.json());
    const event = await db.event.findFirst({ where: { id: input.eventId, isActive: true }, select: { id: true } });
    if (!event) return new Response(null, { status: 404 });
    await recordAnalytics(input);
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 400 }); }
}
