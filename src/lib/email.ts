import { Resend } from 'resend';
import type { Confirmation } from './booking';
import { confirmationEmailHtml, pendingRegistrationEmailHtml, type PendingRegistrationEmail } from './email-templates';
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
    text: `You’re in, ${c.firstName}! Your place at ${c.eventName} is confirmed.\n\nBooking: ${c.reference}\nTicket: ${c.ticketName} · ${c.amountLabel}\n${c.tribe ? `Tribe: ${c.tribe.name} · ${c.tribe.colorName}\n` : ''}When: ${c.dateLong} · ${c.timeLabel}\nTake-off: ${c.takeOffPoint}\nDestination: ${c.destination}\n\nView and download your ticket: ${siteUrl() + c.ticketUrl}\nShow its QR code at take-off.\n${c.guests.map((g) => `${g.fullName} · ${g.tribe}: ${siteUrl() + g.ticketUrl}`).join('\n')}\n\nQuestions? ${c.contactPhone}\n${c.refundPolicy}`,
  });
  if (error) {
    console.error('[email] send failed', error);
    return false;
  }
  return true;
}


export async function sendPendingRegistrationEmail(c: PendingRegistrationEmail) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return false;
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.EMAIL_FROM,
      to: c.email,
      subject: `Registration received · Awaiting approval · ${c.reference}`,
      html: pendingRegistrationEmailHtml(c),
      text: `We’ve got you, ${c.firstName}.\n\nYour registration and payment receipt for ${c.eventName} have been received.\nStatus: Awaiting organiser approval\nBooking reference: ${c.reference}\nTicket type: ${c.ticketName}\n\nThe organiser will review your payment. Once approved, we will assign your team and send your ticket in a separate email. Your place and team are confirmed only after approval.\n\nNo need to submit again or make another payment on the registration page.\nQuestions or corrections? Contact ${c.contactPhone} and quote ${c.reference}.\n\nThis email is an acknowledgment, not a ticket or payment approval.`,
    }, { idempotencyKey: `external-submission/${c.reference}` });
    if (error) {
      console.error('[email] pending acknowledgment failed', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[email] pending acknowledgment failed', error);
    return false;
  }
}
