'use client';

import { useActionState } from 'react';
import { Field } from './Fields';
import type { ContactDetails } from '@/lib/contact-details';
import { saveContactDetails } from '@/app/admin/pages/actions';

export function ContactDetailsForm({ details }: { details: ContactDetails }) {
  const [state, action, pending] = useActionState(saveContactDetails, { message: '', errors: {} });
  const fields = [
    { name: 'email', label: 'Email', type: 'email', hint: 'Public contact email address.', max: 254 },
    { name: 'phone', label: 'Phone number', type: 'tel', hint: 'Include the country code. Leave blank to hide.', max: 50 },
    { name: 'instagram', label: 'Instagram', type: 'url', hint: 'Full HTTPS profile link. Leave blank to hide.', max: 2048 },
    { name: 'whatsapp', label: 'WhatsApp', type: 'url', hint: 'Full HTTPS link, e.g. https://wa.me/94771234567. Leave blank to hide.', max: 2048 },
  ] as const;

  return (
    <form action={action}>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.name} label={field.label} hint={field.hint}>
            <input className="field" name={field.name} type={field.type}
              defaultValue={details[field.name]} required={field.name === 'email'}
              maxLength={field.max} aria-invalid={!!state.errors[field.name]}
              aria-describedby={state.errors[field.name] ? `contact-${field.name}-error` : undefined} />
            {state.errors[field.name] ? (
              <span id={`contact-${field.name}-error`} className="error-text">{state.errors[field.name]}</span>
            ) : null}
          </Field>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        <button type="submit" className="btn-primary btn-sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save contact details'}
        </button>
        <p role="status" className="text-[12px] text-gold-soft">{state.message}</p>
      </div>
    </form>
  );
}
