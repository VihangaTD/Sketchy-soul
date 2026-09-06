import { ImageResponse } from 'next/og';
import { site } from './site';

/**
 * The card that appears when a page is shared on WhatsApp, Facebook, LinkedIn,
 * Slack or X.
 *
 * Every page used to share the site-wide card, so a link to the gallery, the
 * price list and the FAQ all previewed identically — which tells a recipient
 * nothing about what they are being sent, and is the difference between a
 * shared link that gets opened and one that does not. Each page now names
 * itself on its own card.
 *
 * Drawn from the same palette as the site, so there is no static asset to keep
 * in sync. Preview any of them by visiting the path directly, e.g.
 * /gallery/opengraph-image.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

export function ogCard({
  eyebrow,
  headline,
  footnote,
}: {
  /** Small gold line above the headline — usually the page name. */
  eyebrow: string;
  headline: string;
  /** Optional line under the wordmark. Defaults to the studio's one-liner. */
  footnote?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // Satori (the renderer behind ImageResponse) wants the colour and
          // the gradient as separate properties — a combined `background`
          // shorthand fails the build.
          backgroundColor: '#0a0a0b',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(184,147,90,0.22), rgba(10,10,11,0) 60%)',
          color: '#f2efea',
          position: 'relative',
        }}
      >
        {/* Gold mount line, echoing the frames used across the site */}
        <div
          style={{
            position: 'absolute',
            inset: 36,
            border: '1px solid rgba(184,147,90,0.45)',
          }}
        />

        <svg width="132" height="132" viewBox="0 0 200 200" fill="none">
          <path
            d="M100 30 C60 30 45 65 48 100 C50 128 62 150 100 165 C138 150 150 128 152 100 C155 65 140 30 100 30Z"
            stroke="#b8935a"
            strokeWidth="1.6"
          />
          <path d="M78 92 C80 86 88 86 90 92" stroke="#d9bd8e" strokeWidth="1.6" />
          <path d="M110 92 C112 86 120 86 122 92" stroke="#d9bd8e" strokeWidth="1.6" />
          <path d="M97 100 C95 110 93 116 98 120" stroke="#d9bd8e" strokeWidth="1.4" />
          <path d="M84 134 C92 141 108 141 116 134" stroke="#d9bd8e" strokeWidth="1.6" />
        </svg>

        <div
          style={{
            marginTop: 26,
            fontSize: 22,
            letterSpacing: 10,
            textTransform: 'uppercase',
            color: '#b8935a',
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 60,
            letterSpacing: -1,
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.12,
          }}
        >
          {headline}
        </div>

        {/* Satori requires an explicit display:flex on any element with more
            than one child — a plain <div> with mixed text and spans fails. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 26,
            fontSize: 24,
            color: '#8a8a8f',
          }}
        >
          <span style={{ color: '#f2efea' }}>{site.markPrefix}</span>
          <span style={{ color: '#b8935a', marginLeft: -8 }}>{site.markSuffix}</span>
          <span style={{ color: '#b8935a' }}>·</span>
          <span>{footnote ?? 'Custom portraits from your photo'}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
