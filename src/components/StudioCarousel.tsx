'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SketchPortrait } from './SketchPortrait';
import type { StudioSlide } from '@/lib/portfolio';

/**
 * The "From the Studio" carousel: Single · Couple · Family · Pets.
 *
 * Three artworks are on screen at once on desktop (two on tablet, one plus a
 * peek on a phone). An arrow sits on either side of the artwork, level with
 * the middle of the drawing, and steps the rail one card left or right —
 * wrapping around at each end so neither arrow is ever dead.
 *
 * Under the hood this is a native scroll-snap rail rather than a transformed
 * track: swipe, momentum and keyboard scrolling come for free, every card
 * stays in the server-rendered HTML, and nothing depends on JavaScript to be
 * readable. Autoplay is gentle and stops the moment anyone interacts with it,
 * when the tab is hidden, or when the visitor prefers reduced motion.
 *
 * No sizes or prices are shown here by design — this section sells the idea,
 * /packages sells the specifics.
 */

/**
 * Intrinsic pixels of every studio scan. All slides are cropped to 4:5 (the
 * media library enforces nothing, so keep uploads consistent), and passing
 * real width/height instead of `fill` puts the
 * dimensions in the markup: the browser reserves the exact box before a single
 * byte arrives — zero layout shift, which Core Web Vitals scores directly —
 * and Google Images gets the true resolution of the artwork.
 */
const ART_WIDTH = 900;
const ART_HEIGHT = 1125;

/**
 * The widest a card ever gets: the 1200px shell minus its 48px gutters leaves
 * 1104px, split three ways with two 24px gaps → 352px. Below `lg` a card is a
 * share of the viewport instead. Getting this string right is the whole game —
 * it is what stops a phone downloading a desktop-sized image, and Next uses it
 * to build the srcset (352px resolves to the 384w and 768w renditions).
 */
const IMAGE_SIZES = '(max-width: 639px) 80vw, (max-width: 1023px) 46vw, 352px';

/**
 * How wide a card is, and how tall the arrow overlay must be to sit on the
 * vertical middle of the artwork.
 *
 * Slides are added and removed in the admin, so neither can be fixed at
 * three-up any more: two slides in thirds would leave a third of the rail
 * empty. The overlay ratio is rail width ÷ frame height at each breakpoint —
 * a frame is 5/4 of a card, so a full-width card gives 4/5, a half-width card
 * 8/5, and a third-width card 5/2.
 */
const LAYOUTS = {
  1: {
    card: 'w-full',
    overlay: 'aspect-[4/5]',
  },
  2: {
    card: 'w-[78%] sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-1.5rem)/2)]',
    overlay: 'aspect-[40/39] sm:aspect-[18/11] lg:aspect-[8/5]',
  },
  3: {
    card: 'w-[78%] sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)]',
    overlay: 'aspect-[40/39] sm:aspect-[18/11] lg:aspect-[5/2]',
  },
} as const;

export function StudioCarousel({ slides }: { slides: StudioSlide[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const layout = LAYOUTS[Math.min(slides.length, 3) as 1 | 2 | 3] ?? LAYOUTS[3];
  // Nothing scrolls with a single slide, so the arrows would be dead controls.
  const scrollable = slides.length > 1;
  const [paused, setPaused] = useState(false);
  // Server-renders with the desktop view (three cards); the observer below
  // corrects it on mount, so there is nothing for hydration to disagree about.
  const [onScreen, setOnScreen] = useState<boolean[]>(() => slides.map((_, i) => i < 3));

  // Which cards are actually in view — drives the label chips and the
  // announcement for screen readers, at every breakpoint, for free.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const cards = Array.from(rail.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        setOnScreen((prev) => {
          const next = [...prev];
          for (const entry of entries) {
            const i = cards.indexOf(entry.target as HTMLElement);
            if (i >= 0) next[i] = entry.isIntersecting;
          }
          return next;
        });
      },
      // 0.9 rather than 1 — a fractional pixel should not count as clipped.
      { root: rail, threshold: 0.9 },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [slides.length]);

  /** Width of one card plus the gap after it, read from the live layout. */
  const cardStep = useCallback(() => {
    const rail = railRef.current;
    const first = rail?.firstElementChild as HTMLElement | null;
    if (!rail || !first) return 0;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const move = useCallback(
    (direction: 1 | -1) => {
      const rail = railRef.current;
      if (!rail) return;

      // 2px of slack — snapped scroll offsets are routinely fractional.
      const atStart = rail.scrollLeft <= 2;
      const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;

      // Wrap at both ends. `scrollWidth` is past the maximum, so the browser
      // clamps it to "as far right as this rail goes".
      const left =
        direction === 1
          ? atEnd
            ? 0
            : rail.scrollLeft + cardStep()
          : atStart
            ? rail.scrollWidth
            : rail.scrollLeft - cardStep();

      rail.scrollTo({ left, behavior: 'smooth' });
    },
    [cardStep],
  );

  // Autoplay — stops permanently once the visitor takes control.
  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => move(1), 6000);
    return () => window.clearInterval(id);
  }, [paused, slides.length, move]);

  useEffect(() => {
    const onVisibility = () => document.hidden && setPaused(true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const take = (direction: 1 | -1) => {
    setPaused(true);
    move(direction);
  };

  /**
   * Jumps straight to one card — what the dots under the rail do on a phone.
   *
   * `scrollIntoView` rather than a computed `scrollLeft` because it honours
   * `scroll-padding`, so the card lands against the page gutter and not
   * against the edge of the screen.
   */
  const goTo = (index: number) => {
    setPaused(true);
    const card = railRef.current?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  const shown = slides.filter((_, i) => onScreen[i]);

  return (
    <div
      className="relative"
      role="group"
      aria-roledescription="carousel"
      aria-label="Kinds of portrait"
      onMouseEnter={() => setPaused(true)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          take(1);
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          take(-1);
        }
      }}
    >
      {/* ── Rail ───────────────────────────────────────────────────────────
          Three up on lg, two on sm, one with a peek on phones. The negative
          margins let the cards run to the screen edges below lg while their
          first card still lines up with the shell gutter.

          `scroll-pl-*` has to match that padding. A snap point is measured
          from the scrollport, which *includes* the padding — so without it
          every card after the first snaps flush against the edge of the
          screen instead of the gutter, and the rail looks a gutter-width
          out of true for the rest of the section. */}
      <div
        ref={railRef}
        // A scrollable region must be reachable by keyboard (WCAG 2.1.1); the
        // group role is what gives the focused rail an announced name.
        tabIndex={0}
        role="group"
        aria-label="Portrait categories"
        onPointerDown={() => setPaused(true)}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5
                   scroll-pl-5 sm:-mx-8 sm:scroll-pl-8 sm:px-8 lg:mx-0 lg:gap-6
                   lg:scroll-pl-0 lg:px-0"
      >
        {slides.map((slide) => (
          <figure key={slide.id} className={`shrink-0 snap-start ${layout.card}`}>
            <div className="frame frame-hover aspect-[4/5]">
              {slide.imageUrl ? (
                <Image
                  src={slide.imageUrl}
                  alt={slide.imageAlt}
                  width={ART_WIDTH}
                  height={ART_HEIGHT}
                  sizes={IMAGE_SIZES}
                  // The section sits well below the fold — lazy loading here
                  // leaves the hero's LCP budget alone.
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <SketchPortrait variant={slide.sketch} className="h-[46%] w-[46%] opacity-90" />
              )}
            </div>

            {/* Real text under real artwork: indexable, and it survives the
                image failing to load in a way an overlay caption does not. */}
            <figcaption className="mt-3.5 text-center">
              <h3 className="font-serif text-[19px] leading-none text-ivory sm:text-[21px]">
                {slide.label}
              </h3>
              <p className="mx-auto mt-2 max-w-[30ch] text-[11.5px] leading-relaxed text-grey">
                {slide.blurb}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────
          One arrow on each side, sitting on the vertical middle of the
          artwork. The wrapper takes the height of a card's frame rather than
          the whole card, so "middle" means the middle of the drawing and not
          the middle of the drawing-plus-caption. Its ratio is rail width ÷
          frame height at each breakpoint: a card is 78% / (100%-1.25rem)/2 /
          (100%-3rem)/3 of the rail, and a frame is 5/4 of a card.

          Phones get the dots below instead. A 44px arrow on a 260px card
          covers a sixth of the drawing, and a touch screen already has a
          better gesture for this than a button someone has to aim at. */}
      {scrollable ? (
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 hidden sm:block ${layout.overlay}`}
        >
          <ArrowButton side="left" label="Previous portraits" onClick={() => take(-1)} />
          <ArrowButton side="right" label="Next portraits" onClick={() => take(1)} />
        </div>
      ) : null}

      {/* Position, and the only visible sign on a phone that the rail moves.
          Tappable, because a dot that cannot be pressed is a decoration people
          will press anyway. */}
      {scrollable ? (
        <div className="mt-4 flex justify-center sm:hidden">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show ${slide.label}`}
              aria-current={onScreen[i] ? 'true' : undefined}
              // The dot is 6px; the button around it is 24px so it can
              // actually be hit with a thumb.
              className="flex h-6 items-center px-1.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  onScreen[i] ? 'w-6 bg-gold' : 'w-1.5 bg-grey/40'
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* Announced to screen readers, invisible to everyone else */}
      <p className="sr-only" aria-live="polite">
        Showing {shown.map((s) => s.label).join(', ') || 'no'} — {shown.length} of{' '}
        {slides.length} portrait categories.
      </p>

      <p className="mt-5 text-center text-[12px] leading-relaxed text-grey">
        Every piece is drawn by hand from a client photograph.{' '}
        <Link href="/gallery" className="text-gold-soft underline-offset-4 hover:underline">
          See the full gallery
        </Link>
      </p>
    </div>
  );
}

/**
 * A round arrow sitting on the edge of the artwork. It needs its own backdrop
 * because it lands on top of a drawing rather than on the page background —
 * a bare outline would disappear over the lighter passages of a portrait.
 */
function ArrowButton({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`pointer-events-auto absolute top-1/2 flex h-11 w-11 -translate-y-1/2
                  items-center justify-center rounded-full border border-hairline
                  bg-black/55 text-ivory backdrop-blur-sm transition-colors duration-200
                  hover:border-gold/60 hover:bg-black/80 hover:text-gold-soft
                  ${side === 'left' ? 'left-2 sm:left-3' : 'right-2 sm:right-3'}`}
    >
      <Arrow className={side === 'left' ? 'rotate-180' : ''} />
    </button>
  );
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
    >
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
