'use client';

import { useState, type FormEvent } from 'react';

export function ReviewForm({ initialReference }: { initialReference: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        reference: form.get('reference'), author: form.get('author'), rating: Number(form.get('rating')),
        quote: form.get('quote'), consent: form.get('consent') === 'on', company: form.get('company'),
      }) });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? 'Could not submit your review.');
      else setSuccess(data.message);
    } catch { setError('Connection interrupted. Please try again.'); }
    finally { setBusy(false); }
  }
  if (success) return <div role="status" className="panel mt-8 p-6 text-sm leading-relaxed text-gold-soft">{success}</div>;
  return (
    <form onSubmit={submit} className="panel mt-8 space-y-6 p-5 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className="field-label">Order reference</span>
          <input name="reference" className="field uppercase" defaultValue={initialReference} required maxLength={30} placeholder="SS-7F3K2Q" autoCapitalize="characters" spellCheck={false} />
          <span className="mt-2 block text-xs text-grey">Find this in your order confirmation or delivery email.</span>
        </label>
        <label className="block"><span className="field-label">Your name</span>
          <input name="author" className="field" required minLength={2} maxLength={80} autoComplete="name" />
          <span className="mt-2 block text-xs text-grey">The name you would like shown with your review.</span>
        </label>
      </div>
      <label className="block"><span className="field-label">Your rating</span>
        <select name="rating" className="field" defaultValue="5" required>
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>)}
        </select>
      </label>
      <label className="block"><span className="field-label">Your experience</span>
        <textarea name="quote" className="field min-h-36 resize-y" required minLength={10} maxLength={600} rows={5} placeholder="Tell us about your portrait and your experience with the studio." />
        <span className="mt-2 block text-xs text-grey">10–600 characters. Please leave out private contact details.</span>
      </label>
      <div className="hidden" aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-grey">
        <input name="consent" type="checkbox" required className="mt-1 accent-[#b8935a]" />
        <span>I agree that Sketchy Soul may publish my name, rating, and review on the website after approval.</span>
      </label>
      {error ? <p role="alert" className="error-text">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? 'Submitting…' : 'Submit review'}</button>
    </form>
  );
}
