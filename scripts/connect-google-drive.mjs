import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { OAuth2Client } from 'google-auth-library';

// Run locally: node --env-file=.env scripts/connect-google-drive.mjs
// Use an OAuth "Desktop app" client. Never commit .env or paste tokens into chat.
const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env first.');
const state = randomBytes(32).toString('hex');
const server = http.createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}/oauth/callback`;
const client = new OAuth2Client(clientId, clientSecret, redirectUri);
const timeout = setTimeout(() => { console.error('Authorization timed out. Run the command again.'); server.close(); }, 5 * 60_000);
server.on('request', async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/oauth/callback') { res.writeHead(404).end(); return; }
  const received = Buffer.from(url.searchParams.get('state') ?? '');
  const expected = Buffer.from(state);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) { res.writeHead(400).end('Invalid authorization state.'); return; }
  try {
    const code = url.searchParams.get('code');
    if (!code) throw new Error('Google authorization was not completed.');
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) throw new Error('Google did not return offline access. Revoke the previous authorization and reconnect.');
    client.setCredentials(tokens);
    const account = await client.request({ url: 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress),storageQuota' });
    if (account.data.user?.emailAddress?.toLowerCase() !== 'orders@thesketchysoul.com') throw new Error('Please connect using order@sketchysoul.com.');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1a8lNYIejH-QGt5EDuYnEaCGwdZ8pUYip';
    const folder = await client.request({ url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true` });
    if (folder.data.mimeType !== 'application/vnd.google-apps.folder' || !folder.data.capabilities?.canAddChildren) throw new Error('The account cannot upload into the destination folder.');
    let env = await readFile('.env', 'utf8');
    for (const [key, value] of Object.entries({ GOOGLE_DRIVE_REFRESH_TOKEN: tokens.refresh_token, GOOGLE_DRIVE_FOLDER_ID: folderId })) {
      const line = `${key}=${JSON.stringify(value)}`;
      const pattern = new RegExp(`^${key}=.*$`, 'm');
      env = pattern.test(env) ? env.replace(pattern, () => line) : `${env.trimEnd()}\n${line}\n`;
    }
    await writeFile('.env', env);
    console.log(`Connected ${account.data.user.emailAddress} to "${folder.data.name}". Credentials saved privately in .env.`);
    console.log('Restart the dev server. Add GOOGLE_DRIVE_* variables to your Vercel environment and redeploy to enable production uploads.');
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Google Drive connected. You can close this tab.');
  } catch (error) {
    // Google API errors may contain authorization headers. Never print the raw object.
    console.error(error instanceof Error ? error.message : 'Google Drive authorization failed.');
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Connection failed. Check the terminal and try again.');
  } finally {
    clearTimeout(timeout);
    server.close();
  }
});
console.log('Open this URL in your browser and sign in as order@sketchysoul.com:');
console.log(client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', login_hint: 'order@sketchysoul.com', scope: ['https://www.googleapis.com/auth/drive'], state }));
