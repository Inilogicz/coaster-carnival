'use client';

import { ErrorScreen } from '@/components/site/ErrorScreen';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen reset={reset} />;
}
