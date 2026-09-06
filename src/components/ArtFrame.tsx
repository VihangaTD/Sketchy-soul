import Image from 'next/image';
import { SketchPortrait } from './SketchPortrait';

interface Props {
  src?: string;
  alt?: string;
  sketch?: 1 | 2 | 3;
  /** Tailwind aspect ratio class — matches the 4:5 mounts in the concept. */
  ratio?: string;
  className?: string;
  /** `sizes` for next/image. Get this right or mobiles download desktop JPEGs. */
  sizes?: string;
  /** Set on the first gallery image above the fold to improve LCP. */
  priority?: boolean;
  hover?: boolean;
}

/**
 * The gold-mounted artwork frame used everywhere on the site.
 *
 * Renders a real optimised photo when `src` is given, and falls back to the
 * built-in line drawing when it is not — so the site looks finished before a
 * single scan has been uploaded.
 */
export function ArtFrame({
  src,
  alt,
  sketch = 1,
  ratio = 'aspect-[4/5]',
  className = '',
  sizes = '(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 300px',
  priority = false,
  hover = true,
}: Props) {
  return (
    <div className={`frame ${hover ? 'frame-hover' : ''} ${ratio} ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <SketchPortrait variant={sketch} className="h-[46%] w-[46%] opacity-90" />
      )}
    </div>
  );
}
