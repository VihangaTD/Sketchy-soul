'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { PhotoUploader } from './PhotoUploader';
import { OrderSummary } from './OrderSummary';
import { SketchPortrait } from '../SketchPortrait';
import { ProgressLine } from '../Skeleton';
import { trackEvent } from '../Analytics';

import {
  formatMoney,
  priceOrder,
  type PricingCatalogue,
} from '@/lib/packages';
import { getCountries } from '@/lib/countries';
import { COOKIES, COOKIE_MAX_AGE } from '@/lib/cookies';
import { buildOrderSchema, fieldErrors, type UploadedPhoto } from '@/lib/validation';
import { gridColumns } from '@/lib/layout';

const DRAFT_KEY = 'ss_order_draft_v1';

const STEPS = [
  { id: 'package', label: 'The Piece' },
  { id: 'photos', label: 'Your Photo' },
  { id: 'details', label: 'Details' },
  { id: 'pay', label: 'Confirm' },
] as const;

const OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Wedding',
  'Memorial',
  'Pet portrait',
  'Christmas',
  'Just because',
  'Other',
];

interface Draft {
  packageId: string;
  style: string;
  deliveryId: string;
  addOnIds: string[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  occasion: string;
  deadline: string;
  notes: string;
  photos: UploadedPhoto[];
  consented: boolean;
  allowPortfolioUse: boolean;
  provider: 'stripe' | 'paypal';
}

function emptyDraft(
  catalogue: PricingCatalogue,
  packageId: string,
  provider: 'stripe' | 'paypal',
): Draft {
  // Prefer the studio defaults, but never point at an option the artist has
  // since removed — fall back to whatever is first in the live catalogue.
  const pick = (list: { id: string }[], preferred: string) =>
    list.some((o) => o.id === preferred) ? preferred : (list[0]?.id ?? preferred);

  return {
    packageId,
    style: pick(catalogue.styles, 'graphite'),
    deliveryId: pick(catalogue.deliveryOptions, 'digital'),
    addOnIds: [],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    country: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    occasion: '',
    deadline: '',
    notes: '',
    photos: [],
    consented: false,
    allowPortfolioUse: true,
    provider,
  };
}

export function OrderWizard({
  catalogue,
  initialPackageId,
  stripeEnabled,
  paypalEnabled,
}: {
  /** The live price list, loaded on the server so the running total here
      matches the amount /api/checkout will recompute and charge. */
  catalogue: PricingCatalogue;
  initialPackageId: string;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
}) {
  const defaultProvider: 'stripe' | 'paypal' = stripeEnabled ? 'stripe' : 'paypal';

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() =>
    emptyDraft(catalogue, initialPackageId, defaultProvider),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);

  /**
   * The furthest step the customer has validated their way to.
   *
   * The stepper used to disable every entry past the *current* step, so going
   * back to fix a name meant clicking Continue through every screen again to
   * return to payment. Steps already cleared stay reachable.
   */
  const [furthest, setFurthest] = useState(0);

  /**
   * Spam trap. /api/checkout has always discarded submissions with this field
   * filled in, but the form never rendered it, so the check could not fire and
   * every bot sailed through. It is hidden from sight and from screen readers,
   * and excluded from tab order — only a script filling every input finds it.
   */
  const [honeypot, setHoneypot] = useState('');

  const countries = useMemo(() => getCountries(), []);

  /* ── Draft persistence ─────────────────────────────────────────────────
     Photos are already uploaded, so a restored draft still has them. This is
     what lets somebody start on their phone at lunchtime and finish on a
     laptop that evening without re-doing the whole form.                    */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as Partial<Draft>;
      setDraft((current) => ({
        ...current,
        ...parsed,
        // A ?package= in the URL always wins over whatever was saved.
        packageId: initialPackageId || parsed.packageId || current.packageId,
        provider: providerAvailable(parsed.provider, stripeEnabled, paypalEnabled) ?? defaultProvider,
      }));
      setRestored(Boolean(parsed.photos?.length || parsed.customerEmail));
    } catch {
      /* corrupt draft — start fresh */
    }
    // Runs once on mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      // A tiny companion cookie so the server can tell an order was started —
      // no personal data, just the chosen package and how far they got.
      document.cookie = [
        `${COOKIES.orderDraft}=${encodeURIComponent(JSON.stringify({ p: draft.packageId, s: step }))}`,
        'path=/',
        `max-age=${COOKIE_MAX_AGE.orderDraft}`,
        'samesite=lax',
      ].join('; ');
    } catch {
      /* private browsing with storage disabled — the form still works */
    }
  }, [draft, step]);

  /* ── Derived ───────────────────────────────────────────────────────────── */

  const priced = useMemo(() => {
    try {
      return priceOrder(
        {
          packageId: draft.packageId,
          addOnIds: draft.addOnIds,
          style: draft.style,
          deliveryId: draft.deliveryId,
        },
        catalogue,
      );
    } catch {
      // A saved draft can name a package the artist has since retired.
      return priceOrder({ packageId: catalogue.packages[0]?.id ?? '' }, catalogue);
    }
  }, [catalogue, draft.packageId, draft.addOnIds, draft.style, draft.deliveryId]);

  // The same rules the API applies, so the customer sees errors here first.
  const schema = useMemo(() => buildOrderSchema(catalogue), [catalogue]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const toggleAddOn = (id: string) =>
    setDraft((d) => ({
      ...d,
      addOnIds: d.addOnIds.includes(id)
        ? d.addOnIds.filter((a) => a !== id)
        : [...d.addOnIds, id],
    }));

  /* ── Navigation ────────────────────────────────────────────────────────── */

  function validateStep(index: number): boolean {
    const next: Record<string, string> = {};

    if (index === 1 && draft.photos.length === 0) {
      next.photos = 'Please upload at least one reference photo.';
    }

    if (index === 2) {
      if (draft.customerName.trim().length < 2) next.customerName = 'Please enter your name.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.customerEmail))
        next.customerEmail = 'Enter a valid email address.';
      if (!draft.country) next.country = 'Select your country.';

      if (!draft.customerPhone.trim()) next.customerPhone = 'Please enter your phone number.';
      if (draft.deliveryId !== 'digital') {
      if (!draft.addressLine1.trim()) next.addressLine1 = 'Please enter your address.';
      if (!draft.city.trim()) next.city = 'Please enter your city.';
      if (!draft.postalCode.trim()) next.postalCode = 'Please enter your postal / ZIP code.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goTo(index: number) {
    // Moving forward validates; moving back never does.
    if (index > step) {
      for (let i = step; i < index; i += 1) {
        if (!validateStep(i)) {
          setStep(i);
          return;
        }
      }
    }
    setStep(index);
    setFurthest((f) => Math.max(f, index));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (index > step) trackEvent('checkout_step', { step: STEPS[index]?.id });
  }

  /* ── Submit ────────────────────────────────────────────────────────────── */

  async function submit() {
    const payload = {
      ...draft,
      consented: draft.consented,
      company: honeypot,
    };

    // A filled trap is a bot. Say nothing useful and go no further — the API
    // makes the same judgement, this just saves the round trip.
    if (honeypot) return;

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);

      // Jump back to the step that owns the first broken field.
      if (errs.photos) setStep(1);
      else if (
        ['customerName', 'customerEmail', 'customerPhone', 'country', 'addressLine1', 'city', 'postalCode'].some(
          (f) => errs[f],
        )
      ) {
        setStep(2);
      }
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      trackEvent('begin_checkout', {
        value: priced.total / 100,
        currency: 'USD',
        items: [{ item_id: priced.pkg.id, item_name: priced.pkg.name }],
      });

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        setErrors(data.errors ?? { form: data.error ?? 'Could not start the payment.' });
        setSubmitting(false);
        return;
      }

      // The draft has served its purpose — the order now lives on the server.
      localStorage.removeItem(DRAFT_KEY);
      window.location.href = data.url as string;
    } catch {
      setErrors({ form: 'Network error. Check your connection and try again.' });
      setSubmitting(false);
    }
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
      <div>
        <Stepper step={step} furthest={furthest} onSelect={goTo} />

        {restored && step === 0 ? (
          <p className="mb-6 rounded-[2px] border border-hairline bg-[#141416] px-4 py-3 text-[12px] text-grey">
            Welcome back — we kept your previous answers. Change anything you like.
          </p>
        ) : null}

        {/* ══ STEP 1 — the piece ═════════════════════════════════════════ */}
        {step === 0 ? (
          <div className="space-y-10">
            <fieldset>
              <legend className="field-label">Choose a size</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalogue.packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => set('packageId', pkg.id)}
                    data-selected={draft.packageId === pkg.id}
                    className="choice"
                  >
                    <span className="flex items-start gap-3">
                      <SketchPortrait
                        variant={pkg.sketch}
                        className="h-10 w-10 shrink-0 opacity-80"
                      />
                      <span className="flex-1">
                        <span className="block text-[11px] uppercase tracking-[0.14em] text-gold">
                          {pkg.size}
                        </span>
                        <span className="mt-0.5 block font-serif text-[18px] text-ivory">
                          {pkg.name}
                        </span>
                        <span className="mt-1 block text-[11.5px] leading-relaxed text-grey">
                          Up to {pkg.subjectsIncluded} subject
                          {pkg.subjectsIncluded > 1 ? 's' : ''} · {pkg.turnaround}
                        </span>
                      </span>
                      <span className="shrink-0 font-serif text-[19px] text-gold-soft">
                        {formatMoney(pkg.price)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="field-label">Medium</legend>
              <div className={`grid gap-3 ${gridColumns(catalogue.styles.length, 3)}`}>
                {catalogue.styles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => set('style', style.id)}
                    data-selected={draft.style === style.id}
                    className="choice"
                  >
                    <span className="font-serif text-[17px] text-ivory">{style.name}</span>
                    <span className="mt-1 text-[11.5px] leading-relaxed text-grey">
                      {style.description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="field-label">Delivery</legend>
              <div className={`grid gap-3 ${gridColumns(catalogue.deliveryOptions.length, 3)}`}>
                {catalogue.deliveryOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => set('deliveryId', option.id)}
                    data-selected={draft.deliveryId === option.id}
                    className="choice"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-[17px] text-ivory">{option.name}</span>
                      <span className="text-[12px] text-gold-soft">
                        {option.price === 0 ? 'Free' : `+${formatMoney(option.price)}`}
                      </span>
                    </span>
                    <span className="mt-1 text-[11.5px] leading-relaxed text-grey">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="field-label">Add-ons (optional)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalogue.addOns.map((addOn) => {
                  // Colour medium already includes this — show it as locked on.
                  const forced = addOn.id === 'colour' && draft.style === 'colour';
                  const selected = forced || draft.addOnIds.includes(addOn.id);

                  return (
                    <button
                      key={addOn.id}
                      type="button"
                      disabled={forced}
                      onClick={() => toggleAddOn(addOn.id)}
                      data-selected={selected}
                      className="choice disabled:opacity-70"
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-sans text-[14px] text-ivory">{addOn.name}</span>
                        <span className="text-[12px] text-gold-soft">
                          +{formatMoney(addOn.price)}
                        </span>
                      </span>
                      <span className="mt-1 text-[11.5px] leading-relaxed text-grey">
                        {forced ? 'Included with the colour pencil medium.' : addOn.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        ) : null}

        {/* ══ STEP 2 — photos ════════════════════════════════════════════ */}
        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h2 className="heading">Send the photograph</h2>
              <p className="lede mt-3 max-w-[52ch]">
                Bright, sharp and close-up works best. If you have several
                photos of the same person, send them all — more angles means a
                better likeness.
              </p>
            </div>

            <PhotoUploader
              photos={draft.photos}
              onChange={(photos) => set('photos', photos)}
              error={errors.photos}
            />

            <div className="panel p-5">
              <p className="eyebrow mb-3">A quick checklist</p>
              <ul className="space-y-2 text-[12.5px] leading-relaxed text-grey">
                <li>Daylight beats flash — near a window is ideal.</li>
                <li>Eyes open, face unobstructed.</li>
                <li>Send the original file rather than a screenshot.</li>
                <li>Old or damaged photos are welcome — just send what you have.</li>
              </ul>
            </div>
          </div>
        ) : null}

        {/* ══ STEP 3 — details ═══════════════════════════════════════════ */}
        {step === 2 ? (
          <div className="space-y-8">
            <div>
              <h2 className="heading">Where should it go?</h2>
              <p className="lede mt-3 max-w-[52ch]">
                {draft.deliveryId === 'digital'
                  ? 'Enter your name, email and phone number. Your digital portrait will be delivered by email.'
                  : 'Enter your contact details and delivery address for your portrait.'}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" id="customerName" error={errors.customerName}>
                <input
                  id="customerName"
                  className={`field ${errors.customerName ? 'field-error' : ''}`}
                  value={draft.customerName}
                  onChange={(e) => set('customerName', e.target.value)}
                  autoComplete="name"
                />
              </Field>

              <Field label="Email" id="customerEmail" error={errors.customerEmail}>
                <input
                  id="customerEmail"
                  type="email"
                  inputMode="email"
                  className={`field ${errors.customerEmail ? 'field-error' : ''}`}
                  value={draft.customerEmail}
                  onChange={(e) => set('customerEmail', e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <Field label="Phone / WhatsApp" id="customerPhone" error={errors.customerPhone}>
                <input
                  id="customerPhone"
                  required
                  maxLength={40}
                  type="tel"
                  inputMode="tel"
                  className={`field ${errors.customerPhone ? 'field-error' : ''}`}
                  value={draft.customerPhone}
                  onChange={(e) => set('customerPhone', e.target.value)}
                  autoComplete="tel"
                />
              </Field>

              <Field label="Country" id="country" error={errors.country}>
                <select
                  id="country"
                  className={`field ${errors.country ? 'field-error' : ''}`}
                  value={draft.country}
                  onChange={(e) => set('country', e.target.value)}
                  autoComplete="country-name"
                >
                  <option value="" className="bg-[#121214]">
                    Select a country…
                  </option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.name} className="bg-[#121214]">
                      {country.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

              {draft.deliveryId !== 'digital' ? <div className="space-y-5 border-t border-hairline pt-6">
                <p className="eyebrow">Delivery address</p>

                <Field label="Address line 1" id="addressLine1" error={errors.addressLine1}>
                  <input
                    id="addressLine1"
                    className={`field ${errors.addressLine1 ? 'field-error' : ''}`}
                    value={draft.addressLine1}
                    onChange={(e) => set('addressLine1', e.target.value)}
                    autoComplete="address-line1"
                  />
                </Field>

                <Field label="Address line 2 (optional)" id="addressLine2">
                  <input
                    id="addressLine2"
                    className="field"
                    value={draft.addressLine2}
                    onChange={(e) => set('addressLine2', e.target.value)}
                    autoComplete="address-line2"
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="City" id="city" error={errors.city}>
                    <input
                      id="city"
                      className={`field ${errors.city ? 'field-error' : ''}`}
                      value={draft.city}
                      onChange={(e) => set('city', e.target.value)}
                      autoComplete="address-level2"
                    />
                  </Field>

                  <Field label="Postal / ZIP code" id="postalCode" error={errors.postalCode}>
                    <input
                      id="postalCode"
                      className={`field ${errors.postalCode ? 'field-error' : ''}`}
                      value={draft.postalCode}
                      onChange={(e) => set('postalCode', e.target.value)}
                      autoComplete="postal-code"
                    />
                  </Field>
                </div>
              </div> : null}

            <div className="space-y-5 border-t border-hairline pt-6">
              <p className="eyebrow">About the portrait</p>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Occasion (optional)" id="occasion">
                  <select
                    id="occasion"
                    className="field"
                    value={draft.occasion}
                    onChange={(e) => set('occasion', e.target.value)}
                  >
                    <option value="" className="bg-[#121214]">
                      Not specified
                    </option>
                    {OCCASIONS.map((occasion) => (
                      <option key={occasion} value={occasion} className="bg-[#121214]">
                        {occasion}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Needed by (optional)" id="deadline">
                  <input
                    id="deadline"
                    type="date"
                    className="field"
                    value={draft.deadline}
                    onChange={(e) => set('deadline', e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Anything the artist should know? (optional)" id="notes">
                <textarea
                  id="notes"
                  rows={5}
                  className="field resize-y"
                  value={draft.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Who is in the photo, what you love about it, anything to emphasise or leave out."
                />
              </Field>
            </div>
          </div>
        ) : null}

        {/* ══ STEP 4 — review & pay ══════════════════════════════════════ */}
        {step === 3 ? (
          <div className="space-y-8">
            <div>
              <h2 className="heading">Check it over</h2>
              <p className="lede mt-3 max-w-[52ch]">
                Payment is handled by {stripeEnabled && paypalEnabled ? 'Stripe or PayPal' : stripeEnabled ? 'Stripe' : 'PayPal'} on
                their own secure pages. Your card details never touch this site.
              </p>
            </div>

            <div className="panel divide-y divide-[rgba(255,255,255,0.08)]">
              <Row label="Package" value={`${priced.pkg.name} · ${priced.pkg.size}`} onEdit={() => goTo(0)} />
              <Row label="Medium" value={catalogue.styles.find((s) => s.id === priced.style)?.name ?? ''} onEdit={() => goTo(0)} />
              <Row label="Delivery" value={priced.delivery.name} onEdit={() => goTo(0)} />
              <Row
                label="Reference photos"
                value={`${draft.photos.length} attached`}
                onEdit={() => goTo(1)}
              />
              <Row label="Name" value={draft.customerName} onEdit={() => goTo(2)} />
              <Row label="Email" value={draft.customerEmail} onEdit={() => goTo(2)} />
              <Row label="Phone" value={draft.customerPhone} onEdit={() => goTo(2)} />
                {draft.deliveryId !== 'digital' ? <Row
                  label="Delivery address"
                  value={[draft.addressLine1, draft.addressLine2, draft.city, draft.postalCode, draft.country]
                    .filter(Boolean)
                    .join(', ')}
                  onEdit={() => goTo(2)}
                /> : null}
            </div>

            <fieldset>
              <legend className="field-label">Pay with</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {stripeEnabled ? (
                  <button
                    type="button"
                    onClick={() => set('provider', 'stripe')}
                    data-selected={draft.provider === 'stripe'}
                    className="choice"
                  >
                    <span className="font-sans text-[14px] text-ivory">Card</span>
                    <span className="mt-1 text-[11.5px] leading-relaxed text-grey">
                      Visa, Mastercard, Amex, Apple Pay and Google Pay via Stripe.
                    </span>
                  </button>
                ) : null}

                {paypalEnabled ? (
                  <button
                    type="button"
                    onClick={() => set('provider', 'paypal')}
                    data-selected={draft.provider === 'paypal'}
                    className="choice"
                  >
                    <span className="font-sans text-[14px] text-ivory">PayPal</span>
                    <span className="mt-1 text-[11.5px] leading-relaxed text-grey">
                      Pay with your PayPal balance or a card through PayPal.
                    </span>
                  </button>
                ) : null}
              </div>

              {!stripeEnabled && !paypalEnabled ? (
                <p className="error-text">
                  No payment method is configured yet. Please{' '}
                  <Link href="/contact" className="underline">
                    contact the studio
                  </Link>{' '}
                  to order.
                </p>
              ) : null}
            </fieldset>

            <div className="space-y-4 border-t border-hairline pt-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.consented}
                  onChange={(e) => set('consented', e.target.checked)}
                  className="mt-1 accent-[#b8935a]"
                />
                <span className="text-[12.5px] leading-relaxed text-grey">
                  I have the right to use the photographs I uploaded, and I
                  accept the{' '}
                  <Link href="/terms" target="_blank" className="text-gold-soft underline underline-offset-4">
                    terms of service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-gold-soft underline underline-offset-4">
                    privacy policy
                  </Link>
                  .
                </span>
              </label>
              {errors.consented ? <p className="error-text">{errors.consented}</p> : null}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.allowPortfolioUse}
                  onChange={(e) => set('allowPortfolioUse', e.target.checked)}
                  className="mt-1 accent-[#b8935a]"
                />
                <span className="text-[12.5px] leading-relaxed text-grey">
                  The studio may show the finished drawing in its portfolio.
                  Untick this and your portrait stays private, permanently.
                </span>
              </label>
            </div>

            {/* Spam trap — off-screen, hidden from assistive tech and skipped
                by the tab key, so no real person ever meets it. */}
            <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {errors.form ? (
              <p role="alert" className="error-text">
                {errors.form}
              </p>
            ) : null}

            <div className="lg:hidden">
              <OrderSummary priced={priced} />
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting || (!stripeEnabled && !paypalEnabled)}
              className="btn-primary relative w-full overflow-hidden disabled:cursor-wait disabled:opacity-70"
            >
              {submitting
                ? 'Taking you to payment…'
                : `Pay ${formatMoney(priced.total)} securely`}
              {submitting ? <ProgressLine /> : null}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-grey">
              You will be redirected to{' '}
              {draft.provider === 'stripe' ? 'Stripe' : 'PayPal'} to complete the
              payment. Your order reaches the studio the moment it clears.
            </p>
          </div>
        ) : null}

        {/* ── Step navigation ────────────────────────────────────────────── */}
        <div className="mt-10 flex items-center gap-3 border-t border-hairline pt-6">
          {step > 0 ? (
            <button type="button" onClick={() => goTo(step - 1)} className="btn-ghost btn-sm">
              Back
            </button>
          ) : null}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => goTo(step + 1)}
              className="btn-primary btn-sm ml-auto"
            >
              Continue
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Sticky summary (desktop) ─────────────────────────────────────── */}
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <OrderSummary priced={priced} />
          <p className="mt-4 text-[11px] leading-relaxed text-grey">
            Prices are in US dollars and include the artist&apos;s time,
            materials and the digital file.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ── Small internals ───────────────────────────────────────────────────── */

function providerAvailable(
  provider: string | undefined,
  stripeEnabled: boolean,
  paypalEnabled: boolean,
): 'stripe' | 'paypal' | null {
  if (provider === 'stripe' && stripeEnabled) return 'stripe';
  if (provider === 'paypal' && paypalEnabled) return 'paypal';
  return null;
}

function Stepper({
  step,
  furthest,
  onSelect,
}: {
  step: number;
  /** Highest step already validated — everything up to it stays clickable. */
  furthest: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="mb-10 flex items-center gap-2">
      {STEPS.map((item, i) => {
        const done = i < step;
        const current = i === step;

        return (
          <li key={item.id} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(i)}
              disabled={i > furthest}
              aria-current={current ? 'step' : undefined}
              className="group flex flex-1 flex-col gap-2 text-left disabled:cursor-default"
            >
              <span
                className={`h-px w-full transition-colors duration-300 ${
                  done || current ? 'bg-gold' : 'bg-hairline'
                }`}
              />
              <span
                className={`text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  current ? 'text-ivory' : done ? 'text-gold' : 'text-grey/60'
                }`}
              >
                <span className="hidden sm:inline">
                  {String(i + 1).padStart(2, '0')} ·{' '}
                </span>
                {item.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
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

function Row({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</span>
      <span className="flex-1 text-right text-[13px] text-ivory">{value || '—'}</span>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-gold transition-colors hover:text-gold-soft"
      >
        Edit
      </button>
    </div>
  );
}
