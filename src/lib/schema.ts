/**
 * JSON-LD builders. Schema is generated from the same data that renders each
 * page, never hand-written beside it, so the markup can't claim a fare or an
 * answer the page doesn't show.
 *
 * One business entity lives under ORG_ID and every other node points at it by
 * `@id`, so search and answer engines resolve a single business, not twenty.
 *
 * AggregateRating and Review come only from the fetched Google reviews, and
 * only when they are on the page: the rating badge is in the footer of every
 * page, the review cards only where the slider is (`googleReviews`).
 */
import { BUSINESS, ORG_ID, SITE, WEBSITE_ID } from '../data/site';
import type { Faq, Route } from '../data/routes';
import { VEHICLES } from '../data/vehicles';
import { GOOGLE } from '../data/reviews';
import type { TourPackage } from '../data/packages';
import type { Destination } from '../data/destinations';

export const abs = (path: string) => new URL(path, SITE.url).href;

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
      image: abs('/og/default.png'),
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
      sameAs: BUSINESS.sameAs,
      aggregateRating: GOOGLE.hasSchema
        ? {
            '@type': 'AggregateRating',
            ratingValue: GOOGLE.rating,
            reviewCount: GOOGLE.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
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
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: SITE.name,
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

export function article(opts: { headline: string; description: string; path: string; modified: string }) {
  return {
    '@type': 'Article',
    '@id': `${abs(opts.path)}#article`,
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: abs(opts.path),
    dateModified: opts.modified,
    datePublished: opts.modified,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    image: abs('/og/default.png'),
  };
}

/** The Google reviews shown in the slider, attached to the business. */
export function googleReviews() {
  // Sample cards are never marked up; only Google's own reviews are.
  if (!GOOGLE.hasSchema) return [];
  return GOOGLE.reviews.map((r) => ({
    '@type': 'Review',
    itemReviewed: { '@id': ORG_ID },
    author: { '@type': 'Person', name: r.author, url: r.authorUrl },
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    reviewBody: r.text,
    datePublished: r.published ? r.published.slice(0, 10) : undefined,
    publisher: { '@type': 'Organization', name: 'Google' },
    url: r.url,
  }));
}
