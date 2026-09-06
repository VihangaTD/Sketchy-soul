'use server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { CMS_TAGS } from '@/lib/cms/cache';
import { flag, int, lines, money, publish, requireAdmin, slugify, text } from '@/lib/admin/guard';

/**
 * Everything on /admin/packages writes through here.
 *
 * ⚠️ These actions change what customers are charged. `priceOrder()` reads the
 * same rows on the server at checkout, so a saved price takes effect on the
 * very next order — there is no separate "publish" step and no redeploy.
 *
 * Ids are never editable. Placed orders store the package id they were bought
 * under, and the Stripe line items reference the slug, so renaming the key
 * would orphan history. The visible name can change freely.
 */

/**
 * Sends the browser back to the screen with one row re-opened.
 *
 * Without this every save would collapse the whole list and drop you at the
 * top of the page, which is miserable with a dozen records. The hash scrolls
 * the row back into view; `?open=` is what re-expands it on the server.
 *
 * Must be the last thing an action does — `redirect()` works by throwing.
 */
function backTo(anchor?: string): never {
  redirect(anchor ? `/admin/packages?open=${anchor}#${anchor}` : '/admin/packages');
}

/* ── Packages ──────────────────────────────────────────────────────────────*/

function packageFields(formData: FormData) {
  return {
    name: text(formData, 'name', 120),
    size: text(formData, 'size', 80),
    sizeShort: text(formData, 'sizeShort', 20),
    price: money(formData, 'price'),
    blurb: text(formData, 'blurb', 400),
    includes: lines(formData, 'includes'),
    subjectsIncluded: int(formData, 'subjectsIncluded', 1, 1, 20),
    turnaround: text(formData, 'turnaround', 60),
    featured: flag(formData, 'featured'),
    imageUrl: text(formData, 'imageUrl', 2048) || null,
    imageAlt: text(formData, 'imageAlt', 300) || null,
    active: flag(formData, 'active'),
  };
}

export async function createPackage(formData: FormData) {
  await requireAdmin();

  const fields = packageFields(formData);
  if (!fields.name) return;

  // Only one package can carry the "Most Popular" flash.
  if (fields.featured) await prisma.package.updateMany({ data: { featured: false } });

  const slug = await uniquePackageSlug(fields.name);

  const created = await prisma.package.create({
    data: {
      ...fields,
      slug,
      id: await uniquePackageId(slug),
      sortOrder: await nextSortOrder(),
      // Only ever seen when no card photo is chosen. Cycling through the
      // three built-in drawings stops a fresh price list looking like a
      // mistake — four identical line portraits in a row.
      sketch: ((await prisma.package.count()) % 3) + 1,
    },
  });

  await publish(CMS_TAGS.catalogue);
  backTo(`pkg-${created.id}`);
}

export async function updatePackage(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 60);
  if (!id) return;

  const fields = packageFields(formData);
  if (!fields.name) return;

  if (fields.featured) {
    await prisma.package.updateMany({ where: { id: { not: id } }, data: { featured: false } });
  }

  // The slug follows the name so the public link always reads as the package
  // it points at — /packages#a2-grand-portrait, not #package-3. `sortOrder`
  // and `sketch` are left out of the update entirely, which leaves whatever
  // the row already had.
  await prisma.package.update({
    where: { id },
    data: { ...fields, slug: await uniquePackageSlug(fields.name, id) },
  });

  await publish(CMS_TAGS.catalogue);
  backTo(`pkg-${id}`);
}

/**
 * An SEO-friendly slug built from the package name.
 *
 * `slug` is unique in the database, so two packages called "Grand Portrait"
 * would collide — the second becomes `grand-portrait-2`. `exceptId` lets a
 * package keep its own slug when it is saved without a rename.
 */
async function uniquePackageSlug(name: string, exceptId?: string) {
  const base = slugify(name, 'package');
  let candidate = base;
  let n = 2;

  while (
    await prisma.package.findFirst({
      where: { slug: candidate, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

/** Puts a new package at the end of the list. */
async function nextSortOrder() {
  const { _max } = await prisma.package.aggregate({ _max: { sortOrder: true } });
  return (_max.sortOrder ?? -1) + 1;
}

/**
 * Removes a package from the price list.
 *
 * Past orders are untouched: they store the package name, size and the amount
 * actually charged on the order row itself, so a customer's receipt and the
 * Google Sheet stay correct after the package is gone.
 */
export async function deletePackage(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 60);
  if (!id) return;

  // Never leave the site with nothing to sell.
  if ((await prisma.package.count()) <= 1) return;

  await prisma.package.delete({ where: { id } });
  await publish(CMS_TAGS.catalogue);
  backTo();
}

/** Appends `-2`, `-3`… until the slug is free. */
async function uniquePackageId(base: string) {
  let candidate = base;
  let n = 2;

  while (await prisma.package.findFirst({ where: { OR: [{ id: candidate }, { slug: candidate }] } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

/* ── Add-ons ───────────────────────────────────────────────────────────────*/

export async function saveAddOn(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 60);
  const data = {
    name: text(formData, 'name', 80),
    description: text(formData, 'description', 400),
    price: money(formData, 'price'),
    active: flag(formData, 'active'),
  };

  if (!data.name) return;

  let anchor = id;

  if (id) {
    await prisma.addOn.update({ where: { id }, data });
  } else {
    const { _max } = await prisma.addOn.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.addOn.create({
      data: {
        ...data,
        id: await uniqueId('addOn', slugify(data.name, 'extra')),
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
    });
    anchor = created.id;
  }

  await publish(CMS_TAGS.catalogue);
  backTo(`addon-${anchor}`);
}

export async function deleteAddOn(formData: FormData) {
  await requireAdmin();
  const id = text(formData, 'id', 60);
  if (!id) return;

  await prisma.addOn.delete({ where: { id } });
  await publish(CMS_TAGS.catalogue);
  backTo();
}

/* ── Delivery ──────────────────────────────────────────────────────────────*/

export async function saveDelivery(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 60);
  const data = {
    name: text(formData, 'name', 80),
    description: text(formData, 'description', 400),
    price: money(formData, 'price'),
    requiresAddress: flag(formData, 'requiresAddress'),
    active: flag(formData, 'active'),
  };

  if (!data.name) return;

  let anchor = id;

  if (id) {
    await prisma.deliveryOption.update({ where: { id }, data });
  } else {
    const { _max } = await prisma.deliveryOption.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.deliveryOption.create({
      data: {
        ...data,
        id: await uniqueId('deliveryOption', slugify(data.name, 'delivery')),
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
    });
    anchor = created.id;
  }

  await publish(CMS_TAGS.catalogue);
  backTo(`delivery-${anchor}`);
}

export async function deleteDelivery(formData: FormData) {
  await requireAdmin();
  const id = text(formData, 'id', 60);
  if (!id) return;

  // The order form needs at least one way to receive the artwork.
  if ((await prisma.deliveryOption.count()) <= 1) return;

  await prisma.deliveryOption.delete({ where: { id } });
  await publish(CMS_TAGS.catalogue);
  backTo();
}

/* ── Mediums ───────────────────────────────────────────────────────────────*/

export async function saveStyle(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 60);
  const data = {
    name: text(formData, 'name', 80),
    description: text(formData, 'description', 400),
    active: flag(formData, 'active'),
  };

  if (!data.name) return;

  let anchor = id;

  if (id) {
    await prisma.styleOption.update({ where: { id }, data });
  } else {
    const { _max } = await prisma.styleOption.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.styleOption.create({
      data: {
        ...data,
        id: await uniqueId('styleOption', slugify(data.name, 'medium')),
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
    });
    anchor = created.id;
  }

  await publish(CMS_TAGS.catalogue);
  backTo(`style-${anchor}`);
}

export async function deleteStyle(formData: FormData) {
  await requireAdmin();
  const id = text(formData, 'id', 60);
  if (!id) return;

  if ((await prisma.styleOption.count()) <= 1) return;

  await prisma.styleOption.delete({ where: { id } });
  await publish(CMS_TAGS.catalogue);
  backTo();
}

/* ── Shared ────────────────────────────────────────────────────────────────*/

/** Finds a free string id for one of the small catalogue tables. */
async function uniqueId(model: 'addOn' | 'deliveryOption' | 'styleOption', base: string) {
  let candidate = base;
  let n = 2;

  while (true) {
    const taken =
      model === 'addOn'
        ? await prisma.addOn.count({ where: { id: candidate } })
        : model === 'deliveryOption'
          ? await prisma.deliveryOption.count({ where: { id: candidate } })
          : await prisma.styleOption.count({ where: { id: candidate } });

    if (taken === 0) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}
