/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ARTWORK — TYPES AND SEED DEFAULTS                                       ║
 * ║                                                                          ║
 * ║  The gallery and the homepage carousel are edited at /admin/gallery and  ║
 * ║  Page Copy → Homepage. Images come from the media library rather         ║
 * ║  than dropped into public/images — read them with the helpers in         ║
 * ║  src/lib/cms/artwork.ts, not from the DEFAULT_* arrays below.            ║
 * ║                                                                          ║
 * ║  Until an entry has an image the site draws the built-in gold line       ║
 * ║  portrait instead, so the layout never breaks and nothing 404s.          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ═══════════════════════════════════════════════════════════════════════════
   HOMEPAGE CAROUSEL — "From the Studio"

   Four slides, one per kind of commission, three of them on screen at a time
   (two on tablet, one on a phone) with arrows stepping the rail left and
   right. Deliberately no sizes or prices here: this section sells the idea,
   the packages page sells the specifics.

   Crop uploads to 4:5 (portrait) — anything else gets centre-cropped to fit
   the frame. Keep all four at the same dimensions: StudioCarousel writes them
   into the markup (see ART_WIDTH / ART_HEIGHT there) so the browser can
   reserve the box before the image downloads, and a mismatch would
   reintroduce the layout shift that buys.

   A card is at most 352px wide, so 1200×1500 covers even a 3× phone screen
   with room to spare; anything larger is bytes for no visible gain.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface StudioSlide {
  id: string;
  label: string;
  /** One line under the artwork. Keep it short — it sits on one row. */
  blurb: string;
  imageUrl?: string | null;
  /** Describe the drawing. This is what Google Images ranks and what a screen
      reader announces, so write it properly once you add real artwork. */
  imageAlt: string;
  /** Built-in line drawing used if no image is set. */
  sketch: 1 | 2 | 3;
}

export const DEFAULT_STUDIO_SLIDES: StudioSlide[] = [
  {
    id: 'single',
    label: 'Single',
    blurb: 'One subject, fully rendered — the classic portrait.',
    imageUrl: '/images/gallery/single.png',
    imageAlt: 'Hand-drawn graphite portrait of a single subject in soft window light',
    sketch: 1,
  },
  {
    id: 'couple',
    label: 'Couple',
    blurb: 'Two subjects composed together, from one photo or several.',
    imageUrl: '/images/gallery/couple.png',
    imageAlt: 'Graphite portrait of a couple drawn by hand from a client photograph',
    sketch: 2,
  },
  {
    id: 'family',
    label: 'Family',
    blurb: 'Group compositions, lit so everyone belongs in the same room.',
    imageUrl: '/images/gallery/family.png',
    imageAlt: 'Hand-drawn family portrait combining several subjects in one composition',
    sketch: 3,
  },
  {
    id: 'pets',
    label: 'Pets',
    blurb: 'Fur rendered strand by strand. Graphite or full colour.',
    imageUrl: '/images/gallery/pets.png',
    imageAlt: 'Hand-drawn pet portrait with fur rendered in fine pencil detail',
    sketch: 1,
  },
];

/* ── Gallery ───────────────────────────────────────────────────────────────*/

export type PortfolioCategory = 'portrait' | 'family' | 'pet' | 'memorial' | 'wedding';

export interface PortfolioPiece {
  slug: string;
  title: string;
  /** Physical dimensions, shown to the right of the title. */
  size: string;
  medium: string;
  year: string;
  category: PortfolioCategory;
  imageUrl?: string | null;
  /** Descriptive alt text. Required whenever an image is set. */
  imageAlt?: string | null;
  /** Which built-in line drawing to fall back to. */
  sketch: 1 | 2 | 3;
  /** Optional one-line story shown on the gallery page. */
  caption?: string | null;
  featured?: boolean;
}

/** Fixed taxonomy — the filter rail on /gallery. */
export const CATEGORIES: { id: PortfolioCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Work' },
  { id: 'portrait', label: 'Portraits' },
  { id: 'family', label: 'Family' },
  { id: 'pet', label: 'Pets' },
  { id: 'memorial', label: 'Memorial' },
  { id: 'wedding', label: 'Wedding' },
];

/** Categories a piece can actually be filed under (everything but "all"). */
export const PIECE_CATEGORIES = CATEGORIES.filter(
  (c): c is { id: PortfolioCategory; label: string } => c.id !== 'all',
);

export const DEFAULT_PORTFOLIO: PortfolioPiece[] = [
  {
    slug: 'portrait-i',
    title: 'Portrait I',
    size: '11×14',
    medium: 'Graphite on cotton paper',
    year: '2025',
    category: 'portrait',
    sketch: 1,
    caption: 'A quiet study in soft light — three sittings of tonal work.',
    featured: true,
  },
  {
    slug: 'portrait-ii',
    title: 'Portrait II',
    size: '16×20',
    medium: 'Charcoal and graphite',
    year: '2025',
    category: 'portrait',
    sketch: 2,
    caption: 'Ordered as a fortieth birthday gift from a single phone photo.',
    featured: true,
  },
  {
    slug: 'family-of-four',
    title: 'Family',
    size: '18×24',
    medium: 'Graphite on Bristol board',
    year: '2025',
    category: 'family',
    sketch: 3,
    caption: 'Four subjects composed from three separate reference photographs.',
    featured: true,
  },
  {
    slug: 'the-long-goodbye',
    title: 'The Long Goodbye',
    size: '11×14',
    medium: 'Graphite',
    year: '2024',
    category: 'memorial',
    sketch: 2,
    caption: 'Drawn from a faded 1970s print for a family in Melbourne.',
  },
  {
    slug: 'first-light',
    title: 'First Light',
    size: '8×10',
    medium: 'Graphite',
    year: '2024',
    category: 'portrait',
    sketch: 3,
    caption: 'A newborn study, finished in a single week.',
  },
  {
    slug: 'good-boy',
    title: 'Good Boy',
    size: '11×14',
    medium: 'Colour pencil',
    year: '2024',
    category: 'pet',
    sketch: 1,
    caption: 'Fur rendered strand by strand over eleven hours.',
  },
  {
    slug: 'the-vow',
    title: 'The Vow',
    size: '16×20',
    medium: 'Graphite',
    year: '2024',
    category: 'wedding',
    sketch: 2,
    caption: 'A first-anniversary gift taken from the couple’s ceremony photograph.',
  },
  {
    slug: 'grandmothers-hands',
    title: 'Grandmother’s Hands',
    size: '11×14',
    medium: 'Charcoal',
    year: '2023',
    category: 'memorial',
    sketch: 3,
    caption: 'Not every portrait is a face.',
  },
  {
    slug: 'two-brothers',
    title: 'Two Brothers',
    size: '18×24',
    medium: 'Graphite',
    year: '2023',
    category: 'family',
    sketch: 1,
    caption: 'Composed so both subjects share the same light source.',
  },
  {
    slug: 'the-old-tabby',
    title: 'The Old Tabby',
    size: '8×10',
    medium: 'Graphite',
    year: '2023',
    category: 'pet',
    sketch: 2,
    caption: 'Seventeen years old, drawn the week before she passed.',
  },
  {
    slug: 'study-in-profile',
    title: 'Study in Profile',
    size: '11×14',
    medium: 'Graphite',
    year: '2023',
    category: 'portrait',
    sketch: 3,
  },
  {
    slug: 'the-toast',
    title: 'The Toast',
    size: '16×20',
    medium: 'Colour pencil',
    year: '2022',
    category: 'wedding',
    sketch: 1,
    caption: 'Colour work from a low-light reception photograph.',
  },
];

/* ── Pure helpers ──────────────────────────────────────────────────────────*/

export const featuredPortfolio = (pieces: PortfolioPiece[]) => pieces.filter((p) => p.featured);

export const portfolioByCategory = (
  pieces: PortfolioPiece[],
  category: PortfolioCategory | 'all',
) => (category === 'all' ? pieces : pieces.filter((p) => p.category === category));

export const getPiece = (pieces: PortfolioPiece[], slug: string) =>
  pieces.find((p) => p.slug === slug);
