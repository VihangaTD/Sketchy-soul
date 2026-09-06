import { prisma } from '@/lib/prisma';
import {
  DEFAULT_ASSURANCES,
  DEFAULT_FAQS,
  DEFAULT_PROCESS,
  DEFAULT_TESTIMONIALS,
  type Assurance,
  type Faq,
  type ProcessStep,
  type Testimonial,
} from '@/lib/content';
import { CMS_TAGS, cmsRead } from './cache';

/** The numbered steps on /process and the homepage. */
export const getProcessSteps = cmsRead<ProcessStep[]>({
  key: 'process',
  tag: CMS_TAGS.editorial,
  fallback: () => DEFAULT_PROCESS,
  load: async () => {
    const rows = await prisma.processStep.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) return null;
    return rows.map((r): ProcessStep => ({ num: r.num, title: r.title, body: r.body }));
  },
});

/** Client quotes. Placeholder entries stay excluded from review structured data. */
export const getTestimonials = cmsRead<Testimonial[]>({
  key: 'testimonials',
  tag: CMS_TAGS.editorial,
  fallback: () => DEFAULT_TESTIMONIALS,
  load: async () => {
    const rows = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) return null;
    return rows.map(
      (r): Testimonial => ({
        quote: r.quote,
        author: r.author,
        meta: r.meta,
        rating: Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5,
        placeholder: r.placeholder,
      }),
    );
  },
});

/** Questions on /faq, also emitted as FAQPage JSON-LD. */
export const getFaqs = cmsRead<Faq[]>({
  key: 'faqs',
  tag: CMS_TAGS.editorial,
  fallback: () => DEFAULT_FAQS,
  load: async () => {
    const rows = await prisma.faq.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) return null;
    return rows.map((r): Faq => ({ question: r.question, answer: r.answer }));
  },
});

/** Trust badges under the hero. */
export const getAssurances = cmsRead<Assurance[]>({
  key: 'assurances',
  tag: CMS_TAGS.editorial,
  fallback: () => DEFAULT_ASSURANCES,
  load: async () => {
    const rows = await prisma.assurance.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) return null;
    return rows.map((r): Assurance => ({ title: r.title, body: r.body }));
  },
});

/* ── Admin reads (uncached, include unpublished) ───────────────────────────*/

// No `listProcessForAdmin`: the order process is not editable from /admin.
// `getProcess()` above still reads the same table for the public pages.
export const listTestimonialsForAdmin = () =>
  prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } });
export const listFaqsForAdmin = () => prisma.faq.findMany({ orderBy: { sortOrder: 'asc' } });
export const listAssurancesForAdmin = () =>
  prisma.assurance.findMany({ orderBy: { sortOrder: 'asc' } });
