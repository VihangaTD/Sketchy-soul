'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SectionHead } from '@/components/SectionHead';
import { Block, Line, ProgressLine } from '@/components/Skeleton';
import { safeAdminPath } from '@/lib/admin/next-path';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  // The form reads ?next= from the URL, so it has to wait for the router.
  // A skeleton of itself keeps the card from popping in.
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <section className="section">
      <div className="shell mx-auto max-w-sm">
        <div className="flex flex-col items-center gap-3">
          <Line className="h-2.5 w-24" />
          <Line className="h-8 w-40" />
        </div>

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <Line className="h-2.5 w-32" />
            <Block className="h-11 w-full" />
          </div>
          <Block className="h-11 w-full" />
        </div>
      </div>
    </section>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Deliberately not `params.get('next')` as-is. That value is chosen by
        // whoever wrote the link, so `?next=https://evil.com` would walk the
        // studio owner off the site the instant their password is accepted —
        // straight onto a copy of this form. Only an in-app admin path is
        // honoured; anything else lands on the dashboard.
        router.replace(safeAdminPath(params.get('next')));
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Incorrect password.');
    } catch {
      // Without this the promise rejected unhandled, `busy` never cleared, and
      // the button sat on "Checking…" until the page was reloaded.
      setError('Could not reach the server. Check your connection and try again.');
    }

    setBusy(false);
  }

  return (
    <section className="section">
      <div className="shell mx-auto max-w-sm">
        <SectionHead as="h1" eyebrow="Studio Only" title="Sign In" />

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="field-label">
              Admin password
            </label>
            <input
              id="password"
              type="password"
              className={`field ${error ? 'field-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
            {error ? (
              <span role="alert" className="error-text">
                {error}
              </span>
            ) : null}
          </div>

          <button
            type="submit"
            className="btn-primary relative w-full overflow-hidden disabled:cursor-wait disabled:opacity-70"
            disabled={busy}
          >
            {busy ? 'Checking…' : 'Sign In'}
            {busy ? <ProgressLine /> : null}
          </button>
        </form>

        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-grey">
          The password is the ADMIN_PASSWORD environment variable. Change it in
          your host&apos;s dashboard, not in the code.
        </p>
      </div>
    </section>
  );
}
