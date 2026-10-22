/**
 * Search across bookings and customers at once, for the search box at the
 * top of every admin page (a list as you type) and the results page behind
 * it (/admin/search/). Matches any part of a name, a mobile number (four
 * digits or more) or a BAT- reference, using the trigram indexes from
 * migration 0003, so it stays quick however many rows there are.
 */
import { and, count, desc, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import { phoneLabel } from '../lib/itinerary-text';
import { STATUS_LABEL, TONE, dayLabel, todayIST } from './dashboard';
import { getDb, schema } from './db';

export type BookingHit = { ref: string; name: string; trip: string; when: string; status: string; tone: string; href: string };
export type CustomerHit = { id: string; name: string; phone: string; href: string };
export type SearchResult = { q: string; bookings: BookingHit[]; customers: CustomerHit[]; bookingTotal: number; customerTotal: number };

/** What a search box may hold: trimmed, at most 60 characters. */
export const cleanQuery = (raw: string | null) => (raw ?? '').trim().slice(0, 60);

function likeOf(q: string) {
  return `%${q.replace(/[%_\\]/g, '\\$&')}%`;
}

export async function searchAll(q: string, limit = 5): Promise<SearchResult> {
  const empty = { q, bookings: [], customers: [], bookingTotal: 0, customerTotal: 0 };
  if (q.length < 2) return empty;
  const like = likeOf(q);
  const digits = q.replace(/\D/g, '');
  const b = schema.bookings;
  const c = schema.customers;
  const bookingMatch: SQL | undefined = or(ilike(b.ref, like), ilike(b.customerName, like), digits.length >= 4 ? ilike(b.customerPhone, `%${digits}%`) : undefined);
  const customerMatch: SQL | undefined = and(isNull(c.personalDataRemovedAt), or(ilike(c.name, like), digits.length >= 4 ? ilike(c.phone, `%${digits}%`) : undefined));
  // An exact reference comes first, then the newest.
  const exact = sql`(${b.ref} = ${q.toUpperCase()}) desc`;
  const db = getDb();
  const [bookings, [bn], customers, [cn]] = await Promise.all([
    db.select({ ref: b.ref, name: b.customerName, trip: b.tripName, date: b.pickupDate, time: b.pickupTime, status: b.status }).from(b).where(bookingMatch).orderBy(exact, desc(b.createdAt)).limit(limit),
    db.select({ n: count() }).from(b).where(bookingMatch),
    db.select({ id: c.id, name: c.name, phone: c.phone }).from(c).where(customerMatch).orderBy(sql`coalesce(${c.lastBookingAt}, ${c.createdAt}) desc`).limit(limit),
    db.select({ n: count() }).from(c).where(customerMatch),
  ]);
  const today = todayIST();
  return {
    q,
    bookings: bookings.map((x) => ({
      ref: x.ref,
      name: x.name ?? 'Name removed',
      trip: x.trip.split(' · ')[0]!.replace(' (IXB)', ''),
      when: `${dayLabel(x.date, today)}, ${x.time}`,
      status: STATUS_LABEL[x.status][0],
      tone: TONE[STATUS_LABEL[x.status][1]],
      href: `/admin/bookings/${x.ref}/`,
    })),
    customers: customers.map((x) => ({ id: x.id, name: x.name ?? 'No name', phone: x.phone ? phoneLabel(x.phone) : '', href: `/admin/customers/${x.id}/` })),
    bookingTotal: bn?.n ?? 0,
    customerTotal: cn?.n ?? 0,
  };
}
