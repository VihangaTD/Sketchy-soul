'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useFormStatus } from 'react-dom';

import { ProgressLine } from '@/components/Skeleton';

/**
 * The save and delete buttons at the bottom of every admin form.
 *
 * Saving goes through a server action: a round trip to the database and a
 * revalidation of the public pages it feeds. On a slow connection that is a
 * second or two of a page that looks like nothing happened, and the artist
 * clicks Save again. `useFormStatus` reads the pending state of the enclosing
 * <form>, so the buttons can say what is going on.
 *
 * They have to be client components to do that, which is why they live here
 * rather than in Fields.tsx — that file is imported by server pages and
 * re-exports these.
 */

type Intent = 'save' | 'delete';

/**
 * Which button was clicked.
 *
 * Save and Delete submit the *same* form, so `useFormStatus` reports both as
 * pending whichever one was pressed. The button that was clicked records
 * itself here so the other does not claim its pending state and announce
 * "Saving…" during a delete.
 *
 * This deliberately is not a hidden field or a `name` on the button: React
 * uses a submit button's `name` to encode which server action to invoke and
 * overrides anything set there, which is exactly the warning that sent us
 * here.
 */
const IntentContext = createContext<{ intent: Intent; claim: (intent: Intent) => void }>({
  intent: 'save',
  claim: () => {},
});

/** The save / delete row at the bottom of an editor. */
export function Actions({ children }: { children: ReactNode }) {
  const [intent, setIntent] = useState<Intent>('save');

  return (
    <IntentContext.Provider value={{ intent, claim: setIntent }}>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        {children}
        <SavedFlash />
      </div>
    </IntentContext.Provider>
  );
}

/**
 * Confirms a save actually happened.
 *
 * Server actions revalidate in place: the button returns from "Saving…" to
 * "Save" and the page looks identical, because the values it re-renders are
 * the ones already on screen. There was nothing to distinguish a save that
 * worked from a click that missed the button, so the honest response was to
 * press Save again and hope — which is how a price gets edited twice.
 *
 * Reading the form's pending state and reporting the moment it falls back to
 * idle costs no server round trip and covers every admin form at once.
 */
function SavedFlash() {
  const { pending } = useFormStatus();
  const { intent } = useContext(IntentContext);
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    // The falling edge — pending was true on the previous render and is not
    // now — is the completion. A delete navigates or removes the row, so only
    // a save is worth announcing.
    if (wasPending.current && !pending && intent === 'save') setSaved(true);
    wasPending.current = pending;
  }, [pending, intent]);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 3500);
    return () => window.clearTimeout(id);
  }, [saved]);

  if (!saved) return null;

  return (
    <span
      // Announced by a screen reader without stealing focus from the form.
      role="status"
      className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-gold-soft"
    >
      <span aria-hidden="true">✓</span>
      Saved
    </span>
  );
}

/** "Add slide" while idle reads better as "Adding…" than "Add slide…". */
const PENDING_LABELS: Record<string, string> = {
  save: 'Saving…',
  add: 'Adding…',
  upload: 'Uploading…',
  publish: 'Publishing…',
};

function pendingLabel(label: string): string {
  return PENDING_LABELS[label.split(' ')[0]?.toLowerCase() ?? ''] ?? 'Working…';
}

export function Save({ label = 'Save' }: { label?: string }) {
  const { pending } = useFormStatus();
  const { intent, claim } = useContext(IntentContext);
  const busy = pending && intent === 'save';

  return (
    <button
      type="submit"
      onClick={() => claim('save')}
      disabled={pending}
      className="btn-primary btn-sm relative overflow-hidden disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? pendingLabel(label) : label}
      {busy ? <ProgressLine /> : null}
    </button>
  );
}

/**
 * Destructive submit button.
 *
 * `formAction` lets a single <form> carry both a save and a delete button, so
 * the delete does not need its own nested form (which HTML forbids anyway).
 * The confirm dialog is why this has to be a client component; without
 * JavaScript the button still submits, which is the correct fallback for an
 * admin-only screen behind a password.
 */
export function Danger({
  action,
  label,
  confirm,
}: {
  /** A server action, passed down from the server component that renders this. */
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  confirm: string;
}) {
  const { pending } = useFormStatus();
  const { intent, claim } = useContext(IntentContext);
  const deleting = pending && intent === 'delete';

  return (
    <button
      type="submit"
      formAction={action}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) {
          event.preventDefault();
          return;
        }
        claim('delete');
      }}
      // `order-last` keeps Delete pinned to the right edge even though the
      // "Saved" confirmation is rendered after it in the DOM.
      className="order-last ml-auto text-[11px] uppercase tracking-[0.12em] text-[#e08b84] transition-colors hover:text-[#f0a9a3] disabled:cursor-wait disabled:opacity-60"
    >
      {deleting ? 'Deleting…' : label}
    </button>
  );
}
