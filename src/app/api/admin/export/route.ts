import { getAdmin } from '@/lib/auth';
import { attendeeWhere, resolveAdminEvent } from '@/lib/admin-queries';
import { db } from '@/lib/db';
import { formatEventDate } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function csvCell(value: unknown) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of attendees using the same filters as the attendees page. */
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response('Unauthorised', { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const event = await resolveAdminEvent(params.event);
  if (!event) return new Response('No event', { status: 404 });

  const rows = await db.registration.findMany({
    where: attendeeWhere(event.id, params),
    include: { tribe: true, ticketType: true },
    orderBy: { createdAt: 'asc' },
  });
  const header = ['Reference', 'Status', 'Full name', 'Email', 'Phone', 'Gender', 'Birthday', 'Zodiac', 'Element', 'Tribe', 'Tribe reassigned', 'Ticket', 'Amount (NGN)', 'Emergency contact', 'Instagram', 'Registered', 'Paid at', 'Email sent'];
  const lines = rows.map((r) =>
    [
      r.reference, r.status, r.fullName, r.email, r.phone, r.gender, `${r.birthDay} ${MONTHS[r.birthMonth - 1]}`, r.zodiacSign, r.zodiacElement,
      r.tribe?.name ?? '', r.tribeReassigned ? 'yes' : '', r.ticketType.name, (r.amount / 100).toFixed(2), r.emergencyContact, r.instagram ?? '',
      r.createdAt.toISOString(), r.paidAt?.toISOString() ?? '', r.emailSentAt ? 'yes' : '',
    ].map(csvCell).join(','),
  );
  const filename = `${event.slug}-attendees-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response('﻿' + [header.join(','), ...lines].join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Event-Date': formatEventDate(event.date),
    },
  });
}
