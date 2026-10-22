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
import { ROUTE_GROUPS } from '../data/routes';
import { PHOTOS } from '../lib/photos';

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is empty.` : `${label} needs at least ${min} characters.`)
    .max(max, `${label} is too long (at most ${max} characters).`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long (at most ${max} characters).`)
    .optional()
    .transform((v) => (v ? v : undefined));

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
const photoKey = z.string().refine((k) => k in PHOTOS, 'Choose a photo from the library.');

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

export const orderSchema = list('items', slug, 500);
