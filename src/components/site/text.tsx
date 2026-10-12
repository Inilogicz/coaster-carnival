import { Fragment } from 'react';
import { fillTokens } from '@/lib/format';

/** Fill {tokens} and turn "\n" into <br> so admin copy keeps the original line breaks. */
export function makeText(tokens: Record<string, string | number>) {
  const t = (text: string) => fillTokens(text, tokens);
  const lines = (text: string) =>
    t(text)
      .split('\n')
      .map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ));
  return { t, lines };
}
