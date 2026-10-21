/**
 * Long lists in the admin, a page at a time.
 *
 * Lists that grow without end (bookings, customers, payments, itineraries)
 * use keyset paging: each page asks for the rows after the last one shown,
 * which an index answers directly. OFFSET would make the database read and
 * throw away every earlier row, so page 500 would be 500 times slower than
 * page 1. Here every page costs the same, however much data there is.
 *
 * The position travels in the URL as ?after=<cursor> (older rows) or
 * ?before=<cursor> (newer rows). The cursor is the sort key of the row at
 * the edge of the page, read back from the database as text so timestamps
 * keep their microseconds.
 */
import type { AstroCookies } from 'astro';
import { sql, type SQL } from 'drizzle-orm';

/** Rows a page shows until someone picks another number. */
export const PAGE_SIZE = 25;
export const ROW_CHOICES = [10, 25, 50] as const;
const ROWS_COOKIE = 'admin_rows';

/**
 * Rows per page: ?rows=10, 25 or 50 picks it and remembers it in a cookie,
 * so every list keeps the choice until it is changed again.
 */
export function rowsFor(url: URL, cookies: AstroCookies): number {
  const ok = (n: number) => (ROW_CHOICES as readonly number[]).includes(n);
  const asked = Number(url.searchParams.get('rows'));
  if (ok(asked)) {
    cookies.set(ROWS_COOKIE, String(asked), { path: '/admin/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 365 * 86400 });
    return asked;
  }
  const saved = Number(cookies.get(ROWS_COOKIE)?.value);
  return ok(saved) ? saved : PAGE_SIZE;
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/**
 * ?from= and ?to= as YYYY-MM-DD (Indian dates), either one optional. A date
 * that is not real is ignored; a range given backwards is turned round.
 */
export function dateFilter(url: URL): { from: string | null; to: string | null } {
  const read = (k: string) => {
    const v = url.searchParams.get(k) ?? '';
    return isDate(v) ? v : null;
  };
  const from = read('from');
  const to = read('to');
  return from && to && from > to ? { from: to, to: from } : { from, to };
}

/** The Postgres types a sort key can have, with what a valid value looks like. */
const TYPES = {
  timestamptz: (s: string) => /^\d{4}-\d{2}-\d{2}[ T][\d:.]{8,15}([+-]\d{2}(:?\d{2})?|Z)?$/.test(s) && !Number.isNaN(Date.parse(s.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'))),
  date: (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)),
  uuid: (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
};
type KeyType = keyof typeof TYPES;

/**
 * How a list is sorted: two columns (or expressions) and their types, both
 * in the same direction. The second is the row's id, so the order is total.
 */
export type SortKey = { cols: [SQL, SQL]; types: [KeyType, KeyType]; order: 'asc' | 'desc' };

export type Page = { cursor: [string, string] | null; dir: 'after' | 'before' };

const encode = (v: [string, string]) => Buffer.from(JSON.stringify(v)).toString('base64url');

function decode(s: string | null, key: SortKey): [string, string] | null {
  if (!s || s.length > 200) return null;
  try {
    const v = JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
    if (!Array.isArray(v) || v.length !== 2) return null;
    const ok = v.every((x, i) => typeof x === 'string' && TYPES[key.types[i]!](x));
    return ok ? (v as [string, string]) : null;
  } catch {
    return null;
  }
}

/** The page asked for in the URL. A missing or tampered cursor means the first page. */
export function pageFrom(url: URL, key: SortKey): Page {
  const before = decode(url.searchParams.get('before'), key);
  if (before) return { cursor: before, dir: 'before' };
  return { cursor: decode(url.searchParams.get('after'), key), dir: 'after' };
}

/** The SQL that fetches one page: a WHERE for the position, the ORDER BY, and a LIMIT one over the page size. */
export function pageQuery(key: SortKey, page: Page, size = PAGE_SIZE) {
  const [a, b] = key.cols;
  // Fetching newer rows walks the index the other way, then the page is flipped back.
  const forward = page.dir === 'after';
  const desc = (key.order === 'desc') === forward;
  let where: SQL | undefined;
  if (page.cursor) {
    const [x, y] = page.cursor;
    const [tx, ty] = key.types.map((t) => sql.raw(t));
    where = sql`(${a}, ${b}) ${sql.raw(desc ? '<' : '>')} (${x}::${tx}, ${y}::${ty})`;
  }
  const dir = sql.raw(desc ? 'desc' : 'asc');
  return { where, orderBy: [sql`${a} ${dir}`, sql`${b} ${dir}`], limit: size + 1 };
}

/** The SELECT field that gives each row its cursor values. */
export const cursorField = (key: SortKey) => sql<[string, string]>`json_build_array((${key.cols[0]})::text, (${key.cols[1]})::text)`;

/**
 * Trims the extra row, puts the page back in display order and works out the
 * links. `href` builds a link from the cursor parameter to add.
 */
export function pageResult<T extends { cursor: [string, string] }>(
  rows: T[],
  page: Page,
  href: (param: { after: string } | { before: string } | null) => string,
  size = PAGE_SIZE,
) {
  const more = rows.length > size;
  const shown = rows.slice(0, size);
  if (page.dir === 'before') shown.reverse();
  const first = shown[0];
  const last = shown.at(-1);
  const hasNewer = page.dir === 'before' ? more : page.cursor !== null;
  const hasOlder = page.dir === 'before' ? true : more;
  const newer = hasNewer && first ? href({ before: encode(first.cursor) }) : null;
  return {
    rows: shown,
    newer,
    older: hasOlder && last ? href({ after: encode(last.cursor) }) : null,
    /** Straight back to the start, from deep in the list or from a page that came back empty. */
    start: page.cursor && (newer || !first) ? href(null) : null,
  };
}

/** Builds a list link: the page's own filters plus the cursor. */
export function listHref(path: string, keep: Record<string, string | null | undefined>) {
  return (param: { after: string } | { before: string } | null) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) p.set(k, v);
    if (param) for (const [k, v] of Object.entries(param)) p.set(k, v);
    const qs = p.toString();
    return `${path}${qs ? `?${qs}` : ''}`;
  };
}

/** The current address with some parameters changed (null removes one). */
export function withParams(url: URL, change: Record<string, string | null>): string {
  const p = new URLSearchParams(url.searchParams);
  for (const [k, v] of Object.entries(change)) {
    if (v === null) p.delete(k);
    else p.set(k, v);
  }
  const qs = p.toString();
  return `${url.pathname}${qs ? `?${qs}` : ''}`;
}

/* ---------------- Numbered pages, for lists that stay short ---------------- */

/**
 * A driver's statement or one customer's bookings: bounded by one person,
 * so plain page numbers (?page=2) are cheap and easier to follow.
 */
export function pageNumber(url: URL): number {
  const n = Number(url.searchParams.get('page') ?? '1');
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}
