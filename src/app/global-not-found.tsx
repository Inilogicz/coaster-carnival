import type { Metadata } from 'next';
import { ErrorScreen } from '@/components/site/ErrorScreen';

export const metadata: Metadata = { title: 'Page not found · Coastal Carnival', robots: { index: false, follow: false } };

export default function GlobalNotFound() {
  return <html lang="en"><body style={{ margin: 0 }}><ErrorScreen notFound /></body></html>;
}
