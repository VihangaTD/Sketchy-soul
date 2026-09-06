# Where your artwork goes

The site ships with hand-coded gold line drawings as placeholders, so it looks
finished before you have uploaded anything. Replace them here.

```
public/images/
├── gallery/
│   ├── single.png   ← homepage carousel  ⚠️ placeholder — replace these four
│   ├── couple.png   ←
│   ├── family.png   ←
│   ├── pets.png     ←
│   └── …            ← your finished portraits for the /gallery page
├── hero/        ← 1–3 hero slideshow images
└── about/       ← a photo of you / the studio desk
```

## The homepage carousel (start here)

`single.png`, `couple.png`, `family.png` and `pets.png` are **generated
placeholders**. Overwrite them with real scans, cropped to **4:5 portrait**,
keeping the same filenames — no code change needed.

Prefer `.webp` or `.jpg`? Save them with that extension instead and update the
matching `image:` path in `src/lib/portfolio.ts` (`STUDIO_CAROUSEL`, near the
top of the file). While you are there, rewrite each `alt` to describe the
actual drawing.

To regenerate the placeholders at any time:

```bash
node scripts/generate-placeholders.mjs
```

## How to add a gallery piece

1. Export the scan or photo as **.webp** (or .jpg), about **1600px** on the
   long edge, under ~400 KB.
2. Save it here, e.g. `public/images/gallery/portrait-i.webp`.
3. Open `src/lib/portfolio.ts` and set the entry's `image` and `alt`:

```ts
{
  slug: 'portrait-i',
  title: 'Portrait I',
  // ...
  image: '/images/gallery/portrait-i.webp',
  alt: 'Graphite portrait of an older man in soft window light',
}
```

That is the whole change — `next/image` handles resizing, AVIF/WebP conversion
and lazy loading automatically.

## Hero slideshow

Edit the `slides` array in `src/app/page.tsx`:

```ts
slides={[
  { sketch: 1, image: '/images/hero/one.webp', alt: 'A finished A4 graphite portrait' },
  { sketch: 2 },  // still a placeholder — perfectly fine to mix
]}
```

## Alt text matters

`alt` is what Google Images ranks you on and what a screen reader announces.
Describe the subject and the medium — *"Charcoal portrait of a smiling
grandmother"* — not *"IMG_4821"*.

## File naming

Lowercase, hyphens, no spaces: `family-of-four.webp`, not `Family Of Four.WEBP`.
Deployment targets are case-sensitive even though Windows is not, and a
capital letter in a filename is the single most common cause of images that
work locally and 404 in production.
