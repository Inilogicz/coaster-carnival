'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Confirmation } from '@/lib/booking';
import type { PublicEvent } from '@/lib/event';
import { daysInMonth, zodiacForBirthday } from '@/lib/zodiac';
import { GENDERS } from '@/lib/validation';
import { ConfirmationModal } from './ConfirmationModal';
import { loadPaystack, payWithPaystack, verifyPayment } from './paystack-client';
import { makeText } from './text';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PHONE_PATTERN = '[+0-9 ()\\-]{7,25}';
const PHONE_TITLE = 'Enter a phone number with 7–25 characters, using numbers, spaces, +, brackets or hyphens.';

// Unsent form answers, kept for this tab only so visiting the privacy page (or reloading) doesn't wipe them.
const DRAFT_KEY = 'cc-registration-draft';
function saveDraft(form: HTMLFormElement) {
  const data = Object.fromEntries(new FormData(form));
  delete data.termsAccepted; // consent must be given afresh
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}
function readDraft(): Record<string, string> | null {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
  } catch {
    return null;
  }
}
function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function Registration({ event, hidden }: { event: PublicEvent; hidden: boolean }) {
  const c = event.content.registration;
  const { t, lines } = makeText(event.tokens);
  const available = event.tickets.filter((ticket) => !ticket.soldOut);
  const [ticketId, setTicketId] = useState(available[0]?.id ?? '');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [busy, setBusy] = useState<false | string>(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Restore unsent answers once on load; month, day and ticket are React state, the rest are plain inputs.
  useEffect(() => {
    const draft = readDraft();
    const form = formRef.current;
    if (!draft || !form) return;
    for (const [name, value] of Object.entries(draft)) {
      if (name === 'birthMonth' || name === 'birthDay' || name === 'ticketTypeId') continue;
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) field.value = value;
    }
    setMonth(draft.birthMonth ?? '');
    setDay(draft.birthDay ?? '');
    if (available.some((x) => x.id === draft.ticketTypeId)) setTicketId(draft.ticketTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ticket = event.tickets.find((x) => x.id === ticketId);
  const blocked = !event.bookingOpen ? 'Booking Opens Soon' : event.closed || !available.length ? 'Registration Closed' : null;
  const blockedMessage = !event.bookingOpen
    ? 'Bookings are not open yet. Contact the organiser for the confirmed venue.'
    : `All ${event.capacity} places are filled.`;

  const maxDay = month ? daysInMonth(Number(month)) : 31;
  const zodiac = zodiacForBirthday(month, day);
  const preferredTribe = zodiac && event.tribes.find((tribe) => tribe.position === zodiac.preferredPosition);
  const tribeCapacity = event.tokens.tribeCapacity;

  const birthdayHint = useMemo(
    () =>
      zodiac && preferredTribe
        ? `${zodiac.sign} · ${zodiac.element} → ${preferredTribe.name}. If this tribe fills before your payment is confirmed, you’ll join the least-filled available tribe.`
        : `If your zodiac tribe is full, you’ll join the least-filled available tribe. Each tribe has ${tribeCapacity} places.`,
    [zodiac, preferredTribe, tribeCapacity],
  );

  const closeModal = useCallback(() => {
    setConfirmation(null);
    location.hash = '#home';
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const nameInput = form.elements.namedItem('fullName') as HTMLInputElement;
    nameInput.setCustomValidity(nameInput.value.trim().length < 2 ? 'Please enter your name.' : '');
    if (!form.reportValidity() || busy) return;

    setError('');
    setBusy('Saving your details…');
    void loadPaystack(); // warm up the popup script while the server responds
    try {
      const payload = Object.fromEntries(new FormData(form));
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We couldn’t save your registration. Please try again.');

      if (result.kind === 'confirmed') {
        form.reset();
        clearDraft();
        setMonth('');
        setDay('');
        setConfirmation(result.confirmation);
        return;
      }

      setBusy('Opening secure payment…');
      const outcome = await payWithPaystack(result.accessCode, result.authorizationUrl);
      if (outcome === 'cancelled') {
        setError('Payment was cancelled. Your details are saved and your place is held for 30 minutes. Press the button again to pay.');
        return;
      }
      setBusy('Confirming your payment…');
      const confirmed = await verifyPayment(result.reference);
      form.reset();
      clearDraft();
      setMonth('');
      setDay('');
      setConfirmation(confirmed);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="register" className="screen registration" aria-labelledby="registration-title" hidden={hidden}>
      <aside className="registration-intro">
        <a className="back" href="#home">
          Back to the invite
        </a>
        <p className="eyebrow">{t(c.eyebrow)}</p>
        <h2>
          {t(c.title)}
          <br />
          <em>{t(c.titleEmphasis)}</em>
        </h2>
        <p>{lines(c.intro)}</p>
        <div className="registration-photo">
          <img src={c.photo.src} alt={c.photo.alt} width={478} height={569} />
          <span>{t(c.photoCaption)}</span>
        </div>
        <div className="mini-ticket">
          <span className="detail-label">{event.name.toUpperCase()}</span>
          <strong>
            {event.dateLong} · {event.startTime}
          </strong>
          <span>{event.location}</span>
          <div className="ticket-bottom">
            <b>{ticket?.priceLabel ?? event.priceLabel}</b>
            <span>{event.capacity}-person capacity</span>
          </div>
        </div>
        <p className="small-note">{t(c.smallNote)}</p>
      </aside>

      <div className="form-panel">
        <div className="step">
          <span className="step-number">01</span>
          <span>YOUR DETAILS</span>
          <span className="step-next">{t(c.stepNext)}</span>
        </div>
        <h2 id="registration-title" tabIndex={-1}>
          {t(c.formTitle)}
        </h2>
        <p className="form-description">{t(c.formDescription)}</p>

        <form
          ref={formRef}
          id="attendee-form"
          onSubmit={onSubmit}
          onInput={(e) => {
            setError('');
            saveDraft(e.currentTarget);
          }}
          noValidate={false}
        >
          <div className="field">
            <label htmlFor="full-name">Full Name</label>
            <input
              id="full-name"
              name="fullName"
              autoComplete="name"
              placeholder="Who’s bringing the good vibes?"
              required
              minLength={2}
              maxLength={100}
              onInput={(e) => e.currentTarget.setCustomValidity('')}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="phone">Phone Number</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="e.g. +234 801 234 5678" required pattern={PHONE_PATTERN} title={PHONE_TITLE} />
            </div>
            <div className="field">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" required defaultValue="">
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="birthday-fields">
            <legend>Birthday</legend>
            <p className="field-hint">Month and day only. We use your zodiac element to choose your tribe; no birth year is collected.</p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="birth-month">Birth month</label>
                <select
                  id="birth-month"
                  name="birthMonth"
                  autoComplete="bday-month"
                  required
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    if (Number(day) > daysInMonth(Number(e.target.value))) setDay('');
                  }}
                >
                  <option value="">Select month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="birth-day">Birth day</label>
                <select id="birth-day" name="birthDay" autoComplete="bday-day" required value={day} onChange={(e) => setDay(e.target.value)}>
                  <option value="">Select day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d} disabled={d > maxDay}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p id="birthday-team" className="field-hint" aria-live="polite">
              {birthdayHint}
            </p>
          </fieldset>

          <div className="field">
            <label htmlFor="emergency">Emergency Contact</label>
            <input
              id="emergency"
              name="emergencyContact"
              type="tel"
              placeholder="Emergency contact’s phone number"
              required
              pattern={PHONE_PATTERN}
              title={PHONE_TITLE}
            />
            <span className="field-hint">Someone we can call if you need help at the event.</span>
          </div>
          <div className="field">
            <label htmlFor="instagram">
              Instagram Handle <span>(optional)</span>
            </label>
            <input
              id="instagram"
              name="instagram"
              placeholder="@your_main_character_energy"
              autoComplete="off"
              maxLength={31}
              pattern="@?[A-Za-z0-9_.]{1,30}"
              title="Use a valid Instagram handle: letters, numbers, periods and underscores."
            />
          </div>

          {event.tickets.length > 1 ? (
            <fieldset className="ticket-options">
              <legend>Ticket</legend>
              {event.tickets.map((option) => (
                <label key={option.id} className="ticket-option">
                  <input
                    type="radio"
                    name="ticketTypeId"
                    value={option.id}
                    checked={ticketId === option.id}
                    disabled={option.soldOut}
                    onChange={() => setTicketId(option.id)}
                    required
                  />
                  <span className="ticket-option-body">
                    <span className="ticket-option-top">
                      <span>{option.name}</span>
                      <b>{option.priceLabel}</b>
                    </span>
                    {option.description && <small>{option.description}</small>}
                    {option.soldOut && <span className="sold-out">SOLD OUT</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <input type="hidden" name="ticketTypeId" value={ticketId} />
          )}

          <div className="preview-note">
            <strong>Before you book</strong>
            {ticket && (
              <p>
                {ticket.priceLabel}
                {ticket.description ? ` · ${ticket.name}: ${ticket.description}` : ` · ${ticket.name}`}
              </p>
            )}
            <p>
              {event.dateLong} · {event.timeLabel} · Take-off point: {event.takeOffPoint}. Event destination: {event.destination}.
            </p>
            <p>
              Organiser: <a href={`tel:${event.contactPhone.replace(/\s/g, '')}`}>{event.contactPhone}</a>. {event.refundPolicy}
            </p>
            <p>
              <a href="/privacy">How we use your registration details</a>
            </p>
          </div>
          <div className="field booking-consent">
            <label>
              <input type="checkbox" name="termsAccepted" required /> I understand the no-refund policy and have read how my details will be used.
            </label>
          </div>
          <div className="preview-note">
            <strong>A little heads-up</strong>
            <p>{t(c.headsUp)}</p>
          </div>

          {(error || blocked) && (
            <p id="form-error" role="alert">
              {error || blockedMessage}
            </p>
          )}
          <button className="button primary submit" type="submit" disabled={Boolean(busy || blocked)}>
            {blocked ?? (busy || (ticket && ticket.price === 0 ? 'Confirm My Free Place' : `${t(c.submitLabel)}${ticket ? ` · ${ticket.priceLabel}` : ''}`))}
          </button>
          {!blocked && ticket && ticket.price > 0 && <p className="secure-note">🔒 Payments are processed securely by Paystack.</p>}
        </form>
      </div>

      {confirmation && <ConfirmationModal confirmation={confirmation} onClose={closeModal} />}
    </section>
  );
}
