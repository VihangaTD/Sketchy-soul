/**
 * Generates the four placeholder carousel images.
 *
 *   node scripts/generate-placeholders.mjs
 *
 * WHY THIS EXISTS
 * The homepage carousel points at /images/gallery/single.png, couple.png,
 * family.png and pets.png. Rather than ship a carousel that 404s until you
 * upload artwork, this writes real PNGs with the studio's paper-tooth texture
 * so the section looks finished from the first `npm run dev`.
 *
 * TO USE YOUR OWN ARTWORK
 * Overwrite the four files with your scans, keeping the same names — or
 * change the `image` paths in src/lib/portfolio.ts if you prefer .webp/.jpg.
 * You never need to run this script again.
 *
 * No image library is used: PNG is a simple enough container to write by hand
 * with Node's built-in zlib, which keeps this out of package.json.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WIDTH = 900;
const HEIGHT = 1125; // 4:5, the ratio every frame on the site uses

/** Each category gets a slightly different cast so the four are tellable apart. */
const VARIANTS = [
  { name: 'single', top: [44, 44, 48], bottom: [17, 17, 20], warmth: 1.0 },
  { name: 'couple', top: [48, 44, 42], bottom: [20, 17, 16], warmth: 1.08 },
  { name: 'family', top: [42, 45, 50], bottom: [16, 18, 21], warmth: 0.94 },
  { name: 'pets', top: [47, 43, 38], bottom: [19, 17, 14], warmth: 1.12 },
];

/* ── Minimal PNG encoder ─────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));

  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Every scanline is prefixed with its filter byte (0 = none).
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── The artwork itself ──────────────────────────────────────────────────── */

function render({ top, bottom, warmth }) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      // 160deg linear gradient, matching .frame in globals.css
      const t = Math.min(1, (x * 0.34 + y * 0.94) / (WIDTH * 0.34 + HEIGHT * 0.94));
      const ease = t * t * (3 - 2 * t);

      let r = top[0] + (bottom[0] - top[0]) * ease;
      let g = top[1] + (bottom[1] - top[1]) * ease;
      let b = top[2] + (bottom[2] - top[2]) * ease;

      // Pencil tooth: a hairline every 3px on a 115deg diagonal
      const hatch = Math.round(x * 0.42 + y * 0.91);
      if (hatch % 3 === 0) {
        r += 7;
        g += 7;
        b += 7;
      }

      // Soft gold wash falling from the top, echoing the hero
      const dx = (x - WIDTH / 2) / WIDTH;
      const dy = y / HEIGHT;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx * 3 + dy * dy * 1.6)) * 26;
      r += glow * 1.15 * warmth;
      g += glow * 0.92;
      b += glow * 0.55;

      const i = (y * WIDTH + x) * 3;
      pixels[i] = clamp(r);
      pixels[i + 1] = clamp(g);
      pixels[i + 2] = clamp(b);
    }
  }

  return pixels;
}

const outDir = path.join(process.cwd(), 'public', 'images', 'gallery');
mkdirSync(outDir, { recursive: true });

for (const variant of VARIANTS) {
  const file = path.join(outDir, `${variant.name}.png`);
  const png = encodePng(WIDTH, HEIGHT, render(variant));
  writeFileSync(file, png);
  console.log(`${variant.name}.png  ${(png.length / 1024).toFixed(0)} KB`);
}

console.log('\nDone. Overwrite these with your own scans when you have them.');
