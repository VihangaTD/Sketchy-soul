import Link from 'next/link';

import { SectionHead } from '@/components/SectionHead';
import { Actions, Danger, Field, Save, Select, Text } from '@/components/admin/Fields';
import { humanFileSize } from '@/lib/image-resize';
import {
  MEDIA_FOLDERS,
  folderDestination,
  folderLabel,
  listMedia,
  mediaUsage,
} from '@/lib/cms/media';
import { isCloudinaryConfigured } from '@/lib/storage';

import { deleteMedia, updateMedia, uploadMedia } from './actions';

/**
 * The media library.
 *
 * Every image on the site is uploaded here once and then referenced from the
 * gallery, the homepage carousel and the package cards. Replacing a photo in
 * one place therefore updates it everywhere it is used, and nothing needs to
 * be dropped into public/images or redeployed.
 */
export const dynamic = 'force-dynamic';

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ skipped?: string }>;
}) {
  const [assets, usage, params] = await Promise.all([listMedia(), mediaUsage(), searchParams]);

  // Files uploadMedia() refused, one per line. Capped so a crafted link cannot
  // paste an essay into the dashboard.
  const skipped = (params.skipped ?? '').split('\n').filter(Boolean).slice(0, 12);

  return (
    <section className="shell">
      <SectionHead
        as="h1"
        align="left"
        eyebrow="Studio Only"
        title="Photos"
        lede="Upload artwork once, then pick it from any screen. Images are stored in Cloudinary and served from its CDN; the database only keeps the link."
      />

      {!isCloudinaryConfigured() ? (
        <p className="mt-8 rounded-[2px] border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] text-gold-soft">
          Cloudinary is not connected, so uploads are being written to{' '}
          <code>public/uploads</code> on this machine. That works locally but is
          refused in production — set <code>CLOUDINARY_CLOUD_NAME</code>,{' '}
          <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code>{' '}
          before deploying, then re-upload anything added while it was off.
        </p>
      ) : null}

      {skipped.length > 0 ? (
        <div className="mt-8 rounded-[2px] border border-[#c2564f]/50 bg-[#c2564f]/5 px-4 py-3">
          <p className="text-[12.5px] text-[#e08b84]">
            {skipped.length === 1 ? 'One file was not uploaded:' : `${skipped.length} files were not uploaded:`}
          </p>
          <ul className="mt-1.5 space-y-1 text-[12px] text-grey">
            {skipped.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
      <form key={assets.length} action={uploadMedia} className="panel mt-8 p-5 sm:p-6">
        <h2 className="mb-5 font-serif text-[19px] text-ivory">Upload artwork</h2>

        <div className="grid gap-5 sm:grid-cols-[1.6fr_1fr]">
          <Field
            label="Image files"
            hint="JPG, PNG, WebP or HEIC, up to 8 MB each. Crop gallery and carousel artwork to 4:5 before uploading — the frames centre-crop anything else."
          >
            {/* `accept` matches what the server accepts. HEIC was missing, so
                an iPhone photo could not be picked from the file dialog at all,
                even though uploading one works perfectly well. */}
            <input
              type="file"
              name="files"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              required
              className="field file:mr-3 file:rounded-[2px] file:border-0 file:bg-gold/15 file:px-3 file:py-1.5 file:text-[11px] file:uppercase file:tracking-[0.12em] file:text-gold-soft"
            />
          </Field>

          <Field label="Folder" hint="Only used to filter the picker.">
            <Select
              name="folder"
              defaultValue="gallery"
              options={MEDIA_FOLDERS.map((f) => ({ value: f.value, label: f.label }))}
            />
          </Field>
        </div>

        <Field
          label="Describe the image"
          hint="What Google Images ranks and what a screen reader announces. You can change it per-image afterwards."
          className="mt-5"
        >
          <Text name="alt" placeholder="Graphite portrait of a woman in soft window light" maxLength={300} />
        </Field>

        <Actions>
          <Save label="Upload" />
        </Actions>
      </form>

      {/* ── Library ────────────────────────────────────────────────────────── */}
      <div className="mt-12">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[21px] text-ivory">Library</h2>
          <p className="text-[11px] uppercase tracking-[0.12em] text-grey">
            {assets.length} image{assets.length === 1 ? '' : 's'}
          </p>
        </div>

        {assets.length === 0 ? (
          <p className="panel px-5 py-16 text-center text-[13px] text-grey">
            Nothing uploaded yet. Add your scans above and they become available
            on every other screen.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => {
              const usedIn = usage.get(asset.url) ?? [];
              const destination = folderDestination(asset.folder);

              return (
                <form key={asset.id} action={updateMedia} className="panel flex flex-col p-4">
                  <input type="hidden" name="id" value={asset.id} />

                  <div className="frame mb-4 aspect-[4/5]">
                    {/* Deliberately a plain <img>: admin thumbnails are not
                        part of the public page's image budget. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.alt || asset.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>

                  <p className="truncate font-mono text-[11px] text-grey" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-grey/70">
                    {humanFileSize(asset.size)} · {folderLabel(asset.folder)}
                  </p>

                  <Field label="Alt text" className="mt-4">
                    <Text name="alt" defaultValue={asset.alt} maxLength={300} />
                  </Field>

                  <Field label="Folder" className="mt-3">
                    <Select
                      name="folder"
                      defaultValue={asset.folder}
                      options={MEDIA_FOLDERS.map((f) => ({ value: f.value, label: f.label }))}
                    />
                  </Field>

                  {usedIn.length > 0 ? (
                    <p className="mt-3 text-[11px] leading-snug text-gold-soft/80">
                      In use: {usedIn.join(', ')}
                    </p>
                  ) : (
                    // Uploading here puts nothing on the site — it only stocks
                    // the picker. Say where to go, or the next step is a guess.
                    <p className="mt-3 text-[11px] leading-snug text-grey/60">
                      Not on the site yet.{' '}
                      {destination ? (
                        <>
                          Put it there from{' '}
                          <Link
                            href={destination.href}
                            className="text-gold-soft underline-offset-4 hover:underline"
                          >
                            {destination.label}
                          </Link>{' '}
                          → open a row → <em>Choose photo</em>.
                        </>
                      ) : (
                        'Pick it from any screen that shows a photo slot.'
                      )}
                    </p>
                  )}

                  <Actions>
                    <Save />
                    <Danger
                      action={deleteMedia}
                      label="Delete"
                      confirm={
                        usedIn.length > 0
                          ? `This image is used by: ${usedIn.join(', ')}. Those will fall back to the line drawing. Delete it?`
                          : 'Delete this image permanently?'
                      }
                    />
                  </Actions>
                </form>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
