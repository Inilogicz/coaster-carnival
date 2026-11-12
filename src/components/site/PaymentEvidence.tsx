'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { MAX_RECEIPT_BYTES } from '@/lib/payment-evidence';

export function PaymentEvidence({ currency }: { currency: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <fieldset className="payment-evidence">
    <legend>Confirm your payment</legend>
    <p className="field-hint">Help us match your payment quickly. Use the details shown on your receipt, even if someone paid for you.</p>
    <div className="payment-evidence-grid">
      <div className="field"><label htmlFor="payer-name">Name on the payment</label><input id="payer-name" name="payerName" required minLength={2} maxLength={100} placeholder="Sender or payer’s full name" /></div>
      <div className="field"><label htmlFor="paid-amount">Amount paid ({currency})</label><input id="paid-amount" name="paidAmount" type="number" inputMode="decimal" required min="0.01" max="10000000" step="0.01" placeholder="0.00" /></div>
      <div className="field"><label htmlFor="payment-date">Payment date</label><input id="payment-date" name="paymentDate" type="date" required /></div>
      <div className="field"><label htmlFor="payment-method">Payment method</label><select id="payment-method" name="paymentMethod" required defaultValue=""><option value="" disabled>Select a method</option>{['Bank transfer', 'Cash', 'POS', 'Other'].map((method) => <option key={method}>{method}</option>)}</select></div>
    </div>
    <div className="field"><label htmlFor="payment-reference">Transaction reference</label><input id="payment-reference" name="paymentReference" required minLength={2} maxLength={150} placeholder="Reference or session ID from your receipt" /><p className="field-hint">For cash payments, enter “Cash”.</p></div>
    <div className="receipt-upload">
      <label htmlFor="payment-receipt">Upload payment receipt</label>
      <p id="receipt-help" className="field-hint">Choose a clear screenshot, photo or PDF showing the amount, date and transaction reference. JPG, PNG or PDF · up to 2 MB.</p>
      <input ref={input} id="payment-receipt" name="receipt" type="file" accept="image/jpeg,image/png,application/pdf" required aria-describedby="receipt-help receipt-error" onChange={(e) => {
        const next = e.target.files?.[0] ?? null;
        const message = next && (!['image/jpeg', 'image/png', 'application/pdf'].includes(next.type) ? 'Choose a JPG, PNG or PDF receipt.' : next.size > MAX_RECEIPT_BYTES ? 'This file is too large. Choose a receipt under 2 MB.' : next.size === 0 ? 'This file is empty. Choose another receipt.' : '');
        setError(message || '');
        e.target.setCustomValidity(message || '');
        setFile(message ? null : next);
      }} />
      {file && <div className="receipt-preview">
        {preview && <img src={preview} alt="Your selected payment receipt" />}
        <div><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(0)} KB · Ready to submit</span></div>
        <button type="button" className="back" onClick={() => { if (input.current) { input.current.value = ''; input.current.setCustomValidity(''); } setFile(null); setError(''); }}>Remove</button>
      </div>}
      <p id="receipt-error" role="alert">{error}</p>
      <p className="field-hint">Your receipt is available only to organisers reviewing your registration. Uploading it does not automatically approve your booking.</p>
    </div>
    <div className="field"><label htmlFor="external-payment-note">Anything else we should know? <span>(optional)</span></label><textarea id="external-payment-note" name="paymentNote" maxLength={1000} rows={3} placeholder="For example, someone else paid on my behalf." /></div>
  </fieldset>;
}
