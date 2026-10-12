'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useTransition } from 'react';
import { saveEventContent, type ActionResult } from '@/app/admin/(panel)/actions';
import { defaultContent, type EventContent } from '@/lib/content';
import { MediaField } from './MediaField';
import { Notice } from './ui';

type Path = (string | number)[];
function getAt(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o as Record<string | number, unknown>)?.[k], obj);
}
function setAt<T>(obj: T, path: Path, value: unknown): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  const copy = (Array.isArray(obj) ? [...obj] : { ...(obj as object) }) as Record<string | number, unknown>;
  copy[k] = setAt(copy[k], rest, value);
  return copy as T;
}

const EditorContext = createContext<{ content: EventContent; set: (path: Path, value: unknown) => void } | null>(null);

function Text({ path, label, multiline, wide }: { path: Path; label: string; multiline?: boolean; wide?: boolean }) {
  const { content, set } = useContext(EditorContext)!;
  const value = String(getAt(content, path) ?? '');
  return (
    <label className={wide || multiline ? 'sm:col-span-2' : ''}>
      <span className="label">{label}</span>
      {multiline ? (
        <textarea className="input min-h-20" value={value} onChange={(e) => set(path, e.target.value)} />
      ) : (
        <input className="input" value={value} onChange={(e) => set(path, e.target.value)} />
      )}
    </label>
  );
}

function Media({ path, label, accept, hint }: { path: Path; label: string; accept?: string; hint?: string }) {
  const { content, set } = useContext(EditorContext)!;
  return (
    <div className="sm:col-span-2">
      <MediaField label={label} value={String(getAt(content, path) ?? '')} onChange={(v) => set(path, v)} accept={accept} hint={hint} />
    </div>
  );
}

function Section({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="card group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-bold">
        {title}
        <span className="text-slate-400 transition group-open:rotate-90">›</span>
      </summary>
      <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2">{children}</div>
    </details>
  );
}

export function ContentEditor({ eventId, initial }: { eventId: string; initial: EventContent }) {
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const set = (path: Path, value: unknown) => {
    setContent((c) => setAt(c, path, value));
    setDirty(true);
  };

  const move = (path: Path, from: number, to: number) => {
    const list = [...(getAt(content, path) as unknown[])];
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    set(path, list);
  };
  const remove = (path: Path, i: number) => set(path, (getAt(content, path) as unknown[]).filter((_, j) => j !== i));

  return (
    <EditorContext.Provider value={{ content, set }}>
    <form
      className="max-w-5xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveEventContent(eventId, content);
          setResult(r);
          if (r.ok) setDirty(false);
          router.refresh();
        });
      }}
    >
      <Section title="Hero & film" defaultOpen>
        <Text path={['hero', 'perGuestSuffix']} label="After the price" />
        <Text path={['hero', 'ctaLabel']} label="Book button label" />
        <Text path={['hero', 'inclusions']} label="What’s included line" wide />
        <Text path={['hero', 'bottomLine1']} label="Closing line 1" />
        <Text path={['hero', 'bottomLine2']} label="Closing line 2" />
        <Media path={['hero', 'video', 'desktop']} label="Film: desktop" accept="video/*" hint="HLS playlist (.m3u8) or an .mp4 file" />
        <Media path={['hero', 'video', 'phone']} label="Film: phone (portrait 9:16)" accept="video/*" hint="HLS playlist (.m3u8) or an .mp4 file" />
        <Media path={['hero', 'video', 'desktopHdr']} label="Film: desktop HDR (optional)" accept="video/*" hint="Leave blank if you don’t have an HDR version" />
        <Media path={['hero', 'video', 'phoneHdr']} label="Film: phone HDR (optional)" accept="video/*" />
        <Media path={['hero', 'poster']} label="Film poster image" />
        <Media path={['hero', 'soundtrack']} label="Soundtrack (mp3)" accept="audio/*" hint="Leave blank to hide the sound button" />
        <Text path={['hero', 'soundHint']} label="Sound hint" wide />
        <Media path={['logo']} label="Logo" />
        <Text path={['seoDescription']} label="Search engine description" multiline />
      </Section>

      <Section title="Details strip">
        <Text path={['details', 'dateLabel']} label="Date label" />
        <Text path={['details', 'placeLabel']} label="Place label" />
        <Text path={['details', 'priceLabel']} label="Price label" />
        <Text path={['details', 'crowdLabel']} label="Crowd label" />
      </Section>

      <Section title="The experience">
        <Text path={['experience', 'eyebrow']} label="Eyebrow" wide />
        <Text path={['experience', 'title']} label="Title" />
        <Text path={['experience', 'intro']} label="Intro" />
        {content.experience.cards.map((_, i) => (
          <fieldset key={i} className="space-y-3 rounded-xl border border-slate-200 p-4 sm:col-span-2">
            <legend className="px-1 text-xs font-bold uppercase text-slate-500">Card {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Text path={['experience', 'cards', i, 'label']} label="Label" />
              <Text path={['experience', 'cards', i, 'title']} label="Title" />
              <Text path={['experience', 'cards', i, 'text']} label="Text" wide />
              <Media path={['experience', 'cards', i, 'src']} label="Image" />
              <Text path={['experience', 'cards', i, 'alt']} label="Image description (accessibility)" wide />
            </div>
          </fieldset>
        ))}
      </Section>

      <Section title="Welcome block">
        <Text path={['welcome', 'title']} label="Title" multiline />
        <Text path={['welcome', 'subtitle']} label="Subtitle" wide />
        <Text path={['welcome', 'body']} label="Body" multiline />
        <Media path={['welcome', 'image', 'src']} label="Image" />
        <Text path={['welcome', 'image', 'alt']} label="Image description" wide />
      </Section>

      <Section title="Tribes section">
        <Text path={['tribes', 'eyebrow']} label="Eyebrow" />
        <Text path={['tribes', 'title']} label="Title" />
        <Text path={['tribes', 'intro']} label="Intro" multiline />
        <p className="text-xs text-slate-500 sm:col-span-2">Tribe names, colours and photos are edited under Tickets &amp; tribes.</p>
      </Section>

      <Section title={`Gallery (${content.gallery.images.length} photos)`}>
        <Text path={['gallery', 'eyebrow']} label="Eyebrow" />
        <Text path={['gallery', 'title']} label="Title" />
        <Text path={['gallery', 'intro']} label="Intro" multiline />
        <ul className="space-y-3 sm:col-span-2">
          {content.gallery.images.map((img, i) => (
            <li key={i} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <MediaField label={`Photo ${i + 1}`} value={img.src} onChange={(v) => set(['gallery', 'images', i, 'src'], v)} />
                <input className="input" placeholder="Description" value={img.alt} onChange={(e) => set(['gallery', 'images', i, 'alt'], e.target.value)} aria-label="Photo description" />
              </div>
              <div className="flex flex-wrap items-start gap-2 sm:flex-col">
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" className="accent-brand" checked={img.framed} onChange={(e) => set(['gallery', 'images', i, 'framed'], e.target.checked)} /> Framed</label>
                <span className="flex gap-1">
                  <button type="button" className="btn-secondary px-2 py-1" onClick={() => move(['gallery', 'images'], i, i - 1)} aria-label="Move up">↑</button>
                  <button type="button" className="btn-secondary px-2 py-1" onClick={() => move(['gallery', 'images'], i, i + 1)} aria-label="Move down">↓</button>
                  <button type="button" className="btn-danger px-2 py-1" onClick={() => remove(['gallery', 'images'], i)} aria-label="Remove">✕</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-secondary sm:col-span-2" onClick={() => set(['gallery', 'images'], [...content.gallery.images, { src: '', alt: '', framed: true }])}>+ Add photo</button>
      </Section>

      <Section title="Closing banner & footer">
        <Text path={['finale', 'eyebrow']} label="Eyebrow" wide />
        <Text path={['finale', 'title']} label="Title" multiline />
        <Text path={['finale', 'hostLine']} label="Host line" />
        <span />
        <Text path={['footer', 'left']} label="Footer left" />
        <Text path={['footer', 'right']} label="Footer right" />
      </Section>

      <Section title="Registration page">
        <Text path={['registration', 'eyebrow']} label="Eyebrow" wide />
        <Text path={['registration', 'title']} label="Title" />
        <Text path={['registration', 'titleEmphasis']} label="Title (pink italic part)" />
        <Text path={['registration', 'intro']} label="Intro" multiline />
        <Media path={['registration', 'photo', 'src']} label="Photo" />
        <Text path={['registration', 'photoCaption']} label="Photo caption" />
        <Text path={['registration', 'photo', 'alt']} label="Photo description" />
        <Text path={['registration', 'smallNote']} label="Note under ticket" wide />
        <Text path={['registration', 'stepNext']} label="Step hint (top right)" />
        <Text path={['registration', 'formTitle']} label="Form title" />
        <Text path={['registration', 'formDescription']} label="Form description" multiline />
        <Text path={['registration', 'headsUp']} label="Heads-up note" multiline />
        <Text path={['registration', 'submitLabel']} label="Pay button label" />
      </Section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
        <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save page content'}</button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => confirm('Reset all page content to the original Coastal Carnival copy? (Not saved until you press Save.)') && (setContent(defaultContent), setDirty(true))}
        >
          Reset to original
        </button>
        {dirty && <span className="text-xs font-semibold text-amber-700">Unsaved changes</span>}
        <Notice result={result} />
      </div>
    </form>
    </EditorContext.Provider>
  );
}
