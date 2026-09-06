import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton.
 *
 * In development Next hot-reloads modules on every save; without this guard
 * each reload would open a brand new pool and Postgres would run out of
 * connections within a minute. In production it is created once per instance.
 *
 * ⚠️ DEPLOY: DATABASE_URL should be the POOLED connection string on serverless
 * (Neon `-pooler`, Supabase port 6543, Vercel Postgres default). DIRECT_URL is
 * the unpooled one and is only used by `prisma migrate`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * True when a database is actually configured — used for friendly errors and
 * to skip content queries entirely when there is nothing to query.
 *
 * A function, not a constant: Next's dev server reloads `.env` into
 * `process.env` while running, so a value captured at module load can be stale
 * the moment someone creates or edits `.env`. (Prisma's query engine caches the
 * environment it was spawned with regardless, so a dev server still has to be
 * restarted after adding DATABASE_URL — this just stops the app reporting a
 * database it cannot actually reach.)
 */
export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);
