'use client';

let memoryId = '';
export function analyticsVisitorId() {
  try {
    const previous = localStorage.getItem('cc-visitor');
    if (previous && /^[0-9a-f-]{36}$/i.test(previous)) return previous;
    const id = memoryId ||= crypto.randomUUID();
    localStorage.setItem('cc-visitor', id);
    return id;
  } catch { return memoryId ||= crypto.randomUUID(); }
}

const sent = new Set<string>();
export function trackAnalytics(eventId: string, source: 'WEBSITE' | 'EXTERNAL', action: 'VISIT' | 'START' | 'ATTEMPT') {
  const key = `${eventId}:${source}:${action}`;
  if (sent.has(key)) return;
  sent.add(key);
  void fetch('/api/analytics', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ eventId, source, action, visitorId: analyticsVisitorId() }),
  }).then((response) => { if (!response.ok) sent.delete(key); }).catch(() => sent.delete(key));
}
