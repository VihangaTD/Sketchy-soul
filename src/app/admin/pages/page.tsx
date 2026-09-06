import Link from 'next/link';

import { SectionHead } from '@/components/SectionHead';
import {
  Actions,
  Area,
  Card,
  Check,
  Danger,
  Disclosure,
  Field,
  Save,
  Text,
} from '@/components/admin/Fields';
import { MediaPicker, type PickableAsset } from '@/components/admin/MediaPicker';
import { COPY_GROUPS, copyKeys, listCopyOverrides } from '@/lib/cms/copy';
import { listSlidesForAdmin } from '@/lib/cms/artwork';
import { listMedia } from '@/lib/cms/media';

import { deleteSlide, resetCopy, saveCopy, saveSlide } from './actions';

/**
 * Page copy.
 *
 * One form per page, one input per editable sentence. The layout itself is not
 * editable by design: the artist can change every word without being able to
 * break the design or the responsive behaviour, which is the whole point of
 * fields rather than a free-form rich-text box.
 *
 * Leaving a box empty restores the wording the project shipped with, so
 * nothing is ever permanently lost by clearing a field.
 *
 * The homepage carousel is edited here too. Its slides are database records
 * rather than copy keys, so they get their own forms below the Homepage
 * panel — but they belong on this screen, because "change the homepage" is
 * one job and should not be split across two tabs.
 */
export const dynamic = 'force-dynamic';

export default async function PagesAdminPage() {
  const [overrides, media, slides] = await Promise.all([
    listCopyOverrides(),
    listMedia(),
    listSlidesForAdmin(),
  ]);

  const assets = media.map((m) => ({
    id: m.id,
    url: m.url,
    name: m.name,
    alt: m.alt,
    folder: m.folder,
  }));

  const changed = (group: (typeof COPY_GROUPS)[number]) =>
    copyKeys(group.fields).filter((key) => overrides[key]).length;

  return (
    <section className="shell">
      <SectionHead
        as="h1"
        align="left"
        eyebrow="Studio Only"
        title="Page Copy"
        lede="Every sentence on the site, page by page. Clear a box to put that line back to the original wording."
      />

      <nav aria-label="Jump to a page" className="rail rail-bleed mt-8 justify-start gap-2">
        {COPY_GROUPS.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="shrink-0 whitespace-nowrap rounded-full border border-hairline px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-grey transition-colors hover:border-gold/40 hover:text-ivory"
          >
            {group.title}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-8">
        {COPY_GROUPS.map((group) => {
          const edits = changed(group);

          return (
            <div key={group.id} id={group.id} className="scroll-mt-24">
              <Card
                title={group.title}
                meta={
                  <>
                    {edits > 0 ? `${edits} edited · ` : ''}
                    <Link
                      href={group.preview}
                      target="_blank"
                      className="text-gold-soft underline-offset-4 hover:underline"
                    >
                      view ↗
                    </Link>
                  </>
                }
              >
                <p className="-mt-2 mb-5 max-w-[64ch] text-[12.5px] leading-relaxed text-grey">
                  {group.description}
                </p>

                <form action={saveCopy}>
                <input type="hidden" name="group" value={group.id} />

                <div className="grid gap-5 lg:grid-cols-2">
                  {group.fields.map((field) => (
                    <Field
                      key={field.key}
                      label={field.label}
                      group={field.type === 'image'}
                      hint={field.hint}
                      className={field.type === 'line' ? '' : 'lg:col-span-2'}
                    >
                      {field.type === 'image' && field.altKey ? (
                        <MediaPicker
                          name={field.key}
                          altName={field.altKey}
                          assets={assets}
                          defaultUrl={overrides[field.key] ?? field.value}
                          defaultAlt={overrides[field.altKey] ?? field.altValue}
                          preferredFolder="page"
                        />
                      ) : field.type === 'block' ? (
                        <Area
                          name={field.key}
                          defaultValue={overrides[field.key] ?? field.value}
                          placeholder={field.value}
                          rows={3}
                          maxLength={4000}
                        />
                      ) : (
                        <Text
                          name={field.key}
                          defaultValue={overrides[field.key] ?? field.value}
                          placeholder={field.value}
                          maxLength={4000}
                        />
                      )}
                    </Field>
                  ))}
                </div>

                <Actions>
                  <Save label={`Save ${group.title.toLowerCase()}`} />
                  {edits > 0 ? (
                    <Danger
                      action={resetCopy}
                      label="Restore original wording"
                      confirm={`Put every line on the ${group.title.toLowerCase()} back to the wording the project shipped with?`}
                    />
                  ) : null}
                </Actions>
                </form>

                {group.id === 'home' ? <HomepageSlides slides={slides} assets={assets} /> : null}
              </Card>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type AdminSlide = Awaited<ReturnType<typeof listSlidesForAdmin>>[number];

/**
 * The "From the Studio" rail under the homepage hero.
 *
 * Sits directly beneath the Homepage copy panel so everything that changes
 * the homepage is on one screen. Unlike copy, slides can be added and
 * removed, so each is its own form posting to its own action.
 */
function HomepageSlides({ slides, assets }: { slides: AdminSlide[]; assets: PickableAsset[] }) {
  const live = slides.filter((s) => s.active).length;

  return (
    // A sub-section of the Homepage panel, not a panel of its own: changing
    // the homepage is one job. It cannot go inside the copy <form> above —
    // each slide is its own form, and HTML has no nested forms — so it sits
    // as a sibling under a rule inside the same card.
    <section className="mt-8 border-t border-hairline pt-6">
      <header className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-[17px] text-ivory">Homepage slides</h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-grey">
          {slides.length} slide{slides.length === 1 ? '' : 's'}
          {live === slides.length ? '' : ` · ${live} visible`}
        </p>
      </header>

      <p className="mb-5 max-w-[64ch] text-[12.5px] leading-relaxed text-grey">
        The rail below the hero. Crop these to 4:5 and keep them all the same
        pixel size — the browser reserves the exact box before the image loads,
        and a mismatch makes the homepage jump.
        {live > 0 && live < 3
          ? ` Only ${live} ${live === 1 ? 'is' : 'are'} visible; three sit side by side on a desktop screen.`
          : ''}
      </p>

      <div className="space-y-3">
        {/* Add sits at the top of its section, reachable without scrolling
            past every existing slide. */}
        <form key={slides.length} action={saveSlide}>
          <Disclosure title="Add a slide" meta="New slide">
            <SlideFields assets={assets} />
            <Actions>
              <Save label="Add slide" />
            </Actions>
          </Disclosure>
        </form>

        {slides.map((slide) => (
          <form key={slide.id} action={saveSlide}>
            <input type="hidden" name="id" value={slide.id} />
            <Disclosure
              id={`slide-${slide.id}`}
              title={slide.label}
              meta={slide.active ? slide.id : `${slide.id} · hidden`}
              muted={!slide.active}
            >
              <SlideFields slide={slide} assets={assets} />
              <Actions>
                <Save />
                <Danger
                  action={deleteSlide}
                  label="Delete slide"
                  confirm={`Remove the "${slide.label}" slide? The photo stays in your library.`}
                />
              </Actions>
            </Disclosure>
          </form>
        ))}
      </div>
    </section>
  );
}

/**
 * One slide's fields, rendered by both the add form and the per-slide editor,
 * so a new slide is described exactly as completely as an existing one.
 */
function SlideFields({ slide, assets }: { slide?: AdminSlide; assets: PickableAsset[] }) {
  return (
    <>
      <Field label="Artwork" group>
        <MediaPicker
          name="imageUrl"
          altName="imageAlt"
          assets={assets}
          defaultUrl={slide?.imageUrl}
          defaultAlt={slide?.alt}
          preferredFolder="carousel"
        />
      </Field>

      <Field label="Label" hint="The heading under the artwork." className="mt-4">
        <Text name="label" defaultValue={slide?.label} placeholder="Pets" required maxLength={40} />
      </Field>

      <Field label="One-line blurb" hint="Sits on a single row — keep it short." className="mt-4">
        <Area name="blurb" defaultValue={slide?.blurb} rows={2} maxLength={200} />
      </Field>

      <div className="mt-4">
        <Check name="active" label="Show on the homepage" defaultChecked={slide?.active ?? true} />
      </div>
    </>
  );
}

