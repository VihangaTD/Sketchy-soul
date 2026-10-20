import 'server-only';
import { cache } from 'react';
import { site } from '@/lib/site';
import { getCopy } from './copy';
import { contactDetailKeys, defaultContactDetails, type ContactDetails } from '@/lib/contact-details';

export const getContactDetails = cache(async (): Promise<ContactDetails> => {
  const blocks = await getCopy();
  return Object.fromEntries(
    Object.entries(contactDetailKeys).map(([field, key]) => [
      field, blocks[key] ?? defaultContactDetails[field as keyof ContactDetails],
    ]),
  ) as ContactDetails;
});

export async function getSiteDetails() {
  const { instagram, whatsapp, ...contact } = await getContactDetails();
  return { ...site, ...contact, social: { ...site.social, instagram, whatsapp } };
}
