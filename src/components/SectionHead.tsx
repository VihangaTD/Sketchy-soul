interface Props {
  eyebrow: string;
  title: string;
  /** Optional supporting sentence under the title. */
  lede?: string;
  align?: 'center' | 'left';
  /** Renders the title as <h1> on pages where this is the page heading. */
  as?: 'h1' | 'h2';
  className?: string;
}

/** Eyebrow → gold rule → serif heading. The rhythm used by every section. */
export function SectionHead({
  eyebrow,
  title,
  lede,
  align = 'center',
  as = 'h2',
  className = '',
}: Props) {
  const Heading = as;
  const centered = align === 'center';

  return (
    <div
      className={`${centered ? 'text-center' : 'text-left'} ${className}`}
    >
      <p className="eyebrow mb-2.5">{eyebrow}</p>
      <span
        className={`mb-5 block h-px w-9 bg-gold ${centered ? 'mx-auto' : ''}`}
        aria-hidden="true"
      />
      <Heading className={as === 'h1' ? 'display' : 'heading'}>{title}</Heading>
      {lede ? (
        <p className={`lede mt-4 ${centered ? 'mx-auto max-w-[46ch]' : 'max-w-[52ch]'}`}>
          {lede}
        </p>
      ) : null}
    </div>
  );
}
