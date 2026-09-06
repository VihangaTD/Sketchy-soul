/**
 * Next.js configuration — Sketchy Soul
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  DEPLOY CHECKLIST FOR THIS FILE
 *  1. `images.remotePatterns` below must include the host that serves your
 *     uploaded reference photos and gallery art.
 *       • Cloudinary   → `res.cloudinary.com`   (already added — this is what
 *                         src/lib/storage.ts uploads to)
 *       • Cloudflare R2 / S3 → add your public bucket hostname
 *     If a remote image host is missing here, next/image returns a 400 in prod.
 *  2. Nothing else in this file normally needs editing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Pin the workspace root to this folder. Without it, a stray package-lock
  // in a parent directory (very common under C:\Users\<you>) makes Next trace
  // the wrong root and warn on every build.
  outputFileTracingRoot: __dirname,

  /**
   * ⚠️ CLOUD-SYNCED FOLDERS (OneDrive / Dropbox / Google Drive)
   *
   * This project currently lives under OneDrive. Sync clients continuously
   * upload, lock and dehydrate files while Next rewrites `.next` on every
   * keystroke, which produces intermittent, misleading failures:
   *
   *     ENOENT: no such file or directory, open '.next\server\app\page.js'
   *     EPERM: operation not permitted, rename '...'
   *
   * There is no config flag that fixes this properly — `distDir` is always
   * resolved relative to the project root, and pointing it outside makes Next
   * rewrite tsconfig.json with a machine-specific path.
   *
   * The fix is to keep the project somewhere unsynced, e.g. C:\dev\Janindu.
   * See the "Working on Windows" section of README.md.
   */

  // Hide the `x-powered-by: Next.js` fingerprint.
  poweredByHeader: false,

  // gzip/brotli HTML + JSON responses when self-hosting (Vercel does this at the edge).
  compress: true,

  // Trailing slashes off keeps canonical URLs stable for SEO (one URL per page).
  trailingSlash: false,

  images: {
    // Modern formats first — cuts LCP image weight ~40% vs JPEG.
    formats: ['image/avif', 'image/webp'],
    // Breakpoints tuned for the layouts in this project.
    deviceSizes: [360, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [96, 128, 168, 192, 256, 384],
    // Optimised images are cached at the edge for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // ⚠️ DEPLOY: Cloudinary — every reference photo and every gallery upload.
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Kept so images uploaded before the move to Cloudinary still render.
      // Safe to delete once nothing in the database points at a blob URL.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // ⚠️ DEPLOY: uncomment / edit if you move storage elsewhere.
      // { protocol: 'https', hostname: 'cdn.your-domain.com' },
    ],
  },

  experimental: {
    // Only ship the icon/helper code actually imported.
    optimizePackageImports: ['zod'],
  },

  // Long-lived caching for immutable assets + baseline security headers.
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
      // HSTS is only meaningful once you are on HTTPS with your own domain.
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
    ];

    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Fingerprinted build output — safe to cache forever.
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Static art in /public — 1 day in the browser, 1 year at the CDN,
        // served stale while it revalidates so visitors never wait on it.
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Never let a proxy cache a payment/order API response.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Friendly aliases → canonical URLs (keeps duplicate content out of Google).
      { source: '/pricing', destination: '/packages', permanent: true },
      { source: '/portfolio', destination: '/gallery', permanent: true },
      { source: '/book', destination: '/order', permanent: true },
    ];
  },
};

export default nextConfig;
