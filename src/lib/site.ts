/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  EDIT ME FIRST                                                           ║
 * ║  Every brand-level string on the site is read from this one file:        ║
 * ║  studio name, contact details, social links, SEO defaults, nav labels.   ║
 * ║  Change it here → it changes in the header, footer, structured data,     ║
 * ║  sitemap, order emails and the Google Sheet.                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Canonical origin of the site. Never hard-code the domain anywhere else.
 * ⚠️ DEPLOY: set NEXT_PUBLIC_SITE_URL in Vercel → Settings → Environment
 * Variables (e.g. https://www.sketchysoul.com — no trailing slash).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');

export const site = {
  name: 'Sketchy Soul',
  /** Rendered as "Sketchy" + gold "Soul" in the header mark. */
  markPrefix: 'Sketchy',
  markSuffix: 'Soul',
  tagline: 'Hand-Drawn Portraiture',
  shortDescription:
    'Custom graphite and colour-pencil portraits, drawn by hand from your favourite photograph and delivered worldwide.',
  longDescription:
    'Sketchy Soul is a one-artist portrait studio. Every commission is drawn by hand from the photograph you send — no filters, no templates, no AI. Choose a size, upload your photo, approve the preview sketch, and receive the finished piece rolled, framed or as a high-resolution digital file anywhere in the world.',

  /** Free-text location used in structured data + the contact page. */
  location: {
    city: 'Colombo',
    region: 'Western Province',
    country: 'LK',
    countryName: 'Sri Lanka',
    /** Shown to visitors. A studio address is optional — leave blank to hide. */
    street: '',
  },

  // ⚠️ DEPLOY: these come from env so you can change them without a redeploy.
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@sketchysoul.com',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+94 77 000 0000',

  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://instagram.com/sketchysoul',
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || '',
    facebook: '',
    pinterest: '',
    tiktok: '',
  },

  /** Turnaround promise shown across the site — keep these truthful. */
  turnaround: {
    preview: '2–3 days',
    standard: '10–14 days',
    rush: '5–7 days',
  },

  currency: 'USD',
  currencySymbol: '$',

  /** Default social-share / SEO copy. Individual pages override these. */
  seo: {
    titleDefault: 'Sketchy Soul — Custom Hand-Drawn Portraits from Your Photo',
    titleTemplate: '%s · Sketchy Soul',
    description:
      'Commission a custom hand-drawn portrait from your favourite photo. Graphite, charcoal and colour pencil. Preview sketch before the final piece. Shipped or delivered digitally worldwide.',
    keywords: [
      'custom portrait drawing',
      'hand drawn portrait from photo',
      'graphite portrait commission',
      'pencil portrait artist',
      'charcoal portrait',
      'colour pencil portrait',
      'pet portrait drawing',
      'memorial portrait',
      'family portrait sketch',
      'personalised gift portrait',
    ],
    twitterHandle: '',
  },
} as const;

/** Primary navigation — used by the desktop header, mobile drawer and sitemap. */
export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/packages', label: 'Packages' },
  { href: '/process', label: 'Process' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

/** The four-icon bottom bar on phones (mirrors the UI concept). */
export const tabLinks = [
  { href: '/', label: 'Home', match: /^\/$/ },
  { href: '/gallery', label: 'Gallery', match: /^\/gallery/ },
  { href: '/order', label: 'Order', match: /^\/order/ },
  { href: '/contact', label: 'Contact', match: /^\/contact/ },
] as const;

export const footerLinks = {
  studio: [
    { href: '/about', label: 'About the Artist' },
    { href: '/process', label: 'How It Works' },
    { href: '/gallery', label: 'Full Gallery' },
    { href: '/faq', label: 'FAQ' },
  ],
  order: [
    // "Packages & Pricing" already covers /packages, so this one goes straight
    // to the form — which opens on its own size chooser.
    { href: '/packages', label: 'Packages & Pricing' },
    { href: '/order', label: 'Choose a Package' },
    { href: '/contact?subject=custom-quote', label: 'Request a Custom Quote' },
  ],
  legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/shipping', label: 'Shipping & Returns' },
  ],
} as const;

/** Absolute URL helper — required for canonical tags, OG images and sitemaps. */
export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Absolute URL for an image that may already be one.
 *
 * Artwork URLs come from the media library, and that means one of two shapes
 * depending on where the site is running: a full `https://res.cloudinary.com/…`
 * in production, or a local `/uploads/…` path in development. Passing the
 * former through `absoluteUrl()` produces
 * `https://your-site.com/https://res.cloudinary.com/…` — a broken link, and in
 * structured data a broken link is worse than no link, because the whole entry
 * is discarded rather than merely being short a field.
 */
export function absoluteImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return absoluteUrl(url);
}
