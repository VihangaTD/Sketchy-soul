import type { Config } from 'tailwindcss';

/**
 * The palette below is lifted 1:1 from the approved mobile UI concept so the
 * production site is visually identical to the mock-up.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        black: '#0a0a0b',
        charcoal: '#151517',
        card: '#1b1b1e',
        gold: '#b8935a',
        'gold-soft': '#d9bd8e',
        ivory: '#f2efea',
        grey: '#8a8a8f',
        hairline: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        // Bound to the next/font CSS variables declared in src/app/layout.tsx.
        // `font-serif` is the display face, `font-sans` everything else.
        serif: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.25em',
        cta: '0.12em',
        // Fraunces is wider than a transitional serif — large sizes need
        // pulling in slightly or headlines drift apart.
        display: '-0.015em',
      },
      maxWidth: {
        shell: '1200px',
        prose: '68ch',
      },
      backgroundImage: {
        // The "pencil tooth" paper texture used behind every artwork frame.
        tooth:
          'repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)',
        'frame-fill': 'linear-gradient(160deg, #2a2a2d, #131315 70%)',
        'slide-fill': 'linear-gradient(160deg, #232326, #101012 75%)',
        'gold-wash':
          'radial-gradient(120% 90% at 50% -10%, rgba(184,147,90,0.14), transparent 60%)',
      },
      keyframes: {
        fadeSlide: {
          '0%': { opacity: '0' },
          '4%': { opacity: '1' },
          '30%': { opacity: '1' },
          '36%': { opacity: '0' },
          '100%': { opacity: '0' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeSlide: 'fadeSlide 12s infinite',
        riseIn: 'riseIn 0.6s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
      transitionTimingFunction: {
        studio: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
