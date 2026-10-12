/* eslint-disable @next/next/no-img-element -- the original layout relies on plain <img> sizing */
import type { PublicEvent } from '@/lib/event';
import { HeroVideo } from './HeroVideo';
import { makeText } from './text';

const tribeClass = ['hot', 'spicy', 'drip', 'wild'];

export function Landing({ event, hidden }: { event: PublicEvent; hidden: boolean }) {
  const c = event.content;
  const { t, lines } = makeText(event.tokens);
  const hostUpper = event.host.toUpperCase();

  return (
    <section id="home" className="screen landing" aria-labelledby="hero-title" hidden={hidden}>
      <section className="club-hero">
        <HeroVideo hero={c.hero} />
        <div className="club-hero-copy">
          <p className="eyebrow">{hostUpper} PRESENTS</p>
          <h1 id="hero-title">{event.name.toUpperCase()}</h1>
          <p className="hero-theme">{event.theme}</p>
          <p className="hero-booking-facts">
            {event.dateLong} · {event.timeLabel} · {event.city}
            <br />
            <strong>
              {event.priceLabel} {t(c.hero.perGuestSuffix)}
            </strong>
          </p>
          <p className="ticket-inclusions">{t(c.hero.inclusions)}</p>
          <a className="button primary" href="#register">
            {c.hero.ctaLabel}
          </a>
          <p className="hero-bottom">
            {t(c.hero.bottomLine1)}
            <br />
            {t(c.hero.bottomLine2)}
          </p>
        </div>
      </section>

      <div className="club-details">
        <div>
          <span>{c.details.dateLabel}</span>
          <strong>
            {event.dateLong} · {event.startTime}
          </strong>
        </div>
        <div>
          <span>{c.details.placeLabel}</span>
          <strong>{event.location}</strong>
        </div>
        <div>
          <span>{c.details.priceLabel}</span>
          <strong>{event.priceLabel}</strong>
        </div>
        <div>
          <span>{c.details.crowdLabel}</span>
          <strong>{event.capacity} guests</strong>
        </div>
      </div>

      <section id="experience" className="club-section">
        <div className="section-heading">
          <p className="eyebrow">{t(c.experience.eyebrow)}</p>
          <h2>{t(c.experience.title)}</h2>
          <p>{t(c.experience.intro)}</p>
        </div>
        <div className="experience-grid">
          {c.experience.cards.map((card, i) => (
            <article key={i}>
              <img src={card.src} alt={card.alt} loading="lazy" />
              <span>{t(card.label)}</span>
              <h3>{t(card.title)}</h3>
              <p>{t(card.text)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="club-welcome">
        <div>
          <p className="eyebrow">{hostUpper} PRESENTS</p>
          <h2>{lines(c.welcome.title)}</h2>
          <h3>{t(c.welcome.subtitle)}</h3>
          <p>{t(c.welcome.body)}</p>
          <a className="button primary" href="#register">
            {c.hero.ctaLabel}
          </a>
        </div>
        <img src={c.welcome.image.src} alt={c.welcome.image.alt} loading="lazy" />
      </section>

      <section id="tribes" className="club-section tribes-section">
        <div className="section-heading">
          <p className="eyebrow">{t(c.tribes.eyebrow)}</p>
          <h2>{t(c.tribes.title)}</h2>
          <p>{t(c.tribes.intro)}</p>
        </div>
        <div className="tribe-grid">
          {event.tribes.map((tribe) => (
            <article
              key={tribe.position}
              className={`tribe ${tribeClass[tribe.position] ?? ''}`}
              style={{ '--tribe-color': tribe.colorHex } as React.CSSProperties}
            >
              <img src={tribe.image} alt={`${tribe.name} tribe`} loading="lazy" />
              <span>
                {String(tribe.position + 1).padStart(2, '0')} / {tribe.element.toUpperCase()} · {tribe.colorName.toUpperCase()}
              </span>
              <h3>{tribe.name.toUpperCase()}</h3>
              <p>{tribe.tagline}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery" className="club-section">
        <div className="section-heading gallery-title">
          <div>
            <p className="eyebrow">{t(c.gallery.eyebrow)}</p>
            <h2>{t(c.gallery.title)}</h2>
          </div>
          <p>{t(c.gallery.intro)}</p>
        </div>
        <div className="mixed-gallery">
          {c.gallery.images.map((img, i) =>
            img.framed ? (
              <figure key={i}>
                <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
              </figure>
            ) : (
              <img key={i} src={img.src} alt={img.alt} loading="lazy" />
            ),
          )}
        </div>
      </section>

      <section className="club-finale">
        <p className="eyebrow">{t(c.finale.eyebrow)}</p>
        <h2>{lines(c.finale.title)}</h2>
        <p>
          {event.dateLong} · {event.city} · {event.priceLabel}
        </p>
        <a className="button primary" href="#register">
          {c.hero.ctaLabel}
        </a>
        <span>{t(c.finale.hostLine)}</span>
      </section>
    </section>
  );
}
