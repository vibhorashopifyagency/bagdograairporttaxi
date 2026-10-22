/**
 * Everything the admin "today board" (/admin/) shows, read from the database.
 * Dates are Indian dates (Asia/Kolkata), the way the office thinks of a day.
 * Nothing here is invented: an empty database gives empty lists and zeros.
 */
import { and, asc, count, desc, eq, gte, inArray, lt, lte, notInArray, sql } from 'drizzle-orm';
import reviewsFile from '../data/google-reviews.json';
import { vehicleByKey } from '../data/vehicles';
import { getDb, schema } from './db';
import type { BookingStatus } from './db/schema';
import { advanceOf, driverCollectsBalance } from './fares';

/* ---------------- Dates in India ---------------- */

const IST_OFFSET_MS = 5.5 * 3600e3;
const istClock = (now = Date.now()) => new Date(now + IST_OFFSET_MS);
export const todayIST = (now = Date.now()) => istClock(now).toISOString().slice(0, 10);
export const istHour = (now = Date.now()) => istClock(now).getUTCHours();
export const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
/** True for a real calendar date written YYYY-MM-DD (not 2026-02-30). */
export function isDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}
/** The instant an Indian date begins. */
export const istMidnight = (day: string) => new Date(`${day}T00:00:00+05:30`);
const pickupAt = (day: string, time: string) => new Date(`${day}T${time}:00+05:30`);

const shortDay = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'long' });
export const longDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

/** "today", "tomorrow" or "2 Nov". */
export function dayLabel(day: string, today = todayIST()): string {
  if (day === today) return 'today';
  if (day === addDays(today, 1)) return 'tomorrow';
  if (day === addDays(today, -1)) return 'yesterday';
  return shortDay.format(new Date(`${day}T00:00:00Z`));
}

/** "in 50 min", "in 3 h", "2 h ago". */
export function fromNow(at: Date, now = Date.now()): string {
  const mins = Math.round((at.getTime() - now) / 60000);
  const abs = Math.abs(mins);
  const text = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.floor(abs / 60)} h` : `${Math.round(abs / 1440)} days`;
  return mins >= 0 ? `in ${text}` : `${text} ago`;
}

/** How long something has waited: "4 min", "2 h", "3 days". */
function waited(since: Date, now = Date.now()): { text: string; mins: number } {
  const mins = Math.max(0, Math.floor((now - since.getTime()) / 60000));
  const text = mins < 60 ? `${mins} min` : mins < 48 * 60 ? `${Math.floor(mins / 60)} h` : `${Math.floor(mins / 1440)} days`;
  return { text, mins };
}

/* ---------------- Labels and colours ---------------- */

export type Tone = 'lime' | 'amber' | 'red' | 'grey';
export const TONE: Record<Tone, string> = {
  lime: 'bg-lime-50 text-[#3f6200]',
  amber: 'bg-[#fff4d6] text-[#8a5300]',
  red: 'bg-[#fde8e7] text-[#b42318]',
  grey: 'bg-[#eef0f3] text-body',
};

export const STATUS_LABEL: Record<BookingStatus, [string, Tone]> = {
  new: ['New', 'amber'],
  contacted: ['Contacted', 'grey'],
  confirmed: ['Confirmed', 'lime'],
  driver_assigned: ['Driver assigned', 'lime'],
  completed: ['Completed', 'grey'],
  cancelled: ['Cancelled', 'red'],
  no_show: ['No-show', 'red'],
};

/** Statuses that count as a real trip, and ones that do not count at all. */
const LIVE: BookingStatus[] = ['confirmed', 'driver_assigned', 'completed'];
const DEAD: BookingStatus[] = ['cancelled', 'no_show'];

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
/** ₹38.4k for the big numbers. */
export const inrShort = (n: number) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k` : inr(n));

/** "Bagdogra Airport to Darjeeling · Innova Crysta" → "Bagdogra Airport to Darjeeling". */
const routeOf = (tripName: string) => tripName.split(' · ')[0];
const shortRoute = (tripName: string) => routeOf(tripName).replace(' (IXB)', '').replace(/^Bagdogra Airport\b/, 'Airport');
const carName = (key: string) => vehicleByKey(key)?.name ?? key;

export const waText = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

/* ---------------- Payments ---------------- */

async function paidFor(ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const rows = await getDb()
    .select({ id: schema.payments.bookingId, paid: sql<string>`coalesce(sum(${schema.payments.amount}), 0)` })
    .from(schema.payments)
    .where(inArray(schema.payments.bookingId, ids))
    .groupBy(schema.payments.bookingId);
  return new Map(rows.map((r) => [r.id, Number(r.paid)]));
}

export function payState(total: number, advance: number, paid: number, kind: 'taxi' | 'package'): { label: string; tone: Tone } {
  const due = total - paid;
  if (paid >= total) return { label: 'Fully paid', tone: 'lime' };
  if (paid > 0 && paid >= advance) return { label: driverCollectsBalance(kind) ? `Advance paid · driver collects ${inr(due)}` : `Advance paid · ${inr(due)} to collect`, tone: 'lime' };
  if (paid > 0) return { label: `${inr(paid)} paid · ${inr(due)} due`, tone: 'amber' };
  return { label: 'No payment recorded', tone: 'amber' };
}

/* ---------------- Today's pickups ---------------- */

export type Pickup = {
  id: string;
  ref: string;
  time: string;
  when: string;
  route: string;
  status: { label: string; tone: Tone };
  who: string;
  travel: string;
  car: string;
  carMissing: boolean;
  pay: { label: string; tone: Tone };
  phone: string | null;
  name: string;
};

function pickupStatus(status: BookingStatus, hasDriver: boolean): { label: string; tone: Tone } {
  if (status === 'new') return { label: 'Not answered yet', tone: 'red' };
  if (status === 'contacted') return { label: 'Waiting to confirm', tone: 'amber' };
  if (status === 'completed') return { label: 'Completed', tone: 'grey' };
  if (status === 'driver_assigned' || hasDriver) return { label: 'Driver assigned', tone: 'lime' };
  return { label: 'Needs a driver', tone: 'red' };
}

export async function pickupsOn(day: string, now = Date.now()): Promise<Pickup[]> {
  const b = schema.bookings;
  const rows = await getDb()
    .select()
    .from(b)
    .where(and(eq(b.pickupDate, day), notInArray(b.status, DEAD)))
    .orderBy(asc(b.pickupTime))
    .limit(60);
  const paid = await paidFor(rows.map((r) => r.id));
  return rows.map((r) => {
    const hasDriver = Boolean(r.driverName || r.vehicleNumber);
    const car = [carName(r.vehicle), r.vehicleNumber, r.driverName].filter(Boolean).join(' · ');
    return {
      id: r.id,
      ref: r.ref,
      time: r.pickupTime,
      when: fromNow(pickupAt(r.pickupDate, r.pickupTime), now),
      route: routeOf(r.tripName),
      status: pickupStatus(r.status, hasDriver),
      who: [r.customerName ?? 'Name removed', `${r.pax} ${r.pax === 1 ? 'traveller' : 'travellers'}`, r.kind === 'package' ? 'package' : ''].filter(Boolean).join(' · '),
      travel: [r.flight, r.ref].filter(Boolean).join(' · '),
      car: hasDriver ? car : `${carName(r.vehicle)} · driver not assigned yet`,
      carMissing: !hasDriver,
      pay: payState(r.fareTotal, advanceOf(r.fareTotal), paid.get(r.id) ?? 0, r.kind),
      phone: r.customerPhone,
      name: r.customerName ?? '',
    };
  });
}

/* ---------------- Waiting for a reply ---------------- */

export type Waiting = {
  id: string;
  ref: string;
  name: string;
  what: string;
  wait: string;
  tone: Tone;
  waLink: string | null;
};

export async function waitingForReply(now = Date.now()): Promise<{ items: Waiting[]; total: number }> {
  const b = schema.bookings;
  const db = getDb();
  const [rows, [n]] = await Promise.all([
    db.select().from(b).where(eq(b.status, 'new')).orderBy(asc(b.createdAt)).limit(6),
    db.select({ n: count() }).from(b).where(eq(b.status, 'new')),
  ]);
  const today = todayIST(now);
  const items = rows.map((r) => {
    const w = waited(r.createdAt, now);
    const name = r.customerName ?? 'Name removed';
    const first = name.split(' ')[0];
    return {
      id: r.id,
      ref: r.ref,
      name,
      what: `${shortRoute(r.tripName)} · ${carName(r.vehicle)} · ${dayLabel(r.pickupDate, today)} ${r.pickupTime}`,
      wait: w.text,
      tone: (w.mins < 10 ? 'lime' : w.mins < 30 ? 'amber' : 'red') as Tone,
      waLink: r.customerPhone
        ? waText(
            r.customerPhone,
            `Namaste ${first}, thank you for booking with Bagdogra Airport Taxi. Your reference is ${r.ref}: ${routeOf(r.tripName)} by ${carName(r.vehicle)}, ${longDate.format(new Date(`${r.pickupDate}T00:00:00Z`))} at ${r.pickupTime}. `,
          )
        : null,
    };
  });
  return { items, total: n?.n ?? 0 };
}

export async function countNew(): Promise<number> {
  const [n] = await getDb().select({ n: count() }).from(schema.bookings).where(eq(schema.bookings.status, 'new'));
  return n?.n ?? 0;
}

/* ---------------- Balances to collect ---------------- */

/**
 * What is still due on a booking, for a query on `bookings`. Drizzle writes
 * column names without their table in the select list of a single-table
 * query, so a subquery written with ${b.id} there compares each payment with
 * itself and finds none; the tables are named in full instead.
 */
export const dueSql = sql<number>`(bookings.fare_total - coalesce((select sum(pp.amount) from payments pp where pp.booking_id = bookings.id), 0))::int`;

/**
 * `driver` is true when the advance is in and the rest is the driver's to
 * collect after the trip; such a trip gets no reminder to the guest, and
 * once the pickup has passed it is a nudge to record what the driver took.
 */
export type Balance = { id: string; ref: string; name: string; what: string; amt: number; waLink: string | null; driver: boolean; record: boolean };

/**
 * Confirmed trips from the last 30 days and the next 14 that still have money
 * due: the first few, the total over all of them, and how much of that total
 * is for drivers to collect. All are worked out in the database from each
 * trip's own payments (an index lookup per trip), so the work depends on how
 * many trips fall in those 44 days, never on how many payments were ever
 * recorded.
 */
export async function balancesToCollect(now = Date.now()): Promise<{ items: Balance[]; total: number; byDriver: number }> {
  const b = schema.bookings;
  const today = todayIST(now);
  const due = dueSql;
  const inWindow = and(inArray(b.status, LIVE), gte(b.pickupDate, addDays(today, -30)), lte(b.pickupDate, addDays(today, 14)));
  const db = getDb();
  const [rows, [sum], forDrivers] = await Promise.all([
    db
      .select({
        id: b.id, ref: b.ref, kind: b.kind, customerName: b.customerName, customerPhone: b.customerPhone, tripName: b.tripName,
        pickupDate: b.pickupDate, status: b.status, fare: b.fareTotal, driverName: b.driverName, amt: due,
      })
      .from(b)
      .where(and(inWindow, sql`${due} > 0`))
      .orderBy(asc(b.pickupDate), asc(b.pickupTime))
      .limit(4),
    // greatest() leaves out trips paid in full, with one payments lookup per trip.
    db.select({ total: sql<string>`coalesce(sum(greatest(${due}, 0)), 0)` }).from(b).where(inWindow),
    // The drivers' share needs each trip's advance, which is worked out here as it is everywhere else.
    db.select({ fare: b.fareTotal, kind: b.kind, amt: due }).from(b).where(and(inWindow, sql`${due} > 0`, eq(b.kind, 'taxi'))),
  ]);
  const driverJob = (r: { fare: number; kind: 'taxi' | 'package'; amt: number }) => driverCollectsBalance(r.kind) && r.fare - r.amt >= advanceOf(r.fare);
  const items = rows.map(({ amt, ...r }): Balance => {
    const driver = driverJob({ ...r, amt });
    const record = driver && (r.pickupDate < today || r.status === 'completed');
    const day = dayLabel(r.pickupDate, today);
    const who = r.driverName ? r.driverName.split(' ')[0] : 'the driver';
    return {
      id: r.id,
      ref: r.ref,
      name: r.customerName ?? 'Name removed',
      what: `${shortRoute(r.tripName)} · ${day}${driver ? (record ? ` · did ${who} collect it?` : ` · ${who} collects after the trip`) : ''}`,
      amt,
      driver,
      record,
      waLink:
        r.customerPhone && !driver
          ? waText(
              r.customerPhone,
              `Namaste ${(r.customerName ?? '').split(' ')[0]}, a quick note about your trip ${r.ref} (${routeOf(r.tripName)}, ${day}): the amount still to pay is ${inr(amt)}. `,
            )
          : null,
    };
  });
  return { items, total: Number(sum?.total ?? 0), byDriver: forDrivers.filter(driverJob).reduce((s, r) => s + r.amt, 0) };
}

/* ---------------- Wins this week ---------------- */

export async function weekWins(now = Date.now()) {
  const today = todayIST(now);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((dow + 6) % 7));
  const b = schema.bookings;
  const db = getDb();
  // Counted per Indian day in the database: at most seven rows come back, however busy the week.
  const istDay = sql<string>`((${b.createdAt} at time zone 'UTC') + interval '330 minutes')::date::text`;
  const [days, [money]] = await Promise.all([
    db
      .select({
        day: istDay,
        received: sql<number>`(count(*) filter (where ${notInArray(b.status, DEAD)}))::int`,
        confirmed: sql<number>`(count(*) filter (where ${inArray(b.status, LIVE)}))::int`,
      })
      .from(b)
      .where(gte(b.createdAt, istMidnight(weekStart)))
      .groupBy(istDay),
    db
      .select({ sum: sql<string>`coalesce(sum(${schema.payments.amount}), 0)` })
      .from(schema.payments)
      .where(gte(schema.payments.receivedOn, weekStart)),
  ]);
  const received = days.reduce((s, d) => s + d.received, 0);
  const best = [...days].sort((a, z) => z.received - a.received)[0];
  let line: string;
  if (best && best.received >= 2) line = `${weekday.format(new Date(`${best.day}T00:00:00Z`))} was the best day so far, with ${best.received} bookings. Keep it going.`;
  else if (received) line = 'Every booking counts. Keep them coming.';
  else line = 'A fresh week. The first booking is the best one.';
  return {
    received,
    confirmed: days.reduce((s, d) => s + d.confirmed, 0),
    collected: Number(money?.sum ?? 0),
    line,
  };
}

/* ---------------- Monthly goal ---------------- */

export type Goal = { trips: number; amount: number };
export const GOAL_KEY = 'monthly_goal';

export async function monthGoal(now = Date.now()) {
  const today = todayIST(now);
  const monthStart = `${today.slice(0, 8)}01`;
  const next = new Date(Date.parse(`${monthStart}T00:00:00Z`));
  next.setUTCMonth(next.getUTCMonth() + 1);
  const nextStart = next.toISOString().slice(0, 10);
  const daysInMonth = Math.round((next.getTime() - Date.parse(`${monthStart}T00:00:00Z`)) / 86400e3);
  const dayOfMonth = Number(today.slice(8, 10));

  const b = schema.bookings;
  const db = getDb();
  const [[setting], [done], [money]] = await Promise.all([
    db.select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, GOAL_KEY)),
    db
      .select({ trips: count(), value: sql<string>`coalesce(sum(${b.fareTotal}), 0)` })
      .from(b)
      .where(and(inArray(b.status, LIVE), gte(b.pickupDate, monthStart), lt(b.pickupDate, nextStart))),
    db
      .select({ sum: sql<string>`coalesce(sum(${schema.payments.amount}), 0)` })
      .from(schema.payments)
      .where(and(gte(schema.payments.receivedOn, monthStart), lt(schema.payments.receivedOn, nextStart))),
  ]);
  const collected = Number(money?.sum ?? 0);
  const goal = (setting?.value as Goal | undefined) ?? null;
  const trips = done?.trips ?? 0;
  const value = Number(done?.value ?? 0);
  const daysLeft = daysInMonth - dayOfMonth;
  const monthName = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'long' }).format(new Date(`${monthStart}T00:00:00Z`));

  let pct = 0;
  let line = '';
  if (goal && goal.trips > 0) {
    pct = Math.min(100, Math.round((trips / goal.trips) * 100));
    const left = Math.max(0, goal.trips - trips);
    const onPace = trips >= (goal.trips * dayOfMonth) / daysInMonth - 0.5;
    const days = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
    if (left === 0) line = 'Goal reached. Everything from here is a bonus.';
    else line = `${left} ${left === 1 ? 'trip' : 'trips'} to go, ${days}. ${onPace ? 'On track.' : 'A few quick replies will close the gap.'}`;
  }
  return { goal, trips, value, collected, pct, line, monthName, daysLeft };
}

/* ---------------- Most booked routes this month ---------------- */

export async function topRoutes(now = Date.now()) {
  const monthStart = `${todayIST(now).slice(0, 8)}01`;
  const b = schema.bookings;
  // Counted per route in the database (the part of the trip name before " · "), so one row per route comes back.
  const route = sql<string>`split_part(${b.tripName}, ' · ', 1)`;
  const rows = await getDb()
    .select({ route, n: sql<number>`count(*)::int` })
    .from(b)
    .where(and(gte(b.createdAt, istMidnight(monthStart)), notInArray(b.status, DEAD)))
    .groupBy(route);
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(shortRoute(r.route), (counts.get(shortRoute(r.route)) ?? 0) + r.n);
  const top = [...counts].sort((a, z) => z[1] - a[1]).slice(0, 5);
  const max = top[0]?.[1] ?? 1;
  return top.map(([name, n]) => ({ name, count: n, pct: Math.max(6, Math.round((n / max) * 100)) }));
}

/* ---------------- Latest changes ---------------- */

const FIELD_LABEL: Record<string, string> = {
  pickupDate: 'pickup date',
  pickupTime: 'pickup time',
  flight: 'flight',
  pax: 'travellers',
  dropAddress: 'address',
  driverName: 'driver',
  driverPhone: 'driver’s phone',
  vehicleNumber: 'car number',
  fareTotal: 'agreed fare',
  notes: 'notes',
  handledBy: 'handled by',
};

/** One line for a booking timeline entry, and the colour of its dot. */
export function describeEvent(type: string, data: Record<string, unknown> | null, byStaff: boolean): { text: string; tone: Tone } {
  const amount = typeof data?.amount === 'number' ? inr(data.amount) : '';
  const method = data?.method === 'cash' ? 'cash' : 'UPI';
  switch (type) {
    case 'created': {
      const late = typeof data?.lateMinutes === 'number' ? data.lateMinutes : 0;
      const lateText = late ? `. It reached us ${late < 120 ? `${late} min` : late < 2880 ? `${Math.round(late / 60)} h` : `${Math.round(late / 1440)} days`} late: the database was down when it was made` : '';
      return { text: byStaff ? 'Added by hand' : `Booked on the website${data?.channel === 'payment' ? ' (payment button)' : ''}${lateText}`, tone: late ? 'amber' : 'lime' };
    }
    case 'status': {
      const to = (data?.to as BookingStatus | undefined) ?? 'new';
      return { text: `Moved to ${STATUS_LABEL[to]?.[0].toLowerCase() ?? to}`, tone: STATUS_LABEL[to]?.[1] ?? 'grey' };
    }
    case 'edited': {
      const fields = Object.keys((data?.changes as Record<string, unknown>) ?? {}).map((k) => FIELD_LABEL[k] ?? k);
      return { text: fields.length ? `Changed the ${fields.join(', ')}` : 'Edited', tone: 'grey' };
    }
    case 'payment':
      return { text: data?.driver ? `${amount} collected by ${String(data.driver)} (driver), ${method === 'cash' ? 'in cash' : 'by UPI'}` : `${amount} received by ${method}`, tone: 'lime' };
    case 'refund':
      return { text: `${amount} refunded by ${method}`, tone: 'amber' };
    case 'payment_reversed':
      return { text: `${data?.kind === 'refund' ? 'Refund' : 'Payment'} of ${amount.replace('-', '')} reversed: ${String(data?.reason ?? '')}`, tone: 'red' };
    case 'itinerary_sent':
      return { text: Number(data?.count ?? 1) > 1 ? 'Sent an updated itinerary' : 'Sent the itinerary on WhatsApp', tone: 'lime' };
    case 'itinerary_deleted':
      return { text: `Deleted the itinerary${Number(data?.sentCount ?? 0) > 0 ? ' (the customer’s link now shows only the booking)' : ' (it was a draft)'}`, tone: 'red' };
    case 'qr_sent':
      return { text: `Sent the UPI QR code${amount ? ` for ${amount}` : ''}`, tone: 'grey' };
    default:
      return { text: 'Updated', tone: 'grey' };
  }
}

export async function recentChanges(limit = 5, now = Date.now()) {
  const e = schema.bookingEvents;
  const b = schema.bookings;
  const rows = await getDb()
    .select({ at: e.at, type: e.type, data: e.data, ref: b.ref, actor: schema.user.name })
    .from(e)
    .innerJoin(b, eq(e.bookingId, b.id))
    .leftJoin(schema.user, eq(e.actorId, schema.user.id))
    .orderBy(desc(e.at))
    .limit(limit);
  return rows.map((r) => {
    let { text, tone } = describeEvent(r.type, r.data, Boolean(r.actor));
    if (r.type === 'created') text = r.actor ? `${r.ref} added by hand` : `New booking ${r.ref} from the website`;
    else text = `${r.ref}: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    return { text, tone, ref: r.ref, who: r.actor ?? 'Website', when: fromNow(r.at, now) };
  });
}

/* ---------------- A Google review to start the day ---------------- */

type Review = { author: string; rating: number; text: string };

/** A different five-star review each day, from the reviews already on the site. */
export function reviewOfTheDay(now = Date.now()) {
  const file = reviewsFile as { rating: number; count: number; mapsUrl: string; reviews: Review[] };
  const pool = file.reviews.filter((r) => r.rating === 5 && r.text && r.text.length >= 40);
  if (!pool.length) return null;
  const dayNumber = Math.floor((now + IST_OFFSET_MS) / 86400e3);
  const r = pool[dayNumber % pool.length];
  return { author: r.author, text: r.text, rating: file.rating, count: file.count, url: file.mapsUrl };
}
