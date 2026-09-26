import Link from "next/link";
import type { Metadata } from "next";

import { SectionHead } from "@/components/SectionHead";
import { Slideshow } from "@/components/Slideshow";
import { StudioCarousel } from "@/components/StudioCarousel";
import { ProcessSteps } from "@/components/ProcessSteps";
import { PackageCards } from "@/components/PackageCards";
import { Testimonials } from "@/components/Testimonials";
import { JsonLd } from "@/components/JsonLd";

import { formatMoney, lowestPrice } from "@/lib/packages";
import { getCatalogue } from "@/lib/cms/catalogue";
import { getStudioSlides } from "@/lib/cms/artwork";
import {
  getAssurances,
  getProcessSteps,
  getTestimonials,
} from "@/lib/cms/editorial";
import { copy, getCopy } from "@/lib/cms/copy";
import { gridColumnsDense } from "@/lib/layout";
import { site } from "@/lib/site";
import {
  howToSchema,
  packagesSchema,
  pageMetadata,
  serviceSchema,
} from "@/lib/seo";

/**
 * ── CACHING ────────────────────────────────────────────────────────────────
 * The homepage has no per-visitor content, so Next pre-renders it to static
 * HTML at build time and the CDN serves it from the edge. `revalidate` lets it
 * rebuild itself once an hour if you have edited the catalog — no redeploy
 * needed. Set to `false` for "never regenerate", or delete for fully static.
 */
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: site.seo.titleDefault,
  description: site.seo.description,
  path: "/",
});

export default async function HomePage() {
  const [catalogue, slides, assurances, process, testimonials, blocks] =
    await Promise.all([
      getCatalogue(),
      getStudioSlides(),
      getAssurances(),
      getProcessSteps(),
      getTestimonials(),
      getCopy(),
    ]);

  const t = (key: string) => copy(blocks, key);
  const from = formatMoney(lowestPrice(catalogue));

  // The hero slideshow, editable at /admin/pages → Homepage. Empty slots are
  // dropped rather than shown, so choosing one photo gives a single still
  // image instead of it fading in and out of two line drawings. With none
  // chosen the built-in sketches carry the section exactly as before.
  const chosenHeroSlides = ([1, 2, 3] as const)
    .map((n) => ({
      sketch: n,
      image: t(`home.hero.image.${n}.url`) || undefined,
      alt: t(`home.hero.image.${n}.alt`) || undefined,
      caption: t(`home.hero.image.${n}.caption`) || undefined,
    }))
    .filter((slide) => slide.image);

  const heroSlides =
    chosenHeroSlides.length > 0
      ? chosenHeroSlides
      : ([1, 2, 3] as const).map((n) => ({
          sketch: n,
          caption: t(`home.hero.image.${n}.caption`) || undefined,
        }));

  // The homepage is a teaser, so it shows at most four packages — but the
  // featured one must always be among them, however many exist or wherever
  // it has been ordered.
  const homepagePackages = [
    ...catalogue.packages.filter((p) => p.featured),
    ...catalogue.packages.filter((p) => !p.featured),
  ]
    .slice(0, 4)
    .sort(
      (a, b) => catalogue.packages.indexOf(a) - catalogue.packages.indexOf(b),
    );

  return (
    <>
      <JsonLd
        data={[
          serviceSchema(catalogue),
          packagesSchema(catalogue),
          howToSchema(process),
        ]}
      />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
<section className="bg-gold-wash relative overflow-hidden pb-12 pt-4 sm:pb-16 lg:pb-24 lg:pt-10">
  <div className="shell lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
    {/* On phones the artwork leads, exactly as in the concept. */}
    <Slideshow
      className="mb-6 h-[280px] w-full sm:h-[360px] lg:order-2 lg:mb-0 lg:h-[560px] lg:rounded-[2px]"
      slides={heroSlides}
    />

    <div className="text-center lg:order-1 lg:text-left">
      <p className="eyebrow mb-4">{site.tagline}</p>

      <h1 className="display text-balance">
        Every face
        <br className="hidden sm:block" /> tells a story{" "}
        <em className="gold-italic">
          worth
          <br className="hidden sm:block" /> keeping.
        </em>
      </h1>

      <p className="lede mx-auto mt-4 max-w-[38ch] lg:mx-0">
        {t("home.hero.lede")}
      </p>

      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <Link
          href="/packages"
          className="btn-primary w-full sm:w-auto"
        >
          {t("home.hero.primaryCta")}
        </Link>

        <Link
          href="/gallery"
          className="btn-ghost w-full sm:w-auto"
        >
          {t("home.hero.secondaryCta")}
        </Link>
      </div>

      <p className="mt-6 text-[11.5px] uppercase tracking-[0.16em] text-grey">
        From {from} · Preview sketch in {site.turnaround.preview}
        <br />
        <span className="inline-block mt-1  px-2 py-1 text-[13px] font-bold uppercase tracking-[0.18em] text-gold-soft">
  No AI ever
</span>
      </p>
    </div>
  </div>
</section>

      {/* ══ ASSURANCES ════════════════════════════════════════════════════ */}
      {assurances.length > 0 ? (
        <section className="hairline-t hairline-b bg-charcoal/40">
          <div
            className={`shell grid gap-y-6 py-8 sm:gap-6 ${gridColumnsDense(assurances.length)}`}
          >
            {assurances.map((item) => (
              <div key={item.title} className="px-1">
                <p className="font-serif text-[15px] leading-snug text-ivory sm:text-[17px]">
                  {item.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-grey">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ══ FROM THE STUDIO ═══════════════════════════════════════════════ */}
      {slides.length > 0 ? (
        <section className="section">
          <div className="shell">
            <SectionHead
              eyebrow={t("home.studio.eyebrow")}
              title={t("home.studio.title")}
              lede={t("home.studio.lede")}
            />
            <div className="mt-10 lg:mt-14">
              <StudioCarousel slides={slides} />
            </div>
          </div>
        </section>
      ) : null}

      {/* ══ PROCESS ═══════════════════════════════════════════════════════ */}
      {process.length > 0 ? (
        <section className="section bg-charcoal">
          <div className="shell">
            <SectionHead
              eyebrow={t("home.process.eyebrow")}
              title={t("home.process.title")}
              lede={t("home.process.lede")}
            />
            <div className="mt-10 lg:mt-16">
              <ProcessSteps steps={process} />
            </div>
            <div className="mt-10 text-center">
              <Link href="/process" className="btn-ghost">
                Read the Full Process
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* ══ PACKAGES ══════════════════════════════════════════════════════ */}
      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow={t("home.packages.eyebrow")}
            title={t("home.packages.title")}
            lede={t("home.packages.lede")}
          />
          <div className="mt-10 lg:mt-14">
            <PackageCards packages={homepagePackages} />
          </div>

          <p className="mt-8 text-center text-[12px] leading-relaxed text-grey">
            Framing, extra subjects and rush delivery are available as{" "}
            <span className="text-gold-soft">add-ons</span> at checkout.{" "}
            <Link
              href="/packages"
              className="text-gold-soft underline-offset-4 hover:underline"
            >
              Compare packages in detail
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ══ TESTIMONIAL ═══════════════════════════════════════════════════ */}
      {testimonials.length > 0 ? (
        <section className="section hairline-t bg-charcoal">
          <div className="shell">
            <Testimonials testimonials={testimonials} />
          </div>
        </section>
      ) : null}

      {/* ══ FOOTER CTA ════════════════════════════════════════════════════ */}
      <section className="bg-gold-wash-b section text-center">
        <div className="shell">
          <SectionHead
            eyebrow={t("home.cta.eyebrow")}
            title={t("home.cta.title")}
          />
          <p className="lede mx-auto mt-4 max-w-[40ch]">{t("home.cta.lede")}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/packages" className="btn-primary w-full sm:w-auto">
              Choose a Package
            </Link>
            <Link href="/gallery" className="btn-ghost w-full sm:w-auto">
              View Full Gallery
            </Link>
          </div>

          <div className="mt-8">
            <span className="price-pill">
              <b className="font-medium text-ivory">From {from}</b>
              <Link
                href="/packages"
                className="rounded-full bg-gold px-4 py-2 text-[11px] uppercase tracking-[1px] text-[#141414]"
              >
                See Packages
              </Link>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
