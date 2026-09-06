import type { ReactNode } from 'react';

/**
 * Form primitives shared by every admin screen.
 *
 * Deliberately plain: label + input, no client state, no validation library.
 * Each editor is a real <form> posting to a server action, so the screens work
 * with JavaScript still loading and there is nothing to keep in sync.
 */

export function Field({
  label,
  hint,
  children,
  className = '',
  group = false,
}: {
  label: string;
  /** One line under the input explaining what it affects on the live site. */
  hint?: string;
  children: ReactNode;
  className?: string;
  /**
   * Set when the field holds more than one control — the media picker, which
   * is a button, a "Remove" link and its own labelled alt-text box.
   *
   * A <label> may only ever be tied to a single control. Wrapping the picker
   * in one produced nested labels, and made clicking the word "Artwork" (or
   * its hint) open the photo chooser, because the browser forwards a label
   * click to the first control it finds. A group renders as a plain block with
   * a heading instead.
   */
  group?: boolean;
}) {
  const body = (
    <>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-snug text-grey/70">{hint}</span> : null}
    </>
  );

  if (group) {
    return (
      <div role="group" aria-label={label} className={`block ${className}`}>
        {body}
      </div>
    );
  }

  return <label className={`block ${className}`}>{body}</label>;
}

export function Text({
  name,
  defaultValue,
  placeholder,
  required = false,
  maxLength = 200,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      name={name}
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      className="field"
    />
  );
}

export function Area({
  name,
  defaultValue,
  rows = 3,
  placeholder,
  maxLength = 4000,
}: {
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <textarea
      name={name}
      rows={rows}
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      maxLength={maxLength}
      className="field resize-y"
    />
  );
}

/** Price input in dollars. The action converts to cents on the way in. */
export function Money({ name, cents }: { name: string; cents: number }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-grey">
        $
      </span>
      <input
        type="number"
        name={name}
        step="0.01"
        min="0"
        defaultValue={(cents / 100).toFixed(2)}
        className="field pl-7"
        inputMode="decimal"
      />
    </div>
  );
}

export function Num({
  name,
  defaultValue,
  min = 0,
  max = 9999,
}: {
  name: string;
  defaultValue: number;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      name={name}
      defaultValue={defaultValue}
      min={min}
      max={max}
      className="field"
    />
  );
}

export function Select({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ''} className="field">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Check({
  name,
  label,
  defaultChecked = false,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        // The design token, not the yellower #c9a227 this used to hard-code —
        // admin checkboxes were visibly a different gold from every other
        // checkbox in the project.
        className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
      />
      <span>
        <span className="block text-[12.5px] text-ivory">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] leading-snug text-grey/70">{hint}</span> : null}
      </span>
    </label>
  );
}

/** A bordered block wrapping one editable record. */
export function Card({
  title,
  meta,
  muted = false,
  children,
}: {
  title: string;
  meta?: ReactNode;
  /** Dimmed styling for rows that are switched off. */
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`panel p-5 sm:p-6 ${muted ? 'opacity-55' : ''}`}>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-serif text-[19px] text-ivory">{title}</h2>
        {meta ? <p className="text-[11px] uppercase tracking-[0.12em] text-grey">{meta}</p> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * A collapsed record that opens to reveal its editor.
 *
 * Used on the screens that hold long lists — packages and the gallery — where
 * a dozen expanded forms is an unreadable wall. Collapsed, each row is a
 * scannable summary: name, price or year, and whether it is hidden.
 *
 * Built on <details>, so it needs no JavaScript and, importantly, the fields
 * inside a *closed* row are still in the DOM and still submit with the form.
 * That means nothing is lost by collapsing a row you had been editing.
 *
 * `id` + `open` let the server re-open the row you just saved — see the
 * `?open=` handling in the packages and gallery screens.
 */
export function Disclosure({
  id,
  title,
  meta,
  muted = false,
  open = false,
  children,
}: {
  id?: string;
  title: string;
  meta?: ReactNode;
  /** Dimmed styling for rows that are switched off. */
  muted?: boolean;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={open}
      className={`panel group scroll-mt-24 ${muted ? 'opacity-60' : ''}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden sm:px-6">
        <span className="min-w-0">
          <span className="block truncate font-serif text-[18px] text-ivory">{title}</span>
          {meta ? (
            <span className="mt-0.5 block text-[11px] uppercase tracking-[0.12em] text-grey">
              {meta}
            </span>
          ) : null}
        </span>

        <span
          aria-hidden="true"
          className="shrink-0 font-serif text-[22px] leading-none text-gold transition-transform duration-300 group-open:rotate-45"
        >
          +
        </span>
      </summary>

      <div className="border-t border-hairline px-5 py-5 sm:px-6">{children}</div>
    </details>
  );
}

// The save / delete row and its two buttons. They share the form's pending
// state — and which button was pressed — so they are client components.
// Re-exported here so an admin screen still imports its whole form kit from
// one place.
export { Actions, Save, Danger } from './Submit';
