import { SectionHead } from '@/components/SectionHead';

/**
 * Shown instead of an admin screen when the database cannot be reached.
 *
 * The admin is exactly where somebody goes to work out why the site is
 * misbehaving, so it is the worst possible place for a raw stack trace. Every
 * cause below is a first-run setup step with a one-line fix.
 *
 * Public pages never reach this — they fall back to the defaults in
 * src/lib and render normally (see src/lib/cms/cache.ts).
 */
export function DatabaseNotice({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const missingEnv = message.includes('Environment variable not found: DATABASE_URL');
  const missingTables = message.includes('does not exist in the current database');

  return (
    <section className="shell max-w-2xl">
      <SectionHead
        as="h1"
        align="left"
        eyebrow="Studio Only"
        title="No database"
        lede="Orders and content live in Postgres, so this screen needs a working connection. The public site is unaffected — it is rendering the defaults from the code."
      />

      <div className="panel mt-8 p-5 sm:p-6">
        {missingEnv ? (
          <>
            <h2 className="font-serif text-[19px] text-ivory">
              Prisma cannot see <code>DATABASE_URL</code>
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-grey">
              Almost always a dev server that started before <code>.env</code>{' '}
              existed. Next reloads <code>.env</code> into the running process,
              but Prisma&apos;s query engine reads the environment once when it
              spawns — so it keeps the old, empty one until you restart.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-[2px] border border-hairline bg-black/40 p-4 font-mono text-[12px] text-gold-soft">
              {'# stop the dev server, then\nnpm run dev'}
            </pre>
          </>
        ) : missingTables ? (
          <>
            <h2 className="font-serif text-[19px] text-ivory">The tables do not exist yet</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-grey">
              The connection works, but this database has never had the schema
              applied to it.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-[2px] border border-hairline bg-black/40 p-4 font-mono text-[12px] text-gold-soft">
              {'npx prisma migrate dev --name init\nnpm run db:seed'}
            </pre>
          </>
        ) : (
          <>
            <h2 className="font-serif text-[19px] text-ivory">Could not reach the database</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-grey">
              Check that <code>DATABASE_URL</code> is the <b>pooled</b>{' '}
              connection string and that the database is awake — a free-tier
              Neon or Supabase instance suspends after a period of inactivity
              and takes a few seconds to resume.
            </p>
          </>
        )}

        <details className="mt-5">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.12em] text-grey transition-colors hover:text-ivory">
            Full error
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-[2px] border border-hairline bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-grey">
            {message}
          </pre>
        </details>
      </div>
    </section>
  );
}
