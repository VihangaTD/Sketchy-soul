# Deployment Checklist

Everything that has to change between "it runs on my laptop" and "it takes real
money". Work top to bottom; each step says exactly what to do and how to check
it worked.

Target host: **Vercel**. Notes for other hosts are in §12.

---

## 0. Before you start — 15 minutes of accounts

Create these first so you are not switching context later:

| Service            | For                       | Link                                       |
| ------------------ | ------------------------- | ------------------------------------------ |
| GitHub             | Code                      | github.com                                 |
| Vercel             | Hosting                   | vercel.com                                 |
| Cloudinary         | Image storage + CDN       | cloudinary.com                             |
| Neon *or* Supabase | PostgreSQL (free tier)    | neon.tech / supabase.com                   |
| Stripe             | Card payments             | dashboard.stripe.com                       |
| PayPal Developer   | PayPal payments           | developer.paypal.com                       |
| Google Cloud       | Sheets API service account| console.cloud.google.com                   |
| Resend *(optional)*| Order confirmation emails | resend.com                                 |

---

## 1. Push the code

```bash
git init
git add .
git commit -m "Sketchy Soul portrait studio"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/sketchy-soul.git
git push -u origin main
```

`.gitignore` already excludes `.env`. **Never commit it** — it will contain live
payment keys.

Then in Vercel: **Add New → Project → Import** your repo. Framework preset
detects Next.js automatically. Do **not** deploy yet — add the environment
variables first (§2 onwards), or the first build will fail on a missing
database.

---

## 2. Database (PostgreSQL)

### Create it

**Neon** (recommended): neon.tech → New Project → copy both connection strings.
Neon gives you a *pooled* string (host contains `-pooler`) and a *direct* one.

**Or Vercel Postgres**: Vercel → Storage → Create → Postgres → Connect to
project. It injects `POSTGRES_*` variables; copy the values into the two names
this project expects.

### Set the variables

Vercel → Project → Settings → Environment Variables (tick **Production**,
**Preview** and **Development** for each):

```
DATABASE_URL = postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require
DIRECT_URL   = postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require
```

> `DATABASE_URL` **must** be the pooled string. Serverless functions open a new
> connection per invocation and will exhaust a direct connection limit within
> minutes of real traffic.

### Create the tables

Run once from your machine, with the same values in your local `.env`:

```bash
npx prisma migrate dev --name init   # first time — creates prisma/migrations/
git add prisma/migrations && git commit -m "db: initial migration" && git push
```

On every later deploy, apply migrations with:

```bash
npx prisma migrate deploy
```

### Seed the editable content

```bash
npm run db:seed
```

This copies the packages, gallery, carousel, process steps, testimonials and
FAQ that ship in `src/lib/` into the database, which is what makes them
editable at `/admin`. **Until you run it the site still renders correctly** —
every content read falls back to those same defaults — but the admin screens
will show nothing to edit.

Safe to re-run: it resets everything back to the shipped defaults. Use
`npm run db:seed:missing` to add only rows that do not exist yet and leave your
own edits untouched.

**Check it worked:** `npx prisma studio` opens a browser view of the tables
(`Order`, `OrderEvent`, `ContactMessage`, `ProcessedWebhook`, plus the content
tables `Package`, `PortfolioPiece`, `MediaAsset`, `ContentBlock` and friends).

---

## 3. Image storage (Cloudinary)

Every image on the site lives in Cloudinary — the artwork you upload at
`/admin/media` and the reference photos customers attach to an order.

cloudinary.com → Dashboard → **Product Environment Credentials**. Copy all
three into your environment:

```bash
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="..."
```

> The API secret is a write credential for your entire media library. It is
> read server-side only and must **never** be prefixed `NEXT_PUBLIC_`.

**Postgres never stores an image.** It stores the URL Cloudinary returns, and
nothing else — there is no `Bytes` column anywhere in `schema.prisma`. That is
what keeps an order row a few hundred bytes instead of a few megabytes, and it
is why the same URL can be pasted straight into the Google Sheet.

Uploads are organised into two folders so studio artwork is never mixed in with
order evidence:

| Folder            | What lands there                        |
| ----------------- | --------------------------------------- |
| `site/<folder>/`  | Gallery, carousel and package artwork    |
| `orders/YYYY-MM/` | Customer reference photos                |

> **Do not skip this.** With the variables unset the app falls back to writing
> files into `public/uploads/`, which works locally but is *refused in
> production* — serverless filesystems are read-only and wiped between
> requests. The code throws a clear error rather than silently losing a
> customer's photo (`src/lib/storage.ts`).

**Check it worked:** upload a gallery image at `/admin/media` and confirm it
appears in Cloudinary under `site/gallery/`. Then place a test order and
confirm the photo lands under `orders/YYYY-MM/` — and that its URL appears in
the photos column of your Google Sheet.

---

## 4. Stripe (card payments)

### Sandbox payments on Vercel previews

Sandbox payments should still mark orders PAID. Configure `STRIPE_SECRET_KEY`
and `STRIPE_WEBHOOK_SECRET` in Vercel's **Preview** environment using the same
Stripe sandbox. The webhook secret must belong to the deployed endpoint, not
the local `stripe listen` endpoint. Redeploy after changing variables.

Protected previews can open in your signed-in browser while rejecting Stripe
with **401 Protected by Vercel Authentication**. In Vercel project Settings >
Deployment Protection, create a **Protection Bypass for Automation** secret.
Configure the sandbox's webhook destination as:

```text
https://YOUR-PREVIEW-HOST/api/webhooks/stripe?x-vercel-protection-bypass=YOUR_BYPASS_SECRET
```

Keep this token private. It is separate from the Stripe `whsec_...` signing
secret; Stripe signatures are still required by the application. See
[Vercel's webhook bypass instructions](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

Subscribe to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
and `checkout.session.expired`. Point the destination at the latest deployment
or a stable branch alias that runs this code and uses the same order database.
After fixing the destination, resend the failed events in Stripe and verify
HTTP 200 and PAID in admin. Alternatively, use **Check Stripe payment** for an
existing pending order; it verifies the saved session with Stripe.

Checkout returns to the current trusted deployment or branch host, preserving
the customer's order cookie even when `NEXT_PUBLIC_SITE_URL` is a production
domain. The return page also verifies payment; webhooks remain necessary when
customers close their browser before returning. The canonical site URL still
controls SEO and does not need to be changed for every preview.

### Live payments

1. **Activate your account.** Stripe → Settings → Business — live keys do not
   work until this is done.
2. **Keys**: Developers → API keys. In *live* mode copy:
   ```
   STRIPE_SECRET_KEY                   = sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  = pk_live_...
   ```
3. **Webhook**: Developers → Webhooks → **Add endpoint**
   - URL: `https://www.your-domain.com/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `checkout.session.expired`
     - `charge.refunded`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET = whsec_...`
4. **Apple Pay** (optional): Settings → Payments → Payment methods → Apple Pay →
   add your domain.

> Without `STRIPE_WEBHOOK_SECRET`, customers can pay but **orders will never be
> marked paid and never reach your sheet.** This is the single most common
> launch-day mistake.

### Test it locally first

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# paste the whsec_... it prints into your local .env
```

Then place an order with test card `4242 4242 4242 4242`, any future expiry, any
CVC. Watch the `stripe listen` terminal show `checkout.session.completed → 200`.

---

## 5. PayPal

1. developer.paypal.com → Apps & Credentials → **Live** tab → Create app.
2. Copy:
   ```
   PAYPAL_ENV           = live
   PAYPAL_CLIENT_ID     = ...
   PAYPAL_CLIENT_SECRET = ...
   ```
3. Same app → **Webhooks → Add webhook**
   - URL: `https://www.your-domain.com/api/webhooks/paypal`
   - Events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`,
     `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`
   - Copy the **Webhook ID** → `PAYPAL_WEBHOOK_ID`

> `PAYPAL_ENV` defaults to `sandbox`. Leave it as `sandbox` while testing —
> sandbox credentials do **not** work against live and vice versa. Set it to
> `live` only when you are ready to take money.

Sandbox test accounts live under developer.paypal.com → Testing Tools → Sandbox
Accounts.

---

## 6. Google Sheet — the admin hand-off

This is where every paid order lands.

### Option A — Service account (recommended)

1. console.cloud.google.com → **New Project** (name it anything).
2. **APIs & Services → Library → Google Sheets API → Enable.**
3. **IAM & Admin → Service Accounts → Create service account.**
   Name it `sketchy-soul-bot`. Skip the optional role steps → Done.
4. Click the account → **Keys → Add key → Create new key → JSON.** A file
   downloads.
5. Open the JSON and copy two values into your environment variables:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL = sketchy-soul-bot@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY           = "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
   ```
   > Keep the literal `\n` escapes and the surrounding double quotes. Turning
   > them into real line breaks produces `error:1E08010C:DECODER routines` at
   > runtime. When pasting into the Vercel dashboard, paste the value exactly as
   > it appears in the JSON file.
6. Create a Google Sheet. Add two tabs named exactly **`Orders`** and
   **`Contacts`** (header rows are created automatically on first write).
7. **Share the sheet with the service-account email as *Editor*.**
   ← The step everyone forgets. Without it every write returns `403`.
8. From the sheet URL `docs.google.com/spreadsheets/d/**THIS-PART**/edit`:
   ```
   GOOGLE_SHEETS_ID = 1AbCdEf...
   ```

### Option B — Google Form (no cloud console)

Create a form with one short-answer question per field, use "Get pre-filled
link" to read the `entry.XXXX` ids, paste them into `src/lib/google-form.ts`,
and set `GOOGLE_FORM_ACTION_URL` to the form URL with `/viewform` replaced by
`/formResponse`. When that variable is set it is used instead of the Sheets API.

**Check it worked:** place a test order and watch a row appear. If it does not,
open `/admin` — the order will show `sheetStatus: FAILED` with the exact error,
and a **Retry** button.

---

## 7. Site URL, admin and email

```
NEXT_PUBLIC_SITE_URL       = https://www.your-domain.com     ← no trailing slash
NEXT_PUBLIC_CONTACT_EMAIL  = hello@your-domain.com
NEXT_PUBLIC_CONTACT_PHONE  = +94 77 000 0000
NEXT_PUBLIC_INSTAGRAM_URL  = https://instagram.com/yourhandle
NEXT_PUBLIC_WHATSAPP_URL   = https://wa.me/94770000000

ADMIN_PASSWORD             = a-long-random-passphrase
ADMIN_SESSION_SECRET       = <64 hex characters>
```

Generate the session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> `NEXT_PUBLIC_SITE_URL` is baked into canonical tags, the sitemap, share
> images and — critically — the Stripe/PayPal return URLs. A wrong value here
> sends paying customers to the wrong domain after checkout.

**Email** (required for contact-form email delivery; optional for order notifications):

Paid digital orders have a Digital delivery column. Paste an HTTPS portrait link
with download permissions for the customer, then select **Save & send portrait
email**. The link is saved for retries and the accepted email timestamp appears
after sending. Use **Resend portrait email** to send the saved link again, or enter a corrected link. Apply the
`20261025010000_order_digital_delivery` migration with `npm run db:deploy` before
using this feature. The link opens the hosted file; the email does not attach it.

The Orders dashboard includes a Shipping column for paid rolled orders. Enter the
tracking number and choose **Save & send shipping email** to notify the customer.
The number is saved even if email delivery fails, so you can retry. The dashboard
shows the email timestamp after Resend accepts the message; this is not proof of
inbox delivery. Use **Resend shipping email** to send the saved tracking number again.
Apply database migrations with `npm run db:deploy` before deploying this feature
(`20261025000000_order_shipping` adds tracking and notification timestamp fields).

```
RESEND_API_KEY     = re_...
EMAIL_FROM         = Sketchy Soul <orders@your-domain.com>   ← domain must be verified in Resend
ADMIN_NOTIFY_EMAIL = you@your-domain.com
```

Contact messages are emailed to **Admin → Page Copy → Contact details → Email**.
`EMAIL_FROM` remains the verified sender; the client's address is used as Reply-To.
Without `RESEND_API_KEY` and `EMAIL_FROM`, the contact form saves the message but
reports that email delivery failed. `ADMIN_NOTIFY_EMAIL` only controls order alerts.

---

## 8. Domain

Vercel → Project → Settings → **Domains → Add**. Point your registrar at the
records Vercel shows (usually an `A` record to `76.76.21.21`, or a `CNAME` to
`cname.vercel-dns.com` for `www`).

Pick **one** canonical host — `www.your-domain.com` *or* the apex — set it as
Primary, and let Vercel redirect the other. Then make `NEXT_PUBLIC_SITE_URL`
match it exactly. Two indexable hosts is a self-inflicted SEO problem.

HTTPS is automatic. The `Strict-Transport-Security` header in
`next.config.mjs` only takes effect once the domain is live on HTTPS.

---

## 9. Deploy

```bash
git push          # Vercel builds on every push to main
```

The build runs `prisma generate && next build`. It does **not** run migrations —
apply those yourself with `npx prisma migrate deploy` whenever the schema
changes.

**Check the deployment log** for the route table. Anything marked `ƒ` is
server-rendered on demand; `○` is static.

---

## 10. Content you must replace before launch

Most of this is now done **in the browser** at `/admin` — no code, no redeploy.
Run `npm run db:seed` first (§2) or the screens will be empty.

In `/admin`:

- [ ] **Photos** — upload the real scans. Crop gallery and carousel artwork to
      4:5; 1200×1500 is plenty. Write a real description for each: it is what
      Google Images ranks and what a screen reader announces.
- [ ] **Gallery** — replace the twelve seeded placeholders with real work and
      attach the scans. Nine to twelve strong pieces beats twenty uneven ones.
- [ ] **Homepage** — attach real artwork to the four carousel slides.
- [ ] **Packages** — confirm every price is what you actually want to charge,
      in USD. This is the single most expensive thing to get wrong.
- [ ] **Words → Client quotes** — the three seeded quotes are marked
      *placeholder* and are deliberately excluded from review structured data.
      Publishing invented reviews breaks Google's review-snippet policy and
      consumer law in most markets. Replace them with real, attributable quotes
      and untick "placeholder", or delete them.
- [ ] **Page Copy → About** — rewrite in the artist's real voice, and add a
      real studio photograph.
- [ ] **Page Copy → Contact** — check the response-time promise is one you can
      actually keep.

Still in code — search for `⚠️`:

- [ ] **`src/app/terms/page.tsx`** — fill in `[ your country ]`,
      `[ your city ]`, `[ registered business name ]`. Have a local lawyer read
      it if you are trading as a registered business. The privacy and shipping
      clause bodies are in code for the same reason.
- [ ] **`src/lib/site.ts`** — studio name, city and country (used in structured
      data, the header mark and the order emails).

---

## 11. Post-launch: get found

1. **Google Search Console** → Add property → verify with the DNS record *or*
   set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` to the meta-tag token.
2. Submit `https://www.your-domain.com/sitemap.xml` under **Sitemaps**.
3. Test your structured data: search.google.com/test/rich-results
4. Test your share card: paste a URL into WhatsApp or
   opengraph.xyz — you should see the gold portrait card.
5. Run PageSpeed Insights on `/` and `/gallery`.
6. **Analytics (optional):** set `NEXT_PUBLIC_GA_MEASUREMENT_ID`. It only loads
   after a visitor accepts analytics cookies — that is deliberate and legally
   required in the EU/UK.

---

## 12. Deploying somewhere other than Vercel

The app is standard Next.js and runs anywhere Node 20+ does. Two things change:

**Storage.** Cloudinary is not tied to any host, so this part needs no change.
To move to S3 or Cloudflare R2 instead, rewrite `saveFile()` and `deleteFile()`
in `src/lib/storage.ts` — nothing else in the app knows where images live, it
only ever sees the URL they return. Add the new public hostname to
`images.remotePatterns` in `next.config.mjs` or `next/image` returns 400.

**Self-hosting with Docker:**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

Behind Nginx, make sure `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
is set — the rate limiter reads it — and that the webhook routes are **not**
body-parsed or buffered by the proxy, or Stripe signature verification will
fail.

---

## 13. Launch-day smoke test

Do all of these against the live domain before you tell anyone the site exists:

- [ ] Home, gallery, packages, process, about, FAQ, contact all load on a phone
- [ ] The cookie banner appears, and **Decline** really stops analytics loading
      (check the Network tab for `googletagmanager`)
- [ ] Upload a photo in `/order` — it appears as a thumbnail
- [ ] Complete a real payment for the smallest package, with a real card
- [ ] The order appears in your Google Sheet within seconds, with working photo links
- [ ] You receive the studio notification email; the customer gets a confirmation
- [ ] `/order/success` shows the reference and says "Payment Received"
- [ ] `/admin` lists the order with `sheetStatus: SYNCED` and **no** warning banners
- [ ] `/admin/packages` shows your real prices, and `/packages` matches them
- [ ] Change a price in `/admin/packages`, reload `/packages` — the new price is
      there within a second, and a fresh checkout charges the new amount
- [ ] Refund that payment in Stripe/PayPal and confirm the order flips to `REFUNDED`
- [ ] `https://www.your-domain.com/robots.txt` allows crawling (it blocks
      previews only)
- [ ] A preview deployment's `/robots.txt` **disallows** everything

---

## Troubleshooting

| Symptom                                            | Cause and fix                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Build fails: `Environment variable not found: DATABASE_URL` | Add `DATABASE_URL` to Vercel for the environment being built.                             |
| Payment succeeds but no sheet row                  | `STRIPE_WEBHOOK_SECRET` missing/wrong, or the webhook URL points at the wrong domain. Check Stripe → Webhooks → the endpoint's delivery log. |
| Sheets `403 PERMISSION_DENIED`                     | The sheet is not shared with the service-account email as Editor.                                  |
| `error:1E08010C:DECODER routines`                  | `GOOGLE_PRIVATE_KEY` newlines are broken. It must contain literal `\n`, wrapped in double quotes.  |
| Uploads fail in production                         | Cloudinary not connected. Set the three `CLOUDINARY_*` variables on the host.                            |
| Images 404 in production but work locally          | Filename case. Linux is case-sensitive; Windows is not. Use lowercase-with-hyphens.                |
| PayPal returns to `/order/cancelled?reason=…`      | `PAYPAL_ENV` does not match the credentials (sandbox keys with `live`, or the reverse).            |
| `/admin` redirect loop                             | `ADMIN_SESSION_SECRET` is under 32 characters, or differs between deployments.                     |
| `/admin` content screens are empty                 | `npm run db:seed` has not been run against this database.                                          |
| An admin edit does not show on the public site     | The save revalidates by tag and path; if it persists, the deployment is serving a stale CDN entry — redeploy. Check the browser is not showing a cached page. |
| Gallery images 404 after deleting from Photos      | Expected: the piece falls back to the line drawing. Pick a new image for it. |
| Wrong domain after checkout                        | `NEXT_PUBLIC_SITE_URL` has a trailing slash or the wrong host.                                     |
| Preview URLs showing in Google                     | They shouldn't — `robots.ts` blocks `VERCEL_ENV=preview`. Verify the preview's `/robots.txt`.       |
