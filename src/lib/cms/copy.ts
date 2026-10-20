import { prisma } from '@/lib/prisma';
import { CMS_TAGS, cmsRead } from './cache';
import { site } from '@/lib/site';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PAGE COPY                                                               ║
 * ║                                                                          ║
 * ║  Every editable sentence on an otherwise-static page, declared once      ║
 * ║  here with its default. The registry does two jobs at the same time:     ║
 * ║                                                                          ║
 * ║    • pages read a value with `copy(blocks, 'about.hero.title')`          ║
 * ║    • /admin/pages renders the whole registry into forms automatically    ║
 * ║                                                                          ║
 * ║  So adding an editable string means adding one entry below — the admin   ║
 * ║  screen picks it up with no further work, and the two can never drift.   ║
 * ║                                                                          ║
 * ║  The defaults ARE the shipped copy. A key with no row in ContentBlock    ║
 * ║  renders its default, which is why an un-seeded site reads correctly.    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export interface CopyField {
  key: string;
  label: string;
  hint?: string;
  /**
   * `line` renders an input, `block` a textarea, `image` a media picker.
   * An `image` field stores the chosen URL under `key` and its description
   * under `altKey`, so both travel together through one form.
   */
  type: 'line' | 'block' | 'image';
  /** Required for `image` fields. */
  altKey?: string;
  value: string;
  /** Default alt text for `image` fields. */
  altValue?: string;
}

export interface CopyGroup {
  id: string;
  title: string;
  description: string;
  /** Where to look at the result. */
  preview: string;
  fields: CopyField[];
}

export const COPY_GROUPS: CopyGroup[] = [
  {
    id: 'home',
    title: 'Homepage',
    description: 'The hero and the heading above each section.',
    preview: '/',
    fields: [
      /**
       * The three fading images at the top of the homepage.
       *
       * All optional: a slot with no photo draws the built-in line portrait,
       * so the hero is never broken mid-way through being filled in. Slots are
       * skipped rather than left blank, which means choosing one photo gives a
       * single still image rather than a slideshow of one drawing and two gaps.
       *
       * Crop to a landscape-ish frame — this box is 560px tall on desktop and
       * 280px on a phone, and the image is centre-cropped to fit.
       */
      {
        key: 'home.hero.image.1.url',
        altKey: 'home.hero.image.1.alt',
        label: 'Hero photo 1',
        hint: 'Your strongest piece. Shown first, so it is what a visitor judges the studio on.',
        type: 'image',
        value: '',
        altValue: 'Hand-drawn graphite portrait in a gold mount',
      },
      {
        key: 'home.hero.image.2.url',
        altKey: 'home.hero.image.2.alt',
        label: 'Hero photo 2',
        type: 'image',
        value: '',
        altValue: 'Charcoal portrait study',
      },
      {
        key: 'home.hero.image.3.url',
        altKey: 'home.hero.image.3.alt',
        label: 'Hero photo 3',
        type: 'image',
        value: '',
        altValue: 'Line study of a face in profile',
      },
      {
        key: 'home.hero.image.1.caption',
        label: 'Hero caption 1',
        hint: 'The small line under the artwork, e.g. “Graphite portrait, A4”.',
        type: 'line',
        value: 'Graphite portrait, A4',
      },
      {
        key: 'home.hero.image.2.caption',
        label: 'Hero caption 2',
        type: 'line',
        value: 'Charcoal study, A3',
      },
      {
        key: 'home.hero.image.3.caption',
        label: 'Hero caption 3',
        type: 'line',
        value: 'Line study, A5',
      },
      {
        key: 'home.hero.lede',
        label: 'Hero paragraph',
        hint: 'Sits under the big heading.',
        type: 'block',
        value:
          'Custom graphite portraits, drawn by hand from your favourite photograph — shipped or delivered worldwide.',
      },
      {
        key: 'home.hero.primaryCta',
        label: 'Main button',
        type: 'line',
        value: 'Choose a Package',
      },
      {
        key: 'home.hero.secondaryCta',
        label: 'Second button',
        type: 'line',
        value: 'View the Gallery',
      },
      {
        key: 'home.studio.eyebrow',
        label: 'Studio section — eyebrow',
        type: 'line',
        value: 'Selected Works',
      },
      { key: 'home.studio.title', label: 'Studio section — heading', type: 'line', value: 'From the Studio' },
      {
        key: 'home.studio.lede',
        label: 'Studio section — intro',
        type: 'block',
        value: 'Single subjects, couples, whole families and the pets who run them.',
      },
      { key: 'home.process.eyebrow', label: 'Process section — eyebrow', type: 'line', value: 'How It Works' },
      { key: 'home.process.title', label: 'Process section — heading', type: 'line', value: 'The Order Process' },
      {
        key: 'home.process.lede',
        label: 'Process section — intro',
        type: 'block',
        value: 'Five steps from the photo on your phone to a framed drawing on your wall.',
      },
      { key: 'home.packages.eyebrow', label: 'Packages section — eyebrow', type: 'line', value: 'Pricing' },
      {
        key: 'home.packages.title',
        label: 'Packages section — heading',
        type: 'line',
        value: 'Discover Our Packages',
      },
      {
        key: 'home.packages.lede',
        label: 'Packages section — intro',
        type: 'block',
        value:
          'Every package includes the preview sketch, revisions and a high-resolution digital file.',
      },
      { key: 'home.cta.eyebrow', label: 'Closing section — eyebrow', type: 'line', value: 'Ready When You Are' },
      { key: 'home.cta.title', label: 'Closing section — heading', type: 'line', value: 'Start Yours' },
      {
        key: 'home.cta.lede',
        label: 'Closing section — intro',
        type: 'block',
        value: 'Every portrait is drawn to order — no templates, no shortcuts.',
      },
    ],
  },

  {
    id: 'about',
    title: 'About page',
    description:
      'Rewrite this in the artist’s own voice before launch. Keep the structure — it is what turns a browser into a buyer — but the words should be true.',
    preview: '/about',
    fields: [
      {
        key: 'about.photo.url',
        altKey: 'about.photo.alt',
        label: 'Studio photograph',
        hint: 'A real photo of the artist at work sells the “drawn by hand” promise better than any sentence. With none chosen the page draws the line portrait.',
        type: 'image',
        value: '',
        altValue: 'The artist working on a graphite portrait at the studio desk',
      },
      { key: 'about.hero.eyebrow', label: 'Eyebrow', type: 'line', value: 'The Studio' },
      { key: 'about.hero.title', label: 'Heading', type: 'line', value: 'Drawn by Hand, One at a Time' },
      {
        key: 'about.hero.lede',
        label: 'Intro line',
        type: 'block',
        value:
          'Sketchy Soul is not a print shop and not a filter. It is one artist, a stack of graphite and a lot of hours.',
      },
      {
        key: 'about.body.1',
        label: 'Story — paragraph 1',
        type: 'block',
        value:
          'Most portraits start the same way: someone sends a photograph they have looked at a thousand times, and asks whether it can become something you can hang on a wall.',
      },
      {
        key: 'about.body.2',
        label: 'Story — paragraph 2',
        type: 'block',
        value:
          'The answer is almost always yes — but only if the drawing does something a print cannot. A photograph records a face. A portrait decides what matters about it: which shadow to deepen, which line to soften, where to let the paper stay white.',
      },
      {
        key: 'about.body.3',
        label: 'Story — paragraph 3',
        type: 'block',
        value:
          'That decision-making is the whole job, and it is why every piece here is drawn by hand. No AI generation, no traced projection, no filter with a pencil texture on top. Just graphite, charcoal or colour pencil on archival paper, built up over days.',
      },
      {
        key: 'about.body.4',
        label: 'Story — paragraph 4',
        hint: 'Mentions the studio city automatically if you leave {city} in the text.',
        type: 'block',
        value:
          'Working from {city}, portraits from this studio now hang in homes across a few dozen countries — birthdays, anniversaries, memorials, and a surprising number of very well-loved dogs.',
      },
      { key: 'about.practice.eyebrow', label: 'Practice section — eyebrow', type: 'line', value: 'In Practice' },
      {
        key: 'about.practice.title',
        label: 'Practice section — heading',
        type: 'line',
        value: 'How the Studio Works',
      },
      {
        key: 'about.practice.1.title',
        label: 'Practice 1 — title',
        type: 'line',
        value: 'One portrait at a time',
      },
      {
        key: 'about.practice.1.body',
        label: 'Practice 1 — body',
        type: 'block',
        value:
          'Work is queued, not batched. Your piece gets undivided attention from first line to final signature.',
      },
      {
        key: 'about.practice.2.title',
        label: 'Practice 2 — title',
        type: 'line',
        value: 'Archival materials only',
      },
      {
        key: 'about.practice.2.body',
        label: 'Practice 2 — body',
        type: 'block',
        value:
          'Acid-free 200–300gsm paper, artist-grade graphite and pigment. A portrait made now should still look right in fifty years.',
      },
      {
        key: 'about.practice.3.title',
        label: 'Practice 3 — title',
        type: 'line',
        value: 'Nothing ships unseen',
      },
      {
        key: 'about.practice.3.body',
        label: 'Practice 3 — body',
        type: 'block',
        value:
          'You approve the sketch, then the finish. Progress photos land in your inbox along the way.',
      },
      { key: 'about.cta.eyebrow', label: 'Closing — eyebrow', type: 'line', value: 'Say Hello' },
      { key: 'about.cta.title', label: 'Closing — heading', type: 'line', value: 'Questions First, Order Later' },
      {
        key: 'about.cta.lede',
        label: 'Closing — paragraph',
        type: 'block',
        value:
          'Send the photo you have in mind and you will hear back — usually the same day — with an honest view on whether it will make a good drawing.',
      },
    ],
  },

  {
    id: 'contact',
    title: 'Contact page',
    description:
      'Edit the Studio location, worldwide-orders note and other contact-page wording here. Email, phone and social links are in Contact details above.',
    preview: '/contact',
    fields: [
      { key: 'contact.hero.eyebrow', label: 'Eyebrow', type: 'line', value: 'Say Hello' },
      { key: 'contact.hero.title', label: 'Heading', type: 'line', value: 'Get in Touch' },
      {
        key: 'contact.hero.lede',
        label: 'Intro line',
        type: 'block',
        value:
          'Send the photo you have in mind, ask about sizes, or check on an order already in progress.',
      },
      {
        key: 'contact.aside.studioLabel',
        label: 'Studio block — label',
        type: 'line',
        value: 'Studio',
      },
      {
        key: 'contact.aside.studioLocation',
        label: 'Studio block — location',
        hint: 'Location displayed on the contact page, e.g. Colombo, Sri Lanka.',
        type: 'line',
        value: `${site.location.city}, ${site.location.countryName}`,
      },
      {
        key: 'contact.aside.studioNote',
        label: 'Studio block — note under the location',
        type: 'line',
        value: 'Orders accepted worldwide.',
      },
      {
        key: 'contact.aside.responseLabel',
        label: 'Response block — label',
        type: 'line',
        value: 'Response Time',
      },
      {
        key: 'contact.aside.responseBody',
        label: 'Response block — body',
        type: 'block',
        value:
          'Usually within one working day. Existing orders always get answered first.',
      },
      {
        key: 'contact.aside.instagram',
        label: 'Instagram link text',
        type: 'line',
        value: 'Instagram — work in progress shots',
      },
      {
        key: 'contact.aside.whatsapp',
        label: 'WhatsApp link text',
        type: 'line',
        value: 'WhatsApp — quick questions',
      },
    ],
  },

  {
    id: 'gallery',
    title: 'Gallery page',
    description: 'The heading above the grid and the block underneath it.',
    preview: '/gallery',
    fields: [
      { key: 'gallery.hero.eyebrow', label: 'Eyebrow', type: 'line', value: 'Selected Works' },
      { key: 'gallery.hero.title', label: 'Heading', type: 'line', value: 'The Gallery' },
      {
        key: 'gallery.hero.lede',
        label: 'Intro line',
        type: 'block',
        value:
          'Every drawing here began as somebody’s photograph. Tap any piece to see it larger.',
      },
      {
        key: 'gallery.cta.title',
        label: 'Closing — heading',
        type: 'line',
        value: 'Your photograph could be next.',
      },
      {
        key: 'gallery.cta.lede',
        label: 'Closing — paragraph',
        type: 'block',
        value:
          'Pick a size, upload your reference, and receive a preview sketch within a few days.',
      },
    ],
  },

  {
    id: 'packages',
    title: 'Packages page',
    description: 'Section headings. The prices themselves are under Packages.',
    preview: '/packages',
    fields: [
      { key: 'packages.hero.eyebrow', label: 'Eyebrow', type: 'line', value: 'Pricing' },
      { key: 'packages.hero.title', label: 'Heading', type: 'line', value: 'Discover Our Packages' },
      {
        key: 'packages.hero.lede',
        label: 'Intro line',
        type: 'block',
        value:
          'One price, no surprises. Every package includes the preview sketch, revisions and a high-resolution digital file of the finished drawing.',
      },
      { key: 'packages.medium.eyebrow', label: 'Medium section — eyebrow', type: 'line', value: 'Medium' },
      {
        key: 'packages.medium.title',
        label: 'Medium section — heading',
        type: 'line',
        value: 'Choose Your Material',
      },
      { key: 'packages.extras.eyebrow', label: 'Extras section — eyebrow', type: 'line', value: 'Extras' },
      { key: 'packages.extras.title', label: 'Extras section — heading', type: 'line', value: 'Add-Ons' },
      {
        key: 'packages.extras.lede',
        label: 'Extras section — intro',
        type: 'block',
        value: 'Tick any of these at checkout — the total updates as you go.',
      },
      {
        key: 'packages.extras.subjectTitle',
        label: 'Extra subject — title',
        type: 'line',
        value: 'Additional Subject',
      },
      {
        key: 'packages.extras.subjectBody',
        label: 'Extra subject — description',
        type: 'block',
        value:
          'Each face beyond the number included in your package. Subjects can come from different photographs.',
      },
      { key: 'packages.delivery.eyebrow', label: 'Delivery section — eyebrow', type: 'line', value: 'Delivery' },
      {
        key: 'packages.delivery.title',
        label: 'Delivery section — heading',
        type: 'line',
        value: 'How It Reaches You',
      },
      { key: 'packages.compare.eyebrow', label: 'Comparison — eyebrow', type: 'line', value: 'Side by Side' },
      { key: 'packages.compare.title', label: 'Comparison — heading', type: 'line', value: 'Compare Packages' },
      { key: 'packages.cta.eyebrow', label: 'Closing — eyebrow', type: 'line', value: 'Ready When You Are' },
      { key: 'packages.cta.title', label: 'Closing — heading', type: 'line', value: 'Start Yours' },
      {
        key: 'packages.cta.lede',
        label: 'Closing — paragraph',
        type: 'block',
        value:
          'Not sure which size suits your photo? Send it over and you will get an honest recommendation before you pay a cent.',
      },
    ],
  },

  {
    id: 'process',
    title: 'Process page',
    description:
      'The heading above the steps, and one photograph per step. The step titles and wording are under Words.',
    preview: '/process',
    fields: [
      /**
       * One photo per step, matched to the steps in order. Every slot is
       * optional: an empty one draws the built-in line portrait, so the page
       * is never half-finished while the studio photographs its own process.
       */
      {
        key: 'process.step.1.image.url',
        altKey: 'process.step.1.image.alt',
        label: 'Step 1 photo',
        hint: 'Sits beside step 1. With none chosen the step draws the built-in line portrait.',
        type: 'image',
        value: '',
        altValue: 'A customer photograph being reviewed on the studio desk',
      },
      {
        key: 'process.step.2.image.url',
        altKey: 'process.step.2.image.alt',
        label: 'Step 2 photo',
        type: 'image',
        value: '',
        altValue: 'Size and medium samples laid out side by side',
      },
      {
        key: 'process.step.3.image.url',
        altKey: 'process.step.3.image.alt',
        label: 'Step 3 photo',
        type: 'image',
        value: '',
        altValue: 'A preview sketch part-way through, pencil resting on the paper',
      },
      {
        key: 'process.step.4.image.url',
        altKey: 'process.step.4.image.alt',
        label: 'Step 4 photo',
        type: 'image',
        value: '',
        altValue: 'Revision marks pencilled onto a working sketch',
      },
      {
        key: 'process.step.5.image.url',
        altKey: 'process.step.5.image.alt',
        label: 'Step 5 photo',
        type: 'image',
        value: '',
        altValue: 'The finished portrait wrapped and ready to ship',
      },
      { key: 'process.hero.eyebrow', label: 'Eyebrow', type: 'line', value: 'How It Works' },
      { key: 'process.hero.title', label: 'Heading', type: 'line', value: 'The Order Process' },
      {
        key: 'process.hero.lede',
        label: 'Intro line',
        type: 'block',
        value:
          'Nothing is rendered until you have seen a sketch and said yes. Here is exactly what happens, step by step.',
      },
    ],
  },

  {
    id: 'faq',
    title: 'FAQ page',
    description: 'The heading above the questions. The questions are under Words.',
    preview: '/faq',
    fields: [
      { key: 'faq.hero.eyebrow', label: 'Eyebrow', type: 'line', value: 'Good Questions' },
      { key: 'faq.hero.title', label: 'Heading', type: 'line', value: 'Frequently Asked' },
      {
        key: 'faq.hero.lede',
        label: 'Intro line',
        type: 'block',
        value: 'If yours is not here, ask — the answer usually arrives the same day.',
      },
      { key: 'faq.cta.title', label: 'Closing — heading', type: 'line', value: 'Still unsure?' },
      {
        key: 'faq.cta.lede',
        label: 'Closing — paragraph',
        type: 'block',
        value:
          'Send the photograph you have in mind. You will get a straight answer on whether it will make a good drawing before any money changes hands.',
      },
    ],
  },

  {
    id: 'order',
    title: 'Order form',
    description: 'The wording at the top of the checkout flow.',
    preview: '/order',
    fields: [
      { key: 'order.hero.title', label: 'Heading', type: 'line', value: 'Start Your Portrait' },
      {
        key: 'order.hero.lede',
        label: 'Intro line',
        type: 'block',
        value:
          'Four short steps. Nothing is charged until the last one, and nothing is drawn until you approve the preview sketch.',
      },
    ],
  },
];

/** Flat lookup of every default, built once at module load. */
const DEFAULTS: Record<string, string> = Object.fromEntries(
  COPY_GROUPS.flatMap((group) =>
    group.fields.flatMap((field) =>
      field.altKey
        ? [
            [field.key, field.value],
            [field.altKey, field.altValue ?? ''],
          ]
        : [[field.key, field.value]],
    ),
  ),
);

/** Every key the registry owns, including the alt text of image fields. */
export const copyKeys = (fields: CopyField[]) =>
  fields.flatMap((field) => (field.altKey ? [field.key, field.altKey] : [field.key]));

export type CopyBlocks = Record<string, string>;

/**
 * Every overridden string, keyed by its dotted path. Anything absent falls
 * back to the default in the registry above, so this is only ever the diff.
 */
export const getCopy = cmsRead<CopyBlocks>({
  key: 'copy',
  tag: CMS_TAGS.blocks,
  fallback: () => ({}),
  load: async () => {
    const rows = await prisma.contentBlock.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
});

/**
 * Reads one string.
 *
 * `tokens` substitutes `{name}` placeholders — used so copy can mention the
 * studio city without the artist having to retype it in four places.
 */
export function copy(
  blocks: CopyBlocks,
  key: string,
  tokens?: Record<string, string>,
): string {
  const raw = blocks[key]?.trim() || DEFAULTS[key] || '';
  if (!tokens) return raw;

  return raw.replace(/\{(\w+)\}/g, (match, token: string) => tokens[token] ?? match);
}

/** The shipped default for a key, shown as the placeholder in the admin. */
export const defaultCopy = (key: string) => DEFAULTS[key] ?? '';

/** Admin read: overrides only, so the editor can show what has been changed. */
export async function listCopyOverrides() {
  const rows = await prisma.contentBlock.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, row.value])) as CopyBlocks;
}
