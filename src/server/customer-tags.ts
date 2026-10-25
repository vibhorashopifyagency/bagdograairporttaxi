/**
 * The office's ratings and tags for customers (client, 25 Oct 2026): 1 to 5
 * stars and tags the office makes itself (Family, Honeymoon, Corporate ...),
 * so it can filter the customer list later and send a new tour or offer to
 * the right people, one WhatsApp at a time. A customer who asked not to get
 * offers is marked `noOffers` and is left out of the send buttons and the
 * number export. All of it goes with the customer's name and number
 * (src/server/retention.ts).
 */
import { and, asc, count, eq, exists, gte, ilike, inArray, isNull, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { audit } from './admin';
import { addDays, istMidnight } from './dashboard';
import { getDb, schema } from './db';
import { TAG_TONES, type TagTone } from './db/schema';
import { dateFilter } from './paging';

export type Tag = typeof schema.customerTags.$inferSelect;
type Ctx = { actorId: string; ipHash: string };

/** Badge colours, matching TONE in src/server/dashboard.ts (src/styles/admin-dark.css has the dark ones). */
export const TAG_CLASS: Record<TagTone, string> = {
  lime: 'bg-lime-50 text-[#3f6200]',
  amber: 'bg-[#fff4d6] text-[#8a5300]',
  blue: 'bg-[#e7f0ff] text-[#1d4ed8]',
  green: 'bg-[#e7f5ee] text-[#0f7a4e]',
  rose: 'bg-[#fde8ef] text-[#b4235a]',
  grey: 'bg-[#eef0f3] text-body',
};
export const TONE_NAME: Record<TagTone, string> = { lime: 'Lime', amber: 'Amber', blue: 'Blue', green: 'Green', rose: 'Rose', grey: 'Grey' };

/** "★★★★☆" for 4, or '' when not rated. */
export const starText = (n: number | null | undefined) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

/** Every tag, A to Z, with how many customers carry it. */
export async function listTags(): Promise<(Tag & { uses: number })[]> {
  const t = schema.customerTags;
  const l = schema.customerTagLinks;
  const rows = await getDb()
    .select({ id: t.id, name: t.name, tone: t.tone, createdAt: t.createdAt, uses: sql<number>`count(${l.customerId})::int` })
    .from(t)
    .leftJoin(l, eq(l.tagId, t.id))
    .groupBy(t.id)
    .orderBy(asc(sql`lower(${t.name})`));
  return rows;
}

/** The tags on each of these customers, A to Z. */
export async function tagsFor(customerIds: string[]): Promise<Map<string, Tag[]>> {
  const out = new Map<string, Tag[]>();
  if (!customerIds.length) return out;
  const t = schema.customerTags;
  const l = schema.customerTagLinks;
  const rows = await getDb()
    .select({ customerId: l.customerId, id: t.id, name: t.name, tone: t.tone, createdAt: t.createdAt })
    .from(l)
    .innerJoin(t, eq(t.id, l.tagId))
    .where(inArray(l.customerId, customerIds))
    .orderBy(asc(sql`lower(${t.name})`));
  for (const { customerId, ...tag } of rows) out.set(customerId, [...(out.get(customerId) ?? []), tag]);
  return out;
}

/** The colour the next new tag gets: the one used least so far. */
function nextTone(tags: Pick<Tag, 'tone'>[]): TagTone {
  const used = new Map<TagTone, number>(TAG_TONES.map((x) => [x, 0]));
  for (const t of tags) used.set(t.tone, (used.get(t.tone) ?? 0) + 1);
  return [...used.entries()].sort((a, b) => a[1] - b[1])[0]![0];
}

function checkName(raw: string): { error: string } | { name: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { error: 'Give the tag a name.' };
  if (name.length > 30) return { error: 'Tag names are limited to 30 characters.' };
  return { name };
}

/** Adds a tag, or returns the one already called that (in any case). */
export async function addTag(raw: string, tone: string | null, ctx: Ctx): Promise<{ error: string } | { tag: Tag }> {
  const checked = checkName(raw);
  if ('error' in checked) return checked;
  const db = getDb();
  const t = schema.customerTags;
  const [same] = await db.select().from(t).where(eq(sql`lower(${t.name})`, checked.name.toLowerCase()));
  if (same) return { tag: same };
  const [{ n }] = (await db.select({ n: count() }).from(t)) as [{ n: number }];
  if (n >= 60) return { error: 'There are 60 tags already. Remove one you no longer use first.' };
  const all = await db.select({ tone: t.tone }).from(t);
  const pick = (TAG_TONES as readonly string[]).includes(tone ?? '') ? (tone as TagTone) : nextTone(all);
  const [tag] = await db.insert(t).values({ name: checked.name, tone: pick }).onConflictDoNothing().returning();
  if (!tag) return { error: 'That tag was just added by someone else. Try again.' };
  await audit({ actorId: ctx.actorId, action: 'customer_tag_added', entity: 'customer_tag', entityId: tag.id, detail: { name: tag.name }, ipHash: ctx.ipHash });
  return { tag };
}

export async function changeTag(id: string, raw: string, tone: string, ctx: Ctx): Promise<string | null> {
  const checked = checkName(raw);
  if ('error' in checked) return checked.error;
  if (!(TAG_TONES as readonly string[]).includes(tone)) return 'Choose a colour.';
  const db = getDb();
  const t = schema.customerTags;
  const [clash] = await db.select({ id: t.id }).from(t).where(and(eq(sql`lower(${t.name})`, checked.name.toLowerCase()), ne(t.id, id)));
  if (clash) return `There is a tag called “${checked.name}” already.`;
  const [done] = await db.update(t).set({ name: checked.name, tone: tone as TagTone }).where(eq(t.id, id)).returning({ id: t.id });
  if (!done) return 'That tag no longer exists.';
  await audit({ actorId: ctx.actorId, action: 'customer_tag_changed', entity: 'customer_tag', entityId: id, detail: { name: checked.name }, ipHash: ctx.ipHash });
  return null;
}

/** Removes a tag from everyone who has it. Their rating and other tags stay. */
export async function deleteTag(id: string, ctx: Ctx): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const [gone] = await getDb().delete(schema.customerTags).where(eq(schema.customerTags.id, id)).returning({ name: schema.customerTags.name });
  if (gone) await audit({ actorId: ctx.actorId, action: 'customer_tag_deleted', entity: 'customer_tag', entityId: id, detail: { name: gone.name }, ipHash: ctx.ipHash });
}

export type RatingForm = { rating: string; tagIds: string[]; newTag: string; noOffers: boolean };

/** Saves a customer's stars, tags (adding a new tag typed in) and whether they get offers. */
export async function saveRating(customerId: string, f: RatingForm, ctx: Ctx): Promise<string | null> {
  const rating = f.rating ? Number(f.rating) : null;
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return 'Choose 1 to 5 stars.';
  const db = getDb();
  const known = f.tagIds.length ? await db.select({ id: schema.customerTags.id }).from(schema.customerTags).where(inArray(schema.customerTags.id, f.tagIds.filter((x) => /^[0-9a-f-]{36}$/.test(x)))) : [];
  const ids = new Set(known.map((k) => k.id));
  if (f.newTag.trim()) {
    const added = await addTag(f.newTag, null, ctx);
    if ('error' in added) return added.error;
    ids.add(added.tag.id);
  }
  const c = schema.customers;
  const l = schema.customerTagLinks;
  await db.transaction(async (tx) => {
    await tx.update(c).set({ rating, noOffers: f.noOffers }).where(eq(c.id, customerId));
    await tx.delete(l).where(eq(l.customerId, customerId));
    if (ids.size) await tx.insert(l).values([...ids].map((tagId) => ({ customerId, tagId })));
  });
  await audit({ actorId: ctx.actorId, action: 'customer_rated', entity: 'customer', entityId: customerId, detail: { rating, tags: ids.size, noOffers: f.noOffers }, ipHash: ctx.ipHash });
  return null;
}

/* ---------------- The customers list's filters ---------------- */

export const RATING_FILTERS = { '5': '5 stars', '4': '4 stars and up', '3': '3 stars and up', low: '1 or 2 stars', none: 'Not rated' } as const;
export type RatingFilter = keyof typeof RATING_FILTERS;
export type CustomerFilters = { q: string; from: string | null; to: string | null; rating: RatingFilter | null; tag: string | null };

/** When a customer last booked: the same expression as the customers_recent_idx index, so a page (and a date range) is read straight from it. */
export const lastBookedSql = sql`coalesce(${schema.customers.lastBookingAt}, ${schema.customers.createdAt})`;

/**
 * The customers list's filters, from the URL. The list (/admin/customers/)
 * and its export share them, so the file holds exactly the customers the
 * list shows, over every page.
 *   ?q= name or number · ?from= ?to= last booked · ?rating= · ?tag=<tag id>
 */
export function readCustomerFilters(url: URL): CustomerFilters {
  const p = url.searchParams;
  const { from, to } = dateFilter(url);
  const rating = p.get('rating') ?? '';
  const tag = p.get('tag') ?? '';
  return {
    q: (p.get('q') ?? '').trim().slice(0, 60),
    from,
    to,
    rating: rating in RATING_FILTERS ? (rating as RatingFilter) : null,
    tag: /^[0-9a-f-]{36}$/.test(tag) ? tag : null,
  };
}

/** The customers who match, leaving out those whose details were removed. */
export function customerWhere(f: CustomerFilters): SQL | undefined {
  const c = schema.customers;
  let search: SQL | undefined;
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, '\\$&')}%`;
    const digits = f.q.replace(/\D/g, '');
    search = or(ilike(c.name, like), digits.length >= 4 ? ilike(c.phone, `%${digits}%`) : undefined);
  }
  const rating =
    f.rating === 'none' ? isNull(c.rating) : f.rating === 'low' ? lte(c.rating, 2) : f.rating ? gte(c.rating, Number(f.rating)) : undefined;
  const l = schema.customerTagLinks;
  const tag = f.tag ? exists(getDb().select({ x: sql`1` }).from(l).where(and(eq(l.customerId, c.id), eq(l.tagId, f.tag)))) : undefined;
  return and(
    isNull(c.personalDataRemovedAt),
    search,
    f.from ? sql`${lastBookedSql} >= ${istMidnight(f.from)}` : undefined,
    f.to ? sql`${lastBookedSql} < ${istMidnight(addDays(f.to, 1))}` : undefined,
    rating,
    tag,
  );
}
