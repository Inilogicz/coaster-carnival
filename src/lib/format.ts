const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-12-19" -> "19 December 2026" without timezone conversion. */
export function formatEventDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Kobo -> "₦50,000". */
export function formatMoney(kobo: number, currency = 'NGN') {
  const symbol = currency === 'NGN' ? '₦' : `${currency} `;
  const value = kobo / 100;
  return symbol + value.toLocaleString('en-NG', { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' });
}

/** Replace {tokens} in admin-editable copy with live event values. */
export function fillTokens(text: string, tokens: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in tokens ? String(tokens[key]) : match));
}
