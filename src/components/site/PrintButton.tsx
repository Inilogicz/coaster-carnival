'use client';

export function PrintButton() {
  return (
    <button className="button cc-ticket-print" type="button" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
