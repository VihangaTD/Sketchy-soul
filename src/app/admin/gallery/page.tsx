import Link from 'next/link';

import { SectionHead } from '@/components/SectionHead';
import { Actions, Danger, Disclosure, Save } from '@/components/admin/Fields';
import { PieceFields } from '@/components/admin/PieceFields';
import { listPortfolioForAdmin } from '@/lib/cms/artwork';
import { listMedia } from '@/lib/cms/media';
import { PIECE_CATEGORIES } from '@/lib/portfolio';
import { toSketch } from '@/lib/cms/cache';

import { createPiece, deletePiece, updatePiece } from './actions';

/**
 * The gallery.
 *
 * One collapsed row per piece on /gallery — open a row to edit it. A piece
 * with no photo draws the built-in line portrait instead, so an entry is never
 * broken, it is just waiting for its scan.
 */
export const dynamic = 'force-dynamic';

const categoryLabel = (id: string) => PIECE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export default async function GalleryAdminPage({
  searchParams,
}: {
  // `?open=` is set by the save actions so the row you just edited comes back
  // expanded instead of the whole list collapsing under you.
  searchParams: Promise<{ open?: string }>;
}) {
  const [{ open }, rows, media] = await Promise.all([
    searchParams,
    listPortfolioForAdmin(),
    listMedia(),
  ]);

  const pieces = rows.map((p) => ({
    ...p,
    category: p.category as (typeof PIECE_CATEGORIES)[number]['id'],
    sketch: toSketch(p.sketch),
  }));

  const assets = media.map((m) => ({
    id: m.id,
    url: m.url,
    name: m.name,
    alt: m.alt,
    folder: m.folder,
  }));

  const withoutPhoto = pieces.filter((p) => !p.imageUrl).length;
  const hidden = pieces.filter((p) => !p.published).length;

  return (
    <section className="shell">
      <SectionHead
        as="h1"
        align="left"
        eyebrow="Studio Only"
        title="Gallery"
        lede="The work shown on /gallery. Nine to twelve of your strongest pieces is plenty — a short, excellent gallery sells better than a long, uneven one."
      />

      {withoutPhoto > 0 ? (
        <p className="mt-8 rounded-[2px] border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] text-gold-soft">
          {withoutPhoto} piece{withoutPhoto === 1 ? ' is' : 's are'} still showing the
          placeholder line drawing. Upload the scans under Photos, then pick them here.
        </p>
      ) : null}

      <div className="mb-4 mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-grey">
          {pieces.length} piece{pieces.length === 1 ? '' : 's'}
          {hidden > 0 ? ` · ${hidden} hidden` : ''}
        </p>
        <p className="text-[11.5px] text-grey/70">Open a row to edit it.</p>
      </div>

      <div className="space-y-3">
        {/* Add sits at the top of the list, not buried under a dozen rows. */}
        <form key={pieces.length} action={createPiece}>
          <Disclosure title="Add a piece" meta="New gallery entry" open={open === 'new'}>
            <PieceFields assets={assets} />
            <Actions>
              <Save label="Add piece" />
            </Actions>
          </Disclosure>
        </form>

        {pieces.map((piece) => (
          <form key={piece.id} action={updatePiece}>
            <input type="hidden" name="id" value={piece.id} />
            <Disclosure
              id={`piece-${piece.id}`}
              open={open === `piece-${piece.id}`}
              title={piece.title}
              muted={!piece.published}
              meta={
                <>
                  {categoryLabel(piece.category)} · {piece.year}
                  {piece.imageUrl ? '' : ' · no photo'}
                  {piece.published ? '' : ' · hidden'}
                  {piece.featured ? ' · featured' : ''}
                </>
              }
            >
              <PieceFields piece={piece} assets={assets} />

              <Actions>
                <Save />
                <Danger
                  action={deletePiece}
                  label="Delete piece"
                  confirm={`Remove "${piece.title}" from the gallery? The photo stays in your library.`}
                />
              </Actions>
            </Disclosure>
          </form>
        ))}

        {pieces.length === 0 ? (
          <p className="panel px-5 py-16 text-center text-[13px] text-grey">
            No pieces yet. Add your first above — or run <code>npm run db:seed</code> to
            import the twelve that ship with the project.
          </p>
        ) : null}
      </div>

      <p className="mt-14 text-[12px] text-grey">
        See it live on{' '}
        <Link
          href="/gallery"
          target="_blank"
          className="text-gold-soft underline-offset-4 hover:underline"
        >
          the gallery page
        </Link>
        .
      </p>
    </section>
  );
}
