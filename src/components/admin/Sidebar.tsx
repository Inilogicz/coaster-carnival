'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: '◎' },
  { href: '/admin/attendees', label: 'Attendees', icon: '☺' },
  { href: '/admin/payments', label: 'Payments', icon: '₦' },
  { href: '/admin/event', label: 'Event details', icon: '✎' },
  { href: '/admin/tickets', label: 'Tickets & tribes', icon: '🎟' },
  { href: '/admin/content', label: 'Page content', icon: '❏' },
  { href: '/admin/events', label: 'All events', icon: '☰' },
  { href: '/admin/account', label: 'Account', icon: '⚙' },
];

type EventOption = { id: string; name: string; date: string; isActive: boolean };

export function Sidebar({ events, adminEmail }: { events: EventOption[]; adminEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const current = params.get('event') ?? events.find((e) => e.isActive)?.id ?? events[0]?.id ?? '';
  const withEvent = (href: string) => (params.get('event') && href !== '/admin/events' && href !== '/admin/account' ? `${href}?event=${params.get('event')}` : href);

  return (
    <aside className="sticky top-0 z-30 bg-ink text-white lg:h-screen lg:overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-6">
        <Link href="/admin" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_400,c_limit/v1791837791/coastal-carnival/wildlings-logo-transparent" alt="" className="h-10 w-8 object-contain invert" />
          <span className="text-xs font-extrabold tracking-[.12em]">
            EVENT DASHBOARD
            <span className="block text-[10px] font-medium tracking-[.14em] text-white/60">ORGANISER</span>
          </span>
        </Link>
        <button className="rounded-md border border-white/20 px-3 py-1.5 text-sm lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
          Menu
        </button>
      </div>

      <div className={`${open ? 'block' : 'hidden'} px-3 pb-5 lg:block`}>
        <label className="mx-2 mb-4 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.14em] text-white/50">Viewing event</span>
          <select
            value={current}
            onChange={(e) => router.push(`${pathname}?event=${e.target.value}`)}
            className="w-full rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white outline-none focus:border-brand"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id} className="text-ink">
                {e.name} {e.isActive ? '· LIVE' : ''}
              </option>
            ))}
          </select>
        </label>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={withEvent(item.href)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-brand text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
              >
                <span className="w-5 text-center" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-white/10 px-3 pt-4 text-xs text-white/60">
          <p className="truncate">{adminEmail}</p>
          <div className="mt-3 flex gap-3">
            <a href="/" target="_blank" className="underline hover:text-white">View site ↗</a>
            <form action="/api/admin/logout" method="post">
              <button className="underline hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
