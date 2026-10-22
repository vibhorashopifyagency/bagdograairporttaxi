/**
 * What a valid edit looks like for each kind of website content, built from
 * the types in src/data/. Every save from the dashboard is checked here, so
 * a bad edit cannot reach the database, let alone the live site. Each
 * starting item must pass its own schema too (the content tests check it).
 *
 * Messages are written for the admin, not for developers.
 */
import { z } from 'zod';
import { GALLERY_CATEGORIES } from '../data/gallery';
import { WORD_PAGES, allowedVars, type WordField } from '../data/page-text';
import { ROUTE_GROUPS } from '../data/routes';
import { SAFE_HREF, linksIn, tokensIn } from '../lib/rich-text';

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is empty.` : `${label} needs at least ${min} characters.`)
    .max(max, `${label} is too long (at most ${max} characters).`);

/**
 * A field that may be left empty. Empty is kept as null, not dropped: the
 * build lays the admin's copy over the code's field by field
 * (src/data/published.ts), so a dropped field would bring the code's value
 * back. Pages read these with `if (x)` or `x ?? other`, which treat null as
 * empty.
 */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long (at most ${max} characters).`)
    .nullish()
    .transform((v) => (v ? v : null));

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'The web address may use only small letters, numbers and dashes.')
  .max(80, 'The web address is too long.');

const rupees = (label: string, min: number, max: number) =>
  z.number({ error: `${label} must be a number.` }).int(`${label} must be whole rupees.`).min(min, `${label} looks too low.`).max(max, `${label} looks too high.`);

const list = (label: string, item: z.ZodType, max: number, min = 0) =>
  z.array(item).min(min, `Add at least ${min} ${label}.`).max(max, `At most ${max} ${label}.`);

const faq = z.object({ q: text('A question', 5, 200), a: text('An answer', 10, 900) });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Write the time as 24-hour HH:MM, for example 22:00.');
/** A photo library key. Whether it exists is checked at Publish, since a new upload is still a draft. */
const photoKey = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Choose a photo from the library.').max(80);
const optionalPhoto = photoKey.nullish().transform((v) => v || null);

export const routeSchema = z.object({
  slug,
  from: text('From', 2, 80),
  to: text('To', 2, 80),
  fromShort: text('Short "from" name', 2, 40),
  toShort: text('Short "to" name', 2, 40),
  km: z.number().int().min(1, 'The distance looks too short.').max(2000, 'The distance looks too long.'),
  duration: text('Driving time', 3, 40),
  durationIso: z.string().regex(/^PT(\d+H)?(\d+M)?$/, 'The driving time for search engines is missing.'),
  via: text('The way', 5, 300),
  fares: z.object({
    sedan: rupees('The sedan fare', 300, 200000),
    suv: rupees('The SUV fare', 300, 200000),
    innova: rupees('The Innova fare', 300, 200000),
    traveller: rupees('The Tempo Traveller fare', 300, 300000),
  }),
  summary: text('The opening answer', 60, 600),
  stops: list('stops', text('A stop', 2, 120), 12),
  tips: list('tips', text('A tip', 10, 400), 8),
  faqs: list('questions', faq, 10),
  destination: optionalText('Destination', 80),
  returnSlug: optionalText('Return route', 80),
  group: z.enum(ROUTE_GROUPS, 'Choose which group of routes this belongs to.'),
  photo: optionalPhoto,
});

export const packageSchema = z
  .object({
    slug,
    name: text('The name', 3, 80),
    short: text('The short name', 3, 30),
    nights: z.number().int().min(1, 'At least one night.').max(30, 'At most 30 nights.'),
    days: z.number().int().min(2).max(31),
    places: list('places', text('A place', 2, 60), 12, 1),
    fromPrice: rupees('The price', 1000, 1000000),
    priceNote: text('What the price covers', 5, 120),
    bestFor: list('"best for" tags', text('A tag', 2, 40), 6),
    summary: text('The summary', 60, 600),
    itinerary: list('days', z.object({ title: text('A day title', 3, 100), detail: text('A day plan', 10, 600) }), 31, 1),
    includes: list('included items', text('An included item', 3, 200), 20),
    excludes: list('excluded items', text('An excluded item', 3, 200), 20),
    faqs: list('questions', faq, 10),
    destinations: list('destinations', slug, 8),
    photo: optionalPhoto,
  })
  .refine((p) => p.days === p.nights + 1, { message: 'Days must be one more than nights.', path: ['days'] })
  .refine((p) => p.itinerary.length === p.days, { message: 'Write one plan for each day of the trip.', path: ['itinerary'] });

export const destinationSchema = z.object({
  slug,
  name: text('The name', 2, 60),
  short: optionalText('The short name', 30),
  region: text('The region', 2, 80),
  altitude: text('The altitude', 2, 80),
  summary: text('The opening answer', 60, 600),
  bestTime: text('The best time to visit', 10, 300),
  daysNeeded: text('Days needed', 2, 80),
  highlights: list('highlights', z.object({ name: text('A highlight', 2, 80), note: text('Its note', 5, 200) }), 12, 1),
  howToReach: text('How to reach', 10, 500),
  permit: optionalText('Permit', 500),
  faqs: list('questions', faq, 10),
  geo: z.object({ lat: z.number().min(20).max(30), lng: z.number().min(85).max(93) }),
  photo: optionalPhoto,
});

export const vehicleSchema = z.object({
  key: z.enum(['sedan', 'suv', 'innova', 'traveller']),
  name: text('The name', 2, 40),
  models: text('The models', 3, 100),
  seats: z.number().int().min(2).max(30),
  bags: text('Luggage', 2, 60),
  bestFor: text('Best for', 5, 200),
});

export const businessSchema = z.object({
  legalName: text('The registered name', 2, 100),
  tagline: text('The tagline', 3, 100),
  placeId: z.string().trim().max(100),
  foundingYear: z.string().regex(/^(19|20)\d\d$/, 'The year started looks wrong.'),
  phone: z.string().trim().regex(/^\+91 \d{5} \d{5}$/, 'Write the phone like +91 82930 14308.'),
  phoneHref: z.string().regex(/^tel:\+91\d{10}$/),
  whatsapp: z.string().regex(/^91\d{10}$/, 'The WhatsApp number must be 91 and ten digits.'),
  email: z.email('That email address looks wrong.'),
  address: z.object({
    street: text('The street', 3, 120),
    locality: text('The town', 2, 60),
    district: text('The district', 2, 60),
    region: text('The state', 2, 60),
    postalCode: z.string().regex(/^\d{6}$/, 'The PIN code is six digits.'),
    country: z.literal('IN'),
  }),
  geo: z.object({ lat: z.number().min(20).max(30), lng: z.number().min(85).max(93) }),
  mapsUrl: z.url('The Google Maps link looks wrong.'),
  hours: text('Opening hours', 3, 80),
  gstin: z.string().trim().regex(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'That GSTIN looks wrong.'),
  sameAs: list('profile links', z.url('A profile link looks wrong.'), 10),
  registrations: list('registrations', z.object({ name: text('A registration', 3, 120), id: optionalText('Its number', 60) }), 10),
});

export const policySchema = z.object({
  advancePercent: z.number().int().min(0).max(100),
  freeWaitMinutes: z.number().int().min(0).max(240),
  freeCancelHours: z.number().int().min(0).max(168),
  lateCancelRefundPercent: z.number().int().min(0).max(100),
  refundDays: z.number().int().min(1).max(60),
  nightChargeFrom: time,
  nightChargeTo: time,
  nightCharge: rupees('The night charge', 0, 5000),
});

export const siteTextSchema = z.object({
  name: text('The site name', 3, 60),
  title: text('The search title', 30, 75),
  description: text('The search description', 70, 170),
});

export const launchSchema = z.object({ preLaunch: z.boolean() });

export const faqListSchema = list('questions', faq, 30, 1);

export const gallerySchema = list(
  'photos',
  z.object({
    photo: photoKey,
    title: text('A photo title', 2, 80),
    place: text('A place', 2, 80),
    category: z.enum(GALLERY_CATEGORIES as [string, ...string[]], 'Choose a group.'),
    href: z
      .string()
      .regex(/^\/[a-z0-9\-/?=&]*$/, 'Links must be a page on this site, starting with /.')
      .optional(),
    cta: optionalText('The button text', 60),
  }),
  80,
  1,
);

export const guideSchema = z.object({
  slug,
  title: text('The title', 20, 90),
  description: text('The description', 70, 170),
  summary: text('The opening answer', 60, 700),
  published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updatedLabel: z.string(),
});

const httpUrl = (label: string) => z.union([z.literal(''), z.url(`${label} looks wrong.`).regex(/^https?:\/\//, `${label} must start with https://`)]);

export const photoSchema = z.object({
  key: photoKey,
  title: optionalText('The name', 60),
  // May be empty while it is a draft; Publish asks for it (src/server/content.ts).
  alt: z.string().trim().max(200, 'The description is too long (at most 200 characters).'),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  file: z.string().max(300).optional(),
  artist: text('Taken by', 2, 100),
  license: text('The licence', 2, 60),
  licenseUrl: httpUrl('The licence link'),
  source: httpUrl('The link to the original'),
  own: z.boolean().optional(),
  upload: z.string().regex(/^website\/[0-9a-f-]{36}\.jpg$/).nullish().transform((v) => v || null),
  focus: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).nullish().transform((v) => v ?? null),
});

export const orderSchema = list('items', slug, 500);

/**
 * One page's words (src/data/page-text.ts). Every field may be left out,
 * since the dashboard stores only the fields the admin changed. A field
 * cannot be emptied (the design has a place for it), fill-ins must be ones
 * the page knows, links must be safe, and page titles and search
 * descriptions stay plain text.
 */
export function wordsSchema(page: string) {
  const def = (WORD_PAGES as Record<string, { fields: Record<string, WordField> }>)[page];
  const allowed = new Set(allowedVars(page));
  const shape: Record<string, z.ZodType> = {};
  for (const [key, f] of Object.entries(def?.fields ?? {})) {
    const name = f.label.split(' · ').pop() ?? f.label;
    const longest = Math.max(...(Array.isArray(f.text) ? f.text : [f.text]).map((x) => x.length));
    const max = key === 'seoTitle' ? 100 : key === 'seoDescription' ? 250 : Math.min(3000, Math.max(60, Math.ceil(longest * 3)));
    const one = z
      .string()
      .trim()
      .min(1, `${name} is empty. Write something, or put the old words back.`)
      .max(max, `${name} is too long (at most ${max} characters).`)
      .refine((v) => tokensIn(v).every((t) => allowed.has(t)), { message: `${name} has a fill-in in {curly brackets} this page does not know. Use one from the list on this form, or take the brackets away.` })
      .refine((v) => linksIn(v).every((l) => SAFE_HREF.test(l.href)), { message: `A link in ${name} must go to a page on this site (starting with /), or start with https://, mailto: or tel:.` })
      .refine((v) => !f.plain || (!linksIn(v).length && !/\*/.test(v)), { message: `${name} is plain text: no links, bold or stars.` });
    shape[key] = Array.isArray(f.text) ? list(name.toLowerCase(), one, Math.min(40, Math.max(6, f.text.length * 2)), 1) : one;
  }
  return z.object(shape).partial();
}
