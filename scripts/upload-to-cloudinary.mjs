// Uploads the site's media from public/assets to Cloudinary and prints the CDN URLs to use.
// Usage: node --env-file=.env scripts/upload-to-cloudinary.mjs   (re-running overwrites in place)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const m = process.env.CLOUDINARY_URL?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!m) throw new Error('Set CLOUDINARY_URL (cloudinary://<key>:<secret>@<cloud_name>).');
const [, apiKey, apiSecret, cloudName] = m;
const assets = path.resolve('public/assets');
const folder = 'coastal-carnival';
const CHUNK = 20 * 1024 * 1024;

function sign(params) {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

/** Signed upload; files above CHUNK go up in pieces so large videos stay under request limits. */
async function upload(resource, buffer, filename, params) {
  const signed = { ...params, timestamp: Math.floor(Date.now() / 1000) };
  const fields = { ...signed, api_key: apiKey, signature: sign(signed) };
  const uploadId = crypto.randomUUID();
  let result;
  for (let start = 0; start < buffer.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, buffer.length);
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, String(v));
    body.append('file', new Blob([buffer.subarray(start, end)]), filename);
    const headers = buffer.length > CHUNK ? { 'X-Unique-Upload-Id': uploadId, 'Content-Range': `bytes ${start}-${end - 1}/${buffer.length}` } : {};
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`, { method: 'POST', body, headers });
    result = await res.json();
    if (!res.ok) throw new Error(`${filename}: ${result.error?.message || res.status}`);
  }
  return result;
}

/** Rebuilds a playable fragmented MP4 from an HLS rendition (init segment + media segments, in playlist order). */
function joinHls(dir) {
  const playlist = fs.readFileSync(path.join(dir, 'index.m3u8'), 'utf8');
  const parts = ['init.mp4', ...playlist.split('\n').filter((l) => l.trim() && !l.startsWith('#'))];
  return Buffer.concat(parts.map((p) => fs.readFileSync(path.join(dir, p.trim()))));
}

const base = (name) => name.replace(/\.[^.]+$/, '');
const urls = {};

const images = fs.readdirSync(assets).filter((f) => /\.(png|jpe?g)$/i.test(f));
for (const file of images) {
  const r = await upload('image', fs.readFileSync(path.join(assets, file)), file, { public_id: `${folder}/${base(file)}`, overwrite: 'true', invalidate: 'true' });
  const width = file.startsWith('wildlings-logo') ? 400 : 1920;
  urls[`/assets/${file}`] = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width},c_limit/v${r.version}/${r.public_id}`;
  console.log('image', file);
}

for (const file of fs.readdirSync(assets).filter((f) => /\.mp3$/i.test(f))) {
  const r = await upload('video', fs.readFileSync(path.join(assets, file)), file, { public_id: `${folder}/${base(file)}`, overwrite: 'true', invalidate: 'true' });
  urls[`/assets/${file}`] = `https://res.cloudinary.com/${cloudName}/video/upload/q_auto/v${r.version}/${r.public_id}.mp3`;
  console.log('audio', file);
}

// Cloudinary builds an adaptive HLS ladder (several qualities) from each film; SDR only, so the HDR entries are dropped.
for (const layout of ['desktop', 'phone']) {
  const buffer = joinHls(path.join(assets, 'coastal-v5', `${layout}-standard`));
  const r = await upload('video', buffer, `hero-${layout}.mp4`, {
    public_id: `${folder}/hero-${layout}`,
    overwrite: 'true',
    invalidate: 'true',
    eager: 'sp_auto/m3u8',
    eager_async: 'true',
  });
  urls[`/assets/coastal-v5/${layout}-standard/master.m3u8`] = `https://res.cloudinary.com/${cloudName}/video/upload/sp_auto/v${r.version}/${r.public_id}.m3u8`;
  urls[`/assets/coastal-v5/${layout}-hdr/master.m3u8`] = '';
  console.log('video', layout, `${(buffer.length / 1e6).toFixed(0)}MB`);
}

fs.writeFileSync('scripts/cloudinary-urls.json', JSON.stringify(urls, null, 2) + '\n');
console.log('Wrote scripts/cloudinary-urls.json');
