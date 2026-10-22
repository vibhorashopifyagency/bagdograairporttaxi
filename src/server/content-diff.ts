/**
 * What changed in a draft, written for the admin: "Sedan ₹2,800 → ₹3,100",
 * "Day 4 Tsomgo Lake and Baba Mandir → Tsomgo Lake, Baba Mandir and Nathula".
 * The Review and publish popup and the "was ..." notes beside a form's boxes
 * use it. Pure functions, no database.
 */
import type { ContentType } from '../data/published';
import { WORD_PAGES, type WordField } from '../data/page-text';

export interface DiffLine {
  /** The field, in plain words: "Sedan", "Opening answer", "Day 4". */
  what: string;
  /** Empty when something was added. */
  from: string;
  /** Empty when something was removed. */
  to: string;
}

type Data = Record<string, unknown>;
const isRecord = (v: unknown): v is Data => typeof v === 'object' && v !== null && !Array.isArray(v);

const inr = (n: unknown) => (typeof n === 'number' ? '₹' + n.toLocaleString('en-IN') : String(n ?? ''));
const CARS: Record<string, string> = { sedan: 'Sedan', suv: 'SUV', innova: 'Innova Crysta', traveller: 'Tempo Traveller' };

/** Field names in plain words, by kind of content. A path such as "address.street" or "fares.sedan". */
const LABELS: Partial<Record<ContentType, Record<string, string>>> = {
  business: {
    legalName: 'Registered name',
    tagline: 'Tagline',
    placeId: 'Google Place ID',
    foundingYear: 'Year started',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    email: 'Email',
    'address.street': 'Street',
    'address.locality': 'Town',
    'address.district': 'District',
    'address.region': 'State',
    'address.postalCode': 'PIN code',
    'geo.lat': 'Map pin, latitude',
    'geo.lng': 'Map pin, longitude',
    mapsUrl: 'Google Maps link',
    hours: 'Opening hours',
    gstin: 'GSTIN',
    sameAs: 'Profile link',
    registrations: 'Registration',
  },
  policy: {
    advancePercent: 'Advance to confirm',
    freeWaitMinutes: 'Free waiting',
    freeCancelHours: 'Free cancellation',
    lateCancelRefundPercent: 'Late cancellation refund',
    refundDays: 'Refund reaches them in',
    nightChargeFrom: 'Night charge from',
    nightChargeTo: 'Night charge until',
    nightCharge: 'Night charge',
  },
  site: { name: 'Site name', title: 'Search title', description: 'Search description', preLaunch: 'Pre-launch' },
  route: {
    from: 'From',
    to: 'To',
    fromShort: 'Short "from" name',
    toShort: 'Short "to" name',
    km: 'Distance',
    duration: 'Driving time',
    via: 'The way',
    'fares.sedan': 'Sedan',
    'fares.suv': 'SUV',
    'fares.innova': 'Innova Crysta',
    'fares.traveller': 'Tempo Traveller',
    summary: 'Opening answer',
    stops: 'Stop',
    tips: 'Tip',
    faqs: 'Question',
    destination: 'Destination page',
    returnSlug: 'Return route',
    group: 'Group',
    photo: 'Photo',
  },
  package: {
    name: 'Name',
    short: 'Short name',
    nights: 'Nights',
    days: 'Days',
    places: 'Place',
    fromPrice: 'Price per person',
    priceNote: 'What the price covers',
    bestFor: '"Best for" tag',
    summary: 'Summary',
    itinerary: 'Day',
    includes: 'Included',
    excludes: 'Not included',
    faqs: 'Question',
    destinations: 'Destination page',
    photo: 'Photo',
  },
  destination: {
    name: 'Name',
    short: 'Short name',
    region: 'Region',
    altitude: 'Altitude',
    summary: 'Opening answer',
    bestTime: 'Best time to visit',
    daysNeeded: 'Days needed',
    highlights: 'Highlight',
    howToReach: 'How to reach',
    permit: 'Permit',
    faqs: 'Question',
    'geo.lat': 'Map pin, latitude',
    'geo.lng': 'Map pin, longitude',
    photo: 'Photo',
  },
  vehicle: { name: 'Name', models: 'Models', seats: 'Seats', bags: 'Luggage', bestFor: 'Best for' },
  guide: { title: 'Title', description: 'Search description', summary: 'Opening answer' },
  photo: { title: 'Name', alt: 'What the photo shows', artist: 'Taken by', license: 'Licence', licenseUrl: 'Licence link', source: 'Link to the original', upload: 'The picture', focus: 'What stays in', width: 'Width', height: 'Height' },
};

/** How a value reads in the popup: rupees, units, yes and no. */
function show(type: ContentType, path: string, v: unknown): string {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'boolean') return path === 'preLaunch' ? (v ? 'On, hidden from Google' : 'Off, open to Google') : v ? 'Yes' : 'No';
  if (type === 'route' && path.startsWith('fares.')) return inr(v);
  if (type === 'package' && path === 'fromPrice') return inr(v);
  if (type === 'route' && path === 'km') return `${v} km`;
  if (type === 'photo' && path === 'upload') return 'a new picture';
  if (type === 'photo' && path === 'focus' && isRecord(v)) return `${Math.round(Number(v.x))}% across, ${Math.round(Number(v.y))}% down`;
  if (type === 'policy') {
    if (path === 'nightCharge') return inr(v);
    if (path.endsWith('Percent')) return `${v}%`;
    if (path === 'freeWaitMinutes') return `${v} minutes`;
    if (path === 'freeCancelHours') return `${v} hours`;
    if (path === 'refundDays') return `${v} working days`;
  }
  if (isRecord(v)) return Object.values(v).map(String).filter(Boolean).join(', ');
  return String(v);
}

/**
 * The part of a long text that changed, with a few words either side:
 * "costs ₹2,800 in a sedan" → "costs ₹3,100 in a sedan".
 */
export function changedPart(a: string, b: string, context = 28): [string, string] {
  if (a.length <= 90 && b.length <= 90) return [a, b];
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  // Widen to whole words, plus some context.
  let from = Math.max(0, start - context);
  while (from > 0 && a[from - 1] !== ' ') from--;
  let toA = Math.min(a.length, endA + context);
  let toB = Math.min(b.length, endB + context);
  while (toA < a.length && a[toA] !== ' ') toA++;
  while (toB < b.length && b[toB] !== ' ') toB++;
  const clip = (s: string, lo: number, hi: number) => (lo > 0 ? '…' : '') + s.slice(lo, hi).trim() + (hi < s.length ? '…' : '');
  return [clip(a, from, toA), clip(b, from, toB)];
}

const ITEM_TITLE: Record<string, (v: unknown) => string> = {
  faqs: (v) => (isRecord(v) ? String(v.q ?? '') : String(v)),
  itinerary: (v) => (isRecord(v) ? String(v.title ?? '') : String(v)),
  highlights: (v) => (isRecord(v) ? String(v.name ?? '') : String(v)),
  registrations: (v) => (isRecord(v) ? [v.name, v.id].filter(Boolean).join(', ') : String(v)),
};

function diffList(type: ContentType, path: string, label: string, a: unknown[], b: unknown[], out: DiffLine[]) {
  const objects = a.some(isRecord) || b.some(isRecord);
  if (!objects) {
    // Plain lists (stops, tips, places, links): what was added and what was taken out.
    const as = a.map(String);
    const bs = b.map(String);
    for (const x of as) if (!bs.includes(x)) out.push({ what: label, from: x, to: '' });
    for (const x of bs) if (!as.includes(x)) out.push({ what: label, from: '', to: x });
    if (!out.length && as.join('\n') !== bs.join('\n')) out.push({ what: `${label}s`, from: 'old order', to: 'new order' });
    return;
  }
  // Numbered lists (days, questions): compare place by place.
  const title = ITEM_TITLE[path] ?? ((v: unknown) => show(type, path, v));
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const what = `${label} ${i + 1}`;
    if (i >= a.length) out.push({ what, from: '', to: title(b[i]) });
    else if (i >= b.length) out.push({ what, from: title(a[i]), to: '' });
    else if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
      const ta = title(a[i]);
      const tb = title(b[i]);
      if (ta !== tb) out.push({ what, from: ta, to: tb });
      else {
        // Same title, different body: show the body's change.
        const ra = isRecord(a[i]) ? (a[i] as Data) : {};
        const rb = isRecord(b[i]) ? (b[i] as Data) : {};
        for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
          if (JSON.stringify(ra[k]) === JSON.stringify(rb[k])) continue;
          const [x, y] = changedPart(String(ra[k] ?? ''), String(rb[k] ?? ''));
          out.push({ what: `${what}${tb ? `, ${tb}` : ''}`, from: x, to: y });
        }
      }
    }
  }
}

function walk(type: ContentType, prefix: string, a: unknown, b: unknown, out: DiffLine[], labels: Record<string, string> = LABELS[type] ?? {}) {
  if ((isRecord(a) || isRecord(b)) && prefix !== 'focus') {
    const ra = isRecord(a) ? a : {};
    const rb = isRecord(b) ? b : {};
    for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
      const path = prefix ? `${prefix}.${k}` : k;
      // Worked out from other fields, never shown.
      if (['phoneHref', 'durationIso', 'slug', 'key', 'published', 'updated', 'updatedLabel', 'country'].includes(path)) continue;
      if (JSON.stringify(ra[k]) === JSON.stringify(rb[k])) continue;
      walk(type, path, ra[k], rb[k], out, labels);
    }
    return;
  }
  const label = labels[prefix] ?? prefix;
  if (Array.isArray(a) || Array.isArray(b)) {
    diffList(type, prefix, label, Array.isArray(a) ? a : [], Array.isArray(b) ? b : [], out);
    return;
  }
  if (show(type, prefix, a) === show(type, prefix, b)) return;
  const [x, y] = changedPart(show(type, prefix, a), show(type, prefix, b));
  out.push({ what: label, from: x, to: y });
}

/** Every difference between what is live and the draft, in the form's order. `key` names the page for page words. */
export function diffLines(type: ContentType, live: unknown, draft: unknown, key = ''): DiffLine[] {
  const out: DiffLine[] = [];
  if (type === 'text') {
    const fields = (WORD_PAGES as Record<string, { fields: Record<string, WordField> }>)[key]?.fields ?? {};
    walk(type, '', live, draft, out, Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.label])));
    return out;
  }
  if (type === 'order') {
    const a = Array.isArray(live) ? live.map(String) : [];
    const b = Array.isArray(draft) ? draft.map(String) : [];
    const moved = b.filter((k, i) => a[i] !== k).length;
    if (moved) out.push({ what: 'Order', from: '', to: `${moved} moved` });
    return out;
  }
  if (type === 'faq' || type === 'gallery') {
    const a = Array.isArray(live) ? live : [];
    const b = Array.isArray(draft) ? draft : [];
    diffList(type, type === 'faq' ? 'faqs' : 'gallery', type === 'faq' ? 'Question' : 'Photo', a, b, out);
    return out;
  }
  walk(type, '', live, draft, out);
  return out;
}

/** "was ₹2,800" for each changed box of a form, keyed by its path. */
export function wasNotes(type: ContentType, live: unknown, draft: unknown): Record<string, string> {
  const notes: Record<string, string> = {};
  const go = (prefix: string, a: unknown, b: unknown) => {
    if (isRecord(a) && isRecord(b)) {
      for (const k of Object.keys(b)) go(prefix ? `${prefix}.${k}` : k, a[k], b[k]);
      return;
    }
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null) || ((a ?? '') === '' && (b ?? '') === '')) return;
    if (Array.isArray(a) || Array.isArray(b)) {
      notes[prefix] = 'changed';
      return;
    }
    notes[prefix] = a === undefined || a === '' ? 'was empty' : `was ${show(type, prefix, a)}`;
  };
  go('', live, draft);
  return notes;
}

export const carName = (key: string) => CARS[key] ?? key;
