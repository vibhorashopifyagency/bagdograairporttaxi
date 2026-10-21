/**
 * The drivers list, what each trip earns its driver, and each driver's
 * running account: completed trips earned, payouts recorded, balance owed.
 *
 * The office pays its drivers (a share of the agreed fare or a fixed amount
 * per trip). Drivers never collect money from customers.
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { audit } from './admin';
import { normalizePhone } from './bookings';
import { addDays, inr, isDay, todayIST } from './dashboard';
import { getDb, schema } from './db';
import { phoneLabel } from '../lib/itinerary-text';
import { vehicleByKey } from '../data/vehicles';

export type Driver = typeof schema.drivers.$inferSelect;
type Ctx = { actorId: string; ipHash: string };

/* ---------------- Pay ---------------- */

/** "25% of the fare", "₹800 a trip", or "Pay not set". */
export function payLabel(d: Pick<Driver, 'payType' | 'payValue'>): string {
  if (d.payValue === null || d.payValue === undefined) return 'Pay not set';
  return d.payType === 'percent' ? `${d.payValue}% of the fare` : `${inr(d.payValue)} a trip`;
}

/** What a trip with this agreed fare earns the driver, or null when their pay is not set. */
export function payFor(d: Pick<Driver, 'payType' | 'payValue'> | null | undefined, fare: number): number | null {
  if (!d || d.payValue === null || d.payValue === undefined) return null;
  return d.payType === 'percent' ? Math.round((fare * d.payValue) / 100) : d.payValue;
}

/** For the browser: the list the pickers show, with what fills in when one is picked. */
export function pickerList(list: Driver[]) {
  return list.map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone ? phoneLabel(d.phone) : '',
    car: d.vehicleNumber ?? '',
    payType: d.payType,
    payValue: d.payValue,
    label: [d.name, d.vehicleNumber, payLabel(d)].filter(Boolean).join(' · '),
  }));
}

export async function listDrivers(opts: { activeOnly?: boolean } = {}): Promise<Driver[]> {
  const t = schema.drivers;
  return getDb()
    .select()
    .from(t)
    .where(opts.activeOnly ? eq(t.active, true) : undefined)
    .orderBy(desc(t.active), asc(t.name));
}

export async function getDriver(id: string): Promise<Driver | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [d] = await getDb().select().from(schema.drivers).where(eq(schema.drivers.id, id));
  return d ?? null;
}

/* ---------------- Adding, changing, removing ---------------- */

export type DriverForm = { name: string; phone: string; vehicleNumber: string; vehicle: string; payType: string; payValue: string; notes: string };

/**
 * Checks a driver form. Pay is only taken from the admin; for staff it is
 * left as it was. Returns an error for the person, or the row to save.
 */
export function checkDriver(f: DriverForm, canSetPay: boolean): { error: string } | { row: Partial<Driver> & { name: string } } {
  const name = f.name.trim();
  if (!name || name.length > 60) return { error: 'Enter the driver’s name, up to 60 characters.' };
  const phone = f.phone.trim() ? normalizePhone(f.phone) : '';
  if (phone === null) return { error: 'Check the phone number. Ten digits, or with the country code.' };
  const vehicleNumber = f.vehicleNumber.trim().toUpperCase().replace(/\s+/g, ' ');
  if (vehicleNumber.length > 20) return { error: 'The car number is too long.' };
  if (f.vehicle && !vehicleByKey(f.vehicle)) return { error: 'Choose the kind of car.' };
  if (f.notes.length > 500) return { error: 'Notes are limited to 500 characters.' };
  const row: Partial<Driver> & { name: string } = { name, phone: phone || null, vehicleNumber: vehicleNumber || null, vehicle: f.vehicle || null, notes: f.notes.trim() || null };
  if (canSetPay) {
    if (f.payType !== 'percent' && f.payType !== 'fixed') return { error: 'Choose how the driver is paid.' };
    const raw = f.payValue.replace(/[^\d]/g, '');
    const value = raw ? Number(raw) : null;
    if (value !== null && f.payType === 'percent' && value > 100) return { error: 'A share of the fare is 0 to 100%.' };
    if (value !== null && f.payType === 'fixed' && value > 100_000) return { error: 'Check the amount a trip.' };
    row.payType = f.payType;
    row.payValue = value;
  }
  return { row };
}

export async function addDriver(row: Partial<Driver> & { name: string }, ctx: Ctx): Promise<Driver> {
  const [d] = await getDb().insert(schema.drivers).values(row).returning();
  await audit({ actorId: ctx.actorId, action: 'driver_added', entity: 'driver', entityId: d!.id, detail: { name: d!.name }, ipHash: ctx.ipHash });
  return d!;
}

export async function updateDriver(id: string, row: Partial<Driver>, ctx: Ctx): Promise<void> {
  await getDb().update(schema.drivers).set(row).where(eq(schema.drivers.id, id));
  await audit({ actorId: ctx.actorId, action: 'driver_changed', entity: 'driver', entityId: id, detail: { fields: Object.keys(row) }, ipHash: ctx.ipHash });
}

/**
 * Deletes a driver who has never been on a booking or paid; otherwise
 * switches them off, so they leave the pickers but their trips and payouts
 * stay on the accounts.
 */
export async function removeDriver(id: string, ctx: Ctx): Promise<'deleted' | 'switched_off'> {
  const db = getDb();
  const [[used], [paid]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings).where(eq(schema.bookings.driverId, id)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.driverPayouts).where(eq(schema.driverPayouts.driverId, id)),
  ]);
  const result = (used?.n ?? 0) + (paid?.n ?? 0) > 0 ? 'switched_off' : 'deleted';
  if (result === 'deleted') await db.delete(schema.drivers).where(eq(schema.drivers.id, id));
  else await db.update(schema.drivers).set({ active: false }).where(eq(schema.drivers.id, id));
  await audit({ actorId: ctx.actorId, action: `driver_${result}`, entity: 'driver', entityId: id, ipHash: ctx.ipHash });
  return result;
}

export async function restoreDriver(id: string, ctx: Ctx): Promise<void> {
  await getDb().update(schema.drivers).set({ active: true }).where(eq(schema.drivers.id, id));
  await audit({ actorId: ctx.actorId, action: 'driver_restored', entity: 'driver', entityId: id, ipHash: ctx.ipHash });
}

/* ---------------- Assigning to a booking ---------------- */

type BookingForAssign = Pick<typeof schema.bookings.$inferSelect, 'id' | 'status' | 'fareTotal' | 'driverId' | 'driverName' | 'driverPhone' | 'vehicleNumber' | 'driverPay'>;

/**
 * The booking columns for giving it this driver (or none). The name, phone
 * and car number are copied from the driver; `pay` and `vehicleNumber`
 * override what would be worked out. A confirmed booking that gets a driver
 * moves to "driver assigned", and back to "confirmed" when the driver is
 * taken off.
 */
export function driverColumns(b: BookingForAssign, d: Driver | null, override: { pay?: number | null; vehicleNumber?: string | null } = {}) {
  const cols = d
    ? {
        driverId: d.id,
        driverName: d.name,
        driverPhone: d.phone,
        vehicleNumber: override.vehicleNumber !== undefined ? override.vehicleNumber : d.vehicleNumber,
        driverPay: override.pay !== undefined ? override.pay : payFor(d, b.fareTotal),
      }
    : { driverId: null, driverName: null, driverPhone: null, vehicleNumber: override.vehicleNumber !== undefined ? override.vehicleNumber : b.vehicleNumber, driverPay: null };
  const status = d && b.status === 'confirmed' ? ('driver_assigned' as const) : !d && b.status === 'driver_assigned' ? ('confirmed' as const) : null;
  return { cols, status };
}

/** Assigns a driver (or none) to a booking, on its timeline. Used by the itinerary popup. */
export async function assignDriver(b: BookingForAssign, driverId: string | null, ctx: Ctx): Promise<void> {
  if ((b.driverId ?? null) === (driverId || null)) return;
  const d = driverId ? await getDriver(driverId) : null;
  if (driverId && !d) return;
  const { cols, status } = driverColumns(b, d);
  const changes: Record<string, [unknown, unknown]> = {};
  for (const [k, v] of Object.entries(cols)) {
    const was = (b as Record<string, unknown>)[k] ?? null;
    if (was !== v && k !== 'driverId') changes[k] = [was, v];
  }
  await getDb().transaction(async (tx) => {
    await tx.update(schema.bookings).set({ ...cols, ...(status ? { status } : {}) }).where(eq(schema.bookings.id, b.id));
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, actorId: ctx.actorId, type: 'edited', data: { changes, via: 'itinerary' } });
    if (status) await tx.insert(schema.bookingEvents).values({ bookingId: b.id, actorId: ctx.actorId, type: 'status', data: { from: b.status, to: status } });
  });
  await audit({ actorId: ctx.actorId, action: 'driver_assigned', entity: 'booking', entityId: b.id, detail: { driverId }, ipHash: ctx.ipHash });
}

/* ---------------- Accounts ---------------- */

export type Account = {
  /** Completed trips and what they earned. */
  trips: number;
  earned: number;
  /** Completed trips whose pay is not set yet (counted as ₹0 until it is). */
  unpriced: number;
  paid: number;
  /** Owed to the driver right now. Negative means they were paid ahead. */
  balance: number;
  /** Trips assigned and not completed yet, and what they will earn. */
  upcoming: number;
  upcomingPay: number;
  monthTrips: number;
  monthEarned: number;
};

const blank = (): Account => ({ trips: 0, earned: 0, unpriced: 0, paid: 0, balance: 0, upcoming: 0, upcomingPay: 0, monthTrips: 0, monthEarned: 0 });

export async function accounts(ids?: string[]): Promise<Map<string, Account>> {
  const b = schema.bookings;
  const p = schema.driverPayouts;
  const db = getDb();
  const monthStart = `${todayIST().slice(0, 8)}01`;
  const [trips, payouts] = await Promise.all([
    db
      .select({ driverId: b.driverId, status: b.status, pay: b.driverPay, day: b.pickupDate })
      .from(b)
      .where(and(ids ? inArray(b.driverId, ids.length ? ids : ['00000000-0000-0000-0000-000000000000']) : sql`${b.driverId} is not null`, inArray(b.status, ['confirmed', 'driver_assigned', 'completed']))),
    db
      .select({ driverId: p.driverId, sum: sql<string>`coalesce(sum(${p.amount}), 0)` })
      .from(p)
      .where(ids ? inArray(p.driverId, ids.length ? ids : ['00000000-0000-0000-0000-000000000000']) : undefined)
      .groupBy(p.driverId),
  ]);
  const map = new Map<string, Account>();
  const get = (id: string) => map.get(id) ?? (map.set(id, blank()), map.get(id)!);
  for (const t of trips) {
    const a = get(t.driverId!);
    if (t.status === 'completed') {
      a.trips++;
      a.earned += t.pay ?? 0;
      if (t.pay === null) a.unpriced++;
      if (t.day >= monthStart) {
        a.monthTrips++;
        a.monthEarned += t.pay ?? 0;
      }
    } else {
      a.upcoming++;
      a.upcomingPay += t.pay ?? 0;
    }
  }
  for (const r of payouts) get(r.driverId).paid = Number(r.sum);
  for (const a of map.values()) a.balance = a.earned - a.paid;
  return map;
}

export const accountOf = async (id: string) => (await accounts([id])).get(id) ?? blank();

/** The statement: earnings and payouts in date order with the running balance, newest first. */
export async function statement(driverId: string) {
  const b = schema.bookings;
  const p = schema.driverPayouts;
  const db = getDb();
  const [trips, payouts] = await Promise.all([
    db
      .select({ ref: b.ref, trip: b.tripName, day: b.pickupDate, pay: b.driverPay, fare: b.fareTotal })
      .from(b)
      .where(and(eq(b.driverId, driverId), eq(b.status, 'completed'))),
    db
      .select({ row: p, by: schema.user.name })
      .from(p)
      .leftJoin(schema.user, eq(p.createdBy, schema.user.id))
      .where(eq(p.driverId, driverId)),
  ]);
  const reversed = new Set(payouts.filter((x) => x.row.kind === 'reversal').map((x) => x.row.reversesPayoutId));
  type Line = { day: string; at: number; kind: 'trip' | 'payout' | 'reversal'; text: string; sub: string; amount: number; ref?: string; id?: string; reversed?: boolean; balance?: number };
  const lines: Line[] = [
    ...trips.map((t) => ({ day: t.day, at: 0, kind: 'trip' as const, text: t.trip.split(' · ')[0]!.replace(' (IXB)', ''), sub: t.pay === null ? `${t.ref} · pay not set` : `${t.ref} · fare ${inr(t.fare)}`, amount: t.pay ?? 0, ref: t.ref })),
    ...payouts.map((x) => ({
      day: x.row.paidOn,
      at: x.row.createdAt.getTime(),
      kind: x.row.kind,
      text: x.row.kind === 'reversal' ? `Payout reversed: ${x.row.note ?? ''}` : `Paid by ${x.row.method === 'bank' ? 'bank transfer' : x.row.method === 'upi' ? 'UPI' : 'cash'}`,
      sub: [x.row.reference && `ref ${x.row.reference}`, x.row.kind === 'payout' && x.row.note, x.by && `recorded by ${x.by}`].filter(Boolean).join(' · '),
      amount: -x.row.amount,
      id: x.row.id,
      reversed: reversed.has(x.row.id),
    })),
  ].sort((a, z) => a.day.localeCompare(z.day) || a.at - z.at);
  let running = 0;
  for (const l of lines) l.balance = running += l.amount;
  return lines.reverse();
}

/** Trips assigned to the driver and not completed yet, soonest first. */
export async function upcomingTrips(driverId: string) {
  const b = schema.bookings;
  return getDb()
    .select({ ref: b.ref, trip: b.tripName, day: b.pickupDate, time: b.pickupTime, pay: b.driverPay, status: b.status, name: b.customerName })
    .from(b)
    .where(and(eq(b.driverId, driverId), inArray(b.status, ['confirmed', 'driver_assigned'])))
    .orderBy(asc(b.pickupDate), asc(b.pickupTime))
    .limit(50);
}

/* ---------------- Payouts ---------------- */

export type PayoutForm = { amount: string; method: string; paidOn: string; reference: string; note: string };

export async function recordPayout(driverId: string, f: PayoutForm, ctx: Ctx): Promise<string | null> {
  const amount = Number(f.amount.replace(/[^\d]/g, ''));
  const today = todayIST();
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) return 'Enter the amount in rupees.';
  if (!['upi', 'cash', 'bank'].includes(f.method)) return 'Choose how it was paid.';
  if (!isDay(f.paidOn) || f.paidOn > addDays(today, 1) || f.paidOn < addDays(today, -400)) return 'Check the date.';
  if (f.reference.length > 60 || f.note.length > 300) return 'One of the fields is too long.';
  const [row] = await getDb()
    .insert(schema.driverPayouts)
    .values({ driverId, kind: 'payout', amount, method: f.method as 'upi' | 'cash' | 'bank', paidOn: f.paidOn, reference: f.reference.trim() || null, note: f.note.trim() || null, createdBy: ctx.actorId })
    .returning({ id: schema.driverPayouts.id });
  await audit({ actorId: ctx.actorId, action: 'driver_payout', entity: 'driver', entityId: driverId, detail: { amount, method: f.method, payoutId: row!.id }, ipHash: ctx.ipHash });
  return null;
}

/** Admin only. Undoes a payout entered by mistake; both rows stay. */
export async function reversePayout(driverId: string, payoutId: string, reason: string, ctx: Ctx): Promise<string | null> {
  if (!reason.trim() || reason.length > 300) return 'Say why, in a few words. It stays on the record.';
  const db = getDb();
  const rows = await db.select().from(schema.driverPayouts).where(eq(schema.driverPayouts.driverId, driverId));
  const target = rows.find((r) => r.id === payoutId);
  if (!target || target.kind !== 'payout') return 'That payout cannot be reversed.';
  if (rows.some((r) => r.reversesPayoutId === payoutId)) return 'That payout is already reversed.';
  await db.insert(schema.driverPayouts).values({ driverId, kind: 'reversal', amount: -target.amount, method: target.method, paidOn: todayIST(), note: reason.trim(), reversesPayoutId: payoutId, createdBy: ctx.actorId });
  await audit({ actorId: ctx.actorId, action: 'driver_payout_reversed', entity: 'driver', entityId: driverId, detail: { payoutId }, ipHash: ctx.ipHash });
  return null;
}
