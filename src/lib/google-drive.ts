import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { MAX_PHOTO_BYTES, type UploadedPhoto } from './validation';

export const isDriveConfigured = () => Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN && process.env.GOOGLE_DRIVE_FOLDER_ID);
const api = 'https://www.googleapis.com/drive/v3/files';
export class OriginalPhotoError extends Error {}
function auth() {
  if (!isDriveConfigured()) throw new Error('Google Drive is not connected.');
  const client = new OAuth2Client(process.env.GOOGLE_DRIVE_CLIENT_ID, process.env.GOOGLE_DRIVE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
  return client;
}
async function driveFetch(url: string, init: RequestInit = {}) {
  const token = (await auth().getAccessToken()).token;
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers }, cache: 'no-store', signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Google Drive request failed (${res.status}). Check authorization and available storage.`);
  return res;
}
function seal(value: object) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', process.env.GOOGLE_DRIVE_CLIENT_SECRET!).update(payload).digest('hex')}`;
}
function unseal<T>(value: string): T {
  const [payload, signature = ''] = value.split('.');
  const expected = createHmac('sha256', process.env.GOOGLE_DRIVE_CLIENT_SECRET!).update(payload).digest();
  const received = Buffer.from(signature, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error('Invalid original photo receipt. Please upload the photo again.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as T;
}

export async function startOriginalUpload(name: string, size: number, contentType: string, origin: string) {
  const nonce = randomUUID();
  const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': contentType, 'X-Upload-Content-Length': String(size), Origin: origin },
    body: JSON.stringify({ name, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], appProperties: { sketchySoulUpload: nonce } }),
  });
  const uploadUrl = res.headers.get('location');
  if (!uploadUrl) throw new Error('Google Drive did not return an upload session.');
  return { uploadUrl, ticket: seal({ nonce, size, createdAt: Date.now() }) };
}

type DriveFile = { id: string; name: string; size: string; mimeType: string; parents?: string[]; trashed?: boolean; appProperties?: Record<string, string> };
async function readFile(id: string): Promise<DriveFile> {
  return (await driveFetch(`${api}/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id,name,size,mimeType,parents,trashed,appProperties`)).json();
}
export async function finishOriginalUpload(id: string, ticket: string) {
  const proof = unseal<{ nonce: string; size: number; createdAt: number }>(ticket);
  if (Date.now() - proof.createdAt > 60 * 60_000) throw new Error('Upload session expired. Please upload again.');
  const file = await readFile(id);
  if (file.trashed || file.appProperties?.sketchySoulUpload !== proof.nonce || Number(file.size) !== proof.size || Number(file.size) > MAX_PHOTO_BYTES || !file.mimeType.startsWith('image/') || !file.parents?.includes(process.env.GOOGLE_DRIVE_FOLDER_ID!)) throw new Error('The original photo could not be verified.');
  return { originalDriveId: id, originalDriveReceipt: seal({ id, nonce: proof.nonce }) };
}

/** Originals remain private. Reused draft photos are copied so older order folders stay intact. */
export async function fileOrderOriginals(reference: string, photos: UploadedPhoto[]): Promise<UploadedPhoto[]> {
  if (!isDriveConfigured()) return photos;
  const verified = await Promise.all(photos.map(async (photo) => {
    if (!photo.originalDriveId || !photo.originalDriveReceipt) throw new OriginalPhotoError('These photos were uploaded before original-photo storage was connected. Remove them and upload them again before continuing to payment.');
    let proof: { id: string; nonce: string };
    try {
      proof = unseal<{ id: string; nonce: string }>(photo.originalDriveReceipt);
    } catch {
      throw new OriginalPhotoError('Your photo upload verification has expired or changed. Remove the photos and upload them again.');
    }
    if (proof.id !== photo.originalDriveId) throw new OriginalPhotoError('Please remove and re-upload your reference photos.');
    const file = await readFile(proof.id);
    if (file.trashed || file.appProperties?.sketchySoulUpload !== proof.nonce) throw new OriginalPhotoError('Original photo is unavailable. Please remove it and upload it again.');
    return { photo, file };
  }));
  const folder = await (await driveFetch(`${api}?supportsAllDrives=true&fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: reference, mimeType: 'application/vnd.google-apps.folder', parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] }) })).json() as { id: string };
  const filed: UploadedPhoto[] = [];
  for (const { photo, file } of verified) {
    let id = file.id;
    if (file.parents?.includes(process.env.GOOGLE_DRIVE_FOLDER_ID!)) {
      await driveFetch(`${api}/${encodeURIComponent(id)}?supportsAllDrives=true&addParents=${encodeURIComponent(folder.id)}&removeParents=${encodeURIComponent(process.env.GOOGLE_DRIVE_FOLDER_ID!)}&fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    } else {
      const copied = await (await driveFetch(`${api}/${encodeURIComponent(id)}/copy?supportsAllDrives=true&fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parents: [folder.id], name: file.name }) })).json() as { id: string };
      id = copied.id;
    }
    filed.push({ ...photo, originalDriveId: id, originalDriveReceipt: seal({ id, nonce: file.appProperties!.sketchySoulUpload }) });
  }
  return filed;
}
