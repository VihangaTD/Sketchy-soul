'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Testimonial } from '@/lib/content';
import { gridColumns } from '@/lib/layout';

/**
 * Client quotes. Swipeable, rotating reviews with adaptive height on mobile.
 *
 * ⚠️ Quotes flagged `placeholder` at /admin/testimonials are intentionally
 * left OUT of the review structured data until they are replaced with real,
 * attributable client reviews.
 */
export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const lastInteraction = useRef(0);
  const [active, setActive] = useState(0);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const card = rail.current?.children[active];
    if (!(card instanceof HTMLElement)) return;
    const measure = () => setHeight(card.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [active, testimonials]);

  useEffect(() => {
    if (testimonials.length < 2) return;
    const timer = window.setInterval(() => {
      const container = rail.current;
      if (!container || paused.current || document.hidden ||
        Date.now() - lastInteraction.current < 4000 ||
        !window.matchMedia('(max-width: 1023px)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const current = Math.round(container.scrollLeft / container.clientWidth);
      const next = (current + 1) % testimonials.length;
      container.scrollTo({ left: next * container.clientWidth, behavior: 'smooth' });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Client reviews"
      onFocusCapture={(event) => {
        if (event.target.matches(':focus-visible')) paused.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) paused.current = false;
      }}
      onTouchStart={() => { paused.current = true; }}
      onTouchEnd={() => { paused.current = false; lastInteraction.current = Date.now(); }}
      onTouchCancel={() => { paused.current = false; lastInteraction.current = Date.now(); }}
    >
    <div
      ref={rail}
      style={{ '--review-height': height === undefined ? undefined : `${height}px` } as CSSProperties}
      onScroll={(event) => {
        const container = event.currentTarget;
        setActive(Math.max(0, Math.min(testimonials.length - 1,
          Math.round(container.scrollLeft / container.clientWidth))));
      }}
      tabIndex={testimonials.length > 1 ? 0 : undefined}
      aria-label="Swipe to browse client reviews"
      className={`no-scrollbar relative flex items-start snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain transition-[height] duration-300 motion-reduce:transition-none max-lg:h-[var(--review-height)] lg:grid lg:gap-12 lg:overflow-visible ${gridColumns(testimonials.length, 3)}`}
    >
      {testimonials.map((t, i) => (
        <figure
          key={i}
          className="min-w-0 w-full shrink-0 snap-center px-2 text-center lg:w-auto lg:px-0"
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
          {testimonials.length > 1 ? (
            <p className="mt-1 text-[12px] text-grey lg:hidden">Swipe to explore reviews</p>
          ) : null}
        </figure>
      ))}
    </div>
    </div>
  );
}
