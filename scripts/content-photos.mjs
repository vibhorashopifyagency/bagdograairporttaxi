// Makes the website's files for photos added or changed in the dashboard
// (Photos): the three widths and Google's three crops that
// scripts/fetch-photos.mjs makes for the photos the site started with.
// Runs before every build, after scripts/content-pull.mjs.
//   node scripts/content-photos.mjs
//
// A photo needs files of its own when it was uploaded (`upload`, a picture in
// the Blob store) or given a point that stays in when it is cut to fit
// (`focus`). Its files go to public/img/v/<key>.<version>-<size>.webp (not in
// git), where the version changes with the picture and the focus, so a
// browser never keeps an old copy. What was made is listed in
// .content/photo-files.json, which src/data/photo-library.ts reads: a photo
// whose picture could not be fetched is left off that list, and pages fall
// back to their usual photo instead of showing a broken one. The build goes
// on either way.
//
// Uploads are read from the Blob store with the token Vercel gives every
// build, or from .local-files/ in development (src/server/files.ts).
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('public/img/v/', ROOT);
const MANIFEST = new URL('.content/photo-files.json', ROOT);
const WIDTHS = [1600, 800, 400];
const CROPS = [['16x9', 1200, 675], ['4x3', 1024, 768], ['1x1', 900, 900]];

/** Keep in step with fingerprint() in src/data/published.ts. */
function fingerprint(value) {
  const text = JSON.stringify(value) ?? '';
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
/** Keep in step with photoVersion() in src/data/photo-library.ts. */
const version = (p) => fingerprint(JSON.stringify([p.upload ?? '', p.focus ? [p.focus.x, p.focus.y] : null]));

const start = JSON.parse(await readFile(new URL('src/data/photos.json', ROOT), 'utf8'));
const published = existsSync(new URL('.content/published.json', ROOT)) ? JSON.parse(await readFile(new URL('.content/published.json', ROOT), 'utf8')) : { items: {} };

// The library as the build lays it out: the starting copy with the dashboard's edits over it.
const library = new Map(Object.entries(start).map(([key, p]) => [key, { key, ...p }]));
for (const [key, entry] of Object.entries(published.items?.photo ?? {})) {
  if (entry.deleted) library.delete(key);
  else if (entry.data) library.set(key, { ...(library.get(key) ?? {}), ...entry.data, key });
}

async function original(p) {
  if (!p.upload) return readFile(new URL(`public/img/${p.key}-1600.webp`, ROOT));
  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) {
    const { get } = await import('@vercel/blob');
    const r = await get(p.upload, { access: 'private' });
    if (!r?.stream) throw new Error('not in the Blob store');
    return Buffer.from(await new Response(r.stream).arrayBuffer());
  }
  return readFile(new URL(`.local-files/${p.upload}`, ROOT));
}

/** The largest box of the crop's shape that keeps the focus point as near its middle as the picture allows. */
function cropBox(W, H, w, h, focus) {
  const aspect = w / h;
  const cw = Math.min(W, Math.round(H * aspect));
  const ch = Math.min(H, Math.round(cw / aspect));
  const fx = ((focus?.x ?? 50) / 100) * W;
  const fy = ((focus?.y ?? 50) / 100) * H;
  const left = Math.round(Math.min(Math.max(fx - cw / 2, 0), W - cw));
  const top = Math.round(Math.min(Math.max(fy - ch / 2, 0), H - ch));
  return { left, top, width: cw, height: ch };
}

await mkdir(OUT, { recursive: true });
const made = {};
let fresh = 0;
for (const p of library.values()) {
  if (!p.upload && !p.focus) continue;
  const base = `${p.key}.${version(p)}`;
  const files = [...WIDTHS.map((w) => `${base}-${w}.webp`), ...CROPS.map(([r]) => `${base}-${r}.webp`)];
  if (files.every((f) => existsSync(new URL(f, OUT)))) {
    made[p.key] = `/img/v/${base}`;
    continue;
  }
  try {
    const img = sharp(await original(p)).rotate();
    const { width: W, height: H } = await img.metadata();
    for (const w of WIDTHS) {
      await img.clone().resize({ width: Math.min(w, W), withoutEnlargement: true }).webp({ quality: w >= 1600 ? 70 : 74 }).toFile(new URL(`${base}-${w}.webp`, OUT).pathname);
    }
    for (const [ratio, w, h] of CROPS) {
      const box = cropBox(W, H, w, h, p.focus);
      // A crop shown at Google's sizes; a small source is not blown up past its own pixels.
      await img.clone().extract(box).resize({ width: Math.min(w, box.width), height: Math.min(h, Math.round(Math.min(w, box.width) * (h / w))), fit: 'fill' }).webp({ quality: 66 }).toFile(new URL(`${base}-${ratio}.webp`, OUT).pathname);
    }
    made[p.key] = `/img/v/${base}`;
    fresh++;
  } catch (e) {
    console.warn(`[photos] "${p.key}" could not be made (${e.message}); pages that would show it use their usual photo.`);
  }
}

// Files from earlier versions are no longer needed.
const keep = new Set(Object.values(made).map((b) => b.slice('/img/v/'.length)));
for (const f of await readdir(OUT)) {
  const base = f.replace(/-(?:400|800|1600|16x9|4x3|1x1)\.webp$/, '');
  if (!keep.has(base)) await rm(new URL(f, OUT), { force: true });
}
await mkdir(new URL('.content/', ROOT), { recursive: true });
await writeFile(MANIFEST, JSON.stringify(made, null, 1) + '\n');
console.log(`[photos] ${Object.keys(made).length} dashboard photo${Object.keys(made).length === 1 ? '' : 's'} ready (${fresh} made now)`);
