/**
 * When each of the office's cars and drivers is busy: the calendar
 * (/admin/calendar/), the booking form's check (/api/availability/) and the
 * warnings on a booking's page.
 *
 * A booking keeps its car and driver busy from pickup until they are back
 * (busyWindow): a transfer for the drive there and back plus an hour, a tour
 * package to the end of its last day, a trip whose route is not on our list
 * for 12 hours. The office can set its own end on any booking
 * (bookings.busy_until).
 *
 * Only confirmed bookings hold a car (HOLDS). New requests show on the
 * calendar but leave the website open, so a request nobody has answered
 * never turns a real customer away.
 *
 * The office's own cars are its active drivers who are not partners and have
 * a usual car set (ownCar). A booking with one of them holds that driver,
 * whatever car it was booked as; a confirmed booking with no driver yet holds
 * one car of its type. A booking given to a partner, an outside car the
 * office brings in when its own are busy (owner, 25 Oct 2026), holds none of
 * the office's cars. A car type with no own cars listed is not tracked, so
 * the website never shows it as full.
 */
import { and, desc, eq, gt, gte, lt, lte, notInArray, or } from 'drizzle-orm';
import { packageBySlug } from '../data/packages';
import { routeBySlug } from '../data/routes';
import { VEHICLES, type VehicleKey } from '../data/vehicles';
import { audit } from './admin';
import { addDays, isDay, todayIST } from './dashboard';
import { getDb, schema } from './db';
import type { BookingStatus } from './db/schema';

type Driver = typeof schema.drivers.$inferSelect;
type TimeOff = typeof schema.driverTimeOff.$inferSelect;
type Ctx = { actorId: string; ipHash: string };

/** Bookings that hold a car and driver. */
export const HOLDS: readonly BookingStatus[] = ['confirmed', 'driver_assigned'];
/** Requests not answered yet: on the calendar, dashed, but holding nothing. */
export const PENDING: readonly BookingStatus[] = ['new', 'contacted'];
const BACK_GAP_MIN = 60;
const NO_ROUTE_HOURS = 12;
/** How many days before a span a booking may start and still reach into it: the longest tour, with room to spare. Bookings with an end the office set are found by that end. */
const LOOKBACK_DAYS = 16;

/* ---------------- Times ---------------- */

/** The instant of an Indian date and 24-hour time. */
export const istAt = (day: string, time: string) => new Date(`${day}T${time}:00+05:30`);
/** The Indian date an instant falls on. */
export const istDay = (at: Date) => new Date(at.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
/** The 24-hour Indian time of an instant, "21:15". */
export const istTime = (at: Date) => new Date(at.getTime() + 5.5 * 3600e3).toISOString().slice(11, 16);

/** Minutes in an ISO 8601 drive time such as "PT4H45M", or null. */
export function isoMinutes(iso: string): number | null {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
/** "Sun 25 Oct, 21:15", or "end of Mon 26 Oct" for midnight. */
export function whenLabel(at: Date): string {
  if (istTime(at) === '00:00') return `end of ${dayFmt.format(new Date(at.getTime() - 60e3))}`;
  return `${dayFmt.format(at)}, ${istTime(at)}`;
}
/** "Sun 25 Oct, 10:00 to 21:15", or both days in full when it runs past midnight. */
export function spanLabel(start: Date, end: Date): string {
  const sameDay = istDay(start) === istDay(new Date(end.getTime() - 60e3));
  if (sameDay && istTime(end) !== '00:00') return `${whenLabel(start)} to ${istTime(end)}`;
  return `${whenLabel(start)} to ${whenLabel(end)}`;
}

/* ---------------- One booking ---------------- */

type Trip = {
  kind: 'taxi' | 'package';
  routeSlug: string | null;
  packageSlug: string | null;
  tripName: string;
  pickupDate: string;
  pickupTime: string;
  busyUntil: Date | null;
};
export type Window = { start: Date; end: Date; /** The office set the end itself. */ set: boolean; /** How the end was worked out, for people. */ why: string };

/** When a trip would leave its car free again if the office sets nothing. */
export function autoEnd(t: Omit<Trip, 'busyUntil'>): { end: Date; why: string } {
  const start = istAt(t.pickupDate, t.pickupTime);
  if (t.kind === 'package') {
    // A package taken off the website still says how long it was in its name: "(3N/4D)".
    const days = (t.packageSlug && packageBySlug(t.packageSlug)?.days) || Number(/\d+N\/(\d+)D/.exec(t.tripName)?.[1] ?? 0);
    if (days > 0) return { end: istAt(addDays(t.pickupDate, days), '00:00'), why: `the whole ${days}-day tour` };
  }
  const route = t.routeSlug ? routeBySlug(t.routeSlug) : undefined;
  const mins = route ? isoMinutes(route.durationIso) : null;
  if (mins) return { end: new Date(start.getTime() + (2 * mins + BACK_GAP_MIN) * 60e3), why: 'the drive there and back, plus an hour' };
  return { end: new Date(start.getTime() + NO_ROUTE_HOURS * 3600e3), why: `${NO_ROUTE_HOURS} hours, as the route is not on the fare list` };
}

export function busyWindow(t: Trip): Window {
  const start = istAt(t.pickupDate, t.pickupTime);
  if (t.busyUntil && t.busyUntil > start) return { start, end: t.busyUntil, set: true, why: 'set by the office' };
  return { start, set: false, ...autoEnd(t) };
}

/* ---------------- A stretch of time ---------------- */

const cols = {
  id: schema.bookings.id,
  ref: schema.bookings.ref,
  kind: schema.bookings.kind,
  routeSlug: schema.bookings.routeSlug,
  packageSlug: schema.bookings.packageSlug,
  tripName: schema.bookings.tripName,
  vehicle: schema.bookings.vehicle,
  pickupDate: schema.bookings.pickupDate,
  pickupTime: schema.bookings.pickupTime,
  busyUntil: schema.bookings.busyUntil,
  status: schema.bookings.status,
  driverId: schema.bookings.driverId,
  driverName: schema.bookings.driverName,
  vehicleNumber: schema.bookings.vehicleNumber,
  customerName: schema.bookings.customerName,
  pax: schema.bookings.pax,
};

/** Bookings (not cancelled) that may reach into [from, to): the window is checked after, in busyWindow. */
function bookingsNear(from: Date, to: Date) {
  const b = schema.bookings;
  return getDb()
    .select(cols)
    .from(b)
    .where(
      and(
        notInArray(b.status, ['cancelled', 'no_show']),
        lte(b.pickupDate, istDay(to)),
        or(gte(b.pickupDate, addDays(istDay(from), -LOOKBACK_DAYS)), gt(b.busyUntil, from)),
      ),
    );
}

export type SpanBooking = Awaited<ReturnType<typeof bookingsNear>>[number] & Window;
export type Span = { from: Date; to: Date; drivers: Driver[]; bookings: SpanBooking[]; off: TimeOff[] };

/** Every booking (not cancelled) and every time off that reaches into [from, to), with all the drivers. */
export async function loadSpan(from: Date, to: Date): Promise<Span> {
  const db = getDb();
  const t = schema.driverTimeOff;
  const [rows, off, drivers] = await Promise.all([
    bookingsNear(from, to),
    db.select().from(t).where(and(lt(t.startsAt, to), gt(t.endsAt, from))),
    db.select().from(schema.drivers),
  ]);
  const bookings = rows
    .map((r) => ({ ...r, ...busyWindow(r) }))
    .filter((r) => r.start < to && r.end > from)
    .sort((x, y) => x.start.getTime() - y.start.getTime());
  return { from, to, drivers, bookings, off };
}

/** One of the office's own cars: counted on the calendar and in the booking form's check. */
export const ownCar = (d: Pick<Driver, 'active' | 'partner' | 'vehicle'>) => d.active && !d.partner && Boolean(d.vehicle);
/** A booking with nobody to drive it yet. A name typed without a driver from the list is an outside car. */
const unassigned = (x: Pick<SpanBooking, 'driverId' | 'driverName'>) => !x.driverId && !x.driverName;

/** What keeps each driver busy at some point in [start, end): the bookings they hold, and their time off. */
export function driversBusy(span: Span, start: Date, end: Date, except?: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (id: string, what: string) => out.set(id, [...(out.get(id) ?? []), what]);
  for (const x of span.bookings) {
    if (x.id !== except && x.driverId && HOLDS.includes(x.status) && x.start < end && x.end > start) add(x.driverId, `${x.ref}, ${spanLabel(x.start, x.end)}`);
  }
  for (const o of span.off) if (o.startsAt < end && o.endsAt > start) add(o.driverId, `${OFF_REASON[o.reason]}, ${spanLabel(o.startsAt, o.endsAt)}`);
  return out;
}

export type CarCount = { own: number; free: number; /** The office has at least one own car of this type listed. */ tracked: boolean };

/** For each car type: the office's own cars, and how many are free for the whole of [start, end). */
export function carsFree(span: Span, start: Date, end: Date, except?: string): Record<VehicleKey, CarCount> {
  const busy = driversBusy(span, start, end, except);
  const waiting = new Map<string, number>();
  for (const x of span.bookings) {
    if (x.id !== except && unassigned(x) && HOLDS.includes(x.status) && x.start < end && x.end > start) waiting.set(x.vehicle, (waiting.get(x.vehicle) ?? 0) + 1);
  }
  const out = {} as Record<VehicleKey, CarCount>;
  for (const v of VEHICLES) {
    const own = span.drivers.filter((d) => ownCar(d) && d.vehicle === v.key);
    const free = own.filter((d) => !busy.has(d.id)).length - (waiting.get(v.key) ?? 0);
    out[v.key] = { own: own.length, free: Math.max(0, free), tracked: own.length > 0 };
  }
  return out;
}

/* ---------------- The booking form's check ---------------- */

export const SITE_CHECK_KEY = 'calendar_site_check';

/** Whether the booking form greys out full car types. On unless the admin switched it off. */
export async function siteCheckOn(): Promise<boolean> {
  const [row] = await getDb().select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, SITE_CHECK_KEY));
  return (row?.value as { on?: boolean } | undefined)?.on !== false;
}

export async function setSiteCheck(on: boolean, ctx: Ctx): Promise<void> {
  await getDb()
    .insert(schema.settings)
    .values({ key: SITE_CHECK_KEY, value: { on }, updatedBy: ctx.actorId })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: { on }, updatedBy: ctx.actorId } });
  await audit({ actorId: ctx.actorId, action: 'calendar_site_check', detail: { on }, ipHash: ctx.ipHash });
}

export type Ask = { kind: 'taxi'; routeSlug: string; date: string; time: string } | { kind: 'package'; packageSlug: string; date: string; time: string };

/** The car types every one of the office's own cars is busy for, for the whole of this trip. */
export async function fullCarTypes(ask: Ask): Promise<VehicleKey[]> {
  if (!(await siteCheckOn())) return [];
  const w = busyWindow({
    kind: ask.kind,
    routeSlug: ask.kind === 'taxi' ? ask.routeSlug : null,
    packageSlug: ask.kind === 'package' ? ask.packageSlug : null,
    tripName: '',
    pickupDate: ask.date,
    pickupTime: ask.time,
    busyUntil: null,
  });
  const cars = carsFree(await loadSpan(w.start, w.end), w.start, w.end);
  return VEHICLES.filter((v) => cars[v.key].tracked && cars[v.key].free < 1).map((v) => v.key);
}

/* ---------------- Time off ---------------- */

export const OFF_REASON: Record<TimeOff['reason'], string> = { leave: 'On leave', servicing: 'Car at the garage', other: 'Not available' };

export type TimeOffForm = { driverId: string; fromDate: string; fromTime: string; toDate: string; toTime: string; reason: string; note: string };

/** Checks the time-off form. Returns an error for the person, or the row to save. */
export function checkTimeOff(f: TimeOffForm, drivers: Driver[]): { error: string } | { row: typeof schema.driverTimeOff.$inferInsert } {
  const driver = drivers.find((d) => d.id === f.driverId && d.active);
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const today = todayIST();
  if (!driver) return { error: 'Choose the driver.' };
  if (!isDay(f.fromDate) || !isDay(f.toDate) || f.fromDate < addDays(today, -60) || f.toDate > addDays(today, 400)) return { error: 'Check the dates.' };
  const startsAt = istAt(f.fromDate, time.test(f.fromTime) ? f.fromTime : '00:00');
  // No time on the last day means the whole of it.
  const endsAt = time.test(f.toTime) ? istAt(f.toDate, f.toTime) : istAt(addDays(f.toDate, 1), '00:00');
  if (endsAt <= startsAt) return { error: 'The end must come after the start.' };
  if (endsAt.getTime() - startsAt.getTime() > 92 * 86400e3) return { error: 'Time off is limited to three months at a time.' };
  if (!(f.reason in OFF_REASON)) return { error: 'Choose why.' };
  if (f.note.length > 200) return { error: 'The note is limited to 200 characters.' };
  return { row: { driverId: driver.id, startsAt, endsAt, reason: f.reason as TimeOff['reason'], note: f.note.trim() || null } };
}

export async function addTimeOff(row: typeof schema.driverTimeOff.$inferInsert, ctx: Ctx): Promise<void> {
  const [t] = await getDb().insert(schema.driverTimeOff).values({ ...row, createdBy: ctx.actorId }).returning({ id: schema.driverTimeOff.id });
  await audit({ actorId: ctx.actorId, action: 'time_off_added', entity: 'driver', entityId: row.driverId, detail: { id: t?.id, reason: row.reason }, ipHash: ctx.ipHash });
}

export async function removeTimeOff(id: string, ctx: Ctx): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const [t] = await getDb().delete(schema.driverTimeOff).where(eq(schema.driverTimeOff.id, id)).returning({ driverId: schema.driverTimeOff.driverId });
  if (t) await audit({ actorId: ctx.actorId, action: 'time_off_removed', entity: 'driver', entityId: t.driverId, detail: { id }, ipHash: ctx.ipHash });
  return Boolean(t);
}

/** A driver's time off still to come (or going on now), for their page. */
export async function upcomingTimeOff(driverId: string, now = new Date()): Promise<TimeOff[]> {
  const t = schema.driverTimeOff;
  const rows = await getDb().select().from(t).where(and(eq(t.driverId, driverId), gt(t.endsAt, now))).orderBy(desc(t.startsAt)).limit(20);
  return rows.reverse();
}
