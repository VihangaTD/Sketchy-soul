/**
 * Editorial copy: the order process, testimonials, FAQ and trust badges.
 *
 * These arrays are the *seed defaults*. After `npm run db:seed` the live copy
 * lives in the database and is edited at /admin/content — read it through
 * src/lib/cms/editorial.ts rather than importing the DEFAULT_* arrays.
 *
 * Plain data so it can be rendered statically AND fed to structured data (the
 * FAQ list is emitted as schema.org FAQPage JSON-LD, which is what earns the
 * expandable Q&A rows in Google results).
 *
 * ⚠️ Replace the testimonials with real client quotes before launch — inventing
 * reviews breaks Google's review-snippet policy and consumer law in most
 * markets. Placeholder entries are flagged with `placeholder: true` and are
 * deliberately excluded from the structured data.
 */

export interface ProcessStep {
  num: string;
  title: string;
  body: string;
}

export const DEFAULT_PROCESS: ProcessStep[] = [
  {
    num: '01',
    title: 'Upload a Photo',
    body: 'Share the reference image and tell us the occasion — birthday, memorial, pet, family. Bright, sharp, close-up photos give the best results.',
  },
  {
    num: '02',
    title: 'Choose Size & Style',
    body: 'Pick your canvas size, graphite, charcoal or colour pencil, and whether you want it framed, rolled or print-ready.',
  },
  {
    num: '03',
    title: 'Preview Sketch',
    body: 'Within 2–3 days you receive a rough sketch for approval. Nothing is rendered until you are happy with the likeness.',
  },
  {
    num: '04',
    title: 'Final Touches',
    body: 'Revisions are included, so every detail feels right. You will get progress photos as the drawing develops.',
  },
  {
    num: '05',
    title: 'Delivered Worldwide',
    body: 'Shipped rolled or framed, or sent as a high-resolution digital file — tracked door to door, insured against damage.',
  },
];

export interface Testimonial {
  quote: string;
  author: string;
  meta: string;
  rating: 1 | 2 | 3 | 4 | 5;
  placeholder?: boolean;
}

export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'It felt like she captured not just his face, but the way he actually looked at us.',
    author: 'Client Review Placeholder',
    meta: 'Memorial portrait · A3',
    rating: 5,
    placeholder: true,
  },
  {
    quote:
      'I sent a blurry photo from 1998 and somehow got back something sharper than my memory of it.',
    author: 'Client Review Placeholder',
    meta: 'Heirloom portrait · A3',
    rating: 5,
    placeholder: true,
  },
  {
    quote:
      'The preview sketch stage is what sold me. No surprises, just steady updates until it was perfect.',
    author: 'Client Review Placeholder',
    meta: 'Signature portrait · A4',
    rating: 5,
    placeholder: true,
  },
];

export interface Faq {
  question: string;
  answer: string;
}

export const DEFAULT_FAQS: Faq[] = [
  {
    question: 'What kind of photo works best?',
    answer:
      'A sharp, well-lit photo taken straight on, with the face filling a good part of the frame. Daylight beats flash. Avoid heavy filters, sunglasses and very low-resolution screenshots. If you are unsure, upload it anyway — we review every reference before starting and will tell you honestly if it will not work.',
  },
  {
    question: 'Can you work from an old or damaged photograph?',
    answer:
      'Yes. A large share of orders come from faded prints, scanned negatives and photos of photos. Detail can be reconstructed from several images of the same person, so send everything you have.',
  },
  {
    question: 'How long does a portrait take?',
    answer:
      'You receive a preview sketch in 2–3 days. Finished pieces take 7–25 days depending on size and number of subjects, plus shipping. Rush delivery cuts this to 5–7 days and can be added at checkout.',
  },
  {
    question: 'What happens after I pay?',
    answer:
      'Your order and reference photos land with the studio immediately and you get a confirmation email with your order reference. The preview sketch follows within 2–3 working days. Nothing else is required from you until you approve it.',
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'Yes — worldwide, tracked and insured. Rolled originals ship in a rigid tube; framed pieces are crated. Import duties in the destination country are the customer’s responsibility. Digital delivery is instant and free.',
  },
  {
    question: 'What if I do not like the drawing?',
    answer:
      'The preview sketch exists precisely so this never happens. Revisions are included at the sketch stage, and every package includes at least one revision round on the finished piece. If the likeness cannot be resolved, the order is refunded in full before rendering begins — see the Terms for the full policy.',
  },
  {
    question: 'Is my payment secure?',
    answer:
      'Payment is handled entirely by Stripe or PayPal on their own secure pages. Card numbers never touch this website and are never stored on our servers.',
  },
  {
    question: 'Who owns the finished artwork?',
    answer:
      'You own the physical drawing and receive a personal-use licence for the digital file. The artist retains copyright and may show the work in the portfolio unless you ask for privacy — there is an opt-out on the order form.',
  },
  {
    question: 'Can I include more than one person in a single portrait?',
    answer:
      'Yes. Each package includes a set number of subjects and extra faces can be added at checkout. Subjects can be combined from separate photographs, which is how most family and memorial pieces are made.',
  },
  {
    question: 'Do you offer gift vouchers?',
    answer:
      'Yes — get in touch through the contact form and a voucher for any package will be issued as a printable PDF, valid for twelve months.',
  },
];

export interface Assurance {
  title: string;
  body: string;
}

/** Trust badges rendered under the hero and in the order summary. */
export const DEFAULT_ASSURANCES: Assurance[] = [
  { title: 'Preview before you commit', body: 'Approve the sketch first — always.' },
  { title: 'Hand-drawn, never AI', body: 'Real graphite, real paper, real hours.' },
  { title: 'Tracked worldwide shipping', body: 'Insured, rolled or framed.' },
  { title: 'Secure checkout', body: 'Stripe & PayPal. Cards never touch our server.' },
];
