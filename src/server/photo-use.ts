/**
 * Where each photo of the library shows on the website, for the dashboard's
 * Photos screen ("Used on 3 pages") and its rule that only an unused photo
 * can be deleted. Follows the drafts, so it answers for the website as it
 * will be after Publish.
 */
import { PHOTOS, photoFile } from '../data/photo-library';
import { defaultPhoto, guidePhoto } from '../lib/photos';
import { getEntry, listEntries, type Entry } from './content';
import { websitePhotoSrc } from './files';

export interface Use {
  label: string;
  /** The public page. */
  href: string;
}

type Data = Record<string, any>;

/** Photos the page templates show by name: the home page, the list pages, About and Contact. */
const FIXED: Record<string, Use[]> = {
  hero: [{ label: 'Home page, the top', href: '/' }, { label: 'About', href: '/about/' }, { label: 'Destinations page', href: '/destinations/' }, { label: 'Home page, the journey', href: '/' }],
  pelling: [{ label: 'Home page', href: '/' }, { label: 'Gallery page, the top', href: '/gallery/' }, { label: 'The menu, Destinations', href: '/' }],
  airport: [{ label: 'Home page', href: '/' }, { label: 'Contact', href: '/contact/' }, { label: 'Taxi fares page', href: '/taxi/' }, { label: 'Home page, the journey', href: '/' }],
  'car-sedan': [{ label: 'Home page, our cars', href: '/' }],
  'car-suv': [{ label: 'Home page, our cars', href: '/' }],
  'car-innova': [{ label: 'Home page, our cars', href: '/' }],
  'car-traveller': [{ label: 'Home page, our cars', href: '/' }],
  founder: [{ label: 'About', href: '/about/' }],
  'tea-worker': [{ label: 'About', href: '/about/' }, { label: 'Travel guides page', href: '/guides/' }],
  tsomgo: [{ label: 'Destinations page', href: '/destinations/' }, { label: 'Tour packages page', href: '/tour-packages/' }, { label: 'Home page, the journey', href: '/' }],
  'north-sikkim': [{ label: 'Gallery page', href: '/gallery/' }, { label: 'Tour packages page', href: '/tour-packages/' }, { label: 'Home page, the journey', href: '/' }],
  teesta: [{ label: 'Taxi fares page', href: '/taxi/' }, { label: 'Travel guides page', href: '/guides/' }],
  nathula: [{ label: 'Travel guides page', href: '/guides/' }],
  kurseong: [{ label: 'Home page, the journey', href: '/' }],
  gangtok: [{ label: 'Home page, the journey', href: '/' }],
};

export async function photoUses(): Promise<Map<string, Use[]>> {
  const [routes, packages, destinations, guides, gallery] = await Promise.all([listEntries('route'), listEntries('package'), listEntries('destination'), listEntries('guide'), getEntry('gallery', 'main')]);
  const uses = new Map<string, Use[]>();
  const add = (key: string, use: Use) => uses.set(key, [...(uses.get(key) ?? []), use]);
  for (const [key, list] of Object.entries(FIXED)) for (const u of list) add(key, u);
  for (const e of destinations) {
    const d = e.current as Data | null;
    if (d) add(d.photo || defaultPhoto.destination(d.slug), { label: `${d.name}, destination guide`, href: `/destinations/${d.slug}/` });
  }
  for (const e of packages) {
    const p = e.current as Data | null;
    if (p) add(p.photo || defaultPhoto.package(p as never), { label: `${p.name}, tour package`, href: `/tour-packages/${p.slug}/` });
  }
  for (const e of routes) {
    const r = e.current as Data | null;
    if (r) add(r.photo || defaultPhoto.route(r as never), { label: `${r.fromShort} to ${r.toShort}, taxi fare`, href: `/taxi/${r.slug}/` });
  }
  for (const e of guides) {
    const g = e.current as Data | null;
    if (g) add(guidePhoto(g.slug), { label: `${g.title}, travel guide`, href: `/guides/${g.slug}/` });
  }
  for (const g of (gallery?.current as Data[] | null) ?? []) add(g.photo, { label: `Gallery: ${g.title}`, href: '/gallery/' });
  return uses;
}

/** A library photo's picture for the dashboard: the website's own file when it was made from this picture, otherwise the uploaded original. */
export function photoThumb(e: Entry, size: 400 | 800 | 1600 = 400): string {
  const p = (e.current ?? e.live) as Data;
  const made = PHOTOS[e.key];
  const filesMatch = made && (made.upload ?? null) === (p.upload ?? null) && (!p.upload || made.base.startsWith('/img/v/'));
  if (filesMatch) return photoFile(e.key, size);
  if (p.upload) return websitePhotoSrc(p.upload);
  return made ? photoFile(e.key, size) : '/img/hero-400.webp';
}
