/**
 * OPTIONAL: submit orders to a Google FORM instead of the Sheets API.
 *
 * Use this if you would rather not create a Google Cloud service account.
 * Responses land in the spreadsheet the form is linked to, which then acts as
 * your admin order book exactly the same way.
 *
 * HOW TO WIRE IT UP
 *  1. Create a Google Form with one SHORT-ANSWER question per field in
 *     FORM_FIELDS below (Reference, Customer, Email, …). Paragraph answers are
 *     fine for Notes and Photos.
 *  2. Click ⋮ → "Get pre-filled link", fill every box with its own name, and
 *     press "Get link".
 *  3. The copied URL contains entry.123456789=Reference&entry.987654321=…
 *     Paste each entry id next to the matching key below.
 *  4. Set GOOGLE_FORM_ACTION_URL to the form URL with /viewform replaced by
 *     /formResponse — e.g.
 *     https://docs.google.com/forms/d/e/1FAIpQLS.../formResponse
 *
 * When GOOGLE_FORM_ACTION_URL is set it is used INSTEAD of the Sheets API.
 */

export const isFormConfigured = () => Boolean(process.env.GOOGLE_FORM_ACTION_URL);

/** ⚠️ Replace every entry id with the one from your own pre-filled link. */
export const FORM_FIELDS = {
  reference: 'entry.000000001',
  paidAt: 'entry.000000002',
  customerName: 'entry.000000003',
  customerEmail: 'entry.000000004',
  customerPhone: 'entry.000000005',
  country: 'entry.000000006',
  packageName: 'entry.000000007',
  packageSize: 'entry.000000008',
  style: 'entry.000000009',
  subjects: 'entry.000000010',
  addOns: 'entry.000000011',
  delivery: 'entry.000000012',
  address: 'entry.000000013',
  occasion: 'entry.000000014',
  deadline: 'entry.000000015',
  notes: 'entry.000000016',
  photos: 'entry.000000017',
  total: 'entry.000000018',
  provider: 'entry.000000019',
  paymentReference: 'entry.000000020',
} as const;

export type FormPayload = Partial<Record<keyof typeof FORM_FIELDS, string>>;

/**
 * Google Forms accept a plain urlencoded POST and always answer with an opaque
 * redirect, so success is inferred from the absence of a network error. That
 * is exactly why the Sheets API is the recommended path — it tells you when a
 * write fails.
 */
export async function submitToGoogleForm(payload: FormPayload) {
  const action = process.env.GOOGLE_FORM_ACTION_URL;
  if (!action) throw new Error('GOOGLE_FORM_ACTION_URL is not set.');

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    const field = FORM_FIELDS[key as keyof typeof FORM_FIELDS];
    if (field && value != null) body.append(field, String(value));
  }

  const res = await fetch(action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    redirect: 'follow',
    cache: 'no-store',
  });

  // Forms answer 200 on success and 400 when an entry id does not exist.
  if (!res.ok) {
    throw new Error(
      `Google Form submission failed (${res.status}). Check the entry ids in src/lib/google-form.ts.`,
    );
  }
}
