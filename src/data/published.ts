/**
 * Website edits made in the dashboard, laid over the starting copy in this
 * folder.
 *
 * Every data file here holds the site's starting copy and passes it through
 * overlayList() or overlayOne() below. Before each build,
 * scripts/content-pull.mjs copies what the admin has published from the
 * database into .content/published.json (not in git). An item the admin
 * changed, added or removed there wins over the code; everything the admin
 * never touched keeps following the code, so editing these files still works
 * for it. The build prints a warning when the code copy of an item changes
 * after the admin edited it, because the admin's version stays live.
 *
 * Only the build reads the file: public pages stay static HTML and never
 * wait on the database. Publishing in the dashboard starts a new deploy
 * (src/server/content.ts), which pulls again. Without the file (a build with
 * no database) the site is exactly the starting copy.
 */

/** The kinds of content the dashboard edits; `order` holds a list's order. */
export type ContentType =
  | 'site'
  | 'business'
  | 'policy'
  | 'vehicle'
  | 'route'
  | 'package'
  | 'destination'
  | 'faq'
  | 'gallery'
  | 'guide'
  | 'photo'
  | 'order';

/** One published item: its data, or a deletion. `on` is the day (India) it went live. */
export type PublishedEntry = { data?: unknown; deleted?: true; on: string; baseHash?: string };

export interface Published {
  /** The newest content version included (content_versions.id); 0 for none. */
  version: number;
  items: Partial<Record<ContentType, Record<string, PublishedEntry>>>;
}

const files = import.meta.glob<Published>('/.content/published.json', { eager: true, import: 'default' });
const PUBLISHED: Published = Object.values(files)[0] ?? { version: 0, items: {} };

/** Which content version this build carries; the dashboard compares it with the database to tell when a publish is live. */
export const CONTENT_VERSION = PUBLISHED.version;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The value with its keys back in the code's order, at every level. The
 * database does not keep key order, and pages that come out the same for
 * the same content are easier to check.
 */
function likeSeed(value: unknown, seed: unknown): unknown {
  if (Array.isArray(value)) {
    return Array.isArray(seed) && seed.length ? value.map((v, i) => likeSeed(v, seed[Math.min(i, seed.length - 1)])) : value;
  }
  if (!isRecord(value) || !isRecord(seed)) return value;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(seed)) if (k in value) out[k] = likeSeed(value[k], seed[k]);
  for (const k of Object.keys(value)) if (!(k in out)) out[k] = value[k];
  return out;
}

/**
 * A short fingerprint of an item's starting copy. The dashboard stores it
 * with each edit, so the build can tell when the code changed underneath.
 * Keep in step with the copy in src/server/content.ts.
 */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value) ?? '';
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function warnIfCodeMoved(type: ContentType, key: string, entry: PublishedEntry, seed: unknown) {
  if (entry.baseHash && seed !== undefined && entry.baseHash !== fingerprint(seed)) {
    console.warn(
      `[content] ${type} "${key}": the code copy changed after it was edited in the dashboard (${entry.on}); the dashboard's version stays live.`,
    );
  }
}

/**
 * A list with the dashboard's edits applied: changed items replace the
 * code's (fields the dashboard never saw, such as one added in code later,
 * are kept), deleted items drop out, added ones follow, and a saved order
 * wins. With `fixed`, items can be changed but not added or removed, for
 * lists the code relies on (car types, guides with a page each).
 */
export function overlayList<T extends object>(
  type: ContentType,
  seed: readonly T[],
  keyOf: (item: T) => string,
  { fixed = false }: { fixed?: boolean } = {},
): T[] {
  const edits = PUBLISHED.items[type] ?? {};
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of seed) {
    const key = keyOf(item);
    seen.add(key);
    const entry = edits[key];
    if (!entry) {
      out.push(item);
      continue;
    }
    warnIfCodeMoved(type, key, entry, item);
    if (entry.deleted && !fixed) continue;
    out.push(isRecord(entry.data) ? ({ ...item, ...(likeSeed(entry.data, item) as object) } as T) : item);
  }
  if (!fixed) {
    for (const [key, entry] of Object.entries(edits)) {
      if (!seen.has(key) && !entry.deleted && isRecord(entry.data)) out.push(likeSeed(entry.data, seed[0]) as T);
    }
  }
  const order = PUBLISHED.items.order?.[type]?.data;
  if (Array.isArray(order)) {
    const rank = new Map(order.map((k, i) => [String(k), i]));
    const at = (item: T, i: number) => rank.get(keyOf(item)) ?? order.length + i;
    const indexed = out.map((item, i) => ({ item, r: at(item, i) }));
    indexed.sort((a, b) => a.r - b.r);
    return indexed.map((x) => x.item);
  }
  return out;
}

/** The dashboard's published data for one record as it is, or undefined (for values that need more than a merge, such as dates that only move forward). */
export function publishedRecord(type: ContentType, key = 'main'): Record<string, unknown> | undefined {
  const data = PUBLISHED.items[type]?.[key]?.data;
  return isRecord(data) ? data : undefined;
}

/** One record (business details, policies) with the dashboard's edits applied. */
export function overlayOne<T extends object>(type: ContentType, seed: T, key = 'main'): T {
  const entry = PUBLISHED.items[type]?.[key];
  if (!entry) return seed;
  warnIfCodeMoved(type, key, entry, seed);
  return isRecord(entry.data) ? ({ ...seed, ...(likeSeed(entry.data, seed) as object) } as T) : seed;
}

/** A list edited as a whole (the general FAQs, the gallery): the dashboard's copy replaces the code's. */
export function overlayWhole<T>(type: ContentType, seed: T[], key = 'main'): T[] {
  const entry = PUBLISHED.items[type]?.[key];
  if (!entry) return seed;
  warnIfCodeMoved(type, key, entry, seed);
  return Array.isArray(entry.data) ? (likeSeed(entry.data, seed) as T[]) : seed;
}
