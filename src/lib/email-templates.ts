import type { Confirmation } from './booking';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function frame(preheader: string, content: string, footer: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Coastal Carnival</title></head>
<body style="margin:0;padding:0;background:#edf4f3;color:#123d49;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf4f3"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #d6e7e3;border-radius:18px;overflow:hidden">
<tr><td style="padding:28px 28px 26px;background:#073e59;border-bottom:5px solid #4abbbd">
<p style="margin:0 0 9px;color:#a5e4dc;font-size:10px;font-weight:700;letter-spacing:3px">THE WILDLINGS HUB PRESENTS</p>
<p style="margin:0;color:#ffffff;font-size:27px;line-height:1.1;font-weight:900;letter-spacing:-1px">COASTAL<br>CARNIVAL<span style="color:#64d5ca">.</span></p>
<p style="margin:12px 0 0;color:#c4dedf;font-size:12px">Good people. Great energy. One coast.</p>
</td></tr>
<tr><td style="padding:30px 26px">${content}</td></tr>
<tr><td style="padding:22px 26px;background:#f5f9f8;border-top:1px solid #dfece8"><p style="margin:0;color:#53716f;font-size:12px;line-height:1.7">${footer}</p><p style="margin:14px 0 0;color:#688480;font-size:10px;letter-spacing:2px;font-weight:700">THE WILDLINGS HUB · COASTAL CARNIVAL</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function verificationEmailHtml(code: string) {
  return frame('Your verification code is ready. It expires in 10 minutes.', `
<p style="margin:0 0 12px;color:#087f83;font-size:11px;font-weight:700;letter-spacing:2px">ONE QUICK CHECK</p>
<h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#073e59;letter-spacing:-1px">Your inbox. Your ticket.</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4d666b">Enter this code on the registration form to verify your email. We’ll send your ticket to this address once your booking is confirmed.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;background:#edf8f5;border:1px solid #b7dfd6;border-radius:12px">
<p style="margin:0 0 12px;font-size:10px;letter-spacing:2px;color:#397775;font-weight:700">YOUR VERIFICATION CODE</p>
<p style="margin:0;font-family:'Courier New',monospace;font-size:36px;line-height:1.25;letter-spacing:7px;font-weight:700;color:#073e59">${escapeHtml(code)}</p>
<p style="margin:14px 0 0;font-size:12px;color:#4d6f6b">Valid for 10 minutes</p>
</td></tr></table>
<p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#4d666b">Keep this code private. If you request a new code, use the most recent one.</p>`, 'Didn’t request this email? You can safely ignore it. Your email address has not been verified.');
}

export function confirmationEmailHtml(c: Confirmation, ticketUrl: string) {
  const e = escapeHtml;
  const row = (label: string, value: string) => `<tr><td style="padding:12px 8px 12px 0;border-bottom:1px solid #e4efeb;color:#5c7776;font-size:11px;vertical-align:top;width:30%">${label}</td><td style="padding:12px 0;border-bottom:1px solid #e4efeb;color:#123d49;font-size:14px;font-weight:700;line-height:1.5;overflow-wrap:anywhere">${e(value)}</td></tr>`;
  // Only hex colours are allowed in the style attribute.
  const color = c.tribe && /^#[0-9a-f]{6}$/i.test(c.tribe.colorHex) ? c.tribe.colorHex : '#4abbbd';
  return frame(`Your place at ${c.eventName} is confirmed. Your ticket is inside.`, `
<p style="margin:0 0 12px;color:#087f83;font-size:11px;font-weight:700;letter-spacing:2px">BOOKING CONFIRMED</p>
<h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#073e59;letter-spacing:-1px">You’re in, ${e(c.firstName)}.</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#4d666b">Your place at <strong>${e(c.eventName)}</strong> is confirmed. Get ready for the coast.</p>
${c.tribe ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px"><tr><td style="padding:18px;background:#edf8f5;border-left:6px solid ${color};border-radius:8px"><p style="margin:0 0 7px;font-size:10px;letter-spacing:2px;color:#397775;font-weight:700">MEET YOUR TRIBE</p><p style="margin:0;color:#073e59;font-size:25px;font-weight:800">${e(c.tribe.name)}</p><p style="margin:6px 0 0;color:#4d666b;font-size:13px">${e(c.tribe.colorName)}</p></td></tr></table>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${row('BOOKING REF', c.reference)}${row('TICKET', `${c.ticketName} · ${c.amountLabel}`)}${row('WHEN', `${c.dateLong} · ${c.timeLabel}`)}${row('TAKE-OFF', c.takeOffPoint)}${row('DESTINATION', c.destination)}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px"><tr><td align="center" bgcolor="#073e59" style="border-radius:8px"><a href="${e(ticketUrl)}" style="display:block;padding:17px 12px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;line-height:1.4">VIEW &amp; DOWNLOAD YOUR TICKET &rarr;</a></td></tr></table>
<p style="margin:12px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#5c7776">Save your ticket and show its QR code at take-off.<br>Keep this email so you can find it again.</p>
<p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#5c7776">Button not opening? Copy this private ticket link into your browser:<br><a href="${e(ticketUrl)}" style="color:#087f83;word-break:break-all">${e(ticketUrl)}</a></p>`, `Questions? Contact the organiser on ${e(c.contactPhone)}.<br>${e(c.refundPolicy)}<br><br>See you at the coast.`);
}
