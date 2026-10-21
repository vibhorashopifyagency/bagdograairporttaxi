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

/* ---------------- Dates in India ---------------- */

const IST_OFFSET_MS = 5.5 * 3600e3;
const istClock = (now = Date.now()) => new Date(now + IST_OFFSET_MS);
export const todayIST = (now = Date.now()) => istClock(now).toISOString().slice(0, 10);
export const istHour = (now = Date.now()) => istClock(now).getUTCHours();
export const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
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

function payState(total: number, advance: number, paid: number): { label: string; tone: Tone } {
  const due = total - paid;
  if (paid >= total) return { label: 'Fully paid', tone: 'lime' };
  if (paid > 0 && paid >= advance) return { label: `Advance paid · ${inr(due)} to driver`, tone: 'lime' };
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
      pay: payState(r.fareTotal, r.advanceShown, paid.get(r.id) ?? 0),
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

export type Balance = { id: string; ref: string; name: string; what: string; amt: number; waLink: string | null };

/** Confirmed trips from the last 30 days and the next 14 that still have money due. */
export async function balancesToCollect(now = Date.now()): Promise<{ items: Balance[]; total: number }> {
  const b = schema.bookings;
  const today = todayIST(now);
  const rows = await getDb()
    .select()
    .from(b)
    .where(and(inArray(b.status, LIVE), gte(b.pickupDate, addDays(today, -30)), lte(b.pickupDate, addDays(today, 14))))
    .orderBy(asc(b.pickupDate), asc(b.pickupTime))
    .limit(300);
  const paid = await paidFor(rows.map((r) => r.id));
  const due = rows
    .map((r) => ({ r, amt: r.fareTotal - (paid.get(r.id) ?? 0) }))
    .filter((x) => x.amt > 0);
  const items = due.slice(0, 4).map(({ r, amt }) => ({
    id: r.id,
    ref: r.ref,
    name: r.customerName ?? 'Name removed',
    what: `${shortRoute(r.tripName)} · ${dayLabel(r.pickupDate, today)}`,
    amt,
    waLink: r.customerPhone
      ? waText(
          r.customerPhone,
          `Namaste ${(r.customerName ?? '').split(' ')[0]}, a quick note about your trip ${r.ref} (${routeOf(r.tripName)}, ${dayLabel(r.pickupDate, today)}): the amount still to pay is ${inr(amt)}. `,
        )
      : null,
  }));
  return { items, total: due.reduce((s, x) => s + x.amt, 0) };
}

/* ---------------- Wins this week ---------------- */

export async function weekWins(now = Date.now()) {
  const today = todayIST(now);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((dow + 6) % 7));
  const b = schema.bookings;
  const db = getDb();
  const [rows, [money]] = await Promise.all([
    db.select({ createdAt: b.createdAt, status: b.status }).from(b).where(gte(b.createdAt, istMidnight(weekStart))),
    db
      .select({ sum: sql<string>`coalesce(sum(${schema.payments.amount}), 0)` })
      .from(schema.payments)
      .where(gte(schema.payments.receivedOn, weekStart)),
  ]);
  const real = rows.filter((r) => !DEAD.includes(r.status));
  const byDay = new Map<string, number>();
  for (const r of real) {
    const d = todayIST(r.createdAt.getTime());
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const [bestDay, bestCount] = [...byDay].sort((a, z) => z[1] - a[1])[0] ?? ['', 0];
  let line: string;
  if (bestCount >= 2) line = `${weekday.format(new Date(`${bestDay}T00:00:00Z`))} was the best day so far, with ${bestCount} bookings. Keep it going.`;
  else if (real.length) line = 'Every booking counts. Keep them coming.';
  else line = 'A fresh week. The first booking is the best one.';
  return {
    received: real.length,
    confirmed: rows.filter((r) => LIVE.includes(r.status)).length,
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
  const [[setting], [done]] = await Promise.all([
    db.select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, GOAL_KEY)),
    db
      .select({ trips: count(), value: sql<string>`coalesce(sum(${b.fareTotal}), 0)` })
      .from(b)
      .where(and(inArray(b.status, LIVE), gte(b.pickupDate, monthStart), lt(b.pickupDate, nextStart))),
  ]);
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
  return { goal, trips, value, pct, line, monthName, daysLeft };
}

/* ---------------- Most booked routes this month ---------------- */

export async function topRoutes(now = Date.now()) {
  const monthStart = `${todayIST(now).slice(0, 8)}01`;
  const b = schema.bookings;
  const rows = await getDb()
    .select({ tripName: b.tripName })
    .from(b)
    .where(and(gte(b.createdAt, istMidnight(monthStart)), notInArray(b.status, DEAD)));
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(shortRoute(r.tripName), (counts.get(shortRoute(r.tripName)) ?? 0) + 1);
  const top = [...counts].sort((a, z) => z[1] - a[1]).slice(0, 5);
  const max = top[0]?.[1] ?? 1;
  return top.map(([name, n]) => ({ name, count: n, pct: Math.max(6, Math.round((n / max) * 100)) }));
}

/* ---------------- Latest changes ---------------- */

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
    let text = `${r.ref} updated`;
    let tone: Tone = 'grey';
    if (r.type === 'created') {
      text = r.actor ? `${r.ref} added by hand` : `New booking ${r.ref} from the website`;
      tone = 'lime';
    } else if (r.type === 'status') {
      const to = (r.data?.to as BookingStatus | undefined) ?? 'new';
      text = `${r.ref} moved to ${STATUS_LABEL[to]?.[0].toLowerCase() ?? to}`;
      tone = STATUS_LABEL[to]?.[1] ?? 'grey';
    }
    return { text, tone, who: r.actor ?? 'Website', when: fromNow(r.at, now) };
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
