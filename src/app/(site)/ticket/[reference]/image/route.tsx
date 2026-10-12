import { ImageResponse } from 'next/og';
import { getConfirmation } from '@/lib/booking';
import { db } from '@/lib/db';
import { isValidTicketKey, ticketQrPng } from '@/lib/ticket';

export const dynamic = 'force-dynamic';

/** DM Sans (the site font) in the weights the ticket uses; falls back to the built-in font if Google Fonts is unreachable. */
async function loadFonts(text: string) {
  try {
    return await Promise.all(
      ([400, 800] as const).map(async (weight) => {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=DM+Sans:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
        const src = css.match(/src: url\((.+?)\) format/)?.[1];
        if (!src) throw new Error('font not found');
        return { name: 'DM Sans', weight, style: 'normal' as const, data: await (await fetch(src)).arrayBuffer() };
      }),
    );
  } catch {
    return undefined;
  }
}

/** The ticket as a phone-sized PNG, for the "Download ticket" button. */
export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const reference = decodeURIComponent((await params).reference);
  if (!isValidTicketKey(reference, new URL(request.url).searchParams.get('k') ?? undefined)) return new Response('Not found', { status: 404 });
  const registration = await db.registration.findUnique({ where: { reference }, select: { id: true } });
  if (!registration) return new Response('Not found', { status: 404 });
  const c = await getConfirmation(registration.id);
  if (c.status !== 'PAID') return new Response('This booking is not paid.', { status: 404 });
  const qr = await ticketQrPng(c.reference);
  const accent = c.tribe?.colorHex ?? '#4abbbd';
  // The fonts lack the naira sign, so spell out the currency.
  const amount = c.amountLabel.replace('₦', 'NGN ');

  const fact = (label: string, value: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px solid #e3eceb', fontSize: 30 }}>
      <span style={{ color: '#159fa3', fontWeight: 700, letterSpacing: 3, fontSize: 24 }}>{label}</span>
      <span style={{ fontWeight: 700, maxWidth: 560, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f1f7f6', padding: 48, fontFamily: 'DM Sans, sans-serif', color: '#202020' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: '#fff', borderRadius: 32, overflow: 'hidden' }}>
          <div style={{ display: 'flex', height: 18, background: accent }} />
          <div style={{ display: 'flex', flexDirection: 'column', background: '#202020', color: '#fff', padding: '40px 56px' }}>
            <span style={{ fontSize: 24, letterSpacing: 5, fontWeight: 700 }}>{c.hostUpper} PRESENTS</span>
            <span style={{ fontSize: 64, fontWeight: 800, marginTop: 10 }}>{c.eventName}</span>
            <span style={{ fontSize: 28, marginTop: 8, color: '#bbe6e4' }}>
              {c.dateLong} · {c.timeLabel}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 56px', flexGrow: 1 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#1d7a43', letterSpacing: 2 }}>VALID TICKET · PAID</span>
            <span style={{ fontSize: 56, fontWeight: 800, marginTop: 12 }}>{c.fullName}</span>
            {c.tribe && (
              <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f7f6', borderLeft: `14px solid ${accent}`, borderRadius: 12, padding: '20px 26px', margin: '28px 0' }}>
                <span style={{ fontSize: 22, letterSpacing: 3, color: '#555' }}>TRIBE</span>
                <span style={{ fontSize: 48, fontWeight: 800 }}>
                  {c.tribe.name} · {c.tribe.colorName}
                </span>
              </div>
            )}
            {fact('BOOKING REF', c.reference)}
            {fact('TICKET', `${c.ticketName} · ${amount}`)}
            {fact('TAKE-OFF', c.takeOffPoint)}
            {fact('DESTINATION', c.destination)}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: 24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={340} height={340} alt="" />
              <span style={{ fontSize: 24, color: '#555', marginTop: 14 }}>Show this at take-off</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1560,
      fonts: await loadFonts(`${c.hostUpper} PRESENTS ${c.eventName} ${c.dateLong} ${c.timeLabel} VALID TICKET · PAID ${c.fullName} TRIBE ${c.tribe?.name ?? ''} ${c.tribe?.colorName ?? ''} BOOKING REF ${c.reference} TICKET ${c.ticketName} ${amount} TAKE-OFF ${c.takeOffPoint} DESTINATION ${c.destination} Show this at take-off`),
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
