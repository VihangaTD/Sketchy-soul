import { unstable_cache } from 'next/cache';

import { isDatabaseConfigured } from '@/lib/prisma';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  CONTENT READS                                                           ║
 * ║                                                                          ║
 * ║  Every public page reads its copy through this helper. Three properties  ║
 * ║  matter:                                                                 ║
 * ║                                                                          ║
 * ║   1. CACHED. Pages are statically rendered; a database round trip per    ║
 * ║      visitor would throw that away. Results are cached until an admin    ║
 * ║      save calls `revalidateTag()` with the matching tag.                 ║
 * ║                                                                          ║
 * ║   2. NEVER FATAL. If DATABASE_URL is unset, the tables do not exist yet, ║
 * ║      or Postgres is briefly unreachable, the site falls back to the      ║
 * ║      DEFAULT_* constants in src/lib rather than failing the build or     ║
 * ║      serving an empty page. A first deploy therefore works before        ║
 * ║      `prisma migrate deploy` and `npm run db:seed` have been run.        ║
 * ║                                                                          ║
 * ║   3. EMPTY MEANS UNSEEDED. A collection with zero rows also falls back,  ║
 * ║      which is what makes step 2 above render a complete site rather      ║
 * ║      than a skeleton.                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export const CMS_TAGS = {
  catalogue: 'cms:catalogue',
  portfolio: 'cms:portfolio',
  slides: 'cms:slides',
  editorial: 'cms:editorial',
  blocks: 'cms:blocks',
  media: 'cms:media',
} as const;

export type CmsTag = (typeof CMS_TAGS)[keyof typeof CMS_TAGS];

/** Every tag — used by "restore defaults" and the seed action. */
export const ALL_CMS_TAGS = Object.values(CMS_TAGS);

/**
 * Wraps a database read in the cache and a fallback.
 *
 * `fallback` is a function rather than a value so the default arrays are not
 * cloned on every call, and so it can be evaluated lazily only on failure.
 */
export function cmsRead<T>(options: {
  /** Cache key part — must be unique per reader. */
  key: string;
  tag: CmsTag;
  load: () => Promise<T | null>;
  fallback: () => T;
}): () => Promise<T> {
  const cached = unstable_cache(options.load, ['cms', options.key], {
    tags: [options.tag],
    // A safety net only: admin saves revalidate by tag immediately.
    revalidate: 3600,
  });

  return async () => {
    if (!isDatabaseConfigured()) return options.fallback();

    try {
      const value = await cached();
      // `null` is the loader's way of saying "no rows — treat as unseeded".
      return value ?? options.fallback();
    } catch (error) {
      // A missing table (first deploy, migrations not yet applied) lands here,
      // as does a dev server started before .env existed. One line, not a
      // stack trace — this path is expected and the page renders correctly.
      console.warn(`[cms] ${options.key}: using defaults (${describe(error)})`);
      return options.fallback();
    }
  };
}

/**
 * One readable line instead of a Prisma stack trace.
 *
 * The two cases worth naming are the ones people actually hit on a first run,
 * and both have the same fix: restart the dev server, or run the migration.
 */
function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Environment variable not found: DATABASE_URL')) {
    return 'DATABASE_URL not visible to Prisma — restart the dev server after editing .env';
  }
  if (message.includes('does not exist in the current database')) {
    return 'content tables missing — run `npx prisma migrate dev`';
  }

  return message.split('\n')[0].trim() || 'database unavailable';
}

/** Narrows a database integer to the three built-in line drawings. */
export function toSketch(value: number | null | undefined): 1 | 2 | 3 {
  return value === 2 ? 2 : value === 3 ? 3 : 1;
}
