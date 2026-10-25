'use client';

import { useCallback, useRef, useState } from 'react';
import { humanFileSize } from '@/lib/image-resize';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTOS, MAX_PHOTO_BYTES, type UploadedPhoto } from '@/lib/validation';
import { sniffImageType, matchesClaim } from '@/lib/image-signature';

interface Props {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  error?: string;
  driveRequired: boolean;
}

/** XHR exposes transmitted bytes, unlike fetch, for a real upload progress bar. */
function uploadWithProgress(url: string, method: 'POST' | 'PUT', body: File | FormData, onProgress: (fraction: number) => void, contentType?: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = 10 * 60_000;
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
    xhr.onerror = () => reject(new Error('Upload interrupted. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));
    xhr.send(body);
  });
}

/**
 * Drag-and-drop reference photo uploader.
 *
 * With Drive connected, originals go to Drive and optimised copies to Cloudinary. The
 * returned permanent URL is what gets attached to the order — so a customer
 * who abandons checkout and comes back later still has their photos.
 */
export function PhotoUploader({ photos, onChange, error, driveRequired }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replacementRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [percentage, setPercentage] = useState(0);
  // How many tiles are still being uploaded. Each one holds a
  // skeleton in the grid so the thumbnails do not jump into place at the end.
  const [pending, setPending] = useState(0);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      if (busy) return;

      const replacement = replacementRef.current;
      replacementRef.current = null;
      const basePhotos = replacement ? photos.filter((photo) => photo.pathname !== replacement) : photos;
      const incoming = Array.from(fileList);
      const room = replacement ? 1 : MAX_PHOTOS - photos.length;

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
      setPercentage(0);
      setLocalError(null);
      setPending(accepted.length);

      try {
        // One request per photo keeps each body small and lets a single
        // failure be retried without losing the others.
        const uploaded: UploadedPhoto[] = [];

        for (const [i, file] of accepted.entries()) {
          const report = (fraction: number) => setPercentage(Math.floor(((i + fraction) / accepted.length) * 100));
          if (file.size > MAX_PHOTO_BYTES) throw new Error(`"${file.name}" exceeds Cloudinary's 10 MB image limit. Please choose a file within that limit.`);
          const detected = await sniffImageType(file);
          if (!detected || (file.type && !matchesClaim(detected, file.type))) throw new Error(`"${file.name}" is not a supported image file.`);
          setProgress(`Preparing ${i + 1} of ${accepted.length}…`);

          setProgress(`Uploading ${i + 1} of ${accepted.length}…`);
          const body = new FormData();
          const signing = await fetch('/api/upload/sign', { method: 'POST' });
          const signed = await signing.json();
          if (!signing.ok) throw new Error(signed.error ?? 'Could not prepare upload.');
          if (driveRequired && !signed.driveEnabled) throw new Error('Original photo storage is temporarily unavailable. Please refresh and try again.');
          let original: Pick<UploadedPhoto, 'originalDriveId' | 'originalDriveReceipt'> = {};
          if (signed.driveEnabled) {
            const start = await fetch('/api/upload/drive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', name: file.name, size: file.size, contentType: file.type || detected }) });
            const session = await start.json();
            if (!start.ok) throw new Error(session.error ?? 'Could not prepare original photo storage.');
            const saved = await uploadWithProgress(session.uploadUrl, 'PUT', file, (fraction) => report(fraction * 0.45), file.type || detected);
            const savedFile = await saved.json().catch(() => ({}));
            if (!saved.ok || !savedFile.id) throw new Error('Could not upload your original photo. Please try again.');
            const finished = await fetch('/api/upload/drive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finish', id: savedFile.id, ticket: session.ticket }) });
            const receipt = await finished.json();
            if (!finished.ok) throw new Error(receipt.error ?? 'Could not verify your original photo.');
            original = receipt;
            report(0.5);
          }
          if (signed.local) {
            body.append('files', file);
            const res = await uploadWithProgress('/api/upload', 'POST', body, (fraction) => report(fraction * 0.95));
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? 'Upload failed.');
            uploaded.push(...(data.photos as UploadedPhoto[]));
          } else {
            body.append('file', file);
            for (const [key, value] of Object.entries(signed.params)) body.append(key, String(value));
            body.append('api_key', signed.apiKey);
            body.append('signature', signed.signature);
            const res = await uploadWithProgress(signed.endpoint, 'POST', body, (fraction) => report(signed.driveEnabled ? 0.5 + fraction * 0.45 : fraction * 0.95));
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.secure_url || !data.public_id) throw new Error(data.error?.message ?? 'Upload failed.');
            uploaded.push({ url: data.secure_url, pathname: data.public_id, name: file.name, size: data.bytes, contentType: data.format === 'jpg' ? 'image/jpeg' : file.type || `image/${data.format}`, ...original });
          }
          onChange([...basePhotos, ...uploaded]);
          report(1);
          setPending(accepted.length - i - 1);
        }

      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
      } finally {
        setBusy(false);
        setPending(0);
        setProgress('');
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [photos, onChange, driveRequired, busy],
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
          disabled={busy}
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
          Up to 10 MB per photo. Your original photo is preserved for the artist.
        </p>

      </div>

      {busy ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-grey">
            <span role="status">{percentage % 100 >= 95 ? 'Finishing upload…' : 'Uploading photos…'}</span>
            <span className="font-mono tabular-nums text-gold-soft">{percentage}%</span>
          </div>
          <div role="progressbar" aria-label="Photo upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}
            className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
          </div>
          <p className="text-[11px] text-grey">Keep this page open until your photos finish uploading.</p>
        </div>
      ) : null}

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
              {driveRequired && (!photo.originalDriveId || !photo.originalDriveReceipt) ? (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-[#e08b84]">Original needs uploading</p>
                  <button type="button" disabled={busy} onClick={() => {
                    replacementRef.current = photo.pathname;
                    inputRef.current?.click();
                  }} className="w-full rounded border border-gold/40 px-2 py-2 text-[11px] text-gold-soft hover:bg-gold/10 disabled:opacity-50">Upload original again</button>
                </div>
              ) : null}
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
