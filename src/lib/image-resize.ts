/**
 * Browser-side photo optimisation, run before anything is uploaded.
 *
 * Why it exists:
 *   • A modern phone photo is 4–12 MB. Serverless request bodies cap at
 *     ~4.5 MB, so the upload would simply fail.
 *   • On a slow mobile connection an unoptimised upload is the difference
 *     between a 3-second wait and a 90-second one — which is the difference
 *     between a completed order and an abandoned one.
 *   • 2400px on the long edge is still far more detail than a graphite
 *     drawing can resolve, so nothing useful is lost.
 *
 * HEIC (iPhone) files are attempted like any other: Safari decodes them, and
 * any browser that cannot simply throws and the original is sent through
 * untouched.
 */

const MAX_EDGE = 2400;
const QUALITY = 0.86;
/** Anything under this is already small enough to send as-is. */
const SKIP_UNDER_BYTES = 900 * 1024;

export async function optimiseImage(file: File): Promise<File> {
  if (file.size <= SKIP_UNDER_BYTES) return file;
  if (!file.type.startsWith('image/')) return file;
  if (typeof document === 'undefined') return file;

  // HEIC is not skipped up front any more. Safari — which is where almost
  // every HEIC actually comes from, because it is the iPhone default — can
  // decode it perfectly well, and refusing to try meant a 4 MB iPhone photo
  // was sent at full size and bounced off the upload limit. Browsers that
  // cannot decode it throw, and the catch below returns the original exactly
  // as before, so nothing regresses for them.
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Already small in dimensions but heavy in bytes → still worth re-encoding.
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );

    if (!blob || blob.size >= file.size) return file; // no win — keep the original

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // Any decoding problem → send the original and let the server decide.
    return file;
  }
}

export function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
