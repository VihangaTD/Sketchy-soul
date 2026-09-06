'use server';

import { prisma } from '@/lib/prisma';
import { CMS_TAGS } from '@/lib/cms/cache';
import { COPY_GROUPS, copyKeys, defaultCopy } from '@/lib/cms/copy';
import { flag, publish, requireAdmin, slugify, text } from '@/lib/admin/guard';

/**
 * Saves one page's worth of copy.
 *
 * A field left blank — or typed back to exactly the shipped wording — deletes
 * its override rather than storing a duplicate. That keeps the table as a
 * small diff of "what the artist changed", and means "clear the box to put it
 * back how it was" is a real, discoverable behaviour.
 */
export async function saveCopy(formData: FormData) {
  await requireAdmin();

  const groupId = text(formData, 'group', 40);
  const group = COPY_GROUPS.find((g) => g.id === groupId);
  if (!group) return;

  for (const key of copyKeys(group.fields)) {
    const value = text(formData, key, 4000);

    if (!value || value === defaultCopy(key)) {
      await prisma.contentBlock.deleteMany({ where: { key } });
      continue;
    }

    await prisma.contentBlock.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  await publish(CMS_TAGS.blocks);
}

/** Puts one page back to the wording the project shipped with. */
export async function resetCopy(formData: FormData) {
  await requireAdmin();

  const groupId = text(formData, 'group', 40);
  const group = COPY_GROUPS.find((g) => g.id === groupId);
  if (!group) return;

  await prisma.contentBlock.deleteMany({ where: { key: { in: copyKeys(group.fields) } } });

  await publish(CMS_TAGS.blocks);
}

/* ── Homepage carousel ─────────────────────────────────────────────────────
   The "From the Studio" slides. These are database records rather than copy
   keys — they can be added and deleted — so they keep their own actions, but
   they are edited on this screen because that is where someone looks when
   they want to change the homepage. */

export async function saveSlide(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 60);

  const data = {
    label: text(formData, 'label', 40),
    blurb: text(formData, 'blurb', 200),
    imageUrl: text(formData, 'imageUrl', 2048) || null,
    alt: text(formData, 'imageAlt', 300),
    active: flag(formData, 'active'),
  };

  if (!data.label) return;

  if (id) {
    // `sortOrder` and `sketch` are left out of the update, which leaves
    // whatever the row already had.
    await prisma.studioSlide.update({ where: { id }, data });
  } else {
    const { _max } = await prisma.studioSlide.aggregate({ _max: { sortOrder: true } });

    await prisma.studioSlide.create({
      data: {
        ...data,
        id: await uniqueSlideId(slugify(data.label, 'slide')),
        // A new slide joins the end of the rail.
        sortOrder: (_max.sortOrder ?? -1) + 1,
        // Only ever seen before an artwork is chosen; cycled so a part-built
        // rail does not show the same drawing three times.
        sketch: ((await prisma.studioSlide.count()) % 3) + 1,
      },
    });
  }

  await publish(CMS_TAGS.slides);
}

export async function deleteSlide(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id', 60);
  if (!id) return;

  await prisma.studioSlide.delete({ where: { id } });
  await publish(CMS_TAGS.slides);
}

async function uniqueSlideId(base: string) {
  let candidate = base;
  let n = 2;

  while (await prisma.studioSlide.count({ where: { id: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}
