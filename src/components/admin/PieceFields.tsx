import { Area, Check, Field, Select, Text } from './Fields';
import { MediaPicker, type PickableAsset } from './MediaPicker';
import { PIECE_CATEGORIES, type PortfolioPiece } from '@/lib/portfolio';

/**
 * The editable fields for one gallery piece, defined once and rendered by both
 * the "Add a piece" form and the per-piece editor — so a new entry is
 * described exactly as completely as an existing one.
 *
 * Passing no piece renders the empty "add" state.
 *
 * Order and the fallback drawing are set when the piece is created rather than
 * asked for here: new pieces go to the front of the gallery, and the drawing
 * is only ever seen before an artwork has been picked.
 */

const CATEGORY_OPTIONS = PIECE_CATEGORIES.map((c) => ({ value: c.id, label: c.label }));

/** The database row, which carries the admin-only columns the domain type omits. */
export interface AdminPiece extends PortfolioPiece {
  id: string;
  published: boolean;
  sortOrder: number;
}

export function PieceFields({ piece, assets }: { piece?: AdminPiece; assets: PickableAsset[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <Field
        label="Artwork"
        hint="With no photo the piece draws the built-in line portrait."
        group
      >
        <MediaPicker
          name="imageUrl"
          altName="imageAlt"
          assets={assets}
          defaultUrl={piece?.imageUrl}
          defaultAlt={piece?.imageAlt}
          preferredFolder="gallery"
        />
      </Field>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Text
              name="title"
              defaultValue={piece?.title}
              placeholder="Grandmother's Hands"
              required
              maxLength={120}
            />
          </Field>
          <Field label="Category" hint="Drives the filter rail on the gallery page.">
            <Select name="category" defaultValue={piece?.category} options={CATEGORY_OPTIONS} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Size" hint="e.g. 11×14">
            <Text name="size" defaultValue={piece?.size} placeholder="11×14" maxLength={40} />
          </Field>
          <Field label="Medium">
            <Text
              name="medium"
              defaultValue={piece?.medium}
              placeholder="Graphite"
              maxLength={80}
            />
          </Field>
          <Field label="Year">
            <Text name="year" defaultValue={piece?.year} placeholder="2026" maxLength={10} />
          </Field>
        </div>

        <Field label="Caption" hint="One line of story, shown in the lightbox. Optional.">
          <Area
            name="caption"
            defaultValue={piece?.caption}
            placeholder="Drawn from a faded 1970s print for a family in Melbourne."
            rows={2}
            maxLength={400}
          />
        </Field>

        <div className="space-y-2.5">
          <Check
            name="featured"
            label="Featured piece"
            defaultChecked={Boolean(piece?.featured)}
            hint="Marks your strongest work for use in featured rails."
          />
          <Check
            name="published"
            label="Visible on the site"
            defaultChecked={piece?.published ?? true}
          />
        </div>
      </div>
    </div>
  );
}
