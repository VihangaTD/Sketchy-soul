'use client';

import { useEffect, useRef, useState } from 'react';

export interface PickableAsset {
  id: string;
  url: string;
  name: string;
  alt: string;
  folder: string;
}

/**
 * Picks an image from the media library for one slot (a gallery piece, a
 * carousel slide, a package card).
 *
 * It owns two form values: the chosen URL and its alt text. Choosing an image
 * copies that image's library description into the alt box when the box is
 * still empty, so the common case needs no typing — but the text stays
 * editable, because the right description depends on where the image is used.
 *
 * With no image chosen the slot falls back to the built-in gold line drawing,
 * which is why "Remove" is never destructive.
 */
export function MediaPicker({
  name,
  altName,
  assets,
  defaultUrl,
  defaultAlt,
  /** Pre-filters the grid; the artist can still switch to "All". */
  preferredFolder,
}: {
  name: string;
  altName: string;
  assets: PickableAsset[];
  defaultUrl?: string | null;
  defaultAlt?: string | null;
  preferredFolder?: string;
}) {
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [alt, setAlt] = useState(defaultAlt ?? '');
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Start on the folder this slot expects — but only if there is anything in
  // it. Opening a picker onto "Nothing in this folder" while the library is
  // full reads as a broken picker, and the fix ("click All") is invisible.
  const [folder, setFolder] = useState(
    preferredFolder && assets.some((a) => a.folder === preferredFolder)
      ? preferredFolder
      : 'all',
  );

  /**
   * Modal behaviour to match the `aria-modal` it already claimed.
   *
   * Escape closed it, but that was all: the page scrolled underneath, and Tab
   * walked out of the picker and on through the form behind it — an editor
   * full of inputs the user could not see, with no way back. This traps the
   * keyboard for as long as the picker is open and returns focus to the button
   * that opened it.
   */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);

    // Land on the close button rather than the first thumbnail, so the way out
    // is the first thing announced.
    closeRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const shown = folder === 'all' ? assets : assets.filter((a) => a.folder === folder);
  const folders = ['all', ...new Set(assets.map((a) => a.folder))];

  function choose(asset: PickableAsset) {
    setUrl(asset.url);
    // Only pre-fill; never overwrite a description already written here.
    if (!alt.trim()) setAlt(asset.alt);
    setOpen(false);
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />

      <div className="flex items-start gap-4">
        <div className="frame aspect-[4/5] w-[86px] shrink-0">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.12em] text-grey/60">
              Sketch
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn-ghost btn-sm"
              disabled={assets.length === 0}
            >
              {url ? 'Change photo' : 'Choose photo'}
            </button>
            {url ? (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="text-[11px] uppercase tracking-[0.12em] text-grey transition-colors hover:text-ivory"
              >
                Remove
              </button>
            ) : null}
          </div>

          {assets.length === 0 ? (
            <p className="mt-2 text-[11px] leading-snug text-grey/70">
              No images uploaded yet — add some under Photos.
            </p>
          ) : null}

          <label className="mt-3 block">
            <span className="field-label">Describe the image</span>
            <input
              type="text"
              name={altName}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              maxLength={300}
              placeholder="Hand-drawn graphite portrait of…"
              className="field"
            />
          </label>
        </div>
      </div>

      {/* ── Picker ──────────────────────────────────────────────────────────*/}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose an image"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/94 p-4 backdrop-blur-sm sm:p-8"
        >
          <div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-[2px] border border-hairline bg-charcoal p-5 sm:p-6"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-[20px] text-ivory">Choose an image</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-2xl leading-none text-grey transition-colors hover:text-ivory"
              >
                ×
              </button>
            </div>

            <div className="rail rail-bleed mb-5 justify-start gap-2">
              {folders.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFolder(value)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                    folder === value
                      ? 'border-gold bg-gold/10 text-gold-soft'
                      : 'border-hairline text-grey hover:text-ivory'
                  }`}
                >
                  {value === 'all' ? 'All' : value}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-grey">
                Nothing in this folder.
              </p>
            ) : (
              <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 lg:grid-cols-5">
                {shown.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => choose(asset)}
                    className={`group text-left ${asset.url === url ? 'ring-1 ring-gold' : ''}`}
                  >
                    <div className="frame aspect-[4/5]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.alt || asset.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-80"
                      />
                    </div>
                    <span className="mt-1.5 block truncate font-mono text-[10px] text-grey">
                      {asset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
