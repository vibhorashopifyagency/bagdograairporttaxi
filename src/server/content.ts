/**
 * Website content edited in the dashboard: drafts, publishing, version
 * history and going live. Admin only (owner, 21 Oct 2026: staff do not edit
 * content, business details or policies), checked from the database on
 * every change.
 *
 * The site's starting copy is the code in src/data/. A content_items row
 * holds the admin's version of one item (a route, a package, the business
 * details) or of a whole list (the general FAQs, the gallery, an order).
 * Edits wait as drafts until Publish, which checks the whole site as it
 * would be (no route may point at a removed destination), records every
 * change in content_versions, moves the site's "updated" dates on and starts
 * a deploy through the Vercel deploy hook (VERCEL_DEPLOY_HOOK_URL). The
 * build pulls what is published (scripts/content-pull.mjs) and lays it over
 * the code (src/data/published.ts), so a publish is live once that deploy
 * finishes, usually within about a minute. In development there is no hook:
 * Publish runs the pull itself and the dev server picks the change up.
 */
import { execFile } from 'node:child_process';
import { and, desc, eq, isNotNull, max, sql } from 'drizzle-orm';
import type { ZodType } from 'zod';
import { DESTINATIONS_START } from '../data/destinations';
import { GALLERY_START } from '../data/gallery';
import { GENERAL_FAQS_START } from '../data/faqs';
import { GUIDES_START } from '../data/guides';
import { PACKAGES_START } from '../data/packages';
import { CONTENT_VERSION, fingerprint, type ContentType } from '../data/published';
import { GOOGLE } from '../data/reviews';
import { PHOTOS_START, photoTitle } from '../data/photo-library';
import { ROUTES_START } from '../data/routes';
import { BUSINESS_START, LAUNCH_START, POLICY_START, SITE_TEXT_START } from '../data/site';
import { VEHICLES_START } from '../data/vehicles';
import { audit } from './admin';
import * as S from './content-schemas';
import { getDb, schema } from './db';
import { env } from './env';

type Data = Record<string, unknown>;
type Value = Data | unknown[];

/** Which "updated" date on the site a change moves on. */
type DateKind = 'fares' | 'content' | 'destinations';

interface ListDef {
  kind: 'list';
  type: ContentType;
  /** For messages: "route", "package". */
  noun: string;
  keyField: string;
  start: readonly Data[];
  schema: ZodType;
  /** Items can be changed but not added or removed. */
  fixed?: boolean;
  dates: DateKind[];
}
interface OneDef {
  kind: 'one' | 'whole';
  type: ContentType;
  key: string;
  noun: string;
  start: Value;
  schema: ZodType;
  dates: DateKind[];
}
type Def = ListDef | OneDef;

const asData = <T>(v: readonly T[]) => v as unknown as readonly Data[];

export const LISTS: Record<'route' | 'package' | 'destination' | 'vehicle' | 'guide' | 'photo', ListDef> = {
  route: { kind: 'list', type: 'route', noun: 'route', keyField: 'slug', start: asData(ROUTES_START), schema: S.routeSchema, dates: ['content'] },
  package: { kind: 'list', type: 'package', noun: 'package', keyField: 'slug', start: asData(PACKAGES_START), schema: S.packageSchema, dates: ['content'] },
  destination: { kind: 'list', type: 'destination', noun: 'destination', keyField: 'slug', start: asData(DESTINATIONS_START), schema: S.destinationSchema, dates: ['destinations'] },
  vehicle: { kind: 'list', type: 'vehicle', noun: 'car', keyField: 'key', start: asData(VEHICLES_START), schema: S.vehicleSchema, fixed: true, dates: ['content'] },
  guide: { kind: 'list', type: 'guide', noun: 'guide', keyField: 'slug', start: asData(GUIDES_START), schema: S.guideSchema, fixed: true, dates: [] },
  photo: { kind: 'list', type: 'photo', noun: 'photo', keyField: 'key', start: asData(PHOTOS_START), schema: S.photoSchema, dates: [] },
};

const ONES: OneDef[] = [
  { kind: 'one', type: 'business', key: 'main', noun: 'business details', start: BUSINESS_START, schema: S.businessSchema, dates: ['content'] },
  { kind: 'one', type: 'policy', key: 'main', noun: 'policies', start: POLICY_START, schema: S.policySchema, dates: ['content', 'fares'] },
  { kind: 'one', type: 'site', key: 'main', noun: 'site name and search text', start: SITE_TEXT_START, schema: S.siteTextSchema, dates: ['content'] },
  { kind: 'one', type: 'site', key: 'launch', noun: 'pre-launch switch', start: LAUNCH_START, schema: S.launchSchema, dates: [] },
  { kind: 'whole', type: 'faq', key: 'main', noun: 'general questions', start: GENERAL_FAQS_START, schema: S.faqListSchema, dates: ['content'] },
  { kind: 'whole', type: 'gallery', key: 'main', noun: 'gallery', start: GALLERY_START, schema: S.gallerySchema, dates: [] },
  ...(['route', 'package', 'destination'] as const).map(
    (t): OneDef => ({ kind: 'whole', type: 'order', key: t, noun: `order of the ${t}s`, start: LISTS[t].start.map((d) => String(d[LISTS[t].keyField])), schema: S.orderSchema, dates: [] }),
  ),
];

function defFor(type: string, key: string): Def | undefined {
  if (type in LISTS) return LISTS[type as keyof typeof LISTS];
  return ONES.find((d) => d.type === type && d.key === key);
}

const startItem = (def: Def, key: string): Value | undefined =>
  def.kind === 'list' ? def.start.find((d) => String(d[def.keyField]) === key) : def.start;

const isRecord = (v: unknown): v is Data => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Equal as data, whatever the key order (the database does not keep it); an empty field (null) is the same as a missing one. */
const stable = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(stable) : isRecord(v) ? Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined && v[k] !== null).map((k) => [k, stable(v[k])])) : v;
const same = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

/** Today in India, as 2026-10-22. */
const todayIst = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayLabel = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

type Row = typeof schema.contentItems.$inferSelect;

/** Where an item stands: as in the code, edited, added in the dashboard, or removed. */
export type ItemState = 'code' | 'edited' | 'added' | 'removed';

export interface Entry {
  type: ContentType;
  key: string;
  /** What the site shows once the last publish is live; null when removed. */
  live: Value | null;
  /** What the editor shows: the draft when there is one. */
  current: Value | null;
  state: ItemState;
  /** What Publish will do with this item, if anything. */
  pending: Row['draftAction'];
  publishedAt: Date | null;
  updatedAt: Date | null;
}

function liveOf(def: Def, key: string, row: Row | undefined): Value | null {
  const start = startItem(def, key);
  if (row?.deleted) return def.kind === 'list' && def.fixed ? (start ?? null) : null;
  const pub = row?.published;
  if (pub === undefined || pub === null) return start ?? null;
  if (def.kind === 'whole') return pub;
  // Like the build: fields the dashboard never saw (added in code later) are kept.
  return isRecord(start) && isRecord(pub) ? { ...start, ...pub } : pub;
}

function entryOf(def: Def, key: string, row: Row | undefined): Entry {
  const start = startItem(def, key);
  const live = liveOf(def, key, row);
  let current = live;
  if (row?.draftAction === 'save') current = row.draft ?? live;
  else if (row?.draftAction === 'delete') current = null;
  else if (row?.draftAction === 'reset') current = start ?? null;
  const state: ItemState = live === null ? 'removed' : start === undefined ? 'added' : row?.published != null ? 'edited' : 'code';
  return { type: def.type, key, live, current, state, pending: row?.draftAction ?? null, publishedAt: row?.publishedAt ?? null, updatedAt: row?.updatedAt ?? null };
}

async function rowsOf(type: ContentType): Promise<Row[]> {
  return getDb().select().from(schema.contentItems).where(eq(schema.contentItems.type, type));
}

/** Every item of a list, in the order the site shows them (removed ones last), with drafts marked. */
export async function listEntries(type: keyof typeof LISTS): Promise<Entry[]> {
  const def = LISTS[type];
  const [rows, orderRows] = await Promise.all([rowsOf(type), rowsOf('order')]);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const keys = [...def.start.map((d) => String(d[def.keyField]))];
  for (const r of rows) if (!keys.includes(r.key)) keys.push(r.key);
  const entries = keys.map((k) => entryOf(def, k, byKey.get(k)));
  const orderDef = defFor('order', type);
  const order = orderDef ? entryOf(orderDef, type, orderRows.find((r) => r.key === type)).current : null;
  if (Array.isArray(order)) {
    const rank = new Map(order.map((k, i) => [String(k), i]));
    entries.sort((a, b) => (rank.get(a.key) ?? 1e6) - (rank.get(b.key) ?? 1e6));
  }
  return entries.sort((a, b) => Number(a.live === null) - Number(b.live === null));
}

/** One item, a record such as the business details, or a whole list; null when there is no such thing. */
export async function getEntry(type: ContentType, key: string): Promise<Entry | null> {
  const def = defFor(type, key);
  if (!def) return null;
  const [row] = await getDb().select().from(schema.contentItems).where(and(eq(schema.contentItems.type, type), eq(schema.contentItems.key, key)));
  if (!row && startItem(def, key) === undefined) return null;
  return entryOf(def, key, row);
}

/* ------------------------------------------------------------------ */
/* Changing                                                            */
/* ------------------------------------------------------------------ */

type Ctx = { actorId: string; ipHash: string };
export type Result = { ok: true; message?: string } | { ok: false; error: string; field?: string };

const ADMIN_ONLY = 'Only the admin can change the website.';
async function actorIsAdmin(actorId: string): Promise<boolean> {
  const [row] = await getDb().select({ role: schema.user.role, banned: schema.user.banned }).from(schema.user).where(eq(schema.user.id, actorId));
  return row?.role === 'admin' && !row.banned;
}

/** Which row of a list a problem is in: "Day 7: A day plan needs at least 10 characters." */
const ROW_NOUN: Record<string, string> = { itinerary: 'Day', faqs: 'Question', stops: 'Stop', tips: 'Tip', highlights: 'Highlight', includes: 'Included item', excludes: 'Not-included item', registrations: 'Registration', places: 'Place', bestFor: 'Tag', sameAs: 'Profile link' };

function firstIssue(e: { issues: { message: string; path: PropertyKey[] }[] }): { error: string; field: string } {
  const issue = e.issues[0];
  const path = issue?.path ?? [];
  const [list, row] = path;
  const where = typeof list === 'string' && typeof row === 'number' && ROW_NOUN[list] ? `${ROW_NOUN[list]} ${row + 1}: ` : '';
  return { error: where + (issue?.message ?? 'Something in this form is not right.'), field: path.join('.') };
}

async function putDraft(ctx: Ctx, type: ContentType, key: string, action: NonNullable<Row['draftAction']>, draft: Value | null) {
  await getDb()
    .insert(schema.contentItems)
    .values({ type, key, draft, draftAction: action, updatedBy: ctx.actorId })
    .onConflictDoUpdate({
      target: [schema.contentItems.type, schema.contentItems.key],
      set: { draft, draftAction: action, updatedBy: ctx.actorId, updatedAt: new Date() },
    });
}

/**
 * Saves an edit as a draft, after checking it. Nothing changes on the site
 * until Publish. Saving what is already live clears the draft instead.
 */
export async function saveDraft(ctx: Ctx, type: ContentType, key: string, input: unknown): Promise<Result> {
  if (!(await actorIsAdmin(ctx.actorId))) return { ok: false, error: ADMIN_ONLY };
  const def = defFor(type, key);
  if (!def) return { ok: false, error: 'That part of the website cannot be edited here.' };
  const parsed = def.schema.safeParse(input);
  if (!parsed.success) return { ok: false, ...firstIssue(parsed.error) };
  const data = parsed.data as Value;
  const existing = await getEntry(type, key);

  if (def.kind === 'list') {
    if (isRecord(data) && String(data[def.keyField]) !== key) {
      return { ok: false, error: existing ? 'The web address of an existing page cannot change: old links and Google would break.' : 'The web address does not match.', field: def.keyField };
    }
    if (!existing && def.fixed) return { ok: false, error: `A new ${def.noun} cannot be added here.` };
    if (!existing) {
      const taken = (await listEntries(def.type as keyof typeof LISTS)).some((e) => e.key === key);
      if (taken) return { ok: false, error: `There is already a ${def.noun} at that web address.`, field: def.keyField };
    }
  }
  if (existing && existing.live !== null && same(data, def.kind === 'list' || def.kind === 'one' ? pick(existing.live, data) : existing.live)) {
    await discardDraft(ctx, type, key);
    return { ok: true, message: 'No changes from what is live.' };
  }
  await putDraft(ctx, type, key, 'save', data);
  return { ok: true };
}

/** The live value cut down to the fields of `like`, so a saved form can be compared with it. */
function pick(live: Value | null, like: Value): Value | null {
  if (!isRecord(live) || !isRecord(like)) return live;
  return Object.fromEntries(Object.keys(like).map((k) => [k, live[k]]));
}

/** Throws away every draft at once ("Discard all" on the publish bar). */
export async function discardAll(ctx: Ctx): Promise<Result & { count?: number }> {
  if (!(await actorIsAdmin(ctx.actorId))) return { ok: false, error: ADMIN_ONLY };
  const rows = await getDb().select({ type: schema.contentItems.type, key: schema.contentItems.key }).from(schema.contentItems).where(isNotNull(schema.contentItems.draftAction));
  for (const r of rows) await discardDraft(ctx, r.type as ContentType, r.key);
  return { ok: true, count: rows.length };
}

/** Marks a list item for removal at the next publish. */
export async function markForRemoval(ctx: Ctx, type: ContentType, key: string): Promise<Result> {
  if (!(await actorIsAdmin(ctx.actorId))) return { ok: false, error: ADMIN_ONLY };
  const def = defFor(type, key);
  if (!def || def.kind !== 'list' || def.fixed) return { ok: false, error: 'This cannot be removed.' };
  if (type === 'photo' && START_PHOTO_KEYS.has(key)) return { ok: false, error: 'This photo came with the website and pages name it, so it cannot be deleted. Replace it instead.' };
  const e = await getEntry(type, key);
  if (!e || e.live === null) return { ok: false, error: 'It is already removed.' };
  await putDraft(ctx, type, key, 'delete', null);
  return { ok: true };
}

/** Hands an item back to the code's starting copy at the next publish (undoes every dashboard edit to it). */
export async function markForReset(ctx: Ctx, type: ContentType, key: string): Promise<Result> {
  if (!(await actorIsAdmin(ctx.actorId))) return { ok: false, error: ADMIN_ONLY };
  const def = defFor(type, key);
  if (!def || startItem(def, key) === undefined) return { ok: false, error: 'This was added in the dashboard, so it has no starting copy. Remove it instead.' };
  await putDraft(ctx, type, key, 'reset', null);
  return { ok: true };
}

/** Throws away a draft; the live version stays. */
export async function discardDraft(ctx: Ctx, type: ContentType, key: string): Promise<Result> {
  if (!(await actorIsAdmin(ctx.actorId))) return { ok: false, error: ADMIN_ONLY };
  const db = getDb();
  const where = and(eq(schema.contentItems.type, type), eq(schema.contentItems.key, key));
  await db.update(schema.contentItems).set({ draft: null, draftAction: null, updatedBy: ctx.actorId }).where(where);
  // A row that holds nothing any more goes, so the item follows the code again.
  await db.delete(schema.contentItems).where(and(where, sql`${schema.contentItems.published} is null`, eq(schema.contentItems.deleted, false)));
  return { ok: true };
}

/** Puts an old version back as a draft, ready to publish. */
export async function restoreVersion(ctx: Ctx, versionId: number): Promise<Result> {
  if (!(await actorIsAdmin(ctx.actorId))) return { ok: false, error: ADMIN_ONLY };
  const [v] = await getDb().select().from(schema.contentVersions).where(eq(schema.contentVersions.id, versionId));
  if (!v) return { ok: false, error: 'That version no longer exists.' };
  const type = v.type as ContentType;
  if (v.action === 'delete') return markForRemoval(ctx, type, v.key);
  if (v.action === 'reset') return markForReset(ctx, type, v.key);
  return saveDraft(ctx, type, v.key, v.data);
}

export interface Pending {
  type: ContentType;
  key: string;
  action: NonNullable<Row['draftAction']>;
  noun: string;
  /** A name for the list: the item's title or slug. */
  title: string;
  updatedAt: Date;
}

function titleOf(def: Def, key: string, v: Value | null | undefined): string {
  if (def.kind !== 'list') return def.noun[0].toUpperCase() + def.noun.slice(1);
  const d = isRecord(v) ? v : isRecord(startItem(def, key)) ? (startItem(def, key) as Data) : {};
  if (def.type === 'route' && d.from && d.to) return `${d.fromShort ?? d.from} to ${d.toShort ?? d.to}`;
  if (def.type === 'photo') return photoTitle({ key, title: d.title as string | null });
  return String(d.name ?? d.title ?? key);
}

/** Every draft waiting for Publish, newest first. */
export async function pendingChanges(): Promise<Pending[]> {
  const rows = await getDb().select().from(schema.contentItems).where(isNotNull(schema.contentItems.draftAction)).orderBy(desc(schema.contentItems.updatedAt));
  return rows.flatMap((r) => {
    const def = defFor(r.type, r.key);
    if (!def || !r.draftAction) return [];
    return [{ type: r.type as ContentType, key: r.key, action: r.draftAction, noun: def.noun, title: titleOf(def, r.key, r.draft ?? r.published), updatedAt: r.updatedAt }];
  });
}

/** What kind of thing a change is, for the Review popup: "Taxi fare", "Tour package". */
export function kindLabel(type: ContentType, key: string): string {
  if (type === 'site') return 'Search and launch';
  if (type === 'order') return `Order of the ${key}s`;
  return { business: 'Business details', policy: 'Policies', route: 'Taxi route', package: 'Tour package', destination: 'Destination', vehicle: 'Car', faq: 'General questions', gallery: 'Gallery page', guide: 'Travel guide', photo: 'Photo' }[type] ?? type;
}

/** Where the admin edits an item. */
export function editorHref(type: ContentType, key: string): string {
  switch (type) {
    case 'business':
      return '/admin/business/';
    case 'policy':
      return '/admin/business/?tab=policies';
    case 'site':
      return '/admin/business/?tab=search';
    case 'route':
      return `/admin/fares/route/${key}/`;
    case 'package':
      return `/admin/fares/package/${key}/`;
    case 'vehicle':
      return '/admin/fares/?tab=cars';
    case 'gallery':
      return '/admin/photos/?tab=gallery';
    case 'photo':
      return `/admin/photos/?photo=${key}`;
    case 'order':
      return key === 'package' ? '/admin/fares/?tab=packages' : key === 'route' ? '/admin/fares/' : '/admin/pages/';
    default:
      return `/admin/pages/${type}/${key}/`;
  }
}

export interface ReviewItem extends Pending {
  kind: string;
  href: string;
  lines: { what: string; from: string; to: string }[];
}

/** Each draft with what it changes, for the Review and publish popup. */
export async function reviewChanges(): Promise<ReviewItem[]> {
  const { diffLines } = await import('./content-diff');
  const rows = await getDb().select().from(schema.contentItems).where(isNotNull(schema.contentItems.draftAction)).orderBy(desc(schema.contentItems.updatedAt));
  return rows.flatMap((r) => {
    const def = defFor(r.type, r.key);
    if (!def || !r.draftAction) return [];
    const type = r.type as ContentType;
    const e = entryOf(def, r.key, r);
    const base = { type, key: r.key, action: r.draftAction, noun: def.noun, title: titleOf(def, r.key, r.draft ?? r.published), updatedAt: r.updatedAt, kind: kindLabel(type, r.key), href: editorHref(type, r.key) };
    if (r.draftAction === 'delete') return [{ ...base, lines: [{ what: 'Removed from the website', from: '', to: '' }] }];
    if (e.live === null) return [{ ...base, lines: [{ what: `New ${def.noun}`, from: '', to: 'added to the website' }] }];
    const lines = diffLines(type, e.live, e.current);
    if (r.draftAction === 'reset') lines.unshift({ what: 'Back to the starting copy', from: '', to: '' });
    return [{ ...base, lines }];
  });
}

export interface TextHit {
  type: ContentType;
  key: string;
  title: string;
  href: string;
  /** The words around the phrase. */
  snippet: string;
  phrase: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The phrase as a whole number: "5 working days" never matches inside "15 working days". */
const phraseRe = (p: string) => new RegExp(`(?<![\\d,.])${escapeRe(p)}`, 'g');

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (isRecord(v)) Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/**
 * Page text that still says something, such as the old refund days after a
 * policy changes. Searches what the site shows or will show after Publish,
 * in routes, packages, destinations and the general questions, but only text
 * the dashboard holds: the code's copy writes policies in from POLICY, so it
 * follows a policy change by itself.
 */
export async function findText(phrases: string[]): Promise<TextHit[]> {
  if (!phrases.length) return [];
  const hits: TextHit[] = [];
  const look = (type: ContentType, key: string, title: string, value: unknown) => {
    for (const s of strings(value)) {
      for (const p of phrases) {
        const m = phraseRe(p).exec(s);
        if (!m) continue;
        const from = Math.max(0, m.index - 50);
        const to = Math.min(s.length, m.index + p.length + 50);
        hits.push({ type, key, title, href: editorHref(type, key), phrase: p, snippet: (from > 0 ? '…' : '') + s.slice(from, to).trim() + (to < s.length ? '…' : '') });
      }
    }
  };
  for (const t of ['route', 'package', 'destination'] as const) {
    for (const e of await listEntries(t)) if (e.current && (e.state !== 'code' || e.pending)) look(t, e.key, titleOf(LISTS[t], e.key, e.current), e.current);
  }
  const faq = await getEntry('faq', 'main');
  if (faq?.current && (faq.state !== 'code' || faq.pending)) look('faq', 'main', 'General questions', faq.current);
  return hits;
}

/** Changes a phrase to another wherever it is written in one item, as a draft. */
export async function replaceText(ctx: Ctx, type: ContentType, key: string, from: string, to: string): Promise<Result> {
  const e = await getEntry(type, key);
  if (!e?.current) return { ok: false, error: 'That part of the website no longer exists.' };
  const swap = (v: unknown): unknown =>
    typeof v === 'string' ? v.replace(phraseRe(from), to) : Array.isArray(v) ? v.map(swap) : isRecord(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v;
  return saveDraft(ctx, type, key, swap(e.current));
}

/** When the site was last published, and by whom. */
export async function lastPublished(): Promise<{ at: Date; by: string | null } | null> {
  const [v] = await recentVersions(1);
  return v ? { at: v.at, by: v.by } : null;
}

/** Drafts waiting, by kind of content, for the menu's badges. */
export async function draftCounts(): Promise<Partial<Record<ContentType, number>>> {
  const rows = await getDb()
    .select({ type: schema.contentItems.type, n: sql<number>`count(*)::int` })
    .from(schema.contentItems)
    .where(isNotNull(schema.contentItems.draftAction))
    .groupBy(schema.contentItems.type);
  return Object.fromEntries(rows.map((r) => [r.type, r.n]));
}

/* ------------------------------------------------------------------ */
/* Publishing                                                          */
/* ------------------------------------------------------------------ */

/** The site as it would be after publishing: every list and record, drafts applied. */
async function siteAfterPublish() {
  const all = await getDb().select().from(schema.contentItems);
  const byType = (t: string) => all.filter((r) => r.type === t);
  const lists = {} as Record<keyof typeof LISTS, Data[]>;
  for (const t of Object.keys(LISTS) as (keyof typeof LISTS)[]) {
    const def = LISTS[t];
    const rows = new Map(byType(t).map((r) => [r.key, r]));
    const keys = [...def.start.map((d) => String(d[def.keyField])), ...[...rows.keys()].filter((k) => !def.start.some((d) => String(d[def.keyField]) === k))];
    lists[t] = keys.map((k) => entryOf(def, k, rows.get(k)).current).filter(isRecord);
  }
  const one = (type: ContentType, key: string) => {
    const def = defFor(type, key)!;
    return entryOf(def, key, all.find((r) => r.type === type && r.key === key)).current;
  };
  return { lists, business: one('business', 'main') as Data, launch: one('site', 'launch') as Data, gallery: (one('gallery', 'main') ?? []) as Data[], photoRows: byType('photo') };
}

/** The photos the site started with. Page templates name some of them directly, so they can be replaced but never deleted. */
export const START_PHOTO_KEYS = new Set(PHOTOS_START.map((p) => p.key));

/** Problems that would break pages or links if published now. Empty when all is well. */
export async function checkBeforePublish(): Promise<string[]> {
  const site = await siteAfterPublish();
  const problems: string[] = [];
  const dest = new Set(site.lists.destination.map((d) => String(d.slug)));
  const routes = new Set(site.lists.route.map((r) => String(r.slug)));
  const pkgs = new Set(site.lists.package.map((p) => String(p.slug)));
  const guides = new Set(site.lists.guide.map((g) => String(g.slug)));
  for (const r of site.lists.route) {
    if (r.destination && !dest.has(String(r.destination))) problems.push(`The route ${r.fromShort} to ${r.toShort} points at the destination "${r.destination}", which would no longer exist.`);
    if (r.returnSlug && !routes.has(String(r.returnSlug))) problems.push(`The route ${r.fromShort} to ${r.toShort} names a return route that would no longer exist.`);
  }
  for (const p of site.lists.package) {
    for (const d of (p.destinations as string[]) ?? []) if (!dest.has(d)) problems.push(`The package ${p.name} lists the destination "${d}", which would no longer exist.`);
  }
  const pages: Record<string, Set<string>> = { taxi: routes, 'tour-packages': pkgs, destinations: dest, guides };
  for (const g of site.gallery) {
    const href = String(g.href ?? '');
    const m = href.match(/^\/(taxi|tour-packages|destinations|guides)\/([^/]+)\/$/);
    if (m && !pages[m[1]].has(m[2])) problems.push(`The gallery photo "${g.title}" links to ${href}, a page that would no longer exist.`);
  }
  // Answer engines quote a page's opening answer, so a fare in it must be one of the fares on the page.
  for (const r of site.lists.route) {
    const fares = new Set(Object.values((r.fares as Record<string, number>) ?? {}));
    for (const a of rupeesIn(String(r.summary ?? ''))) {
      if (!fares.has(a)) problems.push(`The opening answer for ${r.fromShort} to ${r.toShort} says ₹${a.toLocaleString('en-IN')}, which is not one of its fares. Change the text to match the fares.`);
    }
  }
  for (const p of site.lists.package) {
    for (const a of rupeesIn(String(p.summary ?? ''))) {
      if (a !== p.fromPrice) problems.push(`The summary of ${p.name} says ₹${a.toLocaleString('en-IN')}, but its price is ₹${Number(p.fromPrice).toLocaleString('en-IN')}. Change the text to match.`);
    }
  }
  // Every photo a page names must be in the library, and described.
  const photos = new Map(site.lists.photo.map((p) => [String(p.key), p]));
  const photoName = (k: string) => photoTitle({ key: k, title: (photos.get(k)?.title as string | null) ?? null });
  const usesPhoto = (k: unknown, where: string) => {
    if (typeof k === 'string' && k && !photos.has(k)) problems.push(`${where} shows the photo "${k.replace(/-/g, ' ')}", which would no longer be in the library.`);
  };
  for (const g of site.gallery) usesPhoto(g.photo, `The gallery item "${g.title}"`);
  for (const r of site.lists.route) usesPhoto(r.photo, `The route ${r.fromShort} to ${r.toShort}`);
  for (const p of site.lists.package) usesPhoto(p.photo, `The package ${p.name}`);
  for (const d of site.lists.destination) usesPhoto(d.photo, `The destination ${d.name}`);
  for (const p of site.lists.photo) {
    if (String(p.alt ?? '').trim().length < 10) problems.push(`Describe the photo "${photoName(String(p.key))}" (what it shows, in a sentence) before publishing, or delete it.`);
  }
  for (const r of site.photoRows) {
    if (r.draftAction === 'delete' && START_PHOTO_KEYS.has(r.key)) problems.push(`The photo "${photoName(r.key)}" came with the website and pages name it, so it cannot be deleted. Replace it instead.`);
  }
  if (site.lists.route.length === 0) problems.push('The site needs at least one taxi route.');
  if (site.launch?.preLaunch === false) {
    const b = site.business;
    if (/00000 00000|910000000000/.test(`${b.phone} ${b.whatsapp}`)) problems.push('The site cannot leave pre-launch while the phone or WhatsApp number is a placeholder.');
    if (GOOGLE.isSample) problems.push('The site cannot leave pre-launch while the reviews are samples: the Google reviews must be fetched first.');
  }
  return problems;
}

/** Every rupee amount written in a text, such as 2800 for "₹2,800". */
const rupeesIn = (text: string) => [...text.matchAll(/₹\s?([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));

/**
 * A route's text with its old fares changed to the new ones, for the fare
 * editor's "update the text too". Only a fare that is not shared with
 * another car is changed, since "₹4,200" could mean either car otherwise.
 */
export function updateFareText(text: string, before: Record<string, number>, after: Record<string, number>): string {
  const counts = new Map<number, number>();
  for (const v of Object.values(before)) counts.set(v, (counts.get(v) ?? 0) + 1);
  let out = text;
  for (const [car, old] of Object.entries(before)) {
    const now = after[car];
    if (now === undefined || now === old || counts.get(old) !== 1) continue;
    const written = old.toLocaleString('en-IN');
    out = out.replaceAll(`₹${written}`, `₹${now.toLocaleString('en-IN')}`);
  }
  return out;
}

/** The newest content version in the database: what the next deploy will carry. */
async function latestVersion(): Promise<number> {
  const [r] = await getDb().select({ v: max(schema.contentVersions.id) }).from(schema.contentVersions);
  return Number(r?.v ?? 0);
}

export type PublishResult =
  | { ok: true; count: number; version: number; deploy: DeployResult }
  | { ok: false; error: string; problems?: string[] };

/**
 * Publishes every draft at once and starts one deploy, so a batch of edits
 * goes live together. Refuses, changing nothing, when the result would
 * break a page or a link.
 */
export async function publishAll(ctx: Ctx): Promise<PublishResult> {
  if (!(await actorIsAdmin(ctx.actorId))) return { ok: false, error: ADMIN_ONLY };
  const problems = await checkBeforePublish();
  if (problems.length) return { ok: false, error: 'Nothing was published. Fix these first:', problems };

  const today = todayIst();
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(schema.contentItems).where(isNotNull(schema.contentItems.draftAction)).for('update');
    const moved = new Set<DateKind>();
    for (const r of rows) {
      const def = defFor(r.type, r.key);
      if (!def || !r.draftAction) continue;
      const before = liveOf(def, r.key, r);
      const where = and(eq(schema.contentItems.type, r.type), eq(schema.contentItems.key, r.key));
      let data: Value | null = null;
      if (r.draftAction === 'save') {
        data = r.draft;
        if (def.type === 'guide' && isRecord(data)) data = { ...data, updated: today, updatedLabel: dayLabel(today) };
        const start = startItem(def, r.key);
        await tx
          .update(schema.contentItems)
          .set({ published: data, deleted: false, baseHash: start === undefined ? null : fingerprint(start), publishedAt: new Date(), publishedBy: ctx.actorId, draft: null, draftAction: null })
          .where(where);
      } else if (r.draftAction === 'delete') {
        await tx.update(schema.contentItems).set({ published: null, deleted: true, baseHash: null, publishedAt: new Date(), publishedBy: ctx.actorId, draft: null, draftAction: null }).where(where);
      } else {
        // Back to the code: the row goes, so the starting copy (and later code changes) show again.
        await tx.delete(schema.contentItems).where(where);
      }
      await tx.insert(schema.contentVersions).values({ type: r.type, key: r.key, action: r.draftAction, data, publishedBy: ctx.actorId });
      for (const d of def.dates) moved.add(d);
      const fares = (v: Value | null | undefined) => (isRecord(v) ? JSON.stringify(stable(v.fares)) : null);
      if (def.type === 'route' && fares(before) !== fares(r.draftAction === 'reset' ? startItem(def, r.key) : data)) moved.add('fares');
    }
    if (moved.size) {
      const [cur] = await tx.select().from(schema.contentItems).where(and(eq(schema.contentItems.type, 'site'), eq(schema.contentItems.key, 'dates')));
      const dates: Data = isRecord(cur?.published) ? { ...cur.published } : {};
      if (moved.has('content') || moved.has('fares')) dates.contentUpdated = today;
      if (moved.has('fares')) dates.faresUpdated = today.slice(0, 7);
      if (moved.has('destinations')) dates.destinationsUpdated = today;
      await tx
        .insert(schema.contentItems)
        .values({ type: 'site', key: 'dates', published: dates, publishedAt: new Date(), publishedBy: ctx.actorId })
        .onConflictDoUpdate({ target: [schema.contentItems.type, schema.contentItems.key], set: { published: dates, publishedAt: new Date(), publishedBy: ctx.actorId } });
    }
    return { count: rows.length };
  });
  if (result.count === 0) return { ok: false, error: 'There is nothing to publish.' };
  const version = await latestVersion();
  await audit({ actorId: ctx.actorId, action: 'content_publish', entity: 'content', entityId: String(version), detail: { count: result.count }, ipHash: ctx.ipHash });
  const deploy = await startDeploy(ctx, version);
  return { ok: true, count: result.count, version, deploy };
}

/* ------------------------------------------------------------------ */
/* Going live                                                          */
/* ------------------------------------------------------------------ */

const DEPLOY_KEY = 'content_deploy';
export type DeployState = { at: string; version: number; by: string; ok: boolean; error?: string };
export type DeployResult = 'started' | 'local' | 'not-configured' | 'failed';

/**
 * Starts a deploy, which builds the site with what is published. On Vercel
 * that is the deploy hook; in development it is the pull, which the dev
 * server notices. Without either, the change goes live with the next deploy
 * (the next push to GitHub).
 */
export async function startDeploy(ctx: Ctx, version: number): Promise<DeployResult> {
  const hook = env('VERCEL_DEPLOY_HOOK_URL');
  let result: DeployResult;
  let error: string | undefined;
  if (hook) {
    try {
      const res = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(10_000) });
      result = res.ok ? 'started' : 'failed';
      if (!res.ok) error = `Vercel answered ${res.status}`;
    } catch (e) {
      result = 'failed';
      error = (e as Error).message;
    }
  } else if (import.meta.env.DEV) {
    // The pull, then the photo files (scripts/content-photos.mjs), as a build does.
    const run = (script: string) =>
      new Promise<boolean>((resolve) =>
        execFile(process.execPath, ['--env-file-if-exists=.env', script], { timeout: 60_000 }, (err) => {
          if (err) error = err.message;
          resolve(!err);
        }),
      );
    result = (await run('scripts/content-pull.mjs')) && (await run('scripts/content-photos.mjs')) ? 'local' : 'failed';
  } else {
    result = 'not-configured';
  }
  const state: DeployState = { at: new Date().toISOString(), version, by: ctx.actorId, ok: result === 'started' || result === 'local', ...(error ? { error } : {}) };
  await getDb()
    .insert(schema.settings)
    .values({ key: DEPLOY_KEY, value: state, updatedBy: ctx.actorId })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: state, updatedBy: ctx.actorId } });
  if (error) console.error('[content] deploy did not start:', error);
  return result;
}

export interface PublishStatus {
  /** The content version this running deploy was built with. */
  live: number;
  /** The newest published version in the database. */
  latest: number;
  /** Drafts waiting for Publish. */
  drafts: number;
  lastDeploy: DeployState | null;
  hook: boolean;
}

/** Whether the last publish is live yet: the dashboard asks every few seconds after Publish. */
export async function publishStatus(): Promise<PublishStatus> {
  const db = getDb();
  const [[d], [s], latest] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.contentItems).where(isNotNull(schema.contentItems.draftAction)),
    db.select().from(schema.settings).where(eq(schema.settings.key, DEPLOY_KEY)),
    latestVersion(),
  ]);
  return { live: CONTENT_VERSION, latest, drafts: d?.n ?? 0, lastDeploy: (s?.value as DeployState) ?? null, hook: Boolean(env('VERCEL_DEPLOY_HOOK_URL')) };
}

export interface Version {
  id: number;
  action: 'save' | 'delete' | 'reset';
  data: Value | null;
  at: Date;
  by: string | null;
}

/** An item's published versions, newest first. */
export async function history(type: ContentType, key: string, limit = 50): Promise<Version[]> {
  const v = schema.contentVersions;
  const rows = await getDb()
    .select({ id: v.id, action: v.action, data: v.data, at: v.publishedAt, by: schema.user.name })
    .from(v)
    .leftJoin(schema.user, eq(schema.user.id, v.publishedBy))
    .where(and(eq(v.type, type), eq(v.key, key)))
    .orderBy(desc(v.id))
    .limit(limit);
  return rows;
}

/** Versions published in one go, for a "recent changes" list. */
export async function recentVersions(limit = 20): Promise<(Version & { type: ContentType; key: string; title: string })[]> {
  const v = schema.contentVersions;
  const rows = await getDb()
    .select({ id: v.id, type: v.type, key: v.key, action: v.action, data: v.data, at: v.publishedAt, by: schema.user.name })
    .from(v)
    .leftJoin(schema.user, eq(schema.user.id, v.publishedBy))
    .orderBy(desc(v.id))
    .limit(limit);
  return rows.flatMap((r) => {
    const def = defFor(r.type, r.key);
    return def ? [{ ...r, type: r.type as ContentType, title: titleOf(def, r.key, r.data) }] : [];
  });
}
