/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PRICE LIST — TYPES, DEFAULTS AND THE PRICING ENGINE                     ║
 * ║                                                                          ║
 * ║  The numbers below are the *seed defaults*. Once `npm run db:seed` has    ║
 * ║  run they live in the `Package` / `AddOn` / `DeliveryOption` tables and   ║
 * ║  the artist edits them at /admin/packages. Read them through             ║
 * ║  `getCatalogue()` in src/lib/cms/catalogue.ts — never import the          ║
 * ║  DEFAULT_* arrays into a page, or edits will not show up.                ║
 * ║                                                                          ║
 * ║  ⚠️ SECURITY: the browser only ever sends ids ("a4-signature", "rush").  ║
 * ║  `priceOrder()` re-computes the amount on the server from the catalogue  ║
 * ║  it loaded itself, so a tampered request cannot change what the customer ║
 * ║  is charged.                                                             ║
 * ║                                                                          ║
 * ║  All amounts are in MINOR UNITS (US cents). 12000 === $120.00            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* Ids are plain strings rather than unions: the admin can add a package or an
   extra at any time, so the set is not knowable at compile time. Validation
   happens against the live catalogue instead (see validation.ts). */

export interface PortraitPackage {
  id: string;
  /** URL slug, also used as the Stripe line-item lookup name. */
  slug: string;
  name: string;
  /** e.g. "A4 · 21×29.7cm" — shown in the gold eyebrow above the title. */
  size: string;
  sizeShort: string;
  price: number;
  /** One-line pitch used on cards and in meta descriptions. */
  blurb: string;
  /** Bullet list on the packages page. */
  includes: string[];
  /** Subjects (faces) included before the extra-subject fee applies. */
  subjectsIncluded: number;
  turnaround: string;
  /** Highlights the card as the recommended choice. */
  featured?: boolean;
  /** Which built-in sketch illustration to draw when no image is set. */
  sketch: 1 | 2 | 3;
  /** Optional real photograph, chosen from the media library. */
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Physical options need a postal address; digital does not. */
  requiresAddress: boolean;
}

export interface StyleOption {
  id: string;
  name: string;
  description: string;
}

/**
 * Everything needed to price an order. Server code loads one with
 * `getCatalogue()`; the order form receives the same object as a prop so the
 * running total in the browser matches the amount the server will charge.
 */
export interface PricingCatalogue {
  packages: PortraitPackage[];
  addOns: AddOn[];
  deliveryOptions: DeliveryOption[];
  styles: StyleOption[];
  /** Charged per subject beyond the number included in the chosen package. */
  extraSubjectPrice: number;
  maxSubjects: number;
}

/* ── Seed defaults ─────────────────────────────────────────────────────────
   Edited at /admin/packages after seeding. Kept here so a fresh checkout with
   an empty database still renders a complete site. */

export const DEFAULT_PACKAGES: PortraitPackage[] = [
  {
    id: 'a5-study',
    slug: 'a5-sketch-study',
    name: 'Sketch Study',
    size: 'A5 · 14.8×21cm',
    sizeShort: 'A5',
    price: 8500,
    blurb: 'A loose, expressive single-subject study — the fastest way to own an original.',
    includes: [
      'One subject, head & shoulders',
      'Graphite on 200gsm acid-free paper',
      'Preview sketch before final rendering',
      'One round of revisions',
      'High-resolution digital file included',
    ],
    subjectsIncluded: 1,
    turnaround: '7–10 days',
    sketch: 3,
  },
  {
    id: 'a4-signature',
    slug: 'a4-signature-portrait',
    name: 'Signature Portrait',
    size: 'A4 · 21×29.7cm',
    sizeShort: 'A4',
    price: 12000,
    blurb: 'The studio favourite. Fully rendered realism with soft-focus background.',
    includes: [
      'One subject, head & shoulders',
      'Full tonal rendering, museum-grade paper',
      'Preview sketch before final rendering',
      'Two rounds of revisions',
      'High-resolution digital file included',
      'Signed and dated by the artist',
    ],
    subjectsIncluded: 1,
    turnaround: '10–14 days',
    featured: true,
    sketch: 1,
  },
  {
    id: 'a3-heirloom',
    slug: 'a3-heirloom-portrait',
    name: 'Heirloom Portrait',
    size: 'A3 · 29.7×42cm',
    sizeShort: 'A3',
    price: 17500,
    blurb: 'Larger format with deeper detail — built to hang above a mantelpiece.',
    includes: [
      'Up to two subjects included',
      'Half-body composition available',
      'Preview sketch + progress photos',
      'Two rounds of revisions',
      'High-resolution digital file included',
      'Certificate of authenticity',
    ],
    subjectsIncluded: 2,
    turnaround: '14–18 days',
    sketch: 2,
  },
  {
    id: 'a2-grand',
    slug: 'a2-grand-portrait',
    name: 'Grand Portrait',
    size: 'A2 · 42×59.4cm',
    sizeShort: 'A2',
    price: 26000,
    blurb: 'Statement scale for family groups and once-in-a-lifetime pieces.',
    includes: [
      'Up to three subjects included',
      'Full-body or group composition',
      'Preview sketch + weekly progress photos',
      'Unlimited revisions during sketch stage',
      'High-resolution digital file included',
      'Certificate of authenticity',
    ],
    subjectsIncluded: 3,
    turnaround: '18–25 days',
    sketch: 1,
  },
];

export const DEFAULT_ADD_ONS: AddOn[] = [
  {
    id: 'rush',
    name: 'Rush Delivery',
    description: 'Your portrait jumps the queue — finished in 5–7 days.',
    price: 5000,
  },
  {
    id: 'colour',
    name: 'Colour Pencil',
    description: 'Rendered in full colour instead of graphite.',
    price: 4000,
  },
  {
    id: 'background',
    name: 'Custom Background',
    description: 'A drawn setting or scene behind the subject instead of plain paper.',
    price: 3500,
  },
  {
    id: 'gift-wrap',
    name: 'Gift Presentation',
    description: 'Tissue wrap, wax seal and a hand-written card with your message.',
    price: 1500,
  },
];

export const DEFAULT_STYLES: StyleOption[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Classic pencil. Soft greys, crisp detail. The studio default.',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    description: 'Deeper blacks and dramatic contrast. Best for moody portraits.',
  },
  {
    id: 'colour',
    name: 'Colour Pencil',
    description: 'Warm, lifelike colour. Adds the Colour Pencil extra automatically.',
  },
];

export const DEFAULT_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'digital',
    name: 'Digital File Only',
    description: '600 DPI scan emailed to you. Print it locally at any size.',
    price: 0,
    requiresAddress: false,
  },
  {
    id: 'rolled',
    name: 'Shipped Rolled',
    description: 'Original artwork in a rigid tube. Tracked worldwide courier.',
    price: 2500,
    requiresAddress: true,
  },
  {
    id: 'framed',
    name: 'Framed & Shipped',
    description: 'Mounted behind glass in a hand-finished frame, crated and insured.',
    price: 7500,
    requiresAddress: true,
  },
];

export const DEFAULT_EXTRA_SUBJECT_PRICE = 4500;
export const DEFAULT_MAX_SUBJECTS = 6;

/** The catalogue used when the database has not been seeded yet. */
export const DEFAULT_CATALOGUE: PricingCatalogue = {
  packages: DEFAULT_PACKAGES,
  addOns: DEFAULT_ADD_ONS,
  deliveryOptions: DEFAULT_DELIVERY_OPTIONS,
  styles: DEFAULT_STYLES,
  extraSubjectPrice: DEFAULT_EXTRA_SUBJECT_PRICE,
  maxSubjects: DEFAULT_MAX_SUBJECTS,
};

/* ── Lookups ───────────────────────────────────────────────────────────────
   All take the catalogue explicitly — there is no ambient price list any more. */

export const getPackage = (c: PricingCatalogue, id: string) =>
  c.packages.find((p) => p.id === id);
export const getPackageBySlug = (c: PricingCatalogue, slug: string) =>
  c.packages.find((p) => p.slug === slug);
export const getAddOn = (c: PricingCatalogue, id: string) => c.addOns.find((a) => a.id === id);
export const getDelivery = (c: PricingCatalogue, id: string) =>
  c.deliveryOptions.find((d) => d.id === id);
export const getStyle = (c: PricingCatalogue, id: string) => c.styles.find((s) => s.id === id);

/** Cheapest package — powers the "From $85" pill in the hero and footer. */
export const lowestPrice = (c: PricingCatalogue) =>
  c.packages.length === 0 ? 0 : Math.min(...c.packages.map((p) => p.price));

export const highestPrice = (c: PricingCatalogue) =>
  c.packages.length === 0 ? 0 : Math.max(...c.packages.map((p) => p.price));

/** The package the order form opens on when none was requested. */
export const defaultPackageId = (c: PricingCatalogue) =>
  c.packages.find((p) => p.featured)?.id ?? c.packages[0]?.id ?? '';

/* ── Pricing engine ────────────────────────────────────────────────────────*/

export interface PriceInput {
  packageId: string;
  addOnIds?: string[];
  style?: string;
  subjects?: number;
  deliveryId?: string;
}

export interface PricedLine {
  id: string;
  label: string;
  amount: number;
  /** Extra detail rendered under the label in the summary. */
  meta?: string;
}

export interface PricedOrder {
  pkg: PortraitPackage;
  style: string;
  subjects: number;
  delivery: DeliveryOption;
  addOns: AddOn[];
  lines: PricedLine[];
  subtotal: number;
  addOnsTotal: number;
  shipping: number;
  total: number;
  currency: 'usd';
}

/**
 * Recomputes an order total from ids alone. Call this on the server with a
 * catalogue you loaded yourself before creating any payment — never trust an
 * amount that came from the browser. Throws when an id does not exist, which
 * the API turns into a 400.
 */
export function priceOrder(input: PriceInput, catalogue: PricingCatalogue): PricedOrder {
  const pkg = getPackage(catalogue, input.packageId);
  if (!pkg) throw new Error(`Unknown package: ${input.packageId}`);

  const delivery =
    getDelivery(catalogue, input.deliveryId ?? 'digital') ?? catalogue.deliveryOptions[0];
  if (!delivery) throw new Error(`Unknown delivery option: ${input.deliveryId}`);

  const style =
    getStyle(catalogue, input.style ?? 'graphite')?.id ?? catalogue.styles[0]?.id ?? 'graphite';

  const subjects = Math.min(
    catalogue.maxSubjects,
    Math.max(1, Math.floor(Number(input.subjects ?? 1)) || 1),
  );

  // Choosing the colour medium implies the colour add-on; de-dupe it here so
  // the customer is never charged twice for the same thing.
  const requestedIds = new Set(input.addOnIds ?? []);
  if (style === 'colour' && getAddOn(catalogue, 'colour')) requestedIds.add('colour');

  const addOns = [...requestedIds]
    .map((id) => getAddOn(catalogue, id))
    .filter((a): a is AddOn => Boolean(a));

  const lines: PricedLine[] = [
    { id: pkg.id, label: `${pkg.name} — ${pkg.sizeShort}`, amount: pkg.price, meta: pkg.size },
  ];

  const extraSubjects = Math.max(0, subjects - pkg.subjectsIncluded);
  if (extraSubjects > 0) {
    lines.push({
      id: 'extra-subjects',
      label: `Additional subject${extraSubjects > 1 ? 's' : ''} × ${extraSubjects}`,
      amount: extraSubjects * catalogue.extraSubjectPrice,
      meta: `${formatMoney(catalogue.extraSubjectPrice)} per extra face`,
    });
  }

  for (const addOn of addOns) {
    lines.push({ id: addOn.id, label: addOn.name, amount: addOn.price });
  }

  if (delivery.price > 0) {
    lines.push({ id: `delivery-${delivery.id}`, label: delivery.name, amount: delivery.price });
  }

  const subtotal = pkg.price + extraSubjects * catalogue.extraSubjectPrice;
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
  const shipping = delivery.price;

  return {
    pkg,
    style,
    subjects,
    delivery,
    addOns,
    lines,
    subtotal,
    addOnsTotal,
    shipping,
    total: subtotal + addOnsTotal + shipping,
    currency: 'usd',
  };
}

/** 12000 → "$120". 12550 → "$125.50". */
export function formatMoney(minorUnits: number, currency = 'USD') {
  const value = minorUnits / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
