'use client';

import { useEffect, useRef } from 'react';

export function SubmissionSuccess({ firstName, email, reference, eventName, ticketName, contactPhone, acknowledgmentSent }: {
  firstName: string; email: string; reference?: string; eventName: string; ticketName?: string; contactPhone: string; acknowledgmentSent?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, []);
  return <main className="submission-page">
    <a className="submission-brand" href="/" aria-label="The Wildlings Hub home">THE WILDLINGS HUB <span>COASTAL CARNIVAL</span></a>
    <article className="submission-card" aria-labelledby="submission-heading">
      <header className="submission-header">
        <span className="submission-status"><span aria-hidden="true" />SUBMISSION RECEIVED</span>
        <div className="submission-check" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="m8 16 5 5L24 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <p className="submission-eyebrow">ONE STEP CLOSER TO THE COAST</p>
        <h1 id="submission-heading" ref={heading} tabIndex={-1}>We’ve got you,<br /><span>{firstName}.</span></h1>
        <p>Your details and payment receipt are safely submitted. The organiser will review your payment next.</p>
      </header>
      <div className="submission-body">
        <div className="submission-summary">
          <div><span>YOUR EVENT</span><strong>{eventName}</strong>{ticketName && <small>{ticketName}</small>}</div>
          <span className="submission-pending">Awaiting approval</span>
        </div>
        {reference && <p className="submission-reference">BOOKING REFERENCE <strong>{reference}</strong></p>}
        <h2>Here’s what happens next</h2>
        <ol className="submission-steps">
          <li className="is-complete"><span className="submission-step" aria-hidden="true">✓</span><div><h3>Details &amp; receipt received</h3><p>Your registration is saved. No need to submit again.</p></div></li>
          <li className="is-current"><span className="submission-step" aria-hidden="true">2</span><div><h3>Payment review</h3><p>The organiser will check your receipt against the payment received.</p></div></li>
          <li><span className="submission-step" aria-hidden="true">3</span><div><h3>Your team reveal &amp; ticket</h3><p>Once approved, we’ll assign your team and send your ticket to your verified email.</p></div></li>
        </ol>
        <div className="submission-inbox">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
          <div><strong>Keep an eye on your inbox</strong><p>{email}</p><small>{acknowledgmentSent === false ? 'We couldn’t send your acknowledgment email. Your submission is saved—keep your booking reference. Your ticket will be emailed after approval.' : 'We’ve sent a submission acknowledgment. Check your spam folder too. Your ticket will arrive in a separate email after approval.'}</small></div>
        </div>
        <p className="submission-note">This confirms your submission. Your place and team are confirmed after approval. No further payment is needed on this page.</p>
        <a className="submission-home" href="/">Back to the carnival <span aria-hidden="true">↗</span></a>
        <p className="submission-help">Need to correct something? <a href={`tel:${contactPhone.replace(/\s/g, '')}`}>Contact the organiser</a><br /><span>{contactPhone}</span></p>
      </div>
    </article>
    <p className="submission-signoff">GOOD PEOPLE. GREAT ENERGY. ONE COAST.</p>
  </main>;
}
