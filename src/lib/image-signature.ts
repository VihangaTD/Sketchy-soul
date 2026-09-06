/**
 * Content-based image detection.
 *
 * `/api/upload` is public and unauthenticated by necessity — a customer has to
 * be able to attach a photo before they have any account. Its only check used
 * to be `file.type`, which is a string the browser sends and anything can set:
 * a request declaring `image/jpeg` while carrying a zip, an HTML page or a
 * script was accepted and pushed straight into the studio's Cloudinary
 * library, where the URL is public and permanent.
 *
 * Reading the first bytes off the file settles it, because these signatures
 * come from the file itself rather than from the request. A mismatch between
 * the claimed type and the real one is rejected outright.
 */

/** Bytes needed to identify every format below. */
const HEADER_BYTES = 16;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

/** ISO-BMFF brands that mean "this is a HEIF/HEIC still image". */
const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
]);

export type DetectedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

/**
 * The real format of `bytes`, or null when it is not an image we accept.
 * HEIC and HEIF share a container and are reported as `image/heic`.
 */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length < 12) return null;

  // JPEG — SOI marker.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';

  // PNG — 8-byte signature.
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';

  // WebP — a RIFF container whose form type is "WEBP".
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';

  // HEIC/HEIF — an ISO base media file whose major brand is a still-image one.
  if (ascii(bytes, 4, 4) === 'ftyp' && HEIF_BRANDS.has(ascii(bytes, 8, 4))) return 'image/heic';

  return null;
}

/**
 * Reads just the header of an upload and reports what it actually is.
 * Only the first {@link HEADER_BYTES} bytes are pulled into memory, so this is
 * cheap even for a 10 MB photo.
 */
export async function sniffImageType(file: File): Promise<DetectedImageType | null> {
  const header = await file.slice(0, HEADER_BYTES).arrayBuffer();
  return detectImageType(new Uint8Array(header));
}

/** Groups the interchangeable HEIC/HEIF labels so a claim can be compared. */
function normalise(type: string): string {
  const lower = type.toLowerCase().split(';')[0].trim();
  return lower === 'image/heif' ? 'image/heic' : lower;
}

/**
 * True when the browser's claimed type agrees with the bytes on disk.
 * A claim of `image/jpg` (not a real MIME type, but common) is treated as JPEG.
 */
export function matchesClaim(detected: DetectedImageType, claimed: string): boolean {
  const claim = normalise(claimed) === 'image/jpg' ? 'image/jpeg' : normalise(claimed);
  return claim === detected;
}
