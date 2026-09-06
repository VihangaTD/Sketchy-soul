'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SketchPortrait } from './SketchPortrait';

export interface Slide {
  sketch: 1 | 2 | 3;
  /** Optional real artwork — /images/hero/your-file.webp */
  image?: string;
  alt?: string;
  caption?: string;
}

interface Props {
  slides: Slide[];
  /** ms between slides */
  interval?: number;
  className?: string;
}

/**
 * The fading hero slideshow from the concept, upgraded with tappable dots,
 * swipe support and an auto-advance timer that stops when the tab is hidden
 * or the visitor prefers reduced motion.
 */
export function Slideshow({ slides, interval = 5000, className = '' }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => setIndex(((next % slides.length) + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => window.clearInterval(id);
  }, [paused, interval, slides.length]);

  // Do not burn cycles animating a slideshow nobody is looking at.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Selected portrait work"
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-[1200ms] ease-studio"
          style={{
            opacity: i === index ? 1 : 0,
            backgroundImage:
              'repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px), linear-gradient(160deg, #232326, #101012 75%)',
          }}
        >
          {slide.image ? (
            <Image
              src={slide.image}
              alt={slide.alt ?? ''}
              fill
              sizes="(max-width: 768px) 100vw, 560px"
              // The first slide is the largest paint on the homepage.
              priority={i === 0}
              // Matches the mounted frames elsewhere: the artwork grows a
              // little on hover while the box stays put, so nothing on the
              // page moves. The wrapper clips the overflow.
              className="object-cover transition-transform duration-700 ease-studio group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <SketchPortrait variant={slide.sketch} className="h-[150px] w-[150px] sm:h-[220px] sm:w-[220px]" />
          )}
        </div>
      ))}

      {/* Only the first slide is a real element for screen readers. */}
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {slides.length}
        {slides[index]?.caption ? `: ${slides[index].caption}` : ''}
      </p>

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3.5 z-10 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              className="p-2"
            >
              <span
                className={`block h-1 w-1 rounded-full transition-all duration-300 ${
                  i === index ? 'w-4 bg-gold' : 'bg-white/25'
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
