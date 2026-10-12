import { ContentEditor } from '@/components/admin/ContentEditor';
import { PageHeader } from '@/components/admin/ui';
import { resolveAdminEvent } from '@/lib/admin-queries';
import { resolveContent } from '@/lib/content';

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const event = await resolveAdminEvent((await searchParams).event);
  if (!event) return <PageHeader title="Page content" subtitle="No event found." />;
  return (
    <>
      <PageHeader title="Page content" subtitle="Every headline, paragraph, photo and video on the public site." actions={<a href="/" target="_blank" className="btn-secondary">Preview site ↗</a>} />
      <ContentEditor eventId={event.id} initial={resolveContent(event.content)} />
    </>
  );
}
