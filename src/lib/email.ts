import { Resend } from 'resend';
import type { Confirmation } from './booking';
import { confirmationEmailHtml } from './email-templates';
import { siteUrl } from './ticket';

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
    html: confirmationEmailHtml(c, siteUrl() + c.ticketUrl),
    text: `You’re in, ${c.firstName}! Your place at ${c.eventName} is confirmed.\n\nBooking: ${c.reference}\nTicket: ${c.ticketName} · ${c.amountLabel}\n${c.tribe ? `Tribe: ${c.tribe.name} · ${c.tribe.colorName}\n` : ''}When: ${c.dateLong} · ${c.timeLabel}\nTake-off: ${c.takeOffPoint}\nDestination: ${c.destination}\n\nView and download your ticket: ${siteUrl() + c.ticketUrl}\nShow its QR code at take-off.\n\nQuestions? ${c.contactPhone}\n${c.refundPolicy}`,
  });
  if (error) {
    console.error('[email] send failed', error);
    return false;
  }
  return true;
}
