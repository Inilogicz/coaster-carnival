import { Resend } from 'resend';
import type { Confirmation } from './booking';
import { siteUrl } from './ticket';

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function confirmationHtml(c: Confirmation) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#159fa3;font-size:12px;letter-spacing:.1em;font-weight:700">${label}</td><td style="padding:6px 0;text-align:right;font-weight:700">${escape(value)}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f1f7f6;font-family:Arial,sans-serif;color:#202020">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#202020;color:#fff;padding:20px 28px;font-weight:800;letter-spacing:.1em;font-size:13px">${escape(c.hostUpper)}<br><span style="font-weight:500;font-size:10px;letter-spacing:.15em">PRESENTS ${escape(c.eventName.toUpperCase())}</span></td></tr>
<tr><td style="padding:32px 28px 8px">
<p style="margin:0;color:#159fa3;font-size:12px;letter-spacing:.16em;font-weight:700">YOU’RE IN!</p>
<h1 style="margin:10px 0 6px;font-size:32px;letter-spacing:-.04em">Welcome to the coast, ${escape(c.firstName)}.</h1>
<p style="margin:0 0 20px;color:#444;line-height:1.6">Your payment is confirmed and your place at ${escape(c.eventName)} is booked.</p>
${c.tribe ? `<div style="border-left:8px solid ${escape(c.tribe.colorHex)};background:#f1f7f6;padding:16px 18px;border-radius:6px;margin-bottom:20px"><span style="font-size:12px;letter-spacing:.12em;color:#555">YOUR TRIBE</span><div style="font-size:28px;font-weight:900;margin-top:4px">${escape(c.tribe.name)} · ${escape(c.tribe.colorName)}</div><div style="color:#555;font-size:13px;margin-top:4px">${escape(c.zodiacSign)} · ${escape(c.zodiacElement)}${c.tribeReassigned ? ' · your zodiac tribe was full, so you’ve joined an available tribe' : ''}</div></div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e3eceb;font-size:14px">
${row('BOOKING REF', c.reference)}${row('TICKET', `${c.ticketName} · ${c.amountLabel}`)}${row('DATE', `${c.dateLong} · ${c.timeLabel}`)}${row('TAKE-OFF', c.takeOffPoint)}${row('DESTINATION', c.destination)}
</table>
<p style="margin:24px 0 0;text-align:center"><a href="${escape(siteUrl() + c.ticketUrl)}" style="display:inline-block;background:#4abbbd;color:#001f54;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.08em;padding:15px 26px;border-radius:6px">VIEW &amp; DOWNLOAD YOUR TICKET</a></p>
<p style="margin:10px 0 0;text-align:center;color:#888;font-size:12px">Show the QR code on your ticket at take-off.</p>
<p style="color:#444;font-size:13px;line-height:1.6;margin:22px 0 0">Questions? Call the organiser on ${escape(c.contactPhone)}. ${escape(c.refundPolicy)}</p>
</td></tr>
<tr><td style="padding:24px 28px;color:#888;font-size:11px;letter-spacing:.08em">${escape(c.hostUpper)} · ${escape(c.eventName.toUpperCase())}<br>See you at the coast.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendConfirmationEmail(c: Confirmation) {
  const subject = `You’re in! ${c.eventName} · ${c.reference}`;
  if (!process.env.RESEND_API_KEY) {
    console.info(`[email] RESEND_API_KEY not set; would send "${subject}" to ${c.email}`);
    return false;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Coastal Carnival <onboarding@resend.dev>',
    to: c.email,
    subject,
    html: confirmationHtml(c),
  });
  if (error) {
    console.error('[email] send failed', error);
    return false;
  }
  return true;
}
