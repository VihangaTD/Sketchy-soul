# Customer photo originals in Google Drive

Destination account: `order@sketchysoul.com`.
Destination folder: `Customer Uploaded Photos` (`1a8lNYIejH-QGt5EDuYnEaCGwdZ8pUYip`).

## Connect once

1. Sign into Google Cloud Console as the account owner. Create/select a project
   and enable **Google Drive API**.
2. Configure Google Auth Platform (OAuth consent). If the app is External and in
   Testing, add `order@sketchysoul.com` as a test user. Google expires Drive refresh
   tokens after seven days in External Testing mode; configure the appropriate
   production/internal publishing state before relying on unattended uploads.
3. Create an OAuth client with application type **Desktop app**.
4. Put these values in the project's ignored `.env` file:

   ```dotenv
   GOOGLE_DRIVE_CLIENT_ID="your-desktop-client-id"
   GOOGLE_DRIVE_CLIENT_SECRET="your-desktop-client-secret"
   GOOGLE_DRIVE_FOLDER_ID="1a8lNYIejH-QGt5EDuYnEaCGwdZ8pUYip"
   ```

5. Run `node --env-file=.env scripts/connect-google-drive.mjs` locally. Open the
   printed Google consent URL, use `order@sketchysoul.com`, and approve access.
   The local callback verifies the account and folder access, then writes the
   refresh token into `.env` without printing it. Keep the terminal running
   until authorization finishes. This works with personal accounts and Workspace
   accounts that permit the OAuth app.
6. Restart development. For production, add all four `GOOGLE_DRIVE_*` values,
   including `GOOGLE_DRIVE_REFRESH_TOKEN`, to Vercel and redeploy. Never prefix
   these with `NEXT_PUBLIC_`, commit them, or paste them into chat.

The app requests Drive access because the destination is an existing folder;
Google's narrower `drive.file` scope does not automatically grant access to
arbitrary existing folders. Only the studio authorizes access; customers do not.

## Upload behavior

- All four settings must be present to enable dual storage. Until then, the
  existing original-quality Cloudinary upload continues.
- With Drive connected, original bytes upload directly to a private resumable
  Drive session. No Google access token is sent to the browser. A signed receipt
  is issued after the server verifies the file's size, folder, and upload nonce.
- Cloudinary applies a signed incoming transformation, storing a JPEG copy at
  quality 86 with dimensions limited to 2,400 pixels. This also handles HEIC
  without relying on browser decoding. Google Drive receives the original bytes
  without this transformation. Originals are limited to 10 MiB.
- Photos initially sit in the parent folder. Checkout generates the reference
  and moves them to `Customer Uploaded Photos/SS-XXXXXX/` before creating payment.
  A reference does not exist earlier in the current checkout flow. Reusing a photo
  from a previous checkout copies it into the new folder, preserving the old one.
- The order's photo JSON stores private original file IDs. Admin photo links
  include **Original · Drive**. Files are not made public.
- Drive failures block completion of a new dual-storage upload or checkout so
  the website cannot claim that an original was saved when it was not.
- Abandoned uploads stay in the parent folder; failed checkouts can leave empty
  or unlinked order folders. No automatic deletion runs. Review these manually.
- Existing saved drafts without original receipts must re-upload photos after
  Drive is enabled. Older orders are not automatically migrated.

## Verify after connecting

Upload a photo larger than 4 MiB, complete checkout with Stripe test mode, and
check the new reference folder. Download the Drive original and compare its hash
with the local file. Check the Cloudinary copy dimensions and size independently.
Test an expired/revoked authorization: upload should show an error and never
silently skip saving the original. Live Drive behavior cannot be verified until
the account has been connected.

Sources: [Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads),
[OAuth offline access](https://developers.google.com/identity/protocols/oauth2/web-server),
[OAuth token expiration](https://developers.google.com/identity/protocols/oauth2).
