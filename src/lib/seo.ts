import type { Metadata } from 'next';
import { absoluteImageUrl, absoluteUrl, site, SITE_URL } from './site';
import { formatMoney, highestPrice, lowestPrice, type PricingCatalogue } from './packages';
import type { Faq } from './content';

/**
 * ── SEO TOOLKIT ────────────────────────────────────────────────────────────
 * Everything Google needs, generated from the same data the pages render:
 *   • per-page <title>/<meta description>/canonical/OG/Twitter  → pageMetadata()
 *   • schema.org structured data                                → *Schema()
 * Structured data is what earns rich results — the price range on the
 * packages page, the star-rating eligibility, the Q&A drop-downs, and the
 * breadcrumb trail under the blue link.
 */

interface PageMetaInput {
  title: string;
  description: string;
  /** Path only, e.g. "/packages". Used for the canonical + OG url. */
  path: string;
  /** Absolute or /public path. Falls back to the generated OG image. */
  image?: string;
  /**
   * Set when the route has its own `opengraph-image.tsx`, so the card names
   * the page instead of the site. See src/lib/og-card.tsx.
   *
   * Opt-in rather than inferred from `path`: guessing would point every page
   * at `<path>/opengraph-image`, and the ones without a file would 404 on the
   * share preview — a broken card being distinctly worse than a generic one.
   */
  ownOgImage?: boolean;
  keywords?: string[];
  /** Order/admin pages must never be indexed. */
  noIndex?: boolean;
  type?: 'website' | 'article';
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  ownOgImage = false,
  keywords,
  noIndex = false,
  type = 'website',
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);

  /**
   * Which card this page advertises.
   *
   * Pages with their own `opengraph-image.tsx` deliberately set NO `images`
   * here, so Next fills the field in from the file itself. The URL cannot be
   * written by hand: Next serves a nested card from a content-hashed path
   * (`/gallery/opengraph-image-100q2r`), so the obvious
   * `${path}/opengraph-image` is a 404 and the share preview comes back empty
   * — worse than the generic card it was meant to improve on.
   *
   * Everything else names the site-wide card explicitly, because declaring an
   * `openGraph` object without `images` and without a file of its own leaves
   * the page with no card at all.
   */
  const ogImage = image ?? (ownOgImage ? null : absoluteUrl('/opengraph-image'));

  return {
    title,
    description,
    keywords: keywords ?? [...site.seo.keywords],
    // One canonical URL per page — the single most effective on-page SEO fix.
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type,
      url,
      siteName: site.name,
      title,
      description,
      locale: 'en_US',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
      creator: site.seo.twitterHandle || undefined,
    },
  };
}

/* ── Structured data ─────────────────────────────────────────────────────── */

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export function organizationSchema(catalogue: PricingCatalogue) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORG_ID,
    name: site.name,
    url: SITE_URL,
    description: site.longDescription,
    email: site.email,
    telephone: site.phone,
    priceRange: `${formatMoney(lowestPrice(catalogue))}–${formatMoney(highestPrice(catalogue))}`,
    image: absoluteUrl('/opengraph-image'),
    logo: absoluteUrl('/icon.svg'),
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.location.city,
      addressRegion: site.location.region,
      addressCountry: site.location.country,
      ...(site.location.street ? { streetAddress: site.location.street } : {}),
    },
    areaServed: 'Worldwide',
    sameAs: Object.values(site.social).filter(Boolean),
    knowsAbout: [
      'graphite portrait drawing',
      'charcoal portraiture',
      'colour pencil illustration',
      'memorial portraits',
      'pet portraits',
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE_URL,
    name: site.name,
    description: site.shortDescription,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en',
    /**
     * No `SearchAction` here.
     *
     * There used to be one pointing at `/gallery?q={search_term_string}`, but
     * the gallery has no search — it reads no query parameter at all, so that
     * URL just renders the unfiltered page. A sitelinks-search-box claim is
     * verified by Google against the live URL, and structured data that
     * describes something the site does not do is exactly the kind of mismatch
     * that gets rich results withheld. Add it back the day the gallery grows a
     * real search field, and not before.
     */
  };
}

/** One Product entry per package — powers the price rich result. */
export function packagesSchema(catalogue: PricingCatalogue) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Portrait commission packages',
    itemListElement: catalogue.packages.map((pkg, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        '@id': absoluteUrl(`/packages#${pkg.slug}`),
        name: `${pkg.name} — ${pkg.size}`,
        description: pkg.blurb,
        brand: { '@type': 'Brand', name: site.name },
        category: 'Custom portrait drawing',
        // Google's product rich result wants a picture. Packages with no photo
        // of their own fall back to the branded card rather than omitting the
        // field, which would disqualify the whole entry.
        image: absoluteImageUrl(pkg.imageUrl) ?? absoluteUrl('/opengraph-image'),
        offers: {
          '@type': 'Offer',
          /**
           * The canonical packages page, not `/order?package=…`.
           *
           * The order form is `noIndex` — pointing an Offer at a page Google
           * is told not to index invites a "URL not in index" mismatch on the
           * one field the price rich result hangs off. `/packages` is where
           * this offer is actually described, and it is indexable.
           */
          url: absoluteUrl(`/packages#${pkg.slug}`),
          priceCurrency: 'USD',
          price: (pkg.price / 100).toFixed(2),
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@id': ORG_ID },
        },
      },
    })),
  };
}

export function serviceSchema(catalogue: PricingCatalogue) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Custom hand-drawn portrait commission',
    provider: { '@id': ORG_ID },
    areaServed: 'Worldwide',
    description: site.longDescription,
    offers: catalogue.packages.map((pkg) => ({
      '@type': 'Offer',
      name: pkg.name,
      price: (pkg.price / 100).toFixed(2),
      priceCurrency: 'USD',
    })),
  };
}

export function faqSchema(items: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/**
 * Structured data for the policy pages.
 *
 * /terms, /privacy and /shipping shipped with no structured data whatsoever —
 * no breadcrumb trail under their search result, and no machine-readable
 * revision date. The date matters more than it looks: a shipping or refund
 * policy is the page a shopper checks before buying, and Google prefers a
 * version it can see has been reviewed recently.
 *
 * `dateModified` comes from src/lib/legal.ts, the same constant the page
 * prints and the sitemap advertises, so the three can never disagree.
 */
export function legalPageSchema({
  title,
  description,
  path,
  modified,
}: {
  title: string;
  description: string;
  path: string;
  /** ISO date, e.g. "2026-08-01". */
  modified: string;
}) {
  return [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: title, path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': absoluteUrl(path),
      url: absoluteUrl(path),
      name: title,
      description,
      dateModified: modified,
      inLanguage: 'en',
      isPartOf: { '@id': SITE_ID },
      publisher: { '@id': ORG_ID },
      about: { '@id': ORG_ID },
    },
  ];
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function howToSchema(steps: { num: string; title: string; body: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to commission a hand-drawn portrait',
    description:
      'Upload a photo, choose a size and medium, approve the preview sketch and receive the finished portrait.',
    totalTime: 'P14D',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.body,
      url: absoluteUrl(`/process#step-${i + 1}`),
    })),
  };
}
