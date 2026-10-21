/**
 * JSON-LD builders. Schema is generated from the same data that renders each
 * page, never hand-written beside it, so the markup can't claim a fare or an
 * answer the page doesn't show.
 *
 * One business entity lives under ORG_ID and every other node points at it by
 * `@id`, so search and answer engines resolve a single business, not twenty.
 *
 * No Review or AggregateRating markup, on purpose. Google's review-snippet
 * guidelines say LocalBusiness/Organization rating markup is only for sites
 * that review *other* businesses, and that ratings must not be aggregated
 * from other websites. Marking up our own Google reviews breaks both rules
 * and risks a manual action. The rating badge and the review cards stay on
 * the page as plain HTML; Google shows the real rating from the Business
 * Profile in the local pack anyway.
 *
 * Dates carry the business's timezone (+05:30): Google reads a bare date in
 * Googlebot's timezone, which can shift a "published" day.
 */
import { BUSINESS, ORG_ID, SITE, WEBSITE_ID } from '../data/site';
import type { Faq, Route } from '../data/routes';
import { VEHICLES } from '../data/vehicles';
import type { TourPackage } from '../data/packages';
import type { Destination } from '../data/destinations';
import photos from '../data/photos.json';

export const abs = (path: string) => new URL(path, SITE.url).href;

/** ISO 8601 with the IST offset, for every date in the graph. */
export const isoDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00+05:30` : d);

type PhotoMeta = { alt: string; width: number; height: number; artist: string; license: string; licenseUrl: string; source: string; own?: boolean };
const PHOTOS = photos as Record<string, PhotoMeta>;

/**
 * The crops `scripts/fetch-photos.mjs` writes beside each photo. Google asks
 * for 16x9, 4x3 and 1x1 versions of an article's image, each at least 50k
 * pixels, so a result can use whichever shape its layout needs.
 */
const CROPS = [
  ['16x9', 1200, 675],
  ['4x3', 1024, 768],
  ['1x1', 900, 900],
] as const;

/**
 * ImageObject nodes for one of the site's photographs, in the three aspect
 * ratios, each carrying the licence metadata Google's image-licence feature
 * reads: who took it, the licence URL and where to get the original. The
 * Creative Commons photos credit the Wikimedia photographer; the business's
 * own photos credit the business.
 */
export function photoImages(key: string) {
  const p = PHOTOS[key];
  if (!p) return undefined;
  const credit = p.own
    ? { creditText: BUSINESS.legalName, creator: { '@id': ORG_ID }, copyrightNotice: `© ${BUSINESS.legalName}` }
    : {
        license: p.licenseUrl || undefined,
        acquireLicensePage: p.source || undefined,
        creditText: `${p.artist}, ${p.license}, via Wikimedia Commons`,
        creator: { '@type': 'Person', name: p.artist },
        copyrightNotice: `© ${p.artist}`,
      };
  return CROPS.map(([ratio, width, height]) => ({
    '@type': 'ImageObject',
    contentUrl: abs(`/img/${key}-${ratio}.webp`),
    url: abs(`/img/${key}-${ratio}.webp`),
    width,
    height,
    caption: p.alt,
    ...credit,
  }));
}

/**
 * The images for a page, from its share image. A photo from public/img
 * becomes the three credited crops; anything else (the default share card)
 * is a plain ImageObject.
 */
export function pageImages(imageUrl: string) {
  const m = imageUrl.match(/\/img\/([a-z0-9-]+)-(?:400|800|1600|16x9|4x3|1x1)\.webp$/);
  const fromPhoto = m ? photoImages(m[1]) : undefined;
  return fromPhoto ?? [{ '@type': 'ImageObject', contentUrl: imageUrl, url: imageUrl, width: 1200, height: 630 }];
}

const AREA_SERVED = [
  'Bagdogra', 'Siliguri', 'Darjeeling', 'Kalimpong', 'Kurseong', 'Mirik',
  'Gangtok', 'Sikkim', 'Dooars', 'Jalpaiguri', 'North Bengal',
].map((name) => ({ '@type': 'Place', name }));

export function businessGraph() {
  const address = {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS.address.street,
    addressLocality: BUSINESS.address.locality,
    addressRegion: BUSINESS.address.region,
    postalCode: BUSINESS.address.postalCode,
    addressCountry: BUSINESS.address.country,
  };
  return [
    {
      // TaxiService is a Service, not a place, so the business itself is a
      // LocalBusiness subtype (TravelAgency covers the tour packages) and the
      // taxi offer is a separate TaxiService node it provides.
      '@type': ['TravelAgency', 'LocalBusiness'],
      '@id': ORG_ID,
      name: SITE.name,
      legalName: BUSINESS.legalName,
      url: abs('/'),
      logo: abs('/logo.png'),
      image: [abs('/og/default.png'), ...(photoImages('hero') ?? [])],
      description: SITE.description,
      telephone: BUSINESS.phone,
      email: BUSINESS.email,
      address,
      geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.geo.lat, longitude: BUSINESS.geo.lng },
      hasMap: BUSINESS.mapsUrl,
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
      },
      priceRange: '₹600 – ₹30,000',
      currenciesAccepted: 'INR',
      paymentAccepted: 'UPI, Credit Card, Debit Card, Net Banking, Cash',
      areaServed: AREA_SERVED,
      foundingDate: BUSINESS.foundingYear,
      // GSTIN is a tax identifier users can check in a public registry, one of
      // the trust signals Google's Organization markup asks for. Empty until set.
      taxID: BUSINESS.gstin,
      sameAs: BUSINESS.sameAs,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'reservations',
        telephone: BUSINESS.phone,
        email: BUSINESS.email,
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi', 'Bengali', 'Nepali'],
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          opens: '00:00',
          closes: '23:59',
        },
      },
      knowsAbout: [
        'Bagdogra Airport transfers', 'Sikkim protected area permits',
        'Darjeeling tours', 'North Sikkim tours', 'Dooars jungle safari',
      ],
    },
    {
      // Google picks the site name shown in results from this node on the
      // homepage; the bare domain is the fallback it recommends.
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: SITE.name,
      alternateName: [new URL(SITE.url).hostname],
      url: abs('/'),
      inLanguage: SITE.locale,
      publisher: { '@id': ORG_ID },
    },
  ];
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

/**
 * Google retired the FAQ rich result in May 2026, so this earns nothing on
 * Google. It stays because Bing and the answer engines still read it and it
 * costs nothing: the questions and answers are the ones visible on the page.
 */
export function faqPage(faqs: Faq[], path: string) {
  return {
    '@type': 'FAQPage',
    '@id': `${abs(path)}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function routeService(route: Route, path: string) {
  return {
    '@type': 'TaxiService',
    '@id': `${abs(path)}#service`,
    name: `${route.fromShort} to ${route.toShort} taxi`,
    serviceType: 'Private taxi transfer',
    description: route.summary,
    provider: { '@id': ORG_ID },
    areaServed: [{ '@type': 'Place', name: route.from }, { '@type': 'Place', name: route.to }],
    offers: VEHICLES.map((v) => ({
      '@type': 'Offer',
      name: `${v.name} (${v.seats} seats), one way`,
      price: route.fares[v.key],
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: abs(`/book/?route=${route.slug}&vehicle=${v.key}`),
      priceValidUntil: `${new Date().getFullYear() + 1}-03-31`,
    })),
  };
}

export function tourTrip(pkg: TourPackage, path: string) {
  return {
    '@type': 'TouristTrip',
    '@id': `${abs(path)}#trip`,
    name: `${pkg.name} tour package (${pkg.nights}N/${pkg.days}D)`,
    description: pkg.summary,
    touristType: pkg.bestFor,
    provider: { '@id': ORG_ID },
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: pkg.itinerary.length,
      itemListElement: pkg.itinerary.map((day, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `Day ${i + 1}: ${day.title}`,
        description: day.detail,
      })),
    },
    offers: {
      '@type': 'Offer',
      price: pkg.fromPrice,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: abs(path),
      description: `From ${pkg.fromPrice} INR ${pkg.priceNote}`,
    },
  };
}

export function touristDestination(d: Destination, path: string) {
  return {
    '@type': 'TouristDestination',
    '@id': `${abs(path)}#place`,
    name: d.name,
    description: d.summary,
    geo: { '@type': 'GeoCoordinates', latitude: d.geo.lat, longitude: d.geo.lng },
    containedInPlace: { '@type': 'Place', name: d.region },
    includesAttraction: d.highlights.map((h) => ({
      '@type': 'TouristAttraction',
      name: h.name,
      description: h.note,
    })),
  };
}

/**
 * An Article for the guide pages. `published` is the day the guide first
 * went up and `modified` the day its facts last changed; Google's content
 * guidance treats a modified date that moves without a real change as a
 * freshness trick, so neither is ever derived from the build time.
 */
export function article(opts: {
  headline: string;
  description: string;
  path: string;
  modified: string;
  published?: string;
  /** The page's share image; a public/img photo becomes the three credited crops. */
  image?: string;
}) {
  return {
    '@type': 'Article',
    '@id': `${abs(opts.path)}#article`,
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: abs(opts.path),
    datePublished: isoDate(opts.published ?? opts.modified),
    dateModified: isoDate(opts.modified),
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    image: pageImages(opts.image ? abs(opts.image) : abs('/og/default.png')),
    inLanguage: SITE.locale,
  };
}

/**
 * One WebPage node per page, so every page names itself, says which site it
 * belongs to and who publishes it, when it was last changed, and (where the
 * page opens with an answer paragraph) which text is fit to be read aloud or
 * quoted. The page image is the credited ImageObject, which is what Google
 * reads for both the result thumbnail and the image-licence feature.
 */
export function webPage(opts: {
  path: string;
  name: string;
  description: string;
  image: string;
  modified?: string;
  /** CSS selectors of the quotable, answer-first passages on the page. */
  speakable?: string[];
  type?: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage' | 'FAQPage';
}) {
  const images = pageImages(opts.image);
  return {
    '@type': opts.type ?? 'WebPage',
    '@id': `${abs(opts.path)}#webpage`,
    url: abs(opts.path),
    name: opts.name,
    description: opts.description,
    inLanguage: SITE.locale,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    primaryImageOfPage: images[0],
    image: images,
    dateModified: opts.modified ? isoDate(opts.modified) : undefined,
    speakable: opts.speakable?.length
      ? { '@type': 'SpeakableSpecification', cssSelector: opts.speakable }
      : undefined,
  };
}
