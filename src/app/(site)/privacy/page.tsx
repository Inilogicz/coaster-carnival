import type { Metadata } from 'next';
import { getPublicEvent } from '@/lib/event';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your information' };

export default async function PrivacyPage() {
  const event = await getPublicEvent();
  const host = event?.host ?? 'The organiser';
  const contact = event?.contactPhone;
  return (
    <main className="plain-page">
      <a className="back" href="/#register">Back to registration</a>
      <h1>Your registration details</h1>
      <p>
        {host} collects your name, email, phone number, gender, birth month and day (without a year), emergency contact and optional
        Instagram handle to manage {event?.name ?? 'event'} registration and event planning.
      </p>
      <p>
        Your birth month and day determine your zodiac element for tribe assignment. A full zodiac tribe is replaced with the
        least-filled available tribe. Your emergency contact is used to contact someone if you need help.
      </p>
      <p>
        Payments are processed by Paystack. We never see or store your card details; we keep the payment reference, amount, status
        and payment channel so the organiser can confirm your booking. Paid guests receive a tribe and a confirmation email.
      </p>
      <p>Registration and payment details are available only to authorised organisers.</p>
      {contact && (
        <p>
          Contact the organiser at <a href={`tel:${contact.replace(/\s/g, '')}`}>{contact}</a> about your booking, your information or a
          deletion request.
        </p>
      )}
      {event?.refundPolicy && <p>Event policy supplied by the organiser: {event.refundPolicy.replace(/\.$/, '').toLowerCase()}.</p>}
    </main>
  );
}
