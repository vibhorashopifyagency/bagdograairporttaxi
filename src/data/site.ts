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
  description:
    'Fixed-fare taxis from Bagdogra Airport (IXB) and NJP to Darjeeling, Gangtok, Pelling and the Dooars. Verified drivers, flight tracking, secure payment, free cancellation.',
  locale: 'en-IN',
  lang: 'en',
  // Shown next to every fare. Update it whenever FARES change.
  faresUpdated: '2026-10',
  faresUpdatedLabel: 'October 2026',
} as const;

export const BUSINESS = {
  legalName: 'Bagdogra Airport Taxi', // TODO(pre-launch): registered business name
  foundingYear: '2015', // TODO(pre-launch): confirm year started
  phone: '+91 00000 00000', // TODO(pre-launch): one main number, used everywhere
  phoneHref: 'tel:+910000000000', // TODO(pre-launch)
  whatsapp: '910000000000', // TODO(pre-launch): digits only, with country code
  email: 'book@bagdograairporttaxi.com', // TODO(pre-launch): confirm mailbox exists
  address: {
    street: 'Airport More, Bagdogra', // TODO(pre-launch): real office street address
    locality: 'Bagdogra',
    district: 'Darjeeling',
    region: 'West Bengal',
    postalCode: '734014',
    country: 'IN',
  },
  // Bagdogra Airport (IXB) area. Replace with the office's own pin.
  geo: { lat: 26.6812, lng: 88.3286 }, // TODO(pre-launch): office coordinates
  mapsUrl: 'https://maps.google.com/?q=Bagdogra+Airport+Taxi', // TODO(pre-launch): Google Business Profile link
  hours: 'Open 24 hours, every day',
  gstin: '', // TODO(pre-launch): GSTIN, shown on About and in the footer when set
  sameAs: [
    // TODO(pre-launch): Google Business Profile, TripAdvisor, Facebook, Instagram, Justdial URLs
  ] as string[],
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
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

export const ORG_ID = `${SITE.url}/#business`;
export const WEBSITE_ID = `${SITE.url}/#website`;
