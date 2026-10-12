import { EventDetailsForm } from '@/components/admin/EventDetailsForm';
import { PageHeader } from '@/components/admin/ui';
import { resolveAdminEvent } from '@/lib/admin-queries';

export default async function EventPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const event = await resolveAdminEvent((await searchParams).event);
  if (!event) return <PageHeader title="Event details" subtitle="No event found." />;
  const { id, name, host, theme, date, startTime, timeLabel, city, location, takeOffPoint, destination, capacity, contactPhone, refundPolicy, bookingOpen } = event;
  return (
    <>
      <PageHeader title="Event details" subtitle="These appear across the website, the booking form and confirmation emails." />
      <EventDetailsForm
        eventId={id}
        initial={{ name, host, theme, date, startTime, timeLabel, city, location, takeOffPoint, destination, capacity, contactPhone, refundPolicy, bookingOpen }}
      />
    </>
  );
}
