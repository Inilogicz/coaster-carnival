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
        Your birth month and day are used to place you in a tribe. If a tribe is full, you join the
        least-filled available tribe. Your emergency contact is used to contact someone if you need help.
      </p>
      <p>
        Payments are processed by Paystack. We never see or store your card details; we keep the payment reference, amount, status
        and payment channel so the organiser can confirm your booking. Paid guests receive a tribe and a confirmation email.
      </p>
      <p>
        We use an anonymous random browser identifier stored on your device to count visitors and understand how many people
        start, attempt, and complete registration. We store a keyed hash of that identifier and the steps reached; we do not
        store IP addresses, page URLs, or form field contents in visitor analytics. If you submit, the analytics record is linked
        to your registration so organisers can measure confirmed bookings. Clearing browser storage or changing devices can count as another visitor.
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
