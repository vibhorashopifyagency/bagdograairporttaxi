/**
 * Turns the website-editing forms into the shapes src/server/content-schemas.ts
 * checks, and works out the fields the admin never types (a route's driving
 * time for search engines, a package's days). Also the fare-text helpers the
 * fare grid uses. Pure functions, no database.
 */
import { updateFareText } from './content';

type Data = Record<string, unknown>;

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const all = (f: FormData, k: string) => f.getAll(k).map((v) => String(v).trim());
const list = (f: FormData, k: string) => all(f, k).filter(Boolean);
/** "₹3,100", "3100" and "3 100" are all 3100; an empty box is NaN, so the check says what is missing. */
export const rupees = (v: string) => {
  const t = v.replace(/[₹,\s]/g, '');
  return t === '' ? NaN : Number(t);
};
const pairs = (f: FormData, a: string, b: string, ka: string, kb: string) => {
  const as = all(f, a);
  const bs = all(f, b);
  return as.flatMap((x, i) => (x || bs[i] ? [{ [ka]: x, [kb]: bs[i] ?? '' }] : []));
};

/** A web address from words: "Bagdogra Airport to Mirik taxi" → "bagdogra-airport-to-mirik-taxi". */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

/**
 * The driving time for search engines, from the words: "3 to 3.5 hours" is
 * PT3H15M (the middle), "45 minutes" PT45M, "1 hour 30 minutes" PT1H30M.
 * Empty when it cannot be read.
 */
export function durationIso(text: string): string {
  const t = text.toLowerCase();
  let mins = 0;
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)\s*(h|hour|hours|hr|hrs|m|min|mins|minutes)\b/);
  if (range) {
    const mid = (Number(range[1]) + Number(range[2])) / 2;
    mins = range[3].startsWith('h') ? mid * 60 : mid;
  } else {
    const h = t.match(/(\d+(?:\.\d+)?)\s*(?:h|hour|hours|hr|hrs)\b/);
    const m = t.match(/(\d+)\s*(?:m|min|mins|minutes)\b/);
    if (h) mins += Number(h[1]) * 60;
    if (m) mins += Number(m[1]);
  }
  mins = Math.round(mins / 15) * 15 || Math.round(mins);
  if (!mins) return '';
  const H = Math.floor(mins / 60);
  const M = mins % 60;
  return `PT${H ? `${H}H` : ''}${M ? `${M}M` : ''}`;
}

export function routeFromForm(f: FormData, slug: string): Data {
  const duration = str(f, 'duration');
  const opt = (k: string) => str(f, k) || undefined;
  return {
    slug,
    from: str(f, 'from'),
    to: str(f, 'to'),
    fromShort: str(f, 'fromShort'),
    toShort: str(f, 'toShort'),
    km: rupees(str(f, 'km')),
    duration,
    durationIso: durationIso(duration),
    via: str(f, 'via'),
    fares: { sedan: rupees(str(f, 'sedan')), suv: rupees(str(f, 'suv')), innova: rupees(str(f, 'innova')), traveller: rupees(str(f, 'traveller')) },
    summary: str(f, 'summary'),
    stops: list(f, 'stops'),
    tips: list(f, 'tips'),
    faqs: pairs(f, 'faqQ', 'faqA', 'q', 'a'),
    destination: opt('destination'),
    returnSlug: opt('returnSlug'),
    group: str(f, 'group'),
    photo: str(f, 'photo') || null,
  };
}

export function packageFromForm(f: FormData, slug: string): Data {
  const nights = rupees(str(f, 'nights'));
  return {
    slug,
    name: str(f, 'name'),
    short: str(f, 'short'),
    nights,
    days: Number.isFinite(nights) ? nights + 1 : NaN,
    places: list(f, 'places'),
    fromPrice: rupees(str(f, 'fromPrice')),
    priceNote: str(f, 'priceNote'),
    bestFor: list(f, 'bestFor'),
    summary: str(f, 'summary'),
    itinerary: pairs(f, 'dayTitle', 'dayDetail', 'title', 'detail'),
    includes: list(f, 'includes'),
    excludes: list(f, 'excludes'),
    faqs: pairs(f, 'faqQ', 'faqA', 'q', 'a'),
    destinations: list(f, 'destinations'),
    photo: str(f, 'photo') || null,
  };
}

export function destinationFromForm(f: FormData, slug: string): Data {
  const num = (k: string) => {
    const t = str(f, k);
    return t === '' ? NaN : Number(t);
  };
  return {
    slug,
    name: str(f, 'name'),
    short: str(f, 'short') || null,
    region: str(f, 'region'),
    altitude: str(f, 'altitude'),
    summary: str(f, 'summary'),
    bestTime: str(f, 'bestTime'),
    daysNeeded: str(f, 'daysNeeded'),
    highlights: pairs(f, 'hName', 'hNote', 'name', 'note'),
    howToReach: str(f, 'howToReach'),
    permit: str(f, 'permit') || null,
    faqs: pairs(f, 'faqQ', 'faqA', 'q', 'a'),
    geo: { lat: num('lat'), lng: num('lng') },
    photo: str(f, 'photo') || null,
  };
}

export const faqsFromForm = (f: FormData) => pairs(f, 'faqQ', 'faqA', 'q', 'a') as { q: string; a: string }[];

/**
 * A travel guide from its form. The main text comes as one JSON value (the
 * parts editor writes it on save); if it cannot be read, the guide's parts
 * stay as they were. The packages keep the order they had, with newly ticked
 * ones after them.
 */
export function guideFromForm(f: FormData, current: Data): Data {
  let body: unknown = current.body;
  try {
    const parsed = JSON.parse(str(f, 'body'));
    if (Array.isArray(parsed)) body = parsed;
  } catch {
    /* keep the parts as they were */
  }
  const ticked = all(f, 'packages');
  const before = ((current.packages as string[]) ?? []).filter((p) => ticked.includes(p));
  return {
    ...current,
    title: str(f, 'title'),
    short: str(f, 'short'),
    seoTitle: str(f, 'seoTitle'),
    description: str(f, 'description'),
    summary: str(f, 'summary'),
    facts: pairs(f, 'factLabel', 'factValue', 'label', 'value'),
    body,
    faqs: faqsFromForm(f),
    packages: [...before, ...ticked.filter((p) => !before.includes(p))],
    askNote: str(f, 'askNote'),
    waText: str(f, 'waText'),
    bookHref: str(f, 'bookHref') || '/book/',
    ctaHeading: str(f, 'ctaHeading'),
  };
}

/** The first box that is empty or not a number, so the form can point at it before the schema's message. */
export function missingNumber(d: Data, paths: string[]): string | null {
  for (const p of paths) {
    const v = p.split('.').reduce<unknown>((o, k) => (o as Data | undefined)?.[k], d);
    if (typeof v !== 'number' || !Number.isFinite(v)) return p;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Fares written in a route's text                                     */
/* ------------------------------------------------------------------ */

export type Fares = Record<string, number>;
const CAR_WORDS: Record<string, string> = { sedan: 'sedan', suv: 'SUV', innova: 'Innova Crysta', traveller: 'Tempo Traveller' };
const rupeesIn = (text: string) => [...text.matchAll(/₹\s?([\d,]+)/g)].map((m) => ({ amount: Number(m[1].replace(/,/g, '')), at: m.index, raw: m[0] }));

export interface FareTextNote {
  /** The words around each fare the text still says: "₹2,800 in a sedan". */
  said: string[];
  /** The route's text with the old fares changed to the new ones, when that settles it. */
  fixed: { summary: string; faqs: { q: string; a: string }[] } | null;
  /** True when the opening answer has a fare that is not one of the route's fares: Publish refuses it. */
  blocks: boolean;
}

/**
 * Whether a route's text still says an old fare after its fares change.
 * Looks at the opening answer (Publish refuses a fare there that is not on
 * the chart) and the answers to its questions (a fare that was live and has
 * changed). `live` is what the text was written for.
 */
export function fareTextNote(route: Data, live: Fares): FareTextNote | null {
  const now = route.fares as Fares;
  const current = new Set(Object.values(now));
  const old = new Set(Object.values(live).filter((v) => !current.has(v)));
  const summary = String(route.summary ?? '');
  const faqs = ((route.faqs as { q: string; a: string }[]) ?? []).map((x) => ({ ...x }));
  const said: string[] = [];
  let blocks = false;
  const look = (text: string, strict: boolean) => {
    for (const r of rupeesIn(text)) {
      if (strict ? !current.has(r.amount) : old.has(r.amount)) {
        if (strict) blocks = true;
        // The fare and the few words after it: "₹2,800 in a sedan".
        const end = (r.at ?? 0) + r.raw.length;
        const after = text.slice(end, end + 32);
        let tail = after.split(/[,.;]| and | or /)[0];
        if (tail.length === after.length) tail = tail.replace(/\s+\S*$/, '');
        said.push((r.raw + tail).trim());
      }
    }
  };
  look(summary, true);
  for (const x of faqs) look(x.a, false);
  if (!said.length) return null;
  const fixedSummary = updateFareText(summary, live, now);
  const fixedFaqs = faqs.map((x) => ({ q: x.q, a: updateFareText(x.a, live, now) }));
  const settled = !rupeesIn(fixedSummary).some((r) => !current.has(r.amount)) && !fixedFaqs.some((x) => rupeesIn(x.a).some((r) => old.has(r.amount)));
  return { said: [...new Set(said)], fixed: settled ? { summary: fixedSummary, faqs: fixedFaqs } : null, blocks };
}

/** "Change it to ₹3,100 in a sedan": the first fare the fix would write, for the button. */
export function fixLabel(note: FareTextNote, route: Data, live: Fares): string {
  const now = route.fares as Fares;
  const changed = Object.keys(now).find((k) => live[k] !== now[k] && note.said.some((s) => s.includes(`₹${live[k].toLocaleString('en-IN')}`)));
  return changed ? `Change it to ₹${now[changed].toLocaleString('en-IN')}` : 'Change the text to match';
}

export const carWord = (k: string) => CAR_WORDS[k] ?? k;
