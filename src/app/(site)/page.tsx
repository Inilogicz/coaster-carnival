import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/SiteShell';
import { getPublicEvent } from '@/lib/event';
import { fillTokens } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const event = await getPublicEvent();
  if (!event) return { title: 'Coming soon' };
  return {
    title: `${event.name} · ${event.host}`,
    description: fillTokens(event.content.seoDescription, event.tokens),
  };
}

export default async function HomePage() {
  const event = await getPublicEvent();
  if (!event) {
    return (
      <main className="no-event">
        <div>
          <p className="eyebrow" style={{ color: '#159fa3' }}>STAY TUNED</p>
          <h1>The next event is coming soon.</h1>
        </div>
      </main>
    );
  }
  return <SiteShell event={event} />;
}
