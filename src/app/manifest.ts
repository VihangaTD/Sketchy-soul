import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/**
 * PWA manifest — lets a visitor add the studio to their phone home screen and
 * gives Android the right theme colours in the browser chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.shortDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    orientation: 'portrait',
    categories: ['art', 'shopping', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
