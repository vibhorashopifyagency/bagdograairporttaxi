/**
 * The /llms.txt index and /llms-full.txt corpus (llmstxt.org format).
 *
 * Generated from the same data files that render the pages, so a fare or a
 * policy quoted by an AI assistant is the fare on the site today. Google says
 * Search ignores this file; it is here for the assistants that do read it
 * (ChatGPT, Claude, Perplexity and others) and costs nothing if unread.
 */
import { BUSINESS, POLICY, SITE } from '../data/site';
import { ROUTES, inr } from '../data/routes';
import { PACKAGES } from '../data/packages';
import { DESTINATIONS } from '../data/destinations';
import { GUIDES } from '../data/guides';
import { GENERAL_FAQS } from '../data/faqs';
import { VEHICLES } from '../data/vehicles';

const abs = (p: string) => new URL(p, SITE.url).href;

const header = () => [
  `# ${SITE.name}`,
  '',
  `> ${SITE.description}`,
  '',
  `${SITE.name} is a local taxi and tour operator based at ${BUSINESS.address.locality}, ${BUSINESS.address.region}, India, near Bagdogra Airport (IXB). Phone and WhatsApp: ${BUSINESS.phone}. ${BUSINESS.hours}. Fares are fixed, per car, one way, and include fuel, tolls, parking, driver allowance and GST; last updated ${SITE.faresUpdatedLabel}.`,
  '',
  `Key policies: ${POLICY.advancePercent}% advance to confirm; ${POLICY.freeWaitMinutes} minutes free waiting after landing; free cancellation up to ${POLICY.freeCancelHours} hours before pickup; refunds within ${POLICY.refundDays} working days; night charge ${inr(POLICY.nightCharge)} from ${POLICY.nightChargeFrom} to ${POLICY.nightChargeTo}.`,
];

export function llmsIndex() {
  return [
    ...header(),
    '',
    '## Taxi routes and fares',
    ...ROUTES.map((r) => `- [${r.fromShort} to ${r.toShort} taxi](${abs(`/taxi/${r.slug}/`)}): ${r.km} km, ${r.duration}, sedan ${inr(r.fares.sedan)}, Innova Crysta ${inr(r.fares.innova)}`),
    '',
    '## Tour packages',
    ...PACKAGES.map((p) => `- [${p.name} (${p.nights}N/${p.days}D)](${abs(`/tour-packages/${p.slug}/`)}): from ${inr(p.fromPrice)} ${p.priceNote}`),
    '',
    '## Destination guides',
    ...DESTINATIONS.map((d) => `- [${d.name}](${abs(`/destinations/${d.slug}/`)}): ${d.region}, best time ${d.bestTime.split('.')[0].toLowerCase()}`),
    '',
    '## Travel guides',
    ...GUIDES.map((g) => `- [${g.title}](${abs(`/guides/${g.slug}/`)}): ${g.description}`),
    '',
    '## Booking and policies',
    `- [Book online](${abs('/book/')}): instant fare, ${POLICY.advancePercent}% secure advance, WhatsApp confirmation`,
    `- [Full fare chart](${abs('/taxi/')})`,
    `- [Cancellation and refund policy](${abs('/cancellation-refund-policy/')})`,
    `- [FAQ](${abs('/faq/')})`,
    `- [Contact](${abs('/contact/')})`,
    '',
    '## Optional',
    `- [Full text for language models](${abs('/llms-full.txt')})`,
    '',
  ].join('\n');
}

export function llmsFull() {
  const out = [...header(), ''];
  out.push('## Cars', '');
  for (const v of VEHICLES) out.push(`- ${v.name} (${v.models}): ${v.seats} seats, ${v.bags}. ${v.bestFor}.`);
  out.push('', '## Taxi routes', '');
  for (const r of ROUTES) {
    out.push(`### ${r.from} to ${r.to}`, '', `URL: ${abs(`/taxi/${r.slug}/`)}`, '', r.summary, '');
    out.push(`Fares (one way, per car): ${VEHICLES.map((v) => `${v.name} ${inr(r.fares[v.key])}`).join('; ')}.`);
    out.push(`Route: ${r.via}. Stops: ${r.stops.join(', ')}.`, '');
    for (const t of r.tips) out.push(`- ${t}`);
    for (const f of r.faqs) out.push('', `Q: ${f.q}`, `A: ${f.a}`);
    out.push('');
  }
  out.push('## Tour packages', '');
  for (const p of PACKAGES) {
    out.push(`### ${p.name} (${p.nights} nights / ${p.days} days)`, '', `URL: ${abs(`/tour-packages/${p.slug}/`)}`, '', p.summary, '', `Price: from ${inr(p.fromPrice)} ${p.priceNote}.`, '');
    p.itinerary.forEach((d, i) => out.push(`- Day ${i + 1}, ${d.title}: ${d.detail}`));
    out.push('', `Included: ${p.includes.join('; ')}.`, `Not included: ${p.excludes.join('; ')}.`, '');
  }
  out.push('## Destinations', '');
  for (const d of DESTINATIONS) {
    out.push(`### ${d.name}`, '', `URL: ${abs(`/destinations/${d.slug}/`)}`, '', d.summary, '', `Best time: ${d.bestTime}`, `Days needed: ${d.daysNeeded}`, `How to reach: ${d.howToReach}`);
    if (d.permit) out.push(`Permit: ${d.permit}`);
    out.push('');
  }
  out.push('## Frequently asked questions', '');
  for (const f of GENERAL_FAQS) out.push(`Q: ${f.q}`, `A: ${f.a}`, '');
  return out.join('\n');
}
