/**
 * The filters on the bookings list, read from the URL and turned into SQL.
 * The list (/admin/bookings/) and its CSV download share them, so the file
 * always holds exactly the bookings on screen.
 *
 *   ?q=      name, mobile number or BAT- reference
 *   ?status= one of BOOKING_STATUSES
 *   ?from= ?to= and ?by=booked   pickup dates (default) or the day it came in
 *   ?trip=   taxi | package | route:<slug> | package:<slug>
 *   ?pay=    unpaid | part | advance | full | refunded
 */
import { and, eq, gte, ilike, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { PACKAGES, packageBySlug } from '../data/packages';
import { ROUTES, ROUTE_GROUPS, routeBySlug } from '../data/routes';
import { POLICY } from '../data/site';
import { addDays, istMidnight } from './dashboard';
import { schema } from './db';
import { BOOKING_STATUSES, type BookingStatus } from './db/schema';
import { dateFilter } from './paging';

export const PAY_FILTERS = {
  unpaid: 'No payment yet',
  part: 'Part of the advance',
  advance: 'Advance paid',
  full: 'Fully paid',
  refunded: 'Refunded',
} as const;
export type PayFilter = keyof typeof PAY_FILTERS;

/** The trip filter's choices, grouped the way the booking page groups them. */
export const TRIP_CHOICES: { label: string; options: [value: string, label: string][] }[] = [
  { label: 'All of a kind', options: [['taxi', 'All taxi transfers'], ['package', 'All tour packages']] },
  ...ROUTE_GROUPS.map((g) => ({
    label: `Taxi: ${g}`,
    options: ROUTES.filter((r) => r.group === g).map((r): [string, string] => [`route:${r.slug}`, `${r.fromShort} to ${r.toShort}`]),
  })),
  { label: 'Tour packages', options: PACKAGES.map((p): [string, string] => [`package:${p.slug}`, `${p.short} (${p.nights}N/${p.days}D)`]) },
];

/** What the trip filter is set to, in words, for the field and the CSV name. */
export function tripLabel(trip: string | null): string | null {
  if (!trip) return null;
  if (trip === 'taxi') return 'Taxi transfers';
  if (trip === 'package') return 'Tour packages';
  const [k, slug] = trip.split(':');
  if (k === 'route') {
    const r = routeBySlug(slug ?? '');
    return r ? `${r.fromShort} to ${r.toShort}` : null;
  }
  const p = packageBySlug(slug ?? '');
  return p ? p.short : null;
}

/**
 * Money held on a booking (payments less refunds and reversals) and its
 * advance, worked out in the database. Named in full, because Drizzle writes
 * bare column names in a single-table select (see dueSql in dashboard.ts).
 */
const paidSql = sql`coalesce((select sum(pp.amount) from payments pp where pp.booking_id = bookings.id), 0)`;
const advanceSql = sql`round(bookings.fare_total * ${POLICY.advancePercent}::numeric / 100)`;
const refundSql = sql`exists (select 1 from payments pr where pr.booking_id = bookings.id and pr.kind = 'refund')`;

/** The same states as summarise() in payments.ts, so a booking lands where its page says it is. */
function payWhere(pay: PayFilter): SQL {
  switch (pay) {
    case 'refunded':
      return sql`(${refundSql} and ${paidSql} <= 0)`;
    case 'full':
      return sql`(bookings.fare_total > 0 and ${paidSql} >= bookings.fare_total)`;
    case 'advance':
      return sql`(${paidSql} > 0 and ${paidSql} >= ${advanceSql} and ${paidSql} < bookings.fare_total)`;
    case 'part':
      return sql`(${paidSql} > 0 and ${paidSql} < ${advanceSql})`;
    case 'unpaid':
      return sql`(${paidSql} <= 0 and not ${refundSql})`;
  }
}

/** Which payment state a booking is in, by the same rules as payWhere(), for the CSV. */
export function payFilterOf(total: number, paid: number, hasRefund: boolean): PayFilter {
  const advance = Math.round((total * POLICY.advancePercent) / 100);
  if (hasRefund && paid <= 0) return 'refunded';
  if (total > 0 && paid >= total) return 'full';
  if (paid > 0 && paid >= advance) return 'advance';
  if (paid > 0) return 'part';
  return 'unpaid';
}

/** The money columns for a select on `bookings`: what is held, and whether anything was refunded. */
export const moneyFields = {
  paid: sql<string>`${paidSql}`,
  hasRefund: sql<boolean>`${refundSql}`,
};

export type BookingFilters = {
  q: string;
  status: BookingStatus | null;
  from: string | null;
  to: string | null;
  /** null means pickup dates, the default. */
  by: 'booked' | null;
  trip: string | null;
  pay: PayFilter | null;
};

export function readBookingFilters(url: URL): BookingFilters {
  const p = url.searchParams;
  const statusParam = p.get('status') ?? '';
  const tripParam = p.get('trip') ?? '';
  const payParam = p.get('pay') ?? '';
  const { from, to } = dateFilter(url);
  return {
    q: (p.get('q') ?? '').trim().slice(0, 60),
    status: (BOOKING_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as BookingStatus) : null,
    from,
    to,
    by: p.get('by') === 'booked' ? 'booked' : null,
    trip: tripLabel(tripParam) ? tripParam : null,
    pay: payParam in PAY_FILTERS ? (payParam as PayFilter) : null,
  };
}

/** True when anything narrows the list (the status chips aside). */
export const isFiltered = (f: BookingFilters) => Boolean(f.q || f.from || f.to || f.trip || f.pay);

/**
 * The WHERE for these filters. `withStatus: false` leaves the status out, for
 * the counts on the status chips.
 */
export function bookingWhere(f: BookingFilters, { withStatus = true } = {}): SQL | undefined {
  const b = schema.bookings;
  let search: SQL | undefined;
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, '\\$&')}%`;
    const digits = f.q.replace(/\D/g, '');
    search = or(ilike(b.ref, like), ilike(b.customerName, like), digits.length >= 4 ? ilike(b.customerPhone, `%${digits}%`) : undefined);
  }
  const inRange =
    f.by === 'booked'
      ? and(f.from ? gte(b.createdAt, istMidnight(f.from)) : undefined, f.to ? lt(b.createdAt, istMidnight(addDays(f.to, 1))) : undefined)
      : and(f.from ? gte(b.pickupDate, f.from) : undefined, f.to ? lte(b.pickupDate, f.to) : undefined);
  let trip: SQL | undefined;
  if (f.trip === 'taxi' || f.trip === 'package') trip = eq(b.kind, f.trip);
  else if (f.trip?.startsWith('route:')) trip = eq(b.routeSlug, f.trip.slice(6));
  else if (f.trip?.startsWith('package:')) trip = eq(b.packageSlug, f.trip.slice(8));
  return and(search, inRange, trip, f.pay ? payWhere(f.pay) : undefined, withStatus && f.status ? eq(b.status, f.status) : undefined);
}

/** The filters as URL parameters, leaving out the ones not set. */
export const filterParams = (f: BookingFilters): Record<string, string | null> => ({
  q: f.q || null,
  status: f.status,
  from: f.from,
  to: f.to,
  by: f.by,
  trip: f.trip,
  pay: f.pay,
});
