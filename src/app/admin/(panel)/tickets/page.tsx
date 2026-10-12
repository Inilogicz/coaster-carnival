import { TicketsEditor } from '@/components/admin/TicketsEditor';
import { TribesEditor } from '@/components/admin/TribesEditor';
import { PageHeader } from '@/components/admin/ui';
import { resolveAdminEvent } from '@/lib/admin-queries';
import { db } from '@/lib/db';

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const event = await resolveAdminEvent((await searchParams).event);
  if (!event) return <PageHeader title="Tickets & tribes" subtitle="No event found." />;
  const sold = await db.registration.groupBy({ by: ['ticketTypeId'], where: { eventId: event.id, status: 'PAID' }, _count: true });
  return (
    <>
      <PageHeader title="Tickets & tribes" subtitle="Ticket types guests can choose, and the four tribes they’re sorted into." />
      <TicketsEditor
        eventId={event.id}
        tickets={event.ticketTypes.map((t) => ({
          id: t.id, name: t.name, description: t.description, priceNaira: t.price / 100, quantity: t.quantity ?? '', active: t.active, sortOrder: t.sortOrder,
          sold: sold.find((s) => s.ticketTypeId === t.id)?._count ?? 0,
        }))}
      />
      <TribesEditor
        eventId={event.id}
        tribes={event.tribes.map(({ id, position, element, name, colorName, colorHex, tagline, image, capacity }) => ({ id, position, element, name, colorName, colorHex, tagline, image, capacity }))}
        eventCapacity={event.capacity}
      />
    </>
  );
}
