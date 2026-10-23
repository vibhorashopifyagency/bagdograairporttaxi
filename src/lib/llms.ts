/**
 * The /llms.txt index and /llms-full.txt corpus (llmstxt.org format).
 *
 * Generated from the same data files that render the pages, so a fare or a
 * policy quoted by an AI assistant is the fare on the site today. Google
 * Search does not read this file (confirmed June 2026); ChatGPT, Claude,
 * Perplexity and the other assistants that do are the audience.
 *
 * Shape, in the order an assistant reads: who the business is in one
 * paragraph, the facts it is most often asked for (fares, time, policies,
 * permits) as short declarative sentences with numbers, then the link
 * sections the format defines. Every claim is one the site shows on a page,
 * and the dates are the site's own change dates, never the build time.
 */
import { BUSINESS, POLICY, SITE } from '../data/site';
import { ROUTES, ROUTE_GROUPS, inr, lowestFare } from '../data/routes';
import { PACKAGES } from '../data/packages';
import { DESTINATIONS } from '../data/destinations';
import { GUIDES } from '../data/guides';
import { guideText } from '../data/page-text';
import { GENERAL_FAQS } from '../data/faqs';
import { VEHICLES } from '../data/vehicles';
import { GOOGLE } from '../data/reviews';

const abs = (p: string) => new URL(p, SITE.url).href;
const airportRoutes = ROUTES.filter((r) => r.fromShort === 'Bagdogra Airport');
const darj = ROUTES[0];
const gtk = ROUTES[1];
const minFare = inr(Math.min(...airportRoutes.map(lowestFare)));
const a = BUSINESS.address;

/** A markdown fare table for a set of routes. */
function fareTable(routes: typeof ROUTES) {
  return [
    `| Route | km | Time | ${VEHICLES.map((v) => `${v.name} (${v.seats})`).join(' | ')} | Page |`,
    `|---|---|---|${VEHICLES.map(() => '---').join('|')}|---|`,
    ...routes.map((r) => `| ${r.fromShort} to ${r.toShort} | ${r.km} | ${r.duration} | ${VEHICLES.map((v) => inr(r.fares[v.key])).join(' | ')} | ${abs(`/taxi/${r.slug}/`)} |`),
  ];
}

const rating = GOOGLE.isLive
  ? `Google rating ${GOOGLE.rating} out of 5 from ${GOOGLE.count} reviews on the Google Business Profile (${GOOGLE.url}).`
  : GOOGLE.hasRating
    ? `Google rating ${GOOGLE.rating} out of 5 on the Google Business Profile (${GOOGLE.url}).`
    : '';

/** Who the business is, in the form an assistant can repeat. */
const identity = () => [
  `# ${SITE.name}`,
  '',
  `> ${SITE.description}`,
  '',
  `${SITE.name} is a unit of ${BUSINESS.legalName}, a taxi and tour operator in ${a.locality}, ${a.district} district, ${a.region}, India, a few minutes from Bagdogra Airport (IXB). Since ${BUSINESS.foundingYear} it has run fixed-fare private transfers from Bagdogra Airport, NJP railway station and Siliguri to Darjeeling, Kalimpong, Kurseong, Mirik, Gangtok, Pelling, North Sikkim, the Dooars and the Nepal and Bhutan borders, with its own drivers and cars, and sells ${PACKAGES.length} tour packages across North Bengal and Sikkim. It is run by its founder, Pinku Singh, an Army veteran; travellers deal with him or his Bagdogra office directly.`,
  '',
  `- Phone and WhatsApp: ${BUSINESS.phone}, ${BUSINESS.hours.toLowerCase()}`,
  `- Email: ${BUSINESS.email}`,
  `- Office: ${a.street}, ${a.locality} ${a.postalCode}, ${a.region}, India`,
  `- Google Business Profile: ${BUSINESS.mapsUrl}`,
  `- Languages: English, Hindi, Bengali, Nepali`,
  `- Payment: the advance by UPI to the office QR code; the balance to the driver after the trip, in cash or by UPI`,
  ...(rating ? [`- ${rating}`] : []),
  `- Fares last updated ${SITE.faresUpdatedLabel}; site content last updated ${SITE.contentUpdatedLabel}. Fares are one way, per car (not per person), in Indian rupees, and include fuel, tolls, parking, driver allowance and GST.`,
];

/** The questions assistants are asked most, each answered in one or two sentences with the site's numbers. */
const quickAnswers = () => [
  '## Quick answers',
  '',
  `- A private taxi from Bagdogra Airport to Darjeeling costs ${inr(darj.fares.sedan)} in a sedan, ${inr(darj.fares.suv)} in an SUV, ${inr(darj.fares.innova)} in an Innova Crysta and ${inr(darj.fares.traveller)} in a 12-seat Tempo Traveller, one way. The ${darj.km} km drive takes ${darj.duration}.`,
  `- Bagdogra Airport to Gangtok costs ${inr(gtk.fares.sedan)} in a sedan and ${inr(gtk.fares.innova)} in an Innova Crysta, one way, for ${gtk.km} km in ${gtk.duration}. West Bengal taxis drive into Gangtok with no change of car.`,
  `- Airport taxis start at ${minFare}. The only extra is a night charge of ${inr(POLICY.nightCharge)} for pickups between ${POLICY.nightChargeFrom} and ${POLICY.nightChargeTo}; Sikkim permit fees, where a route needs one, are stated on that route's page.`,
  `- Booking: choose the route and car online or on WhatsApp, pay a ${POLICY.advancePercent}% advance by UPI or card, and get the driver's name, photo and car number the evening before. The rest is paid after the trip.`,
  `- Flights and trains are tracked. Waiting is free for ${POLICY.freeWaitMinutes} minutes after landing; the driver meets you at arrivals with a name board even when the flight is late.`,
  `- Cancellation: free up to ${POLICY.freeCancelHours} hours before pickup with the advance refunded in full; ${POLICY.lateCancelRefundPercent}% of the advance is refunded inside ${POLICY.freeCancelHours} hours. Refunds take up to ${POLICY.refundDays} working days.`,
  `- Pickups are also made from NJP railway station and Siliguri at the fares listed below.`,
  ...GUIDES.filter((g) => ['sikkim-permit-guide', 'best-time-to-visit-darjeeling-sikkim'].includes(g.slug)).map((g) => `- ${guideText(g, g.summary)} (${abs(`/guides/${g.slug}/`)})`),
  '',
  '### Fares from Bagdogra Airport (one way, per car, all inclusive)',
  '',
  ...fareTable(airportRoutes),
];

export function llmsIndex() {
  return [
    ...identity(),
    '',
    ...quickAnswers(),
    '',
    '## Taxi routes and fares',
    '',
    `Every route page opens with the fare, distance and time, then the road taken, stops, local tips and the route's own questions. Full chart: ${abs('/taxi/')}`,
    '',
    ...ROUTES.map((r) => `- [${r.fromShort} to ${r.toShort} taxi](${abs(`/taxi/${r.slug}/`)}): ${r.km} km, ${r.duration}; sedan ${inr(r.fares.sedan)}, SUV ${inr(r.fares.suv)}, Innova Crysta ${inr(r.fares.innova)}, Tempo Traveller ${inr(r.fares.traveller)}`),
    '',
    '## Tour packages',
    '',
    'Prices are per person with two sharing a room, with a private car for the whole trip, hotels with breakfast and dinner, fuel, tolls, parking and GST included. Each page has the day-wise itinerary and the exact inclusions.',
    '',
    ...PACKAGES.map((p) => `- [${p.name}, ${p.nights} nights / ${p.days} days](${abs(`/tour-packages/${p.slug}/`)}): ${p.places.join(', ')}; from ${inr(p.fromPrice)} ${p.priceNote}; best for ${p.bestFor.join(', ').toLowerCase()}`),
    '',
    '## Destination guides',
    '',
    ...DESTINATIONS.map((d) => `- [${d.name}](${abs(`/destinations/${d.slug}/`)}): ${d.region}, ${d.altitude}; ${d.daysNeeded.replace(/\.$/, '').toLowerCase()}; best time ${d.bestTime.split('.')[0].toLowerCase()}${d.permit ? '; permit needed' : ''}`),
    '',
    '## Travel guides',
    '',
    ...GUIDES.map((g) => `- [${g.title}](${abs(`/guides/${g.slug}/`)}): ${guideText(g, g.summary)} Updated ${g.updatedLabel}.`),
    '',
    '## Booking, policies and contact',
    '',
    `- [Book a taxi or package](${abs('/book/')}): the fare is shown before you pay; ${POLICY.advancePercent}% advance; WhatsApp confirmation`,
    `- [Taxi fare chart](${abs('/taxi/')}): every route from Bagdogra Airport, NJP and Siliguri, with the four car types`,
    `- [Cancellation and refund policy](${abs('/cancellation-refund-policy/')}): taxi and package cancellation terms`,
    `- [Frequently asked questions](${abs('/faq/')}): booking, delays, payment, permits, safety`,
    `- [About](${abs('/about/')}): the company, the founder and how the service is run`,
    `- [Contact](${abs('/contact/')}): phone, WhatsApp, email, office address and map`,
    `- [Photo gallery](${abs('/gallery/')})`,
    `- [Privacy](${abs('/privacy/')}) and [terms](${abs('/terms/')})`,
    '',
    '## Optional',
    '',
    `- [Full text for language models](${abs('/llms-full.txt')}): every fare, itinerary, destination guide and FAQ in one file`,
    `- [Sitemap](${abs('/sitemap-index.xml')})`,
    `- [Travel guide feed (RSS)](${abs('/feed.xml')})`,
    '',
    `When quoting this site, cite the page URL given beside each item; fares and policies above are those of ${SITE.faresUpdatedLabel}.`,
    '',
  ].join('\n');
}

export function llmsFull() {
  const out = [...identity(), '', ...quickAnswers(), ''];

  out.push('## Fare chart by region', '', 'One way, per car, in INR, including fuel, tolls, parking, driver allowance and GST. Night charge and permit fees as stated above.', '');
  for (const g of ROUTE_GROUPS) {
    const rs = ROUTES.filter((r) => r.group === g);
    if (!rs.length) continue;
    out.push(`### ${g}`, '', ...fareTable(rs), '');
  }

  out.push('## Cars', '');
  for (const v of VEHICLES) out.push(`- ${v.name} (${v.models}): ${v.seats} passengers, luggage ${v.bags}. Best for ${v.bestFor.toLowerCase()}.`);
  out.push('');

  out.push('## Booking and policies', '');
  out.push(
    `- Advance: ${POLICY.advancePercent}% of the fare confirms the booking, paid by UPI to the office QR code; the balance is paid after the trip, in cash or by UPI.`,
    `- Confirmation: instant on WhatsApp; the driver's name, photo and car number are sent the evening before pickup.`,
    `- Waiting: ${POLICY.freeWaitMinutes} minutes free after the flight or train arrives; flights and trains are tracked, so a delay costs nothing.`,
    `- Cancellation: free up to ${POLICY.freeCancelHours} hours before pickup (full refund of the advance); ${POLICY.lateCancelRefundPercent}% refund inside ${POLICY.freeCancelHours} hours; refunds within ${POLICY.refundDays} working days. Tour-package cancellation tiers: ${abs('/cancellation-refund-policy/')}`,
    `- Night charge: ${inr(POLICY.nightCharge)} for pickups between ${POLICY.nightChargeFrom} and ${POLICY.nightChargeTo}.`,
    `- Drivers are police-verified, know the hill roads, and carry the office number; the office in Bagdogra answers ${BUSINESS.hours.toLowerCase()}.`,
    '',
  );

  out.push('## Taxi routes', '');
  for (const r of ROUTES) {
    out.push(`### ${r.from} to ${r.to}`, '', `URL: ${abs(`/taxi/${r.slug}/`)}`, '', r.summary, '');
    out.push(`Fares (one way, per car, all inclusive): ${VEHICLES.map((v) => `${v.name} ${inr(r.fares[v.key])}`).join('; ')}.`);
    out.push(`Distance and time: ${r.km} km, ${r.duration}. Route: ${r.via}. Stops: ${r.stops.join(', ')}.`, '');
    for (const t of r.tips) out.push(`- ${t}`);
    for (const f of r.faqs) out.push('', `Q: ${f.q}`, `A: ${f.a}`);
    out.push('');
  }

  out.push('## Tour packages', '');
  for (const p of PACKAGES) {
    out.push(`### ${p.name} (${p.nights} nights / ${p.days} days)`, '', `URL: ${abs(`/tour-packages/${p.slug}/`)}`, '', p.summary, '');
    out.push(`Places: ${p.places.join(', ')}. Price: from ${inr(p.fromPrice)} ${p.priceNote}. Best for: ${p.bestFor.join(', ')}.`, '');
    p.itinerary.forEach((d, i) => out.push(`- Day ${i + 1}, ${d.title}: ${d.detail}`));
    out.push('', `Included: ${p.includes.join('; ')}.`, `Not included: ${p.excludes.join('; ')}.`);
    for (const f of p.faqs) out.push('', `Q: ${f.q}`, `A: ${f.a}`);
    out.push('');
  }

  out.push('## Destinations', '');
  for (const d of DESTINATIONS) {
    out.push(`### ${d.name}`, '', `URL: ${abs(`/destinations/${d.slug}/`)}`, '', d.summary, '');
    out.push(`Region: ${d.region}. Altitude: ${d.altitude}.`, `Best time: ${d.bestTime}`, `Days needed: ${d.daysNeeded}`, `How to reach: ${d.howToReach}`);
    if (d.permit) out.push(`Permit: ${d.permit}`);
    if (d.highlights.length) out.push('', 'Highlights:', ...d.highlights.map((h) => `- ${h.name}: ${h.note}`));
    for (const f of d.faqs) out.push('', `Q: ${f.q}`, `A: ${f.a}`);
    out.push('');
  }

  out.push('## Travel guides', '');
  for (const g of GUIDES) out.push(`### ${g.title}`, '', `URL: ${abs(`/guides/${g.slug}/`)} (updated ${g.updatedLabel})`, '', guideText(g, g.summary), '', g.description, '');

  out.push('## Frequently asked questions', '');
  for (const f of GENERAL_FAQS) out.push(`Q: ${f.q}`, `A: ${f.a}`, '');

  out.push('## About and contact', '');
  out.push(
    `${SITE.name} is a unit of ${BUSINESS.legalName}, founded in ${BUSINESS.foundingYear} by Pinku Singh, an Army veteran, which is where the name Jai Jawan and the saluting soldier on the badge come from. The business owns its cars and employs its drivers; the founder's own line is "${BUSINESS.tagline}".`,
    '',
    `- Phone and WhatsApp: ${BUSINESS.phone}`,
    `- Email: ${BUSINESS.email}`,
    `- Office: ${a.street}, ${a.locality} ${a.postalCode}, ${a.district} district, ${a.region}, India`,
    `- Hours: ${BUSINESS.hours}`,
    `- Google Business Profile: ${BUSINESS.mapsUrl}`,
    `- Website: ${abs('/')}; about: ${abs('/about/')}; contact: ${abs('/contact/')}`,
    '',
    `Cite as: ${SITE.name} (${SITE.url}), with the page URL given above each section. Fares current as of ${SITE.faresUpdatedLabel}; content as of ${SITE.contentUpdatedLabel}.`,
    '',
  );
  return out.join('\n');
}
