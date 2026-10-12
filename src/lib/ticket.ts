import crypto from 'node:crypto';
import QRCode from 'qrcode';

/** Unguessable key for a booking's ticket link, so references alone can't be used to look up other guests. */
function ticketKey(reference: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET must be set.');
  return crypto.createHmac('sha256', secret).update(`ticket:${reference}`).digest('base64url').slice(0, 22);
}

export function isValidTicketKey(reference: string, key: string | undefined) {
  const expected = Buffer.from(ticketKey(reference));
  const given = Buffer.from(key ?? '');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** Site-relative ticket page path, e.g. /ticket/CC-AB12CD34?k=… */
export function ticketPath(reference: string) {
  return `/ticket/${encodeURIComponent(reference)}?k=${ticketKey(reference)}`;
}

export function ticketImagePath(reference: string) {
  return `/ticket/${encodeURIComponent(reference)}/image?k=${ticketKey(reference)}`;
}

export const siteUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

/** QR code pointing at the ticket page, so staff can scan it to check the booking is real and paid. */
export function ticketQrSvg(reference: string) {
  return QRCode.toString(siteUrl() + ticketPath(reference), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#202020', light: '#ffffff' } });
}

export function ticketQrPng(reference: string) {
  return QRCode.toDataURL(siteUrl() + ticketPath(reference), { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#202020', light: '#ffffff' } });
}
