/**
 * The customer's private trip page (/trip/<token>/) and the itinerary behind it.
 *
 * The token is the booking reference plus a keyed hash of the booking's id, so
 * a link can be made at any moment without a database write, cannot be
 * guessed from the reference alone, and stops working when the booking's
 * personal data is removed.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'astro/zod';
import { eq, sql } from 'drizzle-orm';
import { GALLERY } from '../data/gallery';
import { packageBySlug } from '../data/packages';
import { routeBySlug } from '../data/routes';
import { POLICY } from '../data/site';
import { vehicleByKey } from '../data/vehicles';
import { BUILT_IN_TEMPLATES, firstName, plusDays, withArticle, type Template, type TemplateValues } from '../lib/itinerary-text';
import { PHOTOS, packagePhoto, routePhoto, type PhotoKey } from '../lib/photos';
import { audit } from './admin';
import { normalizePhone } from './bookings';
import { isDay } from './dashboard';
import { getDb, schema } from './db';
import type { ItineraryData } from './db/schema';
import { requireEnv } from './env';

type BookingRow = typeof schema.bookings.$inferSelect;

/* ---------------- The link ---------------- */

const TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const TOKEN_RE = /^([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})-([a-z2-9]{10})$/;

function mac(bookingId: string): string {
  const bytes = createHmac('sha256', requireEnv('BETTER_AUTH_SECRET')).update(`trip:${bookingId}`).digest();
  let out = '';
  for (let i = 0; i < 10; i++) out += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
  return out;
}

/** True when a token has the right shape; checked before anything reaches the database. */
export const looksLikeTripToken = (token: string) => TOKEN_RE.test(token);

/** "5RJ8VC-h3k9x2m4pq" for booking BAT-5RJ8VC. */
export const tripToken = (b: { id: string; ref: string }) => `${b.ref.slice(4)}-${mac(b.id)}`;
export const tripPath = (b: { id: string; ref: string }) => `/trip/${tripToken(b)}/`;

/** The booking a token belongs to, or null when the token is wrong. */
export async function bookingForToken(token: string): Promise<BookingRow | null> {
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const [row] = await getDb().select().from(schema.bookings).where(eq(schema.bookings.ref, `BAT-${m[1]}`));
  if (!row) return null;
  const want = Buffer.from(mac(row.id));
  const got = Buffer.from(m[2]!);
  return want.length === got.length && timingSafeEqual(want, got) ? row : null;
}

/* ---------------- The photo library ---------------- */

export type LibraryPhoto = { key: string; title: string; place: string; alt: string };

/** Every photo on the website, the same set as the gallery page. */
export const LIBRARY: LibraryPhoto[] = GALLERY.map((g) => ({ key: g.photo, title: g.title, place: g.place, alt: PHOTOS[g.photo]?.alt ?? g.title }));
const LIBRARY_KEYS = new Set(LIBRARY.map((p) => p.key));
export const isPhotoKey = (k: string) => LIBRARY_KEYS.has(k);
export const photoAlt = (k: string) => LIBRARY.find((p) => p.key === k)?.title ?? '';

/** Picks a picture for a day from the places its title and text name. */
const PLACE_PHOTOS: [RegExp, PhotoKey][] = [
  [/gurudongmar/i, 'gurudongmar'],
  [/yumthang|lachung|lachen|north sikkim/i, 'lachung'],
  [/tsomgo|changu|baba mandir/i, 'tsomgo'],
  [/nath[uo] ?la/i, 'nathula'],
  [/zuluk|silk route|nathang|kupup/i, 'zuluk'],
  [/rumtek/i, 'rumtek'],
  [/ravangla|namchi|buddha park/i, 'ravangla'],
  [/pelling|pemayangtse|rabdentse/i, 'pelling'],
  [/jaldapara|gorumara|dooars|lataguri|safari/i, 'dooars'],
  [/bhutan|phuentsholing|thimphu|paro|punakha/i, 'bhutan'],
  [/lava|lolegaon|rishop|kolakham/i, 'lava'],
  [/kalimpong/i, 'kalimpong'],
  [/mirik/i, 'mirik'],
  [/kurseong/i, 'kurseong'],
  [/tiger hill|toy train|batasia|darjeeling/i, 'toy-train'],
  [/gangtok|mg marg/i, 'gangtok'],
  [/teesta|sevoke|siliguri|njp/i, 'teesta'],
  [/bagdogra|airport/i, 'airport'],
];
export function guessPhoto(text: string): string {
  for (const [re, key] of PLACE_PHOTOS) if (re.test(text) && LIBRARY_KEYS.has(key)) return key;
  return '';
}

/* ---------------- Filling in a new itinerary ---------------- */

const TAXI_INCLUDES = [
  'Private car with a verified driver',
  'Fuel, tolls, parking and driver allowance',
  `Up to ${POLICY.freeWaitMinutes} minutes of free waiting at pickup, and flight tracking for airport pickups`,
];
const TAXI_EXCLUDES = ['Sightseeing stops not agreed before the trip', 'Entry tickets and permits, unless agreed'];

/** The place a trip is "to", for "your Gangtok trip". */
export function tripPlace(b: Pick<BookingRow, 'kind' | 'routeSlug' | 'packageSlug' | 'tripName'>): string {
  if (b.kind === 'package' && b.packageSlug) {
    const pkg = packageBySlug(b.packageSlug);
    if (pkg) return pkg.places.slice(0, 2).join(' and ');
  }
  if (b.routeSlug) {
    const r = routeBySlug(b.routeSlug);
    if (r) return r.toShort;
  }
  return b.tripName.split(' · ')[0]!.split(' to ').pop() ?? 'hills';
}

/** A first draft from the booking and its package or route. Staff edit from here. */
export function itineraryFromBooking(b: BookingRow): ItineraryData {
  const car = vehicleByKey(b.vehicle)?.name ?? b.vehicle;
  const pkg = b.kind === 'package' && b.packageSlug ? packageBySlug(b.packageSlug) : undefined;
  const route = b.routeSlug ? routeBySlug(b.routeSlug) : undefined;
  const place = tripPlace(b);

  let days: ItineraryData['days'];
  let photos: string[];
  if (pkg) {
    days = pkg.itinerary.map((d, i) => ({
      title: d.title,
      detail: d.detail,
      stay: i === pkg.itinerary.length - 1 ? 'Drop: Bagdogra Airport or NJP' : '',
      photo: guessPhoto(`${d.title} ${d.detail}`) || packagePhoto(pkg),
    }));
    photos = [packagePhoto(pkg), ...days.map((d) => d.photo)].filter((k, i, all) => k && all.indexOf(k) === i).slice(0, 6);
  } else {
    const title = b.tripName.split(' · ')[0]!.replace(' (IXB)', '');
    const detail = route
      ? `About ${route.km} km and ${route.duration}, by ${route.via}.`
      : '';
    const photo = route ? routePhoto(route) : guessPhoto(title);
    days = [{ title, detail, stay: b.dropAddress ? `Drop: ${b.dropAddress}` : '', photo }];
    photos = [photo, b.vehicle === 'innova' ? 'car-innova' : b.vehicle === 'suv' ? 'car-suv' : b.vehicle === 'traveller' ? 'car-traveller' : 'car-sedan'].filter((k) => k && isPhotoKey(k));
  }

  return {
    name: b.customerName ?? '',
    phone: b.customerPhone ?? '',
    title: `Your ${place} trip`,
    start: b.pickupDate,
    end: pkg ? plusDays(b.pickupDate, Math.max(0, pkg.days - 1)) : b.pickupDate,
    time: b.pickupTime,
    pax: b.pax,
    pickup: route ? route.fromShort : 'Bagdogra Airport',
    flight: b.flight ?? '',
    car,
    vehicleNumber: b.vehicleNumber ?? '',
    driver: b.driverName ?? '',
    driverPhone: b.driverPhone ?? '',
    days,
    includes: pkg ? pkg.includes : TAXI_INCLUDES,
    excludes: pkg ? pkg.excludes : TAXI_EXCLUDES,
    photos,
    message: '',
    showQr: true,
  };
}

export function templateValues(d: ItineraryData, place: string, dateLabel: string): TemplateValues {
  return {
    first: firstName(d.name),
    place,
    driver: d.driver,
    driverPhone: d.driverPhone,
    pickup: d.pickup,
    time: d.time,
    date: dateLabel,
    car: d.car,
    aCar: withArticle(d.car),
    vehicleNumber: d.vehicleNumber,
    title: d.title,
  };
}

/* ---------------- Checking what the popup sends ---------------- */

const line = (max: number) => z.string().trim().max(max).default('');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const itinerarySchema = z.object({
  name: z.string().trim().min(1, 'Enter the customer’s name.').max(80),
  phone: z.string().trim().max(24),
  title: z.string().trim().min(1, 'Give the trip a title.').max(120),
  start: day,
  end: day,
  time: z.union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
  pax: z.coerce.number().int().min(1).max(50),
  pickup: line(160),
  flight: line(60),
  car: line(80),
  vehicleNumber: line(20),
  driverId: z.union([z.literal(''), z.uuid()]).optional(),
  driver: line(60),
  driverPhone: line(24),
  days: z
    .array(z.object({ title: line(120), detail: line(1000), stay: line(160), photo: z.string().max(40).default('') }))
    .max(30),
  includes: z.array(z.string().trim().max(200)).max(30),
  excludes: z.array(z.string().trim().max(200)).max(30),
  photos: z.array(z.string().max(40)).max(10),
  message: line(2000),
  showQr: z.boolean(),
});

/** Validates and tidies a draft. Returns an error for the person, or clean data. */
export function cleanItinerary(input: unknown): { error: string } | { data: ItineraryData } {
  const parsed = itinerarySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg = issue?.message && !/^(Invalid|Too|Expected|String)/.test(issue.message) ? issue.message : `Check the ${String(issue?.path[0] ?? 'form')} field.`;
    return { error: msg };
  }
  const d = parsed.data;
  const phone = d.phone ? normalizePhone(d.phone) : '';
  if (phone === null) return { error: 'Check the WhatsApp number. Ten digits, or with the country code.' };
  const driverPhone = d.driverPhone ? normalizePhone(d.driverPhone) : '';
  if (driverPhone === null) return { error: 'Check the driver’s phone number.' };
  if (!isDay(d.start) || !isDay(d.end)) return { error: 'Check the trip dates.' };
  if (d.end < d.start) return { error: 'The trip ends before it starts. Check the dates.' };
  return {
    data: {
      ...d,
      phone,
      driverPhone,
      days: d.days.filter((x) => x.title || x.detail || x.stay).map((x) => ({ ...x, photo: isPhotoKey(x.photo) ? x.photo : '' })),
      includes: d.includes.filter(Boolean),
      excludes: d.excludes.filter(Boolean),
      photos: d.photos.filter((k, i, all) => isPhotoKey(k) && all.indexOf(k) === i),
    },
  };
}

/* ---------------- Deleting ---------------- */

/**
 * Removes a booking's itinerary, draft and sent copy alike. The customer's
 * link keeps working but shows only the booking and payment, and the next
 * "Send itinerary" starts again from the booking. Noted on the timeline.
 */
export async function deleteItinerary(bookingId: string, ctx: { actorId: string; ipHash: string }): Promise<boolean> {
  const db = getDb();
  const removed = await db.transaction(async (tx) => {
    const [row] = await tx
      .delete(schema.itineraries)
      .where(eq(schema.itineraries.bookingId, bookingId))
      .returning({ sentCount: schema.itineraries.sentCount, title: sql<string>`${schema.itineraries.draft}->>'title'` });
    if (!row) return null;
    await tx.insert(schema.bookingEvents).values({ bookingId, actorId: ctx.actorId, type: 'itinerary_deleted', data: { sentCount: row.sentCount, title: row.title } });
    return row;
  });
  if (removed) await audit({ actorId: ctx.actorId, action: 'itinerary_deleted', entity: 'booking', entityId: bookingId, detail: { sentCount: removed.sentCount }, ipHash: ctx.ipHash });
  return Boolean(removed);
}

/* ---------------- Message templates ---------------- */

export const TEMPLATES_KEY = 'message_templates';

export async function allTemplates(): Promise<Template[]> {
  const [row] = await getDb().select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, TEMPLATES_KEY));
  const custom = ((row?.value as Template[] | undefined) ?? []).map((t) => ({ ...t, custom: true }));
  return [...BUILT_IN_TEMPLATES, ...custom];
}

export async function customTemplates(): Promise<Template[]> {
  return (await allTemplates()).filter((t) => t.custom);
}
