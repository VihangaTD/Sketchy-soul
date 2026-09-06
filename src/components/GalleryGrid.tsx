'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArtFrame } from './ArtFrame';
import { SketchPortrait } from './SketchPortrait';
import {
  CATEGORIES,
  portfolioByCategory,
  type PortfolioCategory,
  type PortfolioPiece,
} from '@/lib/portfolio';

/**
 * Filterable gallery with a lightbox.
 *
 * Filtering happens in the browser over data that is already in the static
 * HTML — no request, no spinner, and every piece stays crawlable by Google
 * because all of them are server-rendered before any filter is applied.
 */
export function GalleryGrid({ pieces: allPieces }: { pieces: PortfolioPiece[] }) {
  const [active, setActive] = useState<PortfolioCategory | 'all'>('all');
  const [lightbox, setLightbox] = useState<PortfolioPiece | null>(null);

  const pieces = useMemo(
    () => portfolioByCategory(allPieces, active),
    [allPieces, active],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightbox]);

  return (
    <>
      {/* Filters — a scrollable rail on phones so nothing wraps awkwardly. */}
      <div className="rail rail-bleed mb-10 justify-start gap-2 sm:justify-center" role="tablist" aria-label="Filter artwork">
        {CATEGORIES.map((cat) => {
          const selected = active === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(cat.id)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors duration-200 ${
                selected
                  ? 'border-gold bg-gold/10 text-gold-soft'
                  : 'border-hairline text-grey hover:border-gold/40 hover:text-ivory'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3 lg:gap-9">
        {pieces.map((piece, i) => (
          <figure key={piece.slug} className="animate-riseIn">
            <button
              type="button"
              onClick={() => setLightbox(piece)}
              className="block w-full text-left"
              aria-label={`Open ${piece.title} larger`}
            >
              <ArtFrame
                src={piece.imageUrl ?? undefined}
                alt={piece.imageAlt ?? `${piece.title} — ${piece.medium}`}
                sketch={piece.sketch}
                ratio="aspect-[4/5]"
                sizes="(max-width: 640px) 46vw, (max-width: 1024px) 45vw, 30vw"
                priority={i < 2}
              />
            </button>
            <figcaption className="mt-2.5">
              {/* Physical dimensions are deliberately not shown here — the
                  gallery is about the work, /packages is where sizes belong. */}
              <span className="block font-serif text-[15px] text-ivory sm:text-[17px]">
                {piece.title}
              </span>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-grey/80">
                {piece.medium} · {piece.year}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      {pieces.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-grey">
          No pieces in this category yet — try another.
        </p>
      ) : null}

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/94 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center text-2xl text-grey transition-colors hover:text-ivory"
          >
            ×
          </button>

          <figure
            className="max-h-full w-full max-w-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="frame aspect-[4/5]">
              {lightbox.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lightbox.imageUrl}
                  alt={lightbox.imageAlt ?? lightbox.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <SketchPortrait variant={lightbox.sketch} className="h-1/2 w-1/2" />
              )}
            </div>

            <figcaption className="mt-5 text-center">
              <h2 className="font-serif text-[24px] text-ivory">{lightbox.title}</h2>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gold">
                {lightbox.medium} · {lightbox.year}
              </p>
              {lightbox.caption ? (
                <p className="mx-auto mt-3 max-w-[38ch] text-[13px] leading-relaxed text-grey">
                  {lightbox.caption}
                </p>
              ) : null}
              <Link href="/packages" className="btn-primary btn-sm mt-6">
                Order something like this
              </Link>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
