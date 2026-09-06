'use client';

import { useEffect } from 'react';

import { DatabaseNotice } from '@/components/admin/DatabaseNotice';

/**
 * Error boundary for every /admin screen.
 *
 * In practice the only thing that reaches here is a database that cannot be
 * reached — every admin screen queries Postgres directly, with none of the
 * fall-back-to-defaults behaviour the public pages get. A stack trace is a
 * poor answer on the one page somebody opens *to find out what is wrong*, so
 * this names the likely cause and gives the command that fixes it.
 *
 * Note: in production React redacts server-render messages, so the notice
 * shows its generic branch there. In development — which is where a missing
 * DATABASE_URL actually happens — the real message comes through.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <div className="py-4">
      <DatabaseNotice error={error} />

      <div className="shell mt-6 max-w-2xl">
        <button type="button" onClick={reset} className="btn-ghost btn-sm">
          Try again
        </button>
      </div>
    </div>
  );
}
