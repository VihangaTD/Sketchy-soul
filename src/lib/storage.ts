import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  IMAGE STORAGE — CLOUDINARY                                              ║
 * ║                                                                          ║
 * ║  Every image on this site lives in Cloudinary: the artwork the studio    ║
 * ║  uploads at /admin/media, and the reference photos a customer attaches   ║
 * ║  to an order. Nothing is ever written into Postgres — the database only  ║
 * ║  keeps the URL Cloudinary hands back, which is why an order row is a few ║
 * ║  hundred bytes instead of a few megabytes.                               ║
 * ║                                                                          ║
 * ║  Two drivers, chosen automatically:                                      ║
 * ║                                                                          ║
 * ║   • CLOUDINARY_* are set  → Cloudinary (what production uses)            ║
 * ║   • they are not         → public/uploads on local disk, so you can      ║
 * ║                            develop without an account                    ║
 * ║                                                                          ║
 * ║  ⚠️ DEPLOY: the local driver CANNOT be used in production — serverless   ║
 * ║  filesystems are read-only and wiped between requests. `saveFile()`      ║
 * ║  refuses to fall back to disk there for exactly that reason.             ║
 * ║                                                                          ║
 * ║  No SDK. A signed upload is one multipart POST and one SHA-1, so the     ║
 * ║  whole driver is the file you are reading rather than a dependency to    ║
 * ║  keep current. Swapping to S3/R2 means rewriting only the two functions  ║
 * ║  marked below.                                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

export interface StoredFile {
  /** The public URL. This, and only this, is what the database stores. */
  url: string;
  /** Cloudinary public id (or the /uploads path locally) — needed to delete. */
  pathname: string;
  name: string;
  size: number;
  contentType: string;
  /** Cloudinary reports these; the local driver cannot, so they are optional. */
  width?: number;
  height?: number;
}

/** Strips directory traversal, spaces and anything exotic from a filename. */
export function safeFileName(name: string) {
  const ext = path.extname(name).toLowerCase().slice(0, 10) || '.jpg';
  const base = path
    .basename(name, path.extname(name))
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');

  return `${base || 'reference'}${ext}`;
}

export async function saveFile(
  file: File,
  /** Folder prefix, e.g. "orders/2026-08". Keeps the library browsable. */
  prefix: string,
): Promise<StoredFile> {
  const cleanName = safeFileName(file.name);

  if (isCloudinaryConfigured()) return uploadToCloudinary(file, prefix, cleanName);

  /* ── Local development driver ──────────────────────────────────────────── */
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'No image storage configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and ' +
        'CLOUDINARY_API_SECRET before deploying — serverless hosts cannot write to the ' +
        'local filesystem.',
    );
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', prefix);
  await mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}-${cleanName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), bytes);

  return {
    url: `/uploads/${prefix}/${fileName}`,
    pathname: `${prefix}/${fileName}`,
    name: cleanName,
    size: file.size,
    contentType: file.type || 'application/octet-stream',
  };
}

/**
 * Removes a stored image. Used by the media library, never by orders — a
 * customer's reference photo is evidence of what was commissioned and stays
 * for as long as the order does.
 *
 * Never throws: the database row is what the admin sees, so a deletion that
 * leaves an orphaned object behind is far better than one that fails halfway
 * and leaves a row pointing at nothing.
 */
export async function deleteFile(publicIdOrUrl: string): Promise<void> {
  try {
    if (isCloudinaryConfigured() && !publicIdOrUrl.startsWith('/uploads/')) {
      await destroyOnCloudinary(cloudinaryPublicId(publicIdOrUrl));
      return;
    }

    // Local driver — only ever touches files under public/uploads.
    const relative = publicIdOrUrl.replace(/^\/uploads\//, '');
    if (relative.includes('..')) return;
    await unlink(path.join(process.cwd(), 'public', 'uploads', relative));
  } catch (error) {
    console.error('[storage] Could not delete', publicIdOrUrl, error);
  }
}

/* ── Cloudinary ──────────────────────────────────────────────────────────── */

const API_BASE = 'https://api.cloudinary.com/v1_1';

function credentials() {
  return {
    cloud: process.env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    apiSecret: process.env.CLOUDINARY_API_SECRET as string,
  };
}

/**
 * Cloudinary's request signature: the signable parameters sorted by name,
 * joined as a query string, with the API secret appended, hashed with SHA-1.
 *
 * `file`, `api_key` and `signature` itself are excluded — passing them in here
 * is the usual reason a signed upload comes back 401.
 */
function sign(params: Record<string, string>, apiSecret: string) {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(canonical + apiSecret).digest('hex');
}

async function uploadToCloudinary(
  file: File,
  prefix: string,
  cleanName: string,
): Promise<StoredFile> {
  const { cloud, apiKey, apiSecret } = credentials();

  // Cloudinary appends the format itself, so the public id carries no
  // extension. The random segment stops one customer guessing another
  // customer's photo URL.
  const publicId = `${randomUUID()}-${cleanName.replace(/\.[^.]+$/, '')}`;
  const signed = {
    folder: prefix,
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  const body = new FormData();
  body.append('file', file);
  body.append('api_key', apiKey);
  for (const [key, value] of Object.entries(signed)) body.append(key, value);
  body.append('signature', sign(signed, apiSecret));

  const res = await fetch(`${API_BASE}/${cloud}/image/upload`, {
    method: 'POST',
    body,
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    width?: number;
    height?: number;
    error?: { message?: string };
  };

  if (!res.ok || !data.secure_url || !data.public_id) {
    throw new Error(
      `Cloudinary upload failed (${res.status}): ${data.error?.message ?? 'no secure_url returned'}`,
    );
  }

  return {
    url: data.secure_url,
    pathname: data.public_id,
    name: cleanName,
    size: typeof data.bytes === 'number' ? data.bytes : file.size,
    contentType: file.type || 'application/octet-stream',
    width: data.width,
    height: data.height,
  };
}

async function destroyOnCloudinary(publicId: string) {
  const { cloud, apiKey, apiSecret } = credentials();
  const signed = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };

  const body = new FormData();
  body.append('api_key', apiKey);
  for (const [key, value] of Object.entries(signed)) body.append(key, value);
  body.append('signature', sign(signed, apiSecret));

  const res = await fetch(`${API_BASE}/${cloud}/image/destroy`, {
    method: 'POST',
    body,
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => ({}))) as { result?: string };

  // "not found" is not an error worth surfacing: it means the object is
  // already gone, which is the state we were asking for. Images uploaded
  // before the move to Cloudinary land here too.
  if (data.result !== 'ok' && data.result !== 'not found') {
    throw new Error(`Cloudinary destroy returned "${data.result ?? res.status}"`);
  }
}

/**
 * The public id for a stored image.
 *
 * `MediaAsset.pathname` already holds one, but older rows were written when
 * this file talked to a different provider and hold a URL instead — so a
 * delivery URL is accepted and reduced:
 *
 *   https://res.cloudinary.com/demo/image/upload/v1712345678/site/gallery/abc.jpg
 *                                               └─ dropped ─┘└── public id ──┘
 */
export function cloudinaryPublicId(value: string) {
  if (!/^https?:\/\//.test(value)) return value;

  const afterUpload = value.split('/upload/')[1];
  if (!afterUpload) return value;

  return afterUpload
    .replace(/^v\d+\//, '') // version segment
    .replace(/\?.*$/, '') // query string
    .replace(/\.[^./]+$/, ''); // format extension
}
