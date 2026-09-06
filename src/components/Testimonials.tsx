import type { Testimonial } from '@/lib/content';
import { gridColumns } from '@/lib/layout';

/**
 * Client quotes. Single centred quote on phones (as in the concept), three
 * across on desktop.
 *
 * ⚠️ Quotes flagged `placeholder` at /admin/testimonials are intentionally
 * left OUT of the review structured data until they are replaced with real,
 * attributable client reviews.
 */
export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <div className={`grid gap-10 lg:gap-12 ${gridColumns(testimonials.length, 3)}`}>
      {testimonials.map((t, i) => (
        <figure
          key={i}
          className={`text-center ${i > 0 ? 'hidden lg:block' : ''}`}
        >
          <p className="stars mb-4" aria-label={`${t.rating} out of 5 stars`}>
            {'★'.repeat(t.rating)}
          </p>
          <blockquote className="mx-auto max-w-[34ch] font-serif text-[19px] italic leading-[1.5] text-ivory sm:text-[21px]">
            “{t.quote}”
          </blockquote>
          <figcaption className="mt-4 text-[11px] uppercase tracking-[0.15em] text-grey">
            {t.author}
            <span className="mx-2 text-gold">·</span>
            {t.meta}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
