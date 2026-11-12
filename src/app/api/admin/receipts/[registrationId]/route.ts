import { getAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  if (!(await getAdmin())) return new Response('Please sign in.', { status: 401 });
  const { registrationId } = await params;
  const receipt = await db.externalPaymentReceipt.findUnique({ where: { registrationId } });
  if (!receipt) return new Response('Receipt not found.', { status: 404 });
  return new Response(new Uint8Array(receipt.data), { headers: {
    'Content-Type': receipt.mimeType,
    'Content-Disposition': `attachment; filename="${receipt.name.replace(/[^a-zA-Z0-9._ -]/g, '_')}"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  } });
}
