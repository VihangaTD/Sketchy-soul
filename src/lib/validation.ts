import { z } from 'zod';
import type { PricingCatalogue } from './packages';

/**
 * One schema, used in two places:
 *   • the browser, to show inline errors before the visitor submits
 *   • the API route, which re-validates because the browser cannot be trusted
 *
 * Anything that reaches the database or a payment provider has been through
 * this file first.
 *
 * The order schema is built per request from the live catalogue, because the
 * set of valid package and add-on ids changes whenever the artist edits
 * /admin/packages. The API route builds its own from a catalogue it loaded
 * itself — it never accepts one from the browser.
 */

/* ── Uploads ─────────────────────────────────────────────────────────────── */

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/**
 * Hosts our own storage driver can produce a URL on. Keep in step with
 * `images.remotePatterns` in next.config.mjs.
 */
const ALLOWED_PHOTO_HOSTS = [
  'res.cloudinary.com',
  // Images uploaded before the move to Cloudinary.
  '.public.blob.vercel-storage.com',
] as const;

/**
 * Accepts only a URL this site could itself have issued.
 *
 * `photos` arrives on the checkout request as JSON, so the browser chooses
 * every field — it is not read back from the upload response server-side. A
 * bare `z.string().url()` let two things through:
 *
 *   • any third-party URL, which the studio then opens from /admin and which
 *     is emailed out as "your reference photo";
 *   • `javascript:…`, which `new URL()` parses happily. The admin dashboard
 *     renders each photo as an <a href>, so that is a stored XSS landing in
 *     the one session that can edit the whole site.
 *
 * Restricting the origin closes both, and costs nothing legitimate: every real
 * photo comes back from /api/upload on one of these hosts.
 */
export const photoUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    // Local development driver writes to public/uploads and returns a path.
    if (value.startsWith('/uploads/')) return !value.includes('..');

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return false;
    }

    if (parsed.protocol !== 'https:') return false;

    return ALLOWED_PHOTO_HOSTS.some((host) =>
      host.startsWith('.') ? parsed.hostname.endsWith(host) : parsed.hostname === host,
    );
  }, 'That photo could not be verified — please re-upload it.');

export const uploadedPhotoSchema = z.object({
  url: photoUrlSchema,
  pathname: z.string().max(512),
  name: z.string().max(255),
  size: z.number().int().nonnegative().max(MAX_PHOTO_BYTES),
  contentType: z.string().max(128),
});

export type UploadedPhoto = z.infer<typeof uploadedPhotoSchema>;

/* ── Commission order ────────────────────────────────────────────────────── */

/**
 * Builds the order schema against a catalogue.
 *
 * Ids are checked with `refine` rather than `z.enum` so an empty collection
 * (a catalogue with no add-ons, say) is a valid state rather than a crash.
 */
export function buildOrderSchema(catalogue: PricingCatalogue) {
  const has = (list: { id: string }[], id: string) => list.some((item) => item.id === id);
  const firstId = (list: { id: string }[], preferred: string) =>
    has(list, preferred) ? preferred : (list[0]?.id ?? preferred);

  return z
  .object({
    // What
    packageId: z
      .string()
      .refine((id) => has(catalogue.packages, id), 'Choose a package'),
    style: z
      .string()
      .refine((id) => has(catalogue.styles, id), 'Choose a medium')
      .default(firstId(catalogue.styles, 'graphite')),
    subjects: z.coerce.number().int().min(1).max(catalogue.maxSubjects).default(1),
    deliveryId: z
      .string()
      .refine((id) => has(catalogue.deliveryOptions, id), 'Choose a delivery option')
      .default(firstId(catalogue.deliveryOptions, 'digital')),
    addOnIds: z
      .array(z.string().refine((id) => has(catalogue.addOns, id), 'Unknown extra'))
      .max(catalogue.addOns.length)
      .default([]),

    // Who
    customerName: z.string().trim().min(2, 'Please enter your name').max(120),
    customerEmail: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
    customerPhone: z.string().trim().min(1, 'Please enter your phone number').max(40),
    country: z.string().trim().min(2, 'Select your country').max(80),

    // Customer address is required for both digital and physical orders.
    addressLine1: z.string().trim().min(1, 'Please enter your address').max(160),
    addressLine2: z.string().trim().max(160).optional().or(z.literal('')),
    city: z.string().trim().min(1, 'Please enter your city').max(80),
    postalCode: z.string().trim().min(1, 'Please enter your postal / ZIP code').max(24),

    // Brief
    occasion: z.string().trim().max(80).optional().or(z.literal('')),
    deadline: z.string().trim().max(40).optional().or(z.literal('')),
    notes: z.string().trim().max(2000).optional().or(z.literal('')),

    // Photos
    photos: z
      .array(uploadedPhotoSchema)
      .min(1, 'Upload at least one reference photo')
      .max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos`),

    // Consent
    consented: z.literal(true, {
      errorMap: () => ({ message: 'Please accept the terms to continue' }),
    }),
    allowPortfolioUse: z.boolean().default(true),

    // Payment
    provider: z.enum(['stripe', 'paypal']),

    // Spam trap — real people never fill a hidden field in.
    company: z.string().max(0).optional(),
  });
}

export type OrderSchema = ReturnType<typeof buildOrderSchema>;
export type OrderInput = z.infer<OrderSchema>;

/* ── Contact form ────────────────────────────────────────────────────────── */

export const CONTACT_SUBJECTS = [
  { value: 'general', label: 'General question' },
  { value: 'custom-quote', label: 'Custom quote request' },
  { value: 'existing-order', label: 'About an existing order' },
  { value: 'gift-voucher', label: 'Gift voucher' },
  { value: 'other', label: 'Something else' },
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  subject: z
    .enum(CONTACT_SUBJECTS.map((s) => s.value) as [string, ...string[]])
    .default('general'),
  message: z.string().trim().min(10, 'Tell us a little more').max(4000),
  company: z.string().max(0).optional(), // honeypot
});

export type ContactInput = z.infer<typeof contactSchema>;

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Flattens a ZodError into { fieldName: "first message" } for the UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
