import { z } from 'zod';

/**
 * Every piece of page copy and media the admin can edit for an event.
 * Text may use tokens that are filled from live event data:
 * {price} {date} {time} {startTime} {location} {city} {capacity} {tribeCapacity} {host} {name} {contact} {takeOff} {destination}
 */
const image = z.object({ src: z.string(), alt: z.string() });

export const contentSchema = z.object({
  seoDescription: z.string(),
  logo: z.string(),
  hero: z.object({
    perGuestSuffix: z.string(),
    inclusions: z.string(),
    bottomLine1: z.string(),
    bottomLine2: z.string(),
    ctaLabel: z.string(),
    poster: z.string(),
    soundtrack: z.string(),
    soundHint: z.string(),
    video: z.object({
      desktop: z.string(),
      phone: z.string(),
      desktopHdr: z.string(),
      phoneHdr: z.string(),
    }),
  }),
  details: z.object({ dateLabel: z.string(), placeLabel: z.string(), priceLabel: z.string(), crowdLabel: z.string() }),
  experience: z.object({
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    cards: z.array(image.extend({ label: z.string(), title: z.string(), text: z.string() })),
  }),
  welcome: z.object({ title: z.string(), subtitle: z.string(), body: z.string(), image }),
  tribes: z.object({ eyebrow: z.string(), title: z.string(), intro: z.string() }),
  gallery: z.object({
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    images: z.array(image.extend({ framed: z.boolean() })),
  }),
  finale: z.object({ eyebrow: z.string(), title: z.string(), hostLine: z.string() }),
  registration: z.object({
    eyebrow: z.string(),
    title: z.string(),
    titleEmphasis: z.string(),
    intro: z.string(),
    photo: image,
    photoCaption: z.string(),
    smallNote: z.string(),
    stepNext: z.string(),
    formTitle: z.string(),
    formDescription: z.string(),
    headsUp: z.string(),
    submitLabel: z.string(),
  }),
  footer: z.object({ left: z.string(), right: z.string() }),
});

export type EventContent = z.infer<typeof contentSchema>;

export const defaultContent: EventContent = {
  seoDescription: '{name}: {theme} by {host}. {dateShort}, {city}. 4 Tribes. One Coast. One Champion.',
  logo: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_400,c_limit/v1791837791/coastal-carnival/wildlings-logo-transparent',
  hero: {
    perGuestSuffix: 'per guest',
    inclusions: 'Includes return transport, food, drinks and activities.',
    bottomLine1: 'Your December. A little wilder.',
    bottomLine2: '4 tribes. One coast. One champion.',
    ctaLabel: 'Book Now ↗',
    poster: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837787/coastal-carnival/coastal-montage-poster-v5',
    soundtrack: 'https://res.cloudinary.com/dtvjiura5/video/upload/q_auto/v1791837792/coastal-carnival/coastal-soundtrack-v5.mp3',
    soundHint: 'Tap Enable sound for the full vibe.',
    video: {
      // Cloudinary adaptive streams (several qualities, picked per connection); no HDR rendition.
      desktop: 'https://res.cloudinary.com/dtvjiura5/video/upload/sp_auto/v1791837845/coastal-carnival/hero-desktop.m3u8',
      phone: 'https://res.cloudinary.com/dtvjiura5/video/upload/sp_auto/v1791837904/coastal-carnival/hero-phone.m3u8',
      desktopHdr: '',
      phoneHdr: '',
    },
  },
  details: { dateLabel: 'THE DATE', placeLabel: 'THE COAST', priceLabel: 'YOUR SPOT', crowdLabel: 'THE CROWD' },
  experience: {
    eyebrow: 'COME FOR THE COAST. STAY FOR THE ENERGY.',
    title: 'THE EXPERIENCE',
    intro: 'Sun on your skin. Music in the air. Your people, all in one place.',
    cards: [
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837775/coastal-carnival/carnival-moment-03', alt: 'Guest dancing at a beach hangout', label: '01 / THE SOUND', title: 'Move with the music.', text: 'Bring your favourite people and your dance-floor energy.' },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837776/coastal-carnival/carnival-moment-04', alt: 'Guest relaxing on a float in a turquoise pool', label: '02 / THE SPLASH', title: 'Find your poolside.', text: 'Slow down, soak it in, and let the coast set the mood.' },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837784/coastal-carnival/coast-3', alt: 'Pineapple drink beside the ocean', label: '03 / THE PLAY', title: 'A little friendly rivalry.', text: 'Beach games, bold fits, and a tribe to cheer you on.' },
    ],
  },
  welcome: {
    title: 'WELCOME TO\nYOUR WILD SIDE.',
    subtitle: 'The Ultimate Beach Party Experience',
    body: 'One December day. Four tribes. A coast full of possibilities. Come for the music, the beach games and the poolside moments. Stay for the people you meet along the way.',
    image: { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837774/coastal-carnival/carnival-moment-02', alt: 'Friends chatting and laughing before their trip' },
  },
  tribes: {
    eyebrow: '4 TRIBES. ONE COAST. ONE CHAMPION.',
    title: 'MEET YOUR TRIBE',
    intro: 'Your birthday’s zodiac element guides your tribe: {tribeMap}. Each tribe has {tribeCapacity} places. If your zodiac tribe fills, you’ll join the least-filled available tribe. Your final tribe is confirmed when your payment goes through.',
  },
  gallery: {
    eyebrow: 'A TASTE OF THE MOOD',
    title: 'THIS IS THE MOOD',
    intro: 'The faces, the sunshine, the poolside energy. A little glimpse of the Wildlings spirit.',
    images: [
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837773/coastal-carnival/carnival-moment-01', alt: 'Palm trees and a sparkling blue pool at a Lagos beach hangout', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837774/coastal-carnival/carnival-moment-02', alt: 'Friends chatting and laughing before a trip', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837775/coastal-carnival/carnival-moment-03', alt: 'A guest dancing with arms raised at a beach hangout', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837776/coastal-carnival/carnival-moment-04', alt: 'A guest relaxing on a float in a blue pool', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837777/coastal-carnival/carnival-moment-05', alt: 'Sunlit beach portrait in blue swimwear', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837778/coastal-carnival/carnival-moment-06', alt: 'A guest posing with arms outstretched at a beach house', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837778/coastal-carnival/carnival-moment-07', alt: 'A playful poolside moment on an inflatable float', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837779/coastal-carnival/carnival-moment-08', alt: 'Two friends posing together on a beach-house balcony', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837780/coastal-carnival/carnival-moment-09', alt: 'A smiling guest in a green shirt and sunglasses', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837781/coastal-carnival/carnival-moment-10', alt: 'A guest enjoying the view from a beach-house balcony', framed: true },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837782/coastal-carnival/coast-1', alt: 'Guest in a pink swimsuit enjoying a poolside drink', framed: false },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837789/coastal-carnival/people-2', alt: 'Guest enjoying a palm-lined outdoor hangout', framed: false },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837784/coastal-carnival/coast-3', alt: 'Tropical drink and blue ocean', framed: false },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837788/coastal-carnival/people-1', alt: 'Friends chatting beside a pool', framed: false },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837783/coastal-carnival/coast-2', alt: 'Beach-day essentials tucked into a swimwear tie', framed: false },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837790/coastal-carnival/people-3', alt: 'Guest posing playfully for a picture', framed: false },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837785/coastal-carnival/coast-4', alt: 'Relaxing at a turquoise pool', framed: false },
      { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837786/coastal-carnival/coast-5', alt: 'A sunny pool surrounded by palm trees', framed: false },
    ],
  },
  finale: {
    eyebrow: 'THE GROUP CHAT HAS FOUND ITS PLAN.',
    title: 'Your December\ndeserves this.',
    hostLine: 'Hosted by {host}',
  },
  registration: {
    eyebrow: 'THE COAST IS CALLING YOUR NAME',
    title: 'Bring your',
    titleEmphasis: 'wild side.',
    intro: 'The fits. The music. The friendly rivalry.\nYou bring the energy. We’ll bring the carnival.',
    photo: { src: 'https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_1920,c_limit/v1791837784/coastal-carnival/coast-3', alt: 'Pineapple drink by the ocean on a bright beach day' },
    photoCaption: 'YOUR OUT-OF-OFFICE MOOD.',
    smallNote: 'Your tribe is revealed the moment your payment is confirmed.',
    stepNext: 'SECURE PAYMENT NEXT',
    formTitle: 'Let’s get you coast-ready.',
    formDescription: 'Every great carnival starts with great people. Tell us about you! All fields are required unless marked optional.',
    headsUp: 'Next, you’ll pay securely with Paystack (card, bank transfer or USSD). Your tribe is assigned as soon as payment is confirmed, and your confirmation is emailed to you.',
    submitLabel: 'Continue to Payment',
  },
  footer: { left: '{hostUpper} · {nameUpper}', right: 'See you at the coast.' },
};

/** Merge stored content over defaults so newly added fields always exist. */
export function resolveContent(stored: unknown): EventContent {
  const merged = deepMerge(defaultContent, stored);
  const parsed = contentSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultContent;
}

function deepMerge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(override) ? override : base) as T;
  if (base && typeof base === 'object' && override && typeof override === 'object' && !Array.isArray(override)) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(override)) out[k] = k in out ? deepMerge(out[k], v) : v;
    return out as T;
  }
  return (override === undefined || override === null ? base : override) as T;
}
