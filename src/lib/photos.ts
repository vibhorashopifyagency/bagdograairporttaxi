/**
 * Which photo illustrates what. A route, package or destination can name
 * its own photo in the dashboard (`photo`); otherwise these mappings choose
 * one. Keys are those of the photo library (src/data/photo-library.ts), so a
 * photo uploaded in the dashboard can be chosen too. A chosen photo the
 * website cannot show (an upload the build could not make) falls back to
 * the mapping, so a page never shows a broken image.
 */
import { PHOTOS } from '../data/photo-library';
import type { Route } from '../data/routes';
import type { TourPackage } from '../data/packages';

export { PHOTOS };
export type PhotoKey = string;

/** The photo an item chose, when the website has it. */
const chosen = (key: string | null | undefined): PhotoKey | undefined => (key && PHOTOS[key] ? key : undefined);

const DESTINATION: Record<string, PhotoKey> = {
  darjeeling: 'toy-train',
  gangtok: 'gangtok',
  kalimpong: 'kalimpong',
  mirik: 'mirik',
  kurseong: 'kurseong',
  pelling: 'pelling',
  'north-sikkim': 'north-sikkim',
  dooars: 'rhino',
  'silk-route': 'zuluk',
  lava: 'lava',
  bhutan: 'bhutan',
};

const PACKAGE: Record<string, PhotoKey> = {
  'darjeeling-gangtok-tour-package': 'hero',
  'gangtok-tsomgo-nathula-tour-package': 'tsomgo',
  'north-sikkim-lachung-yumthang-tour-package': 'north-sikkim',
  'darjeeling-tour-package': 'toy-train',
  'dooars-jungle-safari-tour-package': 'dooars',
  'sikkim-darjeeling-honeymoon-package': 'pelling',
  'silk-route-zuluk-tour-package': 'zuluk',
  'lava-lolegaon-rishop-tour-package': 'lava',
  'kolakham-sittong-offbeat-tour-package': 'kurseong',
  'kalimpong-lava-tour-package': 'kalimpong',
  'pelling-ravangla-tour-package': 'ravangla',
};

const GUIDE: Record<string, PhotoKey> = {
  'sikkim-permit-guide': 'tsomgo',
  'bagdogra-airport-transport-guide': 'airport',
  'nathula-pass-guide': 'nathula',
  'best-time-to-visit-darjeeling-sikkim': 'hero',
  'offbeat-places-north-bengal-sikkim': 'silk-route',
};

/** A destination's photo: its own choice, or the one for its slug. */
export const destinationPhoto = (d: string | { slug: string; photo?: string | null }): PhotoKey =>
  typeof d === 'string' ? (DESTINATION[d] ?? 'hero') : (chosen(d.photo) ?? DESTINATION[d.slug] ?? 'hero');

export function packagePhoto(pkg: Pick<TourPackage, 'slug' | 'destinations'> & { photo?: string | null }): PhotoKey {
  const own = chosen(pkg.photo);
  if (own) return own;
  if (PACKAGE[pkg.slug]) return PACKAGE[pkg.slug];
  for (const d of pkg.destinations) if (DESTINATION[d]) return DESTINATION[d];
  return 'hero';
}

export const guidePhoto = (slug: string): PhotoKey => GUIDE[slug] ?? 'teesta';

/** A route is pictured by where it goes; places without a guide get a sensible stand-in. */
export function routePhoto(route: Pick<Route, 'destination' | 'toShort'> & { photo?: string | null }): PhotoKey {
  const own = chosen(route.photo);
  if (own) return own;
  if (route.destination && DESTINATION[route.destination]) return DESTINATION[route.destination];
  const to = route.toShort.toLowerCase();
  if (to.includes('airport')) return 'airport';
  if (to.includes('njp') || to.includes('siliguri')) return 'teesta';
  if (to.includes('phuentsholing') || to.includes('jaigaon') || to.includes('bhutan')) return 'bhutan';
  if (to.includes('lataguri') || to.includes('gorumara') || to.includes('jaldapara') || to.includes('dooars')) return 'dooars';
  if (to.includes('tsomgo') || to.includes('changu')) return 'tsomgo';
  if (to.includes('nathula')) return 'nathula';
  if (to.includes('lachung') || to.includes('lachen')) return 'lachung';
  if (to.includes('ravangla') || to.includes('namchi')) return 'ravangla';
  if (to.includes('zuluk') || to.includes('silk')) return 'zuluk';
  if (to.includes('rumtek')) return 'rumtek';
  return 'teesta';
}

/**
 * What each item would show by default, before its own choice, for the
 * dashboard's "used on" lists (src/server/photo-use.ts).
 */
export const defaultPhoto = {
  destination: (slug: string): PhotoKey => DESTINATION[slug] ?? 'hero',
  package: (pkg: Pick<TourPackage, 'slug' | 'destinations'>): PhotoKey => packagePhoto({ ...pkg, photo: null }),
  route: (route: Pick<Route, 'destination' | 'toShort'>): PhotoKey => routePhoto({ ...route, photo: null }),
};

