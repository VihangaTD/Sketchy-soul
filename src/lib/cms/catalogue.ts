import { prisma } from '@/lib/prisma';
import {
  DEFAULT_ADD_ONS,
  DEFAULT_CATALOGUE,
  DEFAULT_DELIVERY_OPTIONS,
  DEFAULT_EXTRA_SUBJECT_PRICE,
  DEFAULT_MAX_SUBJECTS,
  DEFAULT_PACKAGES,
  DEFAULT_STYLES,
  type AddOn,
  type DeliveryOption,
  type PortraitPackage,
  type PricingCatalogue,
  type StyleOption,
} from '@/lib/packages';
import { CMS_TAGS, cmsRead, toSketch } from './cache';

/**
 * The live price list. Load it once per request in a server component or route
 * handler and pass it down — including into the order form, so the running
 * total the customer sees is computed from the same numbers the server will
 * charge.
 */

/** Settings keys that live in the SiteSetting table rather than their own column. */
export const PRICING_KEYS = {
  extraSubjectPrice: 'pricing.extraSubjectPrice',
  maxSubjects: 'pricing.maxSubjects',
} as const;

export const getCatalogue = cmsRead<PricingCatalogue>({
  key: 'catalogue',
  tag: CMS_TAGS.catalogue,
  fallback: () => DEFAULT_CATALOGUE,
  load: async () => {
    const [packages, addOns, deliveryOptions, styles, settings] = await Promise.all([
      prisma.package.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      }),
      prisma.addOn.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.deliveryOption.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.styleOption.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.siteSetting.findMany({ where: { key: { in: Object.values(PRICING_KEYS) } } }),
    ]);

    // No packages means the database has never been seeded. Anything else is a
    // deliberate edit, so an empty add-on list is honoured rather than replaced.
    if (packages.length === 0) return null;

    const setting = (key: string, fallback: number) => {
      const raw = settings.find((s) => s.key === key)?.value;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };

    return {
      packages: packages.map(
        (p): PortraitPackage => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          size: p.size,
          sizeShort: p.sizeShort,
          price: p.price,
          blurb: p.blurb,
          includes: Array.isArray(p.includes) ? (p.includes as string[]) : [],
          subjectsIncluded: p.subjectsIncluded,
          turnaround: p.turnaround,
          featured: p.featured,
          sketch: toSketch(p.sketch),
          imageUrl: p.imageUrl,
          imageAlt: p.imageAlt,
        }),
      ),
      addOns: addOns.map(
        (a): AddOn => ({ id: a.id, name: a.name, description: a.description, price: a.price }),
      ),
      deliveryOptions: deliveryOptions.map(
        (d): DeliveryOption => ({
          id: d.id,
          name: d.name,
          description: d.description,
          price: d.price,
          requiresAddress: d.requiresAddress,
        }),
      ),
      styles: styles.map(
        (s): StyleOption => ({ id: s.id, name: s.name, description: s.description }),
      ),
      extraSubjectPrice: setting(PRICING_KEYS.extraSubjectPrice, DEFAULT_EXTRA_SUBJECT_PRICE),
      maxSubjects: Math.max(1, setting(PRICING_KEYS.maxSubjects, DEFAULT_MAX_SUBJECTS)),
    };
  },
});

/**
 * The raw catalogue rows, including ones the artist has switched off.
 *
 * Admin screens need this: a hidden package must still be listed and editable,
 * and the editors bind directly to columns the public type does not carry
 * (`active`, `sortOrder`). Uncached, because the admin is always live.
 * Public pages must never use it.
 */
export async function listCatalogueForAdmin() {
  const [packages, addOns, deliveryOptions, styles, settings] = await Promise.all([
    prisma.package.findMany({ orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] }),
    prisma.addOn.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.deliveryOption.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.styleOption.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.siteSetting.findMany({ where: { key: { in: Object.values(PRICING_KEYS) } } }),
  ]);

  const setting = (key: string, fallback: number) => {
    const parsed = Number(settings.find((s) => s.key === key)?.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  return {
    packages: packages.map((p) => ({
      ...p,
      includes: Array.isArray(p.includes) ? (p.includes as string[]) : [],
      sketch: toSketch(p.sketch),
    })),
    addOns,
    deliveryOptions,
    styles,
    extraSubjectPrice: setting(PRICING_KEYS.extraSubjectPrice, DEFAULT_EXTRA_SUBJECT_PRICE),
    maxSubjects: Math.max(1, setting(PRICING_KEYS.maxSubjects, DEFAULT_MAX_SUBJECTS)),
  };
}

export type AdminCatalogue = Awaited<ReturnType<typeof listCatalogueForAdmin>>;

/** True once the catalogue tables hold at least one package. */
export async function isCatalogueSeeded() {
  return (await prisma.package.count()) > 0;
}

export {
  DEFAULT_ADD_ONS,
  DEFAULT_DELIVERY_OPTIONS,
  DEFAULT_PACKAGES,
  DEFAULT_STYLES,
};
