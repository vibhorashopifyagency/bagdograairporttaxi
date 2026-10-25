/**
 * The one source of truth for who the business is and how to reach it.
 *
 * Name, address and phone must read identically everywhere: the header, the
 * footer, every JSON-LD node, llms.txt and the Google Business Profile. The
 * competitor research found rivals showing two addresses or three phone
 * numbers on one page, and that inconsistency is exactly what weakens a local
 * pack listing. Every page reads these values; nothing hard-codes them.
 *
 * Anything marked TODO(pre-launch) is a placeholder the owner must replace.
 * `scripts/verify-build.mjs` refuses a build with PRE_LAUNCH = false while any
 * placeholder is still in the built HTML.
 *
 * The values below are the starting copy. Once the admin changes business
 * details, policies or the pre-launch switch in the dashboard, the
 * dashboard's version is what the site shows (see ./published.ts).
 */
import { overlayOne, publishedRecord } from './published';

/**
 * While true, every page is `noindex, nofollow`, robots.txt answers
 * `Disallow: /`, and llms.txt says nothing. Flip to false only when the
 * placeholders below are real and the fares are confirmed.
 */
export const LAUNCH_START = { preLaunch: true };
export const PRE_LAUNCH: boolean = overlayOne('site', LAUNCH_START, 'launch').preLaunch;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** '2026-10' as 'October 2026'. */
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
/** '2026-10-22' as '22 October 2026'. */
const dayLabel = (ymd: string) => `${Number(ymd.slice(8, 10))} ${monthLabel(ymd)}`;

/**
 * When the content last changed. Bump these here for a change made in code;
 * a publish in the dashboard moves them on by itself (src/server/content.ts).
 * Whichever is later wins, and the labels follow.
 */
export const UPDATED_START = {
  // Shown next to every fare. Update it whenever FARES change.
  faresUpdated: '2026-10',
  // The homepage's dateModified (JSON-LD and the key-facts footnote). Bump it
  // whenever a fare, a policy or a key fact changes.
  contentUpdated: '2026-10-25',
  // The destination guides' dateModified and sitemap lastmod. Bump it when a
  // destination's facts change.
  destinationsUpdated: '2026-10-19',
};
const fromDashboard = publishedRecord('site', 'dates') ?? {};
const later = (code: string, dashboard: unknown) =>
  typeof dashboard === 'string' && dashboard.length === code.length && dashboard > code ? dashboard : code;
const faresUpdated = later(UPDATED_START.faresUpdated, fromDashboard.faresUpdated);
const contentUpdated = later(UPDATED_START.contentUpdated, fromDashboard.contentUpdated);

/** The site's name and the homepage's search title and description. */
export const SITE_TEXT_START = {
  name: 'Bagdogra Airport Taxi',
  // Leads with the keyword and the price, the pattern the research found
  // working best in this market (sikkimtravellers.com).
  title:
    'Bagdogra Airport Taxi from ₹600 | Darjeeling, Gangtok & Sikkim Cabs',
  // Under 160 characters: the price, the places, the proof, then the action.
  description:
    'Fixed-fare taxi from Bagdogra Airport and NJP to Darjeeling, Gangtok and the Dooars from ₹600. Verified drivers, flight tracking, free cancellation.',
};
const SITE_TEXT = overlayOne('site', SITE_TEXT_START);

export const SITE = {
  url: 'https://bagdograairporttaxi.com',
  name: SITE_TEXT.name,
  title: SITE_TEXT.title,
  description: SITE_TEXT.description,
  locale: 'en-IN',
  lang: 'en',
  faresUpdated,
  faresUpdatedLabel: monthLabel(faresUpdated),
  contentUpdated,
  contentUpdatedLabel: dayLabel(contentUpdated),
  destinationsUpdated: later(UPDATED_START.destinationsUpdated, fromDashboard.destinationsUpdated),
} as const;

export const BUSINESS_START = {
  legalName: 'Jai Jawan Travels', // From the logo and the current site ("a unit of Jai Jawan Travels"). TODO(pre-launch): confirm the registered name
  tagline: 'Your journey, our responsibility', // The owner's own line, from the Google Business Profile post of 18 Oct 2026
  placeId: 'ChIJgebDZQJH5DkR9JC1zX1LUU0', // Google Place ID of the listing (derived from its Maps feature ID)
  foundingYear: '2015', // TODO(pre-launch): confirm year started
  phone: '+91 82930 14308', // From the Google Business Profile (20 Oct 2026). TODO(pre-launch): confirm this is the one number to publish
  phoneHref: 'tel:+918293014308',
  whatsapp: '918293014308', // TODO(pre-launch): confirm WhatsApp runs on the main number
  email: 'bagdograairporttaxi@gmail.com', // As shown on the current live site
  address: {
    street: 'Behind Ashok Nagar Club, Lower Ashok Nagar', // As on the Google Business Profile
    locality: 'Bagdogra',
    district: 'Darjeeling',
    region: 'West Bengal',
    postalCode: '734014',
    country: 'IN',
  },
  // The office pin, from the owner on 21 Oct 2026 (six decimals; Google asks for at least five).
  geo: { lat: 26.703019, lng: 88.337305 },
  mapsUrl: 'https://maps.app.goo.gl/WTafG6NNSiPbbmVG7', // Google Business Profile (from the owner)
  hours: 'Open 24 hours, every day', // Owner's decision, 21 Oct 2026. The Google Business Profile must say the same (it showed Mon–Sat 08:00–22:00 on 20 Oct).
  gstin: '', // TODO(pre-launch): GSTIN, shown on About and in the footer when set
  sameAs: [
    'https://maps.app.goo.gl/WTafG6NNSiPbbmVG7',
    // TODO(pre-launch): TripAdvisor, Facebook, Instagram, Justdial URLs
  ] as string[],
  /**
   * Registrations and approvals shown on About and in the footer, e.g.
   * { name: 'West Bengal Tourism registered tour operator', id: 'WBT/...' }.
   * Only list what you can show a certificate for.
   */
  registrations: [
    // TODO(pre-launch): tourism department / IATO / TAAI / Sikkim Tourism registrations
  ] as { name: string; id?: string }[],
};
export const BUSINESS = overlayOne('business', BUSINESS_START);

/**
 * The MSME (Udyam) entry in `registrations`, if the owner has added one, so
 * the MSME badge (MsmeBadge.astro) can show its number and the plain lists
 * on About and in the footer can leave it out.
 */
export const MSME = BUSINESS.registrations.find((r) => /\b(msme|udyam)\b/i.test(r.name));

/** The promises shown beside every Book button. Keep them true. */
export const POLICY_START = {
  advancePercent: 20,
  freeWaitMinutes: 60,
  freeCancelHours: 24,
  lateCancelRefundPercent: 50,
  refundDays: 5,
  nightChargeFrom: '22:00',
  nightChargeTo: '06:00',
  nightCharge: 300,
};
export const POLICY = overlayOne('policy', POLICY_START);

/*
 * Payments: there is no payment gateway (owner, 21 Oct 2026). The advance is
 * paid by UPI to the office QR code, which the admin uploads on the admin
 * Payments page; /book/ shows it through /api/upi/. The balance is paid to
 * the driver after a taxi trip, in cash or by UPI.
 */

export const waLink = (text: string) =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;

export const NAV = [
  { href: '/taxi/', label: 'Taxi fares' },
  { href: '/tour-packages/', label: 'Tour packages' },
  { href: '/destinations/', label: 'Destinations' },
  { href: '/guides/', label: 'Travel guides' },
  { href: '/gallery/', label: 'Gallery' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

export const ORG_ID = `${SITE.url}/#business`;
export const WEBSITE_ID = `${SITE.url}/#website`;
