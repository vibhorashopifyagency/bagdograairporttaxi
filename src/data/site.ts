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
 */

/**
 * While true, every page is `noindex, nofollow`, robots.txt answers
 * `Disallow: /`, and llms.txt says nothing. Flip to false only when the
 * placeholders below are real and the fares are confirmed.
 */
export const PRE_LAUNCH = true;

export const SITE = {
  url: 'https://bagdograairporttaxi.com',
  name: 'Bagdogra Airport Taxi',
  // Leads with the keyword and the price, the pattern the research found
  // working best in this market (sikkimtravellers.com).
  title:
    'Bagdogra Airport Taxi from ₹600 | Darjeeling, Gangtok & Sikkim Cabs',
  // Under 160 characters: the price, the places, the proof, then the action.
  description:
    'Fixed-fare taxi from Bagdogra Airport and NJP to Darjeeling, Gangtok, Pelling and the Dooars from ₹600. Verified drivers, flight tracking, free cancellation.',
  locale: 'en-IN',
  lang: 'en',
  // Shown next to every fare. Update it whenever FARES change.
  faresUpdated: '2026-10',
  faresUpdatedLabel: 'October 2026',
  // The homepage's dateModified (JSON-LD and the key-facts footnote). Bump it
  // whenever a fare, a policy or a key fact changes.
  contentUpdated: '2026-10-20',
  contentUpdatedLabel: '20 October 2026',
  // The destination guides' dateModified and sitemap lastmod. Bump it when a
  // destination's facts change.
  destinationsUpdated: '2026-10-19',
} as const;

export const BUSINESS = {
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
  // Bagdogra Airport (IXB) area. Replace with the office's own pin.
  geo: { lat: 26.6812, lng: 88.3286 }, // TODO(pre-launch): office coordinates
  mapsUrl: 'https://maps.app.goo.gl/WTafG6NNSiPbbmVG7', // Google Business Profile (from the owner)
  hours: 'Open 24 hours, every day',
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

/** The promises shown beside every Book button. Keep them true. */
export const POLICY = {
  advancePercent: 20,
  freeWaitMinutes: 60,
  freeCancelHours: 24,
  lateCancelRefundPercent: 50,
  refundDays: 5,
  nightChargeFrom: '22:00',
  nightChargeTo: '06:00',
  nightCharge: 300,
};

/**
 * Secure advance payment. Set `advanceUrl` to a Razorpay / PhonePe / Cashfree
 * payment page URL to show the "Pay advance securely" button on /book/.
 * Until then the button is hidden and the payment link is sent on WhatsApp.
 */
export const PAYMENT = {
  advanceUrl: '', // TODO(pre-launch): payment gateway page URL
};

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
