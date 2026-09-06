import Link from 'next/link';

import { SectionHead } from '@/components/SectionHead';
import { Actions, Area, Card, Check, Danger, Field, Num, Save, Select, Text } from '@/components/admin/Fields';
import {
  listAssurancesForAdmin,
  listFaqsForAdmin,
  listTestimonialsForAdmin,
} from '@/lib/cms/editorial';

import {
  deleteAssurance,
  deleteFaq,
  deleteTestimonial,
  saveAssurance,
  saveFaq,
  saveTestimonial,
} from './actions';

/**
 * Editorial copy — the words that repeat across the site.
 *
 * Everything on this screen also feeds structured data, so it is worth being
 * accurate rather than merely persuasive: the FAQ becomes the expandable Q&A
 * rows under your Google listing, and the quotes become review markup.
 */
export const dynamic = 'force-dynamic';

const RATINGS = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: `${'★'.repeat(n)} (${n})`,
}));

export default async function ContentAdminPage() {
  const [testimonials, faqs, assurances] = await Promise.all([
    listTestimonialsForAdmin(),
    listFaqsForAdmin(),
    listAssurancesForAdmin(),
  ]);

  const placeholders = testimonials.filter((t) => t.placeholder && t.published).length;

  return (
    <section className="shell">
      <SectionHead
        as="h1"
        align="left"
        eyebrow="Studio Only"
        title="Words"
        lede="Client quotes, the FAQ and the promises under the hero."
      />

      {placeholders > 0 ? (
        <p className="mt-8 rounded-[2px] border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] leading-relaxed text-gold-soft">
          {placeholders} testimonial{placeholders === 1 ? ' is' : 's are'} still
          marked as a placeholder. They are shown on the page but deliberately
          kept out of the review structured data — publishing invented reviews
          breaks Google&apos;s review-snippet policy and consumer law in most
          markets. Replace them with real, attributable quotes, then untick
          &ldquo;placeholder&rdquo;.
        </p>
      ) : null}

      {/* ══ Testimonials ═══════════════════════════════════════════════════ */}
      <h2 className="mt-12 font-serif text-[24px] text-ivory">Client quotes</h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-grey">
        One is shown on a phone, three across on desktop — so put your strongest
        quote first.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {testimonials.map((t) => (
          <form key={t.id} action={saveTestimonial}>
            <input type="hidden" name="id" value={t.id} />
            <Card
              title={t.author}
              meta={`${'★'.repeat(t.rating)}${t.placeholder ? ' · placeholder' : ''}`}
              muted={!t.published}
            >
              <Field label="Quote">
                <Area name="quote" defaultValue={t.quote} rows={3} maxLength={600} />
              </Field>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Author">
                  <Text name="author" defaultValue={t.author} required maxLength={80} />
                </Field>
                <Field label="Context" hint="e.g. “Memorial portrait · A3”.">
                  <Text name="meta" defaultValue={t.meta} maxLength={80} />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Rating">
                  <Select name="rating" defaultValue={String(t.rating)} options={RATINGS} />
                </Field>
                <Field label="Order">
                  <Num name="sortOrder" defaultValue={t.sortOrder} max={999} />
                </Field>
              </div>

              <div className="mt-4 space-y-2.5">
                <Check
                  name="placeholder"
                  label="Placeholder — not a real review"
                  defaultChecked={t.placeholder}
                  hint="Keeps it out of review structured data. Untick only for genuine, attributable quotes."
                />
                <Check name="published" label="Visible on the site" defaultChecked={t.published} />
              </div>

              <Actions>
                <Save />
                <Danger
                  action={deleteTestimonial}
                  label="Delete"
                  confirm={`Delete the quote from ${t.author}?`}
                />
              </Actions>
            </Card>
          </form>
        ))}
        {/* Keyed on the row count so the form remounts — and clears — once the
            record it just created appears in the list. Uncontrolled inputs
            otherwise keep what was typed, and the obvious next click adds the
            same quote a second time. */}

        <form key={testimonials.length} action={saveTestimonial}>
          <Card title="Add a quote">
            <Field label="Quote">
              <Area name="quote" rows={3} maxLength={600} />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Author">
                <Text name="author" placeholder="Priya M." required maxLength={80} />
              </Field>
              <Field label="Context">
                <Text name="meta" placeholder="Family portrait · A2" maxLength={80} />
              </Field>
            </div>
            <Field label="Rating" className="mt-4">
              <Select name="rating" defaultValue="5" options={RATINGS} />
            </Field>
            <div className="mt-4">
              <Check
                name="placeholder"
                label="Placeholder — not a real review"
                hint="Leave unticked for a genuine client quote."
              />
            </div>
            <Actions>
              <Save label="Add quote" />
            </Actions>
          </Card>
        </form>
      </div>

      {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
      <h2 className="mt-16 font-serif text-[24px] text-ivory">Questions</h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-grey">
        Shown on /faq and published as FAQPage structured data. Questions
        mentioning turnaround, shipping, payment security or multiple subjects
        are also picked up by the packages page automatically.
      </p>

      <div className="mt-6 space-y-5">
        {faqs.map((faq) => (
          <form key={faq.id} action={saveFaq}>
            <input type="hidden" name="id" value={faq.id} />
            <Card title={faq.question} meta={faq.published ? undefined : 'hidden'} muted={!faq.published}>
              <Field label="Question">
                <Text name="question" defaultValue={faq.question} required maxLength={300} />
              </Field>
              <Field label="Answer" className="mt-4">
                <Area name="answer" defaultValue={faq.answer} rows={4} maxLength={2000} />
              </Field>
              <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]">
                <Field label="Order">
                  <Num name="sortOrder" defaultValue={faq.sortOrder} max={999} />
                </Field>
                <div className="flex items-end pb-2">
                  <Check name="published" label="Visible on the site" defaultChecked={faq.published} />
                </div>
              </div>
              <Actions>
                <Save />
                <Danger action={deleteFaq} label="Delete question" confirm="Delete this question?" />
              </Actions>
            </Card>
          </form>
        ))}

        <form key={faqs.length} action={saveFaq}>
          <Card title="Add a question">
            <Field label="Question">
              <Text name="question" placeholder="Do you offer gift vouchers?" required maxLength={300} />
            </Field>
            <Field label="Answer" className="mt-4">
              <Area name="answer" rows={4} maxLength={2000} />
            </Field>
            <Actions>
              <Save label="Add question" />
            </Actions>
          </Card>
        </form>
      </div>

      {/* ══ Assurances ═════════════════════════════════════════════════════ */}
      <h2 className="mt-16 font-serif text-[24px] text-ivory">Promises under the hero</h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-grey">
        The four short trust badges on the homepage. Two columns on a phone,
        four across on desktop — so four works best.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {assurances.map((item) => (
          <form key={item.id} action={saveAssurance}>
            <input type="hidden" name="id" value={item.id} />
            <Card title={item.title} muted={!item.published}>
              <Field label="Title">
                <Text name="title" defaultValue={item.title} required maxLength={80} />
              </Field>
              <Field label="Body" hint="One short line." className="mt-4">
                <Text name="body" defaultValue={item.body} maxLength={200} />
              </Field>
              <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]">
                <Field label="Order">
                  <Num name="sortOrder" defaultValue={item.sortOrder} max={999} />
                </Field>
                <div className="flex items-end pb-2">
                  <Check name="published" label="Visible" defaultChecked={item.published} />
                </div>
              </div>
              <Actions>
                <Save />
                <Danger action={deleteAssurance} label="Delete" confirm={`Delete "${item.title}"?`} />
              </Actions>
            </Card>
          </form>
        ))}

        <form key={assurances.length} action={saveAssurance}>
          <Card title="Add a promise">
            <Field label="Title">
              <Text name="title" placeholder="Hand-drawn, never AI" required maxLength={80} />
            </Field>
            <Field label="Body" className="mt-4">
              <Text name="body" placeholder="Real graphite, real paper, real hours." maxLength={200} />
            </Field>
            <Actions>
              <Save label="Add promise" />
            </Actions>
          </Card>
        </form>
      </div>

      <p className="mt-14 text-[12px] text-grey">
        Check the result on the{' '}
        <Link href="/" target="_blank" className="text-gold-soft underline-offset-4 hover:underline">
          homepage
        </Link>
        ,{' '}
        <Link href="/process" target="_blank" className="text-gold-soft underline-offset-4 hover:underline">
          process
        </Link>{' '}
        and{' '}
        <Link href="/faq" target="_blank" className="text-gold-soft underline-offset-4 hover:underline">
          FAQ
        </Link>{' '}
        pages.
      </p>
    </section>
  );
}
