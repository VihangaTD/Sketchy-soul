'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CONTACT_SUBJECTS, contactSchema, fieldErrors } from '@/lib/validation';
import { ProgressLine } from './Skeleton';
import { trackEvent } from './Analytics';

/**
 * Contact / custom-quote form.
 * Submits to /api/contact, which stores the message and appends it to the
 * "Contacts" tab of the studio Google Sheet.
 */
export function ContactForm() {
  const params = useSearchParams();
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    subject: params.get('subject') ?? 'general',
    message: '',
    company: '', // honeypot
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setState('sending');
    setErrors({});

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrors(body.errors ?? { form: body.error ?? 'Something went wrong. Please email us instead.' });
        setState('error');
        return;
      }

      trackEvent('contact_submitted', { subject: values.subject });
      setState('sent');
    } catch {
      setErrors({ form: 'Network error — check your connection and try again.' });
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="panel p-8 text-center">
        <p className="eyebrow mb-3">Message Sent</p>
        <h2 className="heading">Thank you — it landed.</h2>
        <p className="lede mx-auto mt-3 max-w-[38ch]">
          You will get a reply at{' '}
          <span className="text-gold-soft">{values.email}</span>, usually within
          one working day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={values.company}
          onChange={set('company')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" id="name" error={errors.name}>
          <input
            id="name"
            className={`field ${errors.name ? 'field-error' : ''}`}
            value={values.name}
            onChange={set('name')}
            autoComplete="name"
            required
          />
        </Field>

        <Field label="Email" id="email" error={errors.email}>
          <input
            id="email"
            type="email"
            inputMode="email"
            className={`field ${errors.email ? 'field-error' : ''}`}
            value={values.email}
            onChange={set('email')}
            autoComplete="email"
            required
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone / WhatsApp (optional)" id="phone" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            className={`field ${errors.phone ? 'field-error' : ''}`}
            value={values.phone}
            onChange={set('phone')}
            autoComplete="tel"
          />
        </Field>

        <Field label="What is it about?" id="subject" error={errors.subject}>
          <select
            id="subject"
            className={`field ${errors.subject ? 'field-error' : ''}`}
            value={values.subject}
            onChange={set('subject')}
          >
            {CONTACT_SUBJECTS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#121214]">
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Message" id="message" error={errors.message}>
        <textarea
          id="message"
          rows={6}
          className={`field resize-y ${errors.message ? 'field-error' : ''}`}
          value={values.message}
          onChange={set('message')}
          placeholder="Tell us about the photo, the person, and the occasion."
          required
        />
      </Field>

      {errors.form ? (
        <p role="alert" className="error-text">
          {errors.form}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn-primary relative w-full overflow-hidden disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Sending…' : 'Send Message'}
        {state === 'sending' ? <ProgressLine /> : null}
      </button>

      <p className="text-[11.5px] leading-relaxed text-grey">
        Your details are used only to answer this message. Nothing is shared or
        sold — see the privacy policy.
      </p>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="error-text">
          {error}
        </span>
      ) : null}
    </div>
  );
}
