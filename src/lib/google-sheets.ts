import { JWT } from 'google-auth-library';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  THE ADMIN HAND-OFF                                                      ║
 * ║                                                                          ║
 * ║  When a payment succeeds, the order is appended as one row to your       ║
 * ║  Google Sheet. That sheet is your working order book: filter it, sort    ║
 * ║  it, add a "Status" column, share it with an assistant.                  ║
 * ║                                                                          ║
 * ║  TWO WAYS TO CONNECT (pick one)                                          ║
 * ║                                                                          ║
 * ║  A. Service account  (recommended — writes directly, formats nicely)     ║
 * ║     1. console.cloud.google.com → create project → enable Sheets API     ║
 * ║     2. IAM → Service Accounts → create → Keys → Add key → JSON           ║
 * ║     3. Put client_email + private_key in GOOGLE_SERVICE_ACCOUNT_EMAIL /  ║
 * ║        GOOGLE_PRIVATE_KEY                                                ║
 * ║     4. Create the sheet, add tabs "Orders" and "Contacts"                ║
 * ║     5. SHARE the sheet with the service-account email as EDITOR ← the    ║
 * ║        step everyone forgets; without it every write returns 403         ║
 * ║     6. GOOGLE_SHEETS_ID = the id in the sheet URL                        ║
 * ║                                                                          ║
 * ║  B. Google Form  (no cloud console needed)                               ║
 * ║     Set GOOGLE_FORM_ACTION_URL and the entry ids in                      ║
 * ║     src/lib/google-form.ts. Responses land in the form's own sheet.      ║
 * ║                                                                          ║
 * ║  If neither is configured the order is still saved to Postgres and       ║
 * ║  flagged `sheetStatus: FAILED`, so nothing is ever lost — you can        ║
 * ║  retry every failed row from /admin later.                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const isSheetsConfigured = () =>
  Boolean(
    process.env.GOOGLE_SHEETS_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );

export const ORDERS_TAB = process.env.GOOGLE_SHEETS_ORDERS_TAB || 'Orders';
export const CONTACTS_TAB = process.env.GOOGLE_SHEETS_CONTACTS_TAB || 'Contacts';

/**
 * Environment variables cannot hold real newlines, so the key is stored with
 * literal "\n" sequences that have to be turned back into line breaks here.
 * Getting this wrong is the #1 cause of "error:1E08010C:DECODER routines".
 */
function privateKey() {
  return (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n').replace(/^"|"$/g, '');
}

let jwt: JWT | null = null;

async function authToken(): Promise<string> {
  jwt ??= new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey(),
    scopes: SCOPES,
  });

  const { token } = await jwt.getAccessToken();
  if (!token) throw new Error('Could not obtain a Google access token.');
  return token;
}

/** Appends one row to a tab, creating the header row on first use. */
export async function appendRow(tab: string, values: (string | number)[], headers?: string[]) {
  if (!isSheetsConfigured()) {
    throw new Error(
      'Google Sheets is not configured (GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).',
    );
  }

  const token = await authToken();
  const id = process.env.GOOGLE_SHEETS_ID!;

  if (headers) await ensureHeaderRow(tab, headers, token, id);

  const res = await fetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(`${tab}!A1`)}:append` +
      `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    // 403 here is almost always "you did not share the sheet with the bot".
    throw new Error(`Google Sheets append failed (${res.status}): ${detail}`);
  }

  return res.json();
}

async function ensureHeaderRow(tab: string, headers: string[], token: string, id: string) {
  const res = await fetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(`${tab}!A1:A1`)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );

  if (!res.ok) return; // tab may not exist yet — let the append surface the error

  const data = (await res.json()) as { values?: string[][] };
  if (data.values?.[0]?.[0]) return; // headers already there

  await fetch(
    `${SHEETS_API}/${id}/values/${encodeURIComponent(`${tab}!A1`)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] }),
      cache: 'no-store',
    },
  );
}

/* ── Column layout of the Orders tab ─────────────────────────────────────── */

export const ORDER_HEADERS = [
  'Paid At',
  'Reference',
  'Status',
  'Customer',
  'Email',
  'Phone',
  'Country',
  'Package',
  'Size',
  'Medium',
  'Subjects',
  'Add-ons',
  'Delivery',
  'Address',
  'Occasion',
  'Deadline',
  'Notes',
  'Photos',
  'Total (USD)',
  'Payment Provider',
  'Payment Reference',
  'Portfolio Use OK',
  'Source',
];

export const CONTACT_HEADERS = ['Received At', 'Name', 'Email', 'Phone', 'Subject', 'Message'];
