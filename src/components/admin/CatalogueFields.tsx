import { Area, Check, Field, Money, Num, Text } from './Fields';
import { MediaPicker, type PickableAsset } from './MediaPicker';
import type { AdminCatalogue } from '@/lib/cms/catalogue';

/**
 * The editable fields for each catalogue record, defined once.
 *
 * Both the "Add a …" form and the per-record editor render the *same*
 * component, so a new package is described exactly as completely as an
 * existing one. Adding a field here adds it to both at once — the two cannot
 * drift apart, which is what happens when the create form is a hand-trimmed
 * copy of the edit form.
 *
 * Passing no record renders the empty "add" state.
 *
 * Three things are deliberately *not* here, because they are bookkeeping
 * rather than decisions worth making by hand:
 *
 *   URL slug          derived from the name in the save action, so the link
 *                     is always readable and always matches what it points at.
 *   Order             new records append to the end of their section.
 *   Fallback drawing  chosen when the record is created, and only ever seen
 *                     when no photo has been picked.
 */

type AdminPackage = AdminCatalogue['packages'][number];
type AdminAddOn = AdminCatalogue['addOns'][number];
type AdminStyle = AdminCatalogue['styles'][number];
type AdminDelivery = AdminCatalogue['deliveryOptions'][number];

export function PackageFields({ pkg, assets }: { pkg?: AdminPackage; assets: PickableAsset[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Text
              name="name"
              defaultValue={pkg?.name}
              placeholder="Grand Portrait"
              required
              maxLength={120}
            />
          </Field>
          <Field label="Price (USD)" hint="What the customer pays for the piece itself.">
            <Money name="price" cents={pkg?.price ?? 0} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Size" hint="Shown in the gold eyebrow, e.g. “A4 · 21×29.7cm”.">
            <Text
              name="size"
              defaultValue={pkg?.size}
              placeholder="A2 · 42×59.4cm"
              maxLength={80}
            />
          </Field>
          <Field label="Short size" hint="On buttons, e.g. “A4”.">
            <Text name="sizeShort" defaultValue={pkg?.sizeShort} placeholder="A2" maxLength={20} />
          </Field>
        </div>

        <Field label="One-line pitch" hint="Used on cards and in the page description.">
          <Area
            name="blurb"
            defaultValue={pkg?.blurb}
            placeholder="Statement scale for family groups and once-in-a-lifetime pieces."
            rows={2}
            maxLength={400}
          />
        </Field>

        <Field label="What's included" hint="One bullet per line.">
          <Area
            name="includes"
            defaultValue={pkg?.includes.join('\n')}
            placeholder={'Up to three subjects included\nCertificate of authenticity'}
            rows={6}
          />
        </Field>
      </div>

      <div className="space-y-5">
        <Field
          label="Card photo"
          hint="Optional. With no photo the card draws the built-in line portrait."
          group
        >
          <MediaPicker
            name="imageUrl"
            altName="imageAlt"
            assets={assets}
            defaultUrl={pkg?.imageUrl}
            defaultAlt={pkg?.imageAlt}
            preferredFolder="package"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subjects included" hint="Extra faces are charged separately.">
            <Num
              name="subjectsIncluded"
              defaultValue={pkg?.subjectsIncluded ?? 1}
              min={1}
              max={20}
            />
          </Field>
          <Field label="Turnaround" hint="e.g. “10–14 days”.">
            <Text
              name="turnaround"
              defaultValue={pkg?.turnaround}
              placeholder="18–25 days"
              maxLength={60}
            />
          </Field>
        </div>

        {/* The link the packages page and the sitemap point at. Read-only:
            it follows the name, so it cannot drift out of step with it. */}
        {pkg ? (
          <p className="text-[11px] leading-snug text-grey/70">
            Link: <span className="font-mono text-grey">/packages#{pkg.slug}</span>
            <br />
            Renaming the package updates this automatically.
          </p>
        ) : null}

        <div className="space-y-2.5">
          <Check
            name="featured"
            label="Most popular"
            defaultChecked={Boolean(pkg?.featured)}
            hint="Adds the gold flash. Only one package can hold it."
          />
          <Check
            name="active"
            label="Visible on the site"
            defaultChecked={pkg?.active ?? true}
            hint="Uncheck to retire it without deleting."
          />
        </div>
      </div>
    </div>
  );
}

export function AddOnFields({ addOn }: { addOn?: AdminAddOn }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Text
            name="name"
            defaultValue={addOn?.name}
            placeholder="Gift Presentation"
            required
            maxLength={80}
          />
        </Field>
        <Field label="Price (USD)" hint="Added to the total when ticked at checkout.">
          <Money name="price" cents={addOn?.price ?? 0} />
        </Field>
      </div>

      <Field label="Description" className="mt-4">
        <Area
          name="description"
          defaultValue={addOn?.description}
          placeholder="Tissue wrap, wax seal and a hand-written card with your message."
          rows={2}
          maxLength={400}
        />
      </Field>

      <div className="mt-4">
        <Check name="active" label="Offered at checkout" defaultChecked={addOn?.active ?? true} />
      </div>
    </>
  );
}

export function StyleFields({ style }: { style?: AdminStyle }) {
  return (
    <>
      <Field label="Name">
        <Text
          name="name"
          defaultValue={style?.name}
          placeholder="Ink Wash"
          required
          maxLength={80}
        />
      </Field>

      <Field label="Description" className="mt-4">
        <Area
          name="description"
          defaultValue={style?.description}
          placeholder="Loose, atmospheric washes over a graphite underdrawing."
          rows={2}
          maxLength={400}
        />
      </Field>

      <div className="mt-4">
        <Check name="active" label="Offered at checkout" defaultChecked={style?.active ?? true} />
      </div>
    </>
  );
}

export function DeliveryFields({ option }: { option?: AdminDelivery }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Text
            name="name"
            defaultValue={option?.name}
            placeholder="Framed & Shipped"
            required
            maxLength={80}
          />
        </Field>
        <Field label="Price (USD)" hint="Zero shows as “Included”.">
          <Money name="price" cents={option?.price ?? 0} />
        </Field>
      </div>

      <Field label="Description" className="mt-4">
        <Area
          name="description"
          defaultValue={option?.description}
          placeholder="Mounted behind glass in a hand-finished frame, crated and insured."
          rows={2}
          maxLength={400}
        />
      </Field>

      <div className="mt-4 space-y-2.5">
        <Check
          name="requiresAddress"
          label="Needs a postal address"
          defaultChecked={option?.requiresAddress ?? false}
          hint="Makes the postal fields required on the order form."
        />
        <Check name="active" label="Offered at checkout" defaultChecked={option?.active ?? true} />
      </div>
    </>
  );
}
