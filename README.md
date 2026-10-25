# Sketchy Soul — Portrait Studio

A production-ready portfolio + commerce site for a hand-drawn portrait studio,
built to match the approved mobile UI concept exactly and scale up cleanly to
tablet and desktop.

Visitors browse the gallery, pick a package, upload the photo they want drawn,
pay by card or PayPal, and the order lands in the studio's **Google Sheet**
automatically.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · PostgreSQL via
Prisma · Stripe + PayPal · Cloudinary · Google Sheets API

---

## Quick start

```bash
npm install
cp .env.example .env        # Windows: Copy-Item .env.example .env
# fill in .env — see the comments in that file
npx prisma migrate dev --name init
npm run db:seed             # copies the default content into the editable tables
npm run dev                 # http://localhost:3000
```

The site runs with **no keys at all** — the gallery, packages, process, about,
FAQ and legal pages all work. You only need credentials for the parts that
touch money, storage or Google.

| Want to test…            | Set these                                              |
| ------------------------ | ------------------------------------------------------ |
| The whole site's design  | nothing                                                 |
| The order form           | `DATABASE_URL` (uploads fall back to `public/uploads/`) |
| Card checkout            | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`            |
| PayPal checkout          | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`              |
| Orders reaching a sheet  | `GOOGLE_SHEETS_ID` + service account                    |
| The admin dashboard      | `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`                |
| Editing content in `/admin` | `DATABASE_URL` + `npm run db:seed`                   |

**Deploying? Read [DEPLOYMENT.md](DEPLOYMENT.md).** It is a numbered checklist
of everything that has to change before the site takes real money.

---

## Editing the site without touching code

Sign in at `/admin` and everything below can be changed from the browser. No
redeploy, no build — a save takes effect on the next request.

| Screen              | What it controls                                                        |
| ------------------- | ----------------------------------------------------------------------- |
| **Orders**          | Every commission, sheet-sync status, retry button, config warnings       |
| **Packages**        | Prices, sizes, what's included, extras, mediums, delivery, extra subjects |
| **Gallery**         | The pieces on `/gallery` — artwork, titles, categories, captions, order  |
| **Homepage**        | The four "From the Studio" carousel slides                               |
| **Page Copy**       | Every sentence on the home, about, contact, gallery, packages, process, FAQ and order pages |
| **Words**           | Order process steps, client quotes, the FAQ, the promises under the hero |
| **Photos**          | The media library — upload once, then pick the image from any screen     |

Two things are deliberately **not** editable from `/admin`:

- **Page layout.** Copy is edited as labelled fields rather than a rich-text
  box, so the design and its responsive behaviour cannot be broken by an edit.
- **Legal clause bodies** in `/terms`, `/privacy` and `/shipping`. That text
  wants a lawyer and a version-controlled diff, not a textarea. The delivery
  options listed on `/shipping` do come from the Packages screen.

### How the fallback works

The arrays in `src/lib/{packages,portfolio,content}.ts` and the registry in
`src/lib/cms/copy.ts` are the **seed defaults**, not dead code. Any collection
with no rows in the database — or an unreachable database, or one where
migrations have not run yet — falls back to them. That is why a fresh clone
with no `DATABASE_URL` still builds and renders a complete site, and why
`npm run db:seed` is what makes content *editable* rather than what makes it
*appear*.

Re-running `npm run db:seed` resets everything to those defaults. Use
`npm run db:seed:missing` to add only what is absent and leave your edits
alone.

---

## Working on Windows

**Run exactly one dev server.** Two `next dev` processes sharing a `.next`
directory will fight: one rewrites `.next/server/app/page.js` while the other
reads it, and you get

```
Error: ENOENT: no such file or directory, open '.next\server\app\page.js'
```

Check before starting a second one:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

**Do not run `next build` while `next dev` is running** — same reason, and the
symptom is more confusing. `build` replaces `.next` with production output, so
the dev server then asks for dev-only chunks that no longer exist:

```
Refused to execute script from '.../main-app.js' because its MIME type
('text/plain') is not executable, and strict MIME type checking is enabled.
```

Those are 404 pages being served as `text/plain`, not a Content-Type bug. Stop
the dev server, delete `.next`, and start it again:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

To check your work *while* a dev server is up, use the commands that never
touch `.next`:

```powershell
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

Those catch the overwhelming majority of mistakes. Save `npm run build` for
when the dev server is stopped — there is no supported way to redirect the
output directory per-run (`distDir` is a `next.config.mjs` setting, and
pointing it elsewhere has its own problems, below).

**Keep the project out of OneDrive / Dropbox / Google Drive.** Sync clients
continuously upload, lock and dehydrate files. `node_modules` alone is ~25,000
files, and Next rewrites `.next` on every keystroke, so sync and the dev server
end up racing each other — producing intermittent `ENOENT` and `EPERM` errors
that look like code bugs but are not.

```powershell
# one-time move, from the project's parent folder
Move-Item "$env:USERPROFILE\OneDrive\Desktop\Janindu" "C:\dev\Janindu"
cd C:\dev\Janindu
npm install        # rebuilds native binaries for the new path
```

There is no config setting that solves this properly — `distDir` is always
resolved relative to the project root, and pointing it outside causes Next to
rewrite `tsconfig.json` with a machine-specific path.

**After deleting or renaming a component, or editing `next.config.mjs` /
`tailwind.config.ts`, clear the cache.** Dev HMR does not always invalidate
cleanly, and a stale chunk shows up as
`Cannot read properties of undefined (reading 'call')`:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

Production builds are never affected — `npm run build` compiles from scratch.

## Pages

| Route              | What it is                                       | Rendering              |
| ------------------ | ------------------------------------------------ | ---------------------- |
| `/`                | Home — hero, works, process, packages, reviews    | Static, 1h revalidate  |
| `/gallery`         | Filterable portfolio with lightbox                | Static, 1h revalidate  |
| `/packages`        | Full pricing, add-ons, delivery, comparison table | Static, 1h revalidate  |
| `/process`         | The five-step commission process + photo guidance | Static, 1h revalidate  |
| `/about`           | The artist's story                                | Static, 1h revalidate  |
| `/faq`             | Ten answers, emitted as FAQ structured data       | Static, 1h revalidate  |
| `/contact`         | Contact / custom quote form                       | Static, 1h revalidate  |
| `/order`           | Four-step commission wizard with photo upload     | Dynamic                |
| `/order/success`   | Confirmation, self-refreshing while payment clears | Dynamic, never cached |
| `/order/cancelled` | Nothing was charged, resume where you left off    | Dynamic                |
| `/terms`           | Commission terms                                  | Static, 1d revalidate  |
| `/privacy`         | Privacy + a live cookie table                     | Static, 1d revalidate  |
| `/shipping`        | Shipping, customs, damage and returns             | Static, 1d revalidate  |
| `/admin`           | Private order dashboard                           | Dynamic, password      |
| `/sitemap.xml`     | Generated from the route + package data           | Static                 |
| `/robots.txt`      | Blocks previews and private routes                | Static                 |
| `/opengraph-image` | 1200×630 social share card, generated             | Static                 |

---

## How an order actually works

```
Customer                    This app                        Elsewhere
────────                    ────────                        ─────────
picks a package
uploads a photo   ────────► POST /api/upload      ────────► Cloudinary
                            (only the URL is kept)
                            (original file, no resizing or compression)
fills the form
presses Pay       ────────► POST /api/checkout
                            • re-prices from the catalog
                            • saves Order (AWAITING_PAYMENT) ► Postgres
                            • creates the payment          ► Stripe / PayPal
                  ◄──────── redirect URL
pays on Stripe/PayPal ─────────────────────────────────────► money captured
                            POST /api/webhooks/stripe  ◄────
                            POST /api/webhooks/paypal  ◄────
                            • marks Order PAID
                            • appends a row            ────► Google Sheet ★
                            • emails customer + studio ────► Resend (optional)
lands on /order/success
```

★ **This is the admin hand-off you asked for.** The Google Sheet is the studio's
order book — one row per paid commission, with clickable links to the customer's
reference photos. A Google *Form* is supported as an alternative if you would
rather not create a service account (see `src/lib/google-form.ts`).

Three things make this safe:

- **Prices are recomputed server-side.** The browser only sends ids; a tampered
  request cannot buy an A2 for $1. (`priceOrder()` in `src/lib/packages.ts`)
- **Webhooks are verified and idempotent.** Stripe signatures are checked, PayPal
  events are verified with PayPal's own API, and each event id is claimed once.
- **A failed Sheet write never loses an order.** It is recorded in Postgres with
  `sheetStatus: FAILED` and can be retried with one click from `/admin`.

---

## Where to edit things

| To change…                       | Edit                                  |
| -------------------------------- | ------------------------------------- |
| Studio name, contact, socials    | `src/lib/site.ts`                     |
| Prices, sizes, add-ons, delivery | `src/lib/packages.ts`                 |
| Gallery pieces                   | `src/lib/portfolio.ts`                |
| Process steps, FAQs, reviews     | `src/lib/content.ts`                  |
| Colours, fonts, spacing          | `tailwind.config.ts` + `globals.css`  |
| Which cookies are set            | `src/lib/cookies.ts`                  |
| Your actual artwork              | `public/images/` (see its README)     |

Every one of those files opens with a comment explaining what it drives.

---

## Caching

- **Marketing pages** are pre-rendered to static HTML and regenerated hourly
  (`export const revalidate = 3600`), so the CDN serves them instantly.
- **Immutable assets** (`/_next/static`, fonts) get `max-age=31536000, immutable`;
  images in `/public/images` get a year at the CDN with `stale-while-revalidate`.
- **HTML** is served `stale-while-revalidate` by the middleware — repeat visits
  render from cache while a fresh copy is fetched in the background.
- **Anything private** (`/admin`, `/order/success`, every `/api/*` route) is
  explicitly `no-store`, so a shared proxy can never leak one customer's order
  to another.
- **Uploaded photos** are stored with a one-year cache header; they never change.

## Cookies

Two are set before consent, both strictly necessary (the consent choice itself,
and the commission draft so a refresh does not wipe the form). Analytics
cookies, the anonymous visitor id and the campaign attribution cookie are only
written **after** the visitor accepts — and Google Analytics is not loaded at
all until then. The table on `/privacy` is generated from the same source of
truth (`src/lib/cookies.ts`), so it cannot drift out of date.

## SEO

Per-page titles and descriptions, canonical URLs, Open Graph and Twitter cards,
a generated 1200×630 share image, a sitemap, a robots.txt that blocks preview
deployments, and structured data on every page: `Organization`/`LocalBusiness`,
`WebSite`, `Service`, `Product` per package, `HowTo` for the process,
`FAQPage`, `BreadcrumbList` and `CollectionPage` for the gallery.

---

## Scripts

```bash
npm run dev         # development server
npm run build       # prisma generate + production build
npm start           # run the production build
npm run typecheck   # TypeScript, no emit
npm run lint        # ESLint
npm run db:migrate  # create + apply a migration locally
npm run db:deploy   # apply migrations in production
npm run db:studio   # browse the database
```

## Before you go live

Search the codebase for `⚠️` — every line that needs a real value before launch
is marked. The must-dos:

1. Replace the placeholder testimonials in `src/lib/content.ts` with real ones.
2. Fill in `[ your country ]` / `[ registered business name ]` in `/terms`.
3. Rewrite `/about` in the artist's own words.
4. Add real artwork to `public/images/gallery/`.
5. Work through [DEPLOYMENT.md](DEPLOYMENT.md) end to end.
