/**
 * The gold line-drawn faces from the UI concept, as reusable SVG.
 *
 * These are the placeholder that appears anywhere a real photograph has not
 * been supplied yet (gallery entries without `image`, package cards, the hero
 * slideshow). They are inline SVG rather than files so they inherit the theme
 * colours, weigh nothing, and never produce a broken-image 404 on a fresh
 * deploy. Swap in real scans via src/lib/portfolio.ts — no code change needed.
 */

type Variant = 1 | 2 | 3;

interface Props {
  variant?: Variant;
  className?: string;
  /** Decorative by default; give it a title when it carries meaning. */
  title?: string;
}

export function SketchPortrait({ variant = 1, className = '', title }: Props) {
  const decorative = !title;

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {variant === 1 ? <FaceOne /> : variant === 2 ? <FaceTwo /> : <FaceThree />}
    </svg>
  );
}

function FaceOne() {
  return (
    <>
      <path
        d="M100 30 C60 30 45 65 48 100 C50 128 62 150 100 165 C138 150 150 128 152 100 C155 65 140 30 100 30Z"
        stroke="#b8935a"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="M78 92 C80 86 88 86 90 92" stroke="#d9bd8e" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M110 92 C112 86 120 86 122 92" stroke="#d9bd8e" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M97 100 C95 110 93 116 98 120 C101 122 104 121 105 119" stroke="#d9bd8e" strokeWidth="1" />
      <path d="M84 134 C92 141 108 141 116 134" stroke="#d9bd8e" strokeWidth="1.1" strokeLinecap="round" />
    </>
  );
}

function FaceTwo() {
  return (
    <>
      <ellipse cx="100" cy="95" rx="52" ry="62" stroke="#b8935a" strokeWidth="1.1" />
      <path d="M76 88 Q84 82 92 88" stroke="#d9bd8e" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M108 88 Q116 82 124 88" stroke="#d9bd8e" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M98 100 Q94 112 100 116" stroke="#d9bd8e" strokeWidth="1" />
      <path d="M82 130 Q100 140 118 130" stroke="#d9bd8e" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M60 60 Q100 30 140 60" stroke="#8a8a8f" strokeWidth="0.6" strokeDasharray="1 4" />
    </>
  );
}

function FaceThree() {
  return (
    <>
      <path
        d="M100 34 C64 34 50 66 52 98 C54 126 66 148 100 162 C134 148 146 126 148 98 C150 66 136 34 100 34Z"
        stroke="#b8935a"
        strokeWidth="1.1"
      />
      <circle cx="84" cy="92" r="3" fill="#d9bd8e" />
      <circle cx="116" cy="92" r="3" fill="#d9bd8e" />
      <path d="M92 128 Q100 134 108 128" stroke="#d9bd8e" strokeWidth="1.1" strokeLinecap="round" />
    </>
  );
}

/** Small 64px mark used inside portfolio thumbnails. */
export function SketchMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M32 8c-14 0-20 12-18 26 2 12 9 20 18 24 9-4 16-12 18-24 2-14-4-26-18-26Z"
        stroke="#d9bd8e"
        strokeWidth="1"
      />
    </svg>
  );
}
