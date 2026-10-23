// Downloads the site's photographs from Wikimedia Commons, resizes them to
// WebP at three widths in public/img/, and writes src/data/photos.json with
// the width, height and the attribution each licence requires.
//
//   node scripts/fetch-photos.mjs           # all photos (skips ones already in public/img)
//   node scripts/fetch-photos.mjs --force   # re-download and re-encode everything
//
// Originals are cached in .photos-cache/ (gitignored). The processed WebP
// files and photos.json are committed, so a normal build needs no network.
// To swap a photo, change its Commons file name below and run the script.
//
// The business's own photographs live in scripts/photos-own/ and are listed in
// OWN below; they are resized the same way but need no licence or credit.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const UA = 'bagdograairporttaxi.com site build (photo fetch; contact book@bagdograairporttaxi.com)';
const WIDTHS = [1600, 800, 400];
const CROPS = [['16x9', 1200, 675], ['4x3', 1024, 768], ['1x1', 900, 900]];
const OUT = new URL('../public/img/', import.meta.url);
const CACHE = new URL('../.photos-cache/', import.meta.url);
const DATA = new URL('../src/data/photos.json', import.meta.url);
const force = process.argv.includes('--force');

/** key -> Commons file name and the alt text shown to screen readers. */
export const PHOTOS = {
  hero: { file: 'Kanchenjunga range from tea gardens of darjeeling.jpg', alt: 'Kanchenjunga range rising above the tea gardens of Darjeeling at dawn' },
  'toy-train': { file: 'Toy Train Darjeeling West Bengal India.jpg', alt: 'The Darjeeling Himalayan Railway toy train' },
  gangtok: { file: 'M.G. Marg, Gangtok 01.jpg', alt: 'MG Marg, the pedestrian main street of Gangtok' },
  tsomgo: { file: 'Tsomgo Lake alias Tsongmo Lake or Changgu Lake in East Sikkim 02.jpg', alt: 'Tsomgo Lake in East Sikkim with snow on the surrounding hills' },
  nathula: { file: 'Nathula Pass in October.jpg', alt: 'Nathula Pass on the India–China border in October' },
  pelling: { file: 'Kanchenjunga from Pelling.jpg', alt: 'Kanchenjunga seen from Pelling, West Sikkim' },
  'north-sikkim': { file: 'Landscape on the way to Yumthang Valley from Lachung, North Sikkim, India 04.jpg', alt: 'The road from Lachung to Yumthang Valley, North Sikkim' },
  gurudongmar: { file: 'Gurudongmar Lake Sikkim, India.jpg', alt: 'Gurudongmar Lake, North Sikkim, partly frozen' },
  lachung: { file: 'Lachung Monastery at Lachung Village in North Sikkim, India 03.jpg', alt: 'Lachung Monastery above Lachung village, North Sikkim' },
  // Was Zuluk.jpg until 23 Oct 2026: that file carries another travel company's logo.
  'silk-route': { file: 'Mysterious road.jpg', alt: 'The zig-zag road at Zuluk on the Old Silk Route, East Sikkim' },
  zuluk: { file: 'Morning at Silk Route.jpg', alt: 'Morning light on the Old Silk Route near Zuluk' },
  dooars: { file: 'Elephant Safari in Jaldapara National Park.jpg', alt: 'Elephant safari in Jaldapara National Park, Dooars' },
  rhino: { file: 'Rhino in a pond at Jaldapara.jpg', alt: 'A one-horned rhino in a pond at Jaldapara National Park' },
  kalimpong: { file: 'View of Kalimpong, India.jpg', alt: 'Kalimpong town on its ridge above the Teesta valley' },
  mirik: { file: 'Mirik Lake a.k.a Sumendu Lake.jpg', alt: 'Sumendu Lake at Mirik' },
  kurseong: { file: 'Tea estate in kurseong.jpg', alt: 'A tea estate on the hillside at Kurseong' },
  lava: { file: 'Kagyu Thekchen Ling Lava Monastery, Lava, West Bengal, India.jpg', alt: 'Kagyu Thekchen Ling Monastery at Lava' },
  bhutan: { file: 'Punakha Dzong, Bhutan 03.jpg', alt: 'Punakha Dzong, Bhutan, at the meeting of two rivers' },
  ravangla: { file: 'Peaceful Ravangla Buddha Park.jpg', alt: 'The Buddha statue at Buddha Park, Ravangla' },
  rumtek: { file: 'Rumtek Monastery 04.jpg', alt: 'Rumtek Monastery near Gangtok' },
  airport: { file: 'Bagdogra Airport.jpg', alt: 'The terminal at Bagdogra Airport' },
  teesta: { file: 'Coronation Bridge at Sevoke 01.jpg', alt: 'Coronation Bridge over the Teesta at Sevoke, on the road to Kalimpong and Gangtok' },
  'tea-worker': { file: 'Darjeeling Tea Garden worker.jpg', alt: 'Tea pluckers at work on a Darjeeling tea estate' },
  'car-sedan': { file: 'Maruti Suzuki Dzire VXi VVT (front).JPG', alt: 'A white Maruti Suzuki Dzire sedan' },
  'car-suv': { file: 'Maruti Suzuki Ertiga(3).jpg', alt: 'A grey Maruti Suzuki Ertiga' },
  'car-innova': { file: 'Toyota Innova Crysta 2.4 Z front right.jpg', alt: 'A Toyota Innova Crysta' },
  'car-traveller': { file: 'Force Traveller, Leh-Manali Highway.jpg', alt: 'A Force Traveller on a mountain highway' },
};

/**
 * key -> a free stock photograph (Pexels licence: free to use and change, no
 * credit required, though it is credited on /photo-credits/ like the rest).
 */
export const STOCK = {
  'happy-travellers': {
    url: 'https://images.pexels.com/photos/17864689/pexels-photo-17864689.jpeg?auto=compress&cs=tinysrgb&w=2400',
    alt: 'Two friends laughing in a hug in front of snow-capped Himalayan peaks',
    artist: 'Rani Sahu',
    license: 'Pexels licence',
    licenseUrl: 'https://www.pexels.com/license/',
    source: 'https://www.pexels.com/photo/happy-women-in-orange-t-shirts-posing-on-mountain-17864689/',
  },
};

/** key -> the business's own photo in scripts/photos-own/ and its alt text. */
export const OWN = {
  founder: { file: 'founder.jpeg', alt: 'Pinku Singh, founder of Jai Jawan Travels, at his desk in the Bagdogra office' },
};

const exists = (u) => access(u).then(() => true, () => false);
const headers = { 'User-Agent': UA };

await mkdir(OUT, { recursive: true });
await mkdir(CACHE, { recursive: true });

// One API call for every file's licence and author.
const titles = Object.values(PHOTOS).map((p) => 'File:' + p.file).join('|');
const api = new URL('https://commons.wikimedia.org/w/api.php');
api.search = new URLSearchParams({
  action: 'query', format: 'json', titles, prop: 'imageinfo', iiprop: 'extmetadata|url',
  iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Credit',
}).toString();
const meta = await (await fetch(api, { headers })).json();
const byFile = {};
for (const p of Object.values(meta.query.pages)) {
  const ii = p.imageinfo?.[0]; if (!ii) continue;
  const m = ii.extmetadata ?? {};
  const strip = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  byFile[p.title.replace(/^File:/, '')] = {
    artist: strip(m.Artist?.value) || 'Unknown',
    license: strip(m.LicenseShortName?.value) || 'See source',
    licenseUrl: m.LicenseUrl?.value ?? '',
    source: ii.descriptionurl,
  };
}

const out = {};
const all = [
  ...Object.entries(PHOTOS),
  ...Object.entries(STOCK).map(([k, p]) => [k, { ...p, stock: true }]),
  ...Object.entries(OWN).map(([k, p]) => [k, { ...p, own: true }]),
];
for (const [key, p] of all) {
  const cached = p.own ? new URL(`../scripts/photos-own/${p.file}`, import.meta.url) : new URL(key + '.bin', CACHE);
  if (!p.own && (force || !(await exists(cached)))) {
    const url = p.stock ? p.url : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.file)}?width=2000`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${key}: ${res.status} for ${p.file ?? p.url}`);
    await writeFile(cached, Buffer.from(await res.arrayBuffer()));
    await new Promise((r) => setTimeout(r, 800));
  }
  const buf = await readFile(cached);
  const img = sharp(buf).rotate();
  const { width, height } = await img.metadata();
  for (const w of WIDTHS) {
    const target = new URL(`${key}-${w}.webp`, OUT);
    if (!force && (await exists(target))) continue;
    await img.clone().resize({ width: Math.min(w, width), withoutEnlargement: true }).webp({ quality: w >= 1600 ? 70 : 74 }).toFile(fileURLToPath(target));
  }
  // Google's Article and image markup want 16x9, 4x3 and 1x1 versions of a
  // page's image (each over 50k pixels). Cropped from the original with
  // sharp's attention strategy so the subject stays in frame.
  for (const [ratio, w, h] of CROPS) {
    const target = new URL(`${key}-${ratio}.webp`, OUT);
    if (!force && (await exists(target))) continue;
    await img.clone().resize({ width: w, height: h, fit: 'cover', position: 'attention' }).webp({ quality: 66 }).toFile(fileURLToPath(target));
  }
  const credit = p.own
    ? { artist: 'Jai Jawan Travels', license: 'Own photograph', licenseUrl: '', source: '', own: true }
    : p.stock
      ? { artist: p.artist, license: p.license, licenseUrl: p.licenseUrl, source: p.source }
      : byFile[p.file] ?? { artist: 'Unknown', license: 'See source', licenseUrl: '', source: '' };
  out[key] = { alt: p.alt, width, height, ...(p.file && { file: p.file }), ...credit };
  console.log(`photos: ${key} ${width}x${height} ${credit.license} ${credit.artist}`);
}
await writeFile(DATA, JSON.stringify(out, null, 2) + '\n');
console.log(`photos: wrote ${Object.keys(out).length} entries to src/data/photos.json`);
