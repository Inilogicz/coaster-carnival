'use client';

import { ErrorScreen } from '@/components/site/ErrorScreen';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0 }}><ErrorScreen reset={reset} /></body></html>;
}
