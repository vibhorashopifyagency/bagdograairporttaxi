/**
 * The photo library: every photograph the website can show, with what it
 * shows (alt text), who took it and its licence.
 *
 * The starting copy is src/data/photos.json, written by
 * scripts/fetch-photos.mjs, whose files are in public/img/ as
 * <key>-{400,800,1600,16x9,4x3,1x1}.webp. The admin can describe and credit
 * a photo, set the point that stays in when it is cut to fit (`focus`),
 * replace it, or add new ones in the dashboard (Photos). A photo uploaded or
 * re-framed there is turned into the same six files by
 * scripts/content-photos.mjs before each build, under a name that changes
 * with the picture (public/img/v/<key>.<version>-800.webp), so browsers never
 * keep an old copy. That script lists what it made in
 * .content/photo-files.json; an uploaded photo it could not make is left out
 * of PHOTOS, and every page that would show it falls back to its usual photo.
 *
 * Always build a photo's address with photoFile(), never by hand.
 */
import photos from './photos.json';
import { fingerprint, overlayList } from './published';

export interface LibraryPhoto {
  key: string;
  /** A short name for the dashboard, such as "Toy train". */
  title?: string | null;
  /** What the photo shows, read aloud and used by Google Images. */
  alt: string;
  width: number;
  height: number;
  /** The Wikimedia Commons file it came from. */
  file?: string;
  artist: string;
  license: string;
  licenseUrl: string;
  source: string;
  /** The business's own photo: credited to the business, not listed on /photo-credits/. */
  own?: boolean;
  /** An uploaded picture in the Blob store, website/<id>.jpg (src/server/files.ts). */
  upload?: string | null;
  /** The point that stays in when the photo is cut to fit, in % from the left and top. */
  focus?: { x: number; y: number } | null;
}

export const PHOTOS_START: LibraryPhoto[] = Object.entries(photos as Record<string, Omit<LibraryPhoto, 'key'>>).map(([key, p]) => ({ key, ...p }));
const START_KEYS = new Set(PHOTOS_START.map((p) => p.key));

/** Every photo in the library, with the dashboard's edits. */
export const LIBRARY: LibraryPhoto[] = overlayList('photo', PHOTOS_START, (p) => p.key);

/** A photo the build has to make files for: uploaded, or given a focus point. */
export const needsFiles = (p: Pick<LibraryPhoto, 'upload' | 'focus'>) => Boolean(p.upload || p.focus);

/** The version in a made photo's file name; changes whenever the picture or its focus does. Keep in step with scripts/content-photos.mjs. */
export const photoVersion = (p: Pick<LibraryPhoto, 'upload' | 'focus'>) => fingerprint(JSON.stringify([p.upload ?? '', p.focus ? [p.focus.x, p.focus.y] : null]));

const made = import.meta.glob<Record<string, string>>('/.content/photo-files.json', { eager: true, import: 'default' });
/** key → the start of its file names, for the photos scripts/content-photos.mjs made in this build. */
const MADE: Record<string, string> = Object.values(made)[0] ?? {};

/** Where a photo's files are, or null when it has none (an upload the build could not make). */
function baseOf(p: LibraryPhoto): string | null {
  if (needsFiles(p)) {
    const want = `/img/v/${p.key}.${photoVersion(p)}`;
    if (MADE[p.key] === want) return want;
    // Not made: a built-in photo keeps its original files; an upload is left out.
    return START_KEYS.has(p.key) ? `/img/${p.key}` : null;
  }
  return START_KEYS.has(p.key) ? `/img/${p.key}` : null;
}

export type PhotoInfo = LibraryPhoto & { base: string };

/** The photos the website can show, by key. */
export const PHOTOS: Record<string, PhotoInfo> = Object.fromEntries(
  LIBRARY.flatMap((p) => {
    const base = baseOf(p);
    return base ? [[p.key, { ...p, base }]] : [];
  }),
);

export type PhotoSize = 400 | 800 | 1600 | '16x9' | '4x3' | '1x1';

/** The address of one of a photo's files: photoFile('pelling', 800). Falls back to the home page photo for an unknown key. */
export function photoFile(key: string, size: PhotoSize): string {
  const base = PHOTOS[key]?.base ?? '/img/hero';
  return `${base}-${size}.webp`;
}

/**
 * A JPEG of the photo's 16:9 crop, for WhatsApp, which takes no WebP
 * pictures (src/server/whatsapp.ts). scripts/content-photos.mjs makes these
 * before every build: /img/hero-16x9.webp becomes /img/wa/hero.jpg.
 */
export function whatsappPhotoFile(key: string): string {
  const base = PHOTOS[key]?.base ?? '/img/hero';
  return `${base.replace(/^\/img\//, '/img/wa/')}.jpg`;
}

/** The library key a photo address belongs to, for structured data built from a page's share image. */
export function photoKeyOf(url: string): string | undefined {
  const m = url.match(/\/img\/(?:v\/([a-z0-9-]+)\.[a-z0-9]+|([a-z0-9-]+))-(?:400|800|1600|16x9|4x3|1x1)\.webp$/);
  const key = m?.[1] ?? m?.[2];
  return key && PHOTOS[key] ? key : undefined;
}

/** CSS object-position for a photo cut to fit its box, when the admin chose what stays in. */
export const focusStyle = (key: string) => {
  const f = PHOTOS[key]?.focus;
  return f ? `object-position: ${f.x}% ${f.y}%` : undefined;
};

/** Names for the photos the site started with, where the key alone would not say much. */
const NAMES: Record<string, string> = {
  hero: 'Kanchenjunga at dawn',
  'toy-train': 'Toy train',
  gangtok: 'MG Marg, Gangtok',
  tsomgo: 'Tsomgo Lake',
  nathula: 'Nathula Pass',
  pelling: 'Kanchenjunga from Pelling',
  'north-sikkim': 'Road to Yumthang',
  gurudongmar: 'Gurudongmar Lake',
  lachung: 'Lachung Monastery',
  'silk-route': 'Zuluk zig-zag road',
  zuluk: 'Morning on the Silk Route',
  dooars: 'Elephant safari, Jaldapara',
  rhino: 'Rhino, Jaldapara',
  kalimpong: 'Kalimpong',
  mirik: 'Sumendu Lake, Mirik',
  kurseong: 'Tea at Kurseong',
  lava: 'Monastery at Lava',
  bhutan: 'Punakha Dzong, Bhutan',
  ravangla: 'Buddha Park, Ravangla',
  rumtek: 'Rumtek Monastery',
  airport: 'Bagdogra Airport',
  teesta: 'Coronation Bridge, Teesta',
  'tea-worker': 'Plucking first flush',
  'car-sedan': 'Our sedan',
  'car-suv': 'Our SUV',
  'car-innova': 'Our Innova Crysta',
  'car-traveller': 'Our Tempo Traveller',
  founder: 'Our founder',
};

/** A photo's name in the dashboard: its own, the built-in name, or "toy-train" as "Toy train". */
export const photoTitle = (p: Pick<LibraryPhoto, 'key' | 'title'>) => p.title || NAMES[p.key] || (p.key.charAt(0).toUpperCase() + p.key.slice(1)).replace(/-/g, ' ');
