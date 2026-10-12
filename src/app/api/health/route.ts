import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Database check-in. Vercel Cron calls this daily (vercel.json) so the free Supabase project never counts as inactive and pauses. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[health] database unreachable', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
