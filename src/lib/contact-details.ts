import { z } from 'zod';
import { site } from '@/lib/site';

const socialUrl = z.string().trim().max(2048).refine(
  (value) => {
    if (!value) return true;
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  },
  'Enter a full HTTPS link, or leave this blank to hide it.',
);

export const contactDetailsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: z.string().trim().max(50).refine(
    (value) => !value || (/^[+\d\s().-]+$/.test(value) && /\d/.test(value)),
    'Enter a valid phone number, or leave this blank to hide it.',
  ),
  instagram: socialUrl,
  whatsapp: socialUrl,
});

export type ContactDetails = z.infer<typeof contactDetailsSchema>;
export const defaultContactDetails: ContactDetails = {
  email: site.email,
  phone: site.phone,
  instagram: site.social.instagram,
  whatsapp: site.social.whatsapp,
};

export const contactDetailKeys = {
  email: 'settings.contact.email',
  phone: 'settings.contact.phone',
  instagram: 'settings.contact.instagram',
  whatsapp: 'settings.contact.whatsapp',
} as const;
