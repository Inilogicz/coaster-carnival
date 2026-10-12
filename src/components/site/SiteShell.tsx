'use client';

import { useEffect, useState } from 'react';
import type { PublicEvent } from '@/lib/event';
import { Landing } from './Landing';
import { Registration } from './Registration';
import { makeText } from './text';

/** Single-page shell: #home and #register toggle like the original, plus the frosted sticky header. */
export function SiteShell({ event }: { event: PublicEvent }) {
  const [registering, setRegistering] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = makeText(event.tokens);
  const brand = event.host.toUpperCase();

  useEffect(() => {
    const homeTitle = `${event.name} · ${event.host}`;
    function navigate() {
      const isRegistering = location.hash === '#register';
      setRegistering(isRegistering);
      document.body.classList.toggle('is-registering', isRegistering);
      document.title = isRegistering ? `Register · ${event.name}` : homeTitle;
      requestAnimationFrame(() => {
        const section = !isRegistering && ['#experience', '#tribes', '#gallery'].includes(location.hash) && document.querySelector(location.hash);
        if (section) section.scrollIntoView({ behavior: 'instant' });
        else window.scrollTo(0, 0);
        if (isRegistering) document.getElementById('registration-title')?.focus({ preventScroll: true });
      });
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    navigate();
    onScroll();
    window.addEventListener('hashchange', navigate);
    window.addEventListener('hashchange', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('hashchange', onScroll);
      window.removeEventListener('scroll', onScroll);
      document.body.classList.remove('is-registering');
    };
  }, [event.name, event.host]);

  return (
    <>
      <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
        <a className="brand" href="#home" aria-label={`${event.name} home`}>
          <span className="wildlings-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.content.logo} alt={`${event.host} logo`} />
          </span>
          <span>
            {brand}
            <span className="brand-sub">PRESENTS {event.name.toUpperCase()}</span>
          </span>
        </a>
        <nav className="club-nav" aria-label="Main navigation" hidden={registering}>
          <a href="#experience">Experience</a>
          <a href="#tribes">Tribes</a>
          <a href="#gallery">Gallery</a>
        </nav>
        <a className="nav-cta" href="#register" hidden={registering}>
          {event.content.hero.ctaLabel}
        </a>
      </header>
      <main>
        <Landing event={event} hidden={registering} />
        <Registration event={event} hidden={!registering} />
      </main>
      <footer>
        <span>{t(event.content.footer.left)}</span>
        <span>{t(event.content.footer.right)}</span>
      </footer>
    </>
  );
}
