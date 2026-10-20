'use client';

import { createContext, useContext } from 'react';
import { defaultContactDetails, type ContactDetails } from '@/lib/contact-details';
import { site } from '@/lib/site';

const ContactContext = createContext<ContactDetails>(defaultContactDetails);

export function ContactDetailsProvider({ details, children }: {
  details: ContactDetails;
  children: React.ReactNode;
}) {
  return <ContactContext.Provider value={details}>{children}</ContactContext.Provider>;
}

export const useContactDetails = () => useContext(ContactContext);

export function useSiteDetails() {
  const { instagram, whatsapp, ...contact } = useContactDetails();
  return { ...site, ...contact, social: { ...site.social, instagram, whatsapp } };
}
