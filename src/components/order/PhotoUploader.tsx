'use client';

import { useCallback, useRef, useState } from 'react';
import { humanFileSize, optimiseImage } from '@/lib/image-resize';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTOS, type UploadedPhoto } from '@/lib/validation';

interface Props {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  error?: string;
}

/**
 * Drag-and-drop reference photo uploader.
 *
 * Each file is downscaled in the browser, uploaded to /api/upload, and the
 * returned permanent URL is what gets attached to the order — so a customer
 * who abandons checkout and comes back later still has their photos.
 */
export function PhotoUploader({ photos, onChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  // How many tiles are still being resized and uploaded. Each one holds a
  // skeleton in the grid so the thumbnails do not jump into place at the end.
  const [pending, setPending] = useState(0);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;

      const incoming = Array.from(fileList);
      const room = MAX_PHOTOS - photos.length;

      if (room <= 0) {
        setLocalError(`You can attach up to ${MAX_PHOTOS} photos.`);
        return;
      }

      const accepted = incoming.slice(0, room).filter((file) => {
        const ok =
          ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]) ||
          /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
        return ok;
      });

      if (accepted.length === 0) {
        setLocalError('Please choose JPEG, PNG, WebP or HEIC images.');
        return;
      }

      setBusy(true);
      setLocalError(null);
      setPending(accepted.length);

      try {
        // One request per photo keeps each body small and lets a single
        // failure be retried without losing the others.
        const uploaded: UploadedPhoto[] = [];

        for (const [i, file] of accepted.entries()) {
          setProgress(`Preparing ${i + 1} of ${accepted.length}…`);
          const optimised = await optimiseImage(file);

          setProgress(`Uploading ${i + 1} of ${accepted.length}…`);
          const body = new FormData();
          body.append('files', optimised);

          const res = await fetch('/api/upload', { method: 'POST', body });
          const data = await res.json().catch(() => ({}));

          if (!res.ok) throw new Error(data.error ?? 'Upload failed.');
          uploaded.push(...(data.photos as UploadedPhoto[]));
          setPending(accepted.length - i - 1);
        }

        onChange([...photos, ...uploaded]);
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
      } finally {
        setBusy(false);
        setPending(0);
        setProgress('');
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [photos, onChange],
  );

  const remove = (pathname: string) => onChange(photos.filter((p) => p.pathname !== pathname));
  const shown = localError ?? error;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`relative flex flex-col items-center justify-center rounded-[2px] border border-dashed px-6 py-10 text-center transition-colors duration-200 ${
          dragging
            ? 'border-gold bg-gold/5'
            : shown
              ? 'border-[#c2564f]'
              : 'border-hairline bg-[#121214]'
        }`}
      >
        <input
          ref={inputRef}
          id="photos"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
          disabled={busy || photos.length >= MAX_PHOTOS}
        />

        <svg viewBox="0 0 48 48" fill="none" className="mb-3 h-10 w-10" aria-hidden="true">
          <rect x="6" y="12" width="36" height="26" rx="2" stroke="#b8935a" strokeWidth="1.2" />
          <circle cx="17" cy="21" r="3" stroke="#d9bd8e" strokeWidth="1.2" />
          <path d="M9 34l10-9 7 6 6-5 7 8" stroke="#d9bd8e" strokeWidth="1.2" strokeLinecap="round" />
        </svg>

        <p className="font-serif text-[18px] text-ivory">
          {busy ? progress || 'Working…' : 'Drop your photo here'}
        </p>
        <p className="mt-1 text-[12px] text-grey">
          or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || photos.length >= MAX_PHOTOS}
            className="text-gold-soft underline underline-offset-4 disabled:opacity-40"
          >
            browse your files
          </button>
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-grey/80">
          Up to {MAX_PHOTOS} images · JPEG, PNG, WebP or HEIC
          <br />
          Photos are resized in your browser before upload, so this is quick
          even on mobile data.
        </p>

        {busy ? (
          <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
            <span className="block h-full w-1/3 animate-shimmer bg-gold" />
          </div>
        ) : null}
      </div>

      {shown ? (
        <p role="alert" className="error-text">
          {shown}
        </p>
      ) : null}

      {photos.length > 0 || pending > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.pathname} className="relative">
              <div className="frame aspect-square overflow-hidden">
                {/* Plain <img>: these are one-off customer uploads, so there is
                    nothing for the image optimiser to cache usefully. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(photo.pathname)}
                aria-label={`Remove ${photo.name}`}
                className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-charcoal text-[15px] text-grey transition-colors hover:border-gold hover:text-ivory"
              >
                ×
              </button>
              <p className="mt-1.5 truncate text-[10.5px] text-grey" title={photo.name}>
                {photo.name} · {humanFileSize(photo.size)}
              </p>
            </li>
          ))}

          {/* One placeholder per photo still in flight, so the grid grows to
              its final size now rather than shifting under the cursor as each
              upload lands. */}
          {Array.from({ length: pending }).map((_, i) => (
            <li key={`pending-${i}`}>
              <div className="skeleton aspect-square rounded-[2px]" />
              <p className="mt-1.5 text-[10.5px] text-grey">Uploading…</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
