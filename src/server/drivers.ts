/**
 * The drivers list, what each trip earns its driver, and each driver's
 * running account.
 *
 * The office pays its drivers (a share of the agreed fare or a fixed amount
 * per trip). The office takes each booking's advance; after the trip the
 * driver collects the balance from the guest and hands it to the office
 * (owner, 21 Oct 2026). So each driver has two running figures: the cash
 * they hold for the office (collected less handed over) and the pay owed to
 * them (earned less paid out). They are kept apart because the driver hands
 * over everything and is paid separately; the net of the two is the
 * statement's running balance, for settling both at once.
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { audit } from './admin';
import { normalizePhone } from './bookings';
import { addDays, dueSql, inr, isDay, todayIST } from './dashboard';
import { getDb, schema } from './db';
import { PAGE_SIZE } from './paging';
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
    partner: d.partner,
    label: [d.name, d.vehicleNumber, d.partner && 'Outside car', payLabel(d)].filter(Boolean).join(' · '),
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

/** `partner` is '1' for an outside car (see schema.drivers.partner). */
export type DriverForm = { name: string; phone: string; vehicleNumber: string; vehicle: string; partner: string; payType: string; payValue: string; notes: string };

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
  const row: Partial<Driver> & { name: string } = { name, phone: phone || null, vehicleNumber: vehicleNumber || null, vehicle: f.vehicle || null, partner: f.partner === '1', notes: f.notes.trim() || null };
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
  // One row is enough to know; no need to count them all.
  const [used, paid] = await Promise.all([
    db.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.driverId, id)).limit(1),
    db.select({ id: schema.driverPayouts.id }).from(schema.driverPayouts).where(eq(schema.driverPayouts.driverId, id)).limit(1),
  ]);
  const [collected] = await db.select({ id: schema.payments.id }).from(schema.payments).where(eq(schema.payments.driverId, id)).limit(1);
  const result = used.length + paid.length > 0 || collected ? 'switched_off' : 'deleted';
  if (result === 'deleted') await db.delete(schema.drivers).where(eq(schema.drivers.id, id));
  else await db.update(schema.drivers).set({ active: false }).where(eq(schema.drivers.id, id));
  await audit({ actorId: ctx.actorId, action: `driver_${result}`, entity: 'driver', entityId: id, ipHash: ctx.ipHash });
  return result;
}

export async function restoreDriver(id: string, ctx: Ctx): Promise<void> {
  await getDb().update(schema.drivers).set({ active: true }).where(eq(schema.drivers.id, id));
  await audit({ actorId: ctx.actorId, action: 'driver_restored', entity: 'driver', entityId: id, ipHash: ctx.ipHash });
}

/**
 * The calendar's "Set up your cars": each driver's usual car and whether it
 * is an outside car, saved for all of them at once. Only changed drivers are
 * written. Returns how many changed.
 */
export async function setCars(rows: { id: string; vehicle: string; partner: boolean }[], ctx: Ctx): Promise<number> {
  const db = getDb();
  const t = schema.drivers;
  const ids = rows.map((r) => r.id).filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (!ids.length) return 0;
  const current = new Map((await db.select({ id: t.id, vehicle: t.vehicle, partner: t.partner }).from(t).where(inArray(t.id, ids))).map((d) => [d.id, d]));
  let changed = 0;
  for (const r of rows) {
    const was = current.get(r.id);
    const vehicle = vehicleByKey(r.vehicle) ? r.vehicle : null;
    if (!was || (was.vehicle === vehicle && was.partner === r.partner)) continue;
    await db.update(t).set({ vehicle, partner: r.partner }).where(eq(t.id, r.id));
    changed++;
  }
  if (changed) await audit({ actorId: ctx.actorId, action: 'drivers_cars_set', entity: 'drivers', detail: { changed }, ipHash: ctx.ipHash });
  return changed;
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
  /** Balances the driver collected from guests, after reversals. */
  collected: number;
  /** Paid to the driver, and handed over by the driver, leaving out reversed entries. */
  paid: number;
  handedOver: number;
  /** Cash from guests the driver still holds for the office: collected − handed over. */
  holds: number;
  /** Pay owed to the driver: earned − paid. Negative means they were paid ahead. */
  owed: number;
  /** owed − holds: positive, the office pays the difference; negative, the driver hands it over. */
  balance: number;
  /** Trips assigned and not completed yet, and what they will earn. */
  upcoming: number;
  upcomingPay: number;
  monthTrips: number;
  monthEarned: number;
};

const blank = (): Account => ({ trips: 0, earned: 0, unpriced: 0, collected: 0, paid: 0, handedOver: 0, holds: 0, owed: 0, balance: 0, upcoming: 0, upcomingPay: 0, monthTrips: 0, monthEarned: 0 });

/**
 * Every driver's account (or only those in `ids`), added up in the database:
 * one row per driver comes back, however many trips they have driven.
 */
export async function accounts(ids?: string[]): Promise<Map<string, Account>> {
  const b = schema.bookings;
  const p = schema.driverPayouts;
  const c = schema.payments;
  const db = getDb();
  const monthStart = `${todayIST().slice(0, 8)}01`;
  const none = ['00000000-0000-0000-0000-000000000000'];
  const done = sql`${b.status} = 'completed'`;
  const ahead = sql`${b.status} in ('confirmed', 'driver_assigned')`;
  const thisMonth = sql`${done} and ${b.pickupDate} >= ${monthStart}`;
  const int = (x: ReturnType<typeof sql>) => sql<number>`(${x})::int`;
  // Tables named in full: in this select list Drizzle would write a bare "id", which means r.id inside the subquery.
  const live = sql`not exists (select 1 from driver_payouts r where r.reverses_payout_id = driver_payouts.id)`;
  const [trips, payouts, collections] = await Promise.all([
    db
      .select({
        driverId: b.driverId,
        trips: int(sql`count(*) filter (where ${done})`),
        earned: int(sql`coalesce(sum(${b.driverPay}) filter (where ${done}), 0)`),
        unpriced: int(sql`count(*) filter (where ${done} and ${b.driverPay} is null)`),
        upcoming: int(sql`count(*) filter (where ${ahead})`),
        upcomingPay: int(sql`coalesce(sum(${b.driverPay}) filter (where ${ahead}), 0)`),
        monthTrips: int(sql`count(*) filter (where ${thisMonth})`),
        monthEarned: int(sql`coalesce(sum(${b.driverPay}) filter (where ${thisMonth}), 0)`),
      })
      .from(b)
      .where(and(ids ? inArray(b.driverId, ids.length ? ids : none) : sql`${b.driverId} is not null`, inArray(b.status, ['confirmed', 'driver_assigned', 'completed'])))
      .groupBy(b.driverId),
    db
      .select({
        driverId: p.driverId,
        paid: int(sql`coalesce(sum(${p.amount}) filter (where ${p.kind} = 'payout' and ${live}), 0)`),
        handedOver: int(sql`coalesce(-sum(${p.amount}) filter (where ${p.kind} = 'handover' and ${live}), 0)`),
      })
      .from(p)
      .where(ids ? inArray(p.driverId, ids.length ? ids : none) : undefined)
      .groupBy(p.driverId),
    // Reversal rows carry the driver too, so the plain sum is net of them.
    db
      .select({ driverId: c.driverId, collected: int(sql`coalesce(sum(${c.amount}), 0)`) })
      .from(c)
      .where(ids ? inArray(c.driverId, ids.length ? ids : none) : sql`${c.driverId} is not null`)
      .groupBy(c.driverId),
  ]);
  const map = new Map<string, Account>();
  const get = (id: string) => map.get(id) ?? (map.set(id, blank()), map.get(id)!);
  for (const { driverId, ...t } of trips) Object.assign(get(driverId!), t);
  for (const { driverId, ...t } of payouts) Object.assign(get(driverId), t);
  for (const r of collections) get(r.driverId!).collected = r.collected;
  for (const a of map.values()) {
    a.holds = a.collected - a.handedOver;
    a.owed = a.earned - a.paid;
    a.balance = a.owed - a.holds;
  }
  return map;
}

export const accountOf = async (id: string) => (await accounts([id])).get(id) ?? blank();

export type StatementLine = {
  day: string;
  /** 'collected' is a balance collected from a guest (or its reversal, with a positive amount). */
  kind: 'trip' | 'collected' | 'payout' | 'handover' | 'reversal';
  text: string;
  sub: string;
  amount: number;
  ref?: string;
  id?: string;
  reversed?: boolean;
  /** Owed to the driver after this line. */
  balance: number;
};

/**
 * The statement: earnings, balances collected from guests, payouts and
 * handovers with the running balance, newest first, one page at a time. The
 * database works out the balance over the whole history and sends back only
 * the page asked for. On the same day, trips come first, then what was
 * collected on them, then money between the office and the driver.
 */
export async function statement(driverId: string, page = 1, size = PAGE_SIZE): Promise<{ lines: StatementLine[]; total: number }> {
  const b = schema.bookings;
  const p = schema.driverPayouts;
  const c = schema.payments;
  const u = schema.user;
  type Row = {
    day: string; kind: StatementLine['kind']; id: string; ref: string | null; trip: string | null; fare: number | null; pay: number | null;
    method: string | null; reference: string | null; note: string | null; by: string | null; amount: number; reversed: boolean; undoes: string | null;
    balance: number; total: number;
  };
  const res = await getDb().execute<Row>(sql`
    with lines as (
      select ${b.pickupDate}::text as day, 0 as k, null::timestamptz as at, ${b.id}::text as id, 'trip'::text as kind,
             ${b.ref} as ref, ${b.tripName} as trip, ${b.fareTotal} as fare, ${b.driverPay} as pay,
             null::text as method, null::text as reference, null::text as note, null::text as by,
             coalesce(${b.driverPay}, 0) as amount, false as reversed, null::text as undoes
      from ${b}
      where ${b.driverId} = ${driverId} and ${b.status} = 'completed'
      union all
      select ${c.receivedOn}::text, 1, ${c.createdAt}, ${c.id}::text, 'collected',
             cb.ref, cb.trip_name, null, null, ${c.method}, ${c.upiRef}, ${c.note}, ${u.name},
             -${c.amount}, exists (select 1 from ${c} r where r.booking_id = ${c.bookingId} and r.reverses_payment_id = ${c.id}),
             case when ${c.kind} = 'reversal' then 'collected' end
      from ${c} join ${b} cb on cb.id = ${c.bookingId} left join ${u} on ${u.id} = ${c.createdBy}
      where ${c.driverId} = ${driverId}
      union all
      select ${p.paidOn}::text, 2, ${p.createdAt}, ${p.id}::text, ${p.kind},
             null, null, null, null, ${p.method}, ${p.reference}, ${p.note}, ${u.name},
             -${p.amount}, exists (select 1 from ${p} r where r.driver_id = ${p.driverId} and r.reverses_payout_id = ${p.id}),
             (select o.kind from ${p} o where o.id = ${p.reversesPayoutId})
      from ${p} left join ${u} on ${u.id} = ${p.createdBy}
      where ${p.driverId} = ${driverId}
    )
    select day, kind, id, ref, trip, fare, pay, method, reference, note, by, amount, reversed, undoes,
           (sum(amount) over (order by day, k, at, id rows unbounded preceding))::int as balance,
           (count(*) over ())::int as total
    from lines
    order by day desc, k desc, at desc, id desc
    limit ${size} offset ${(page - 1) * size}`);
  const how = (m: string | null) => (m === 'bank' ? 'by bank transfer' : m === 'upi' ? 'by UPI' : 'in cash');
  const route = (trip: string | null) => (trip ?? '').split(' · ')[0]!.replace(' (IXB)', '');
  const lines = res.rows.map((r): StatementLine => {
    if (r.kind === 'trip') {
      return { day: r.day, kind: 'trip', text: route(r.trip), sub: r.pay === null ? `${r.ref} · pay not set` : `${r.ref} · fare ${inr(r.fare ?? 0)}`, amount: r.amount, ref: r.ref!, balance: r.balance };
    }
    if (r.kind === 'collected') {
      return {
        day: r.day,
        kind: 'collected',
        text: r.undoes ? `Collection reversed: ${r.note ?? ''}` : `Collected from the guest ${how(r.method)}`,
        sub: [`${r.ref} · ${route(r.trip)}`, !r.undoes && r.note, r.by && `recorded by ${r.by}`].filter(Boolean).join(' · '),
        amount: r.amount,
        ref: r.ref!,
        reversed: r.reversed,
        balance: r.balance,
      };
    }
    const undone = r.undoes === 'handover' ? 'Handover' : 'Payout';
    return {
      day: r.day,
      kind: r.kind,
      text: r.kind === 'reversal' ? `${undone} reversed: ${r.note ?? ''}` : r.kind === 'handover' ? `Handed over to the office ${how(r.method)}` : `Paid ${how(r.method)}`,
      sub: [r.reference && `ref ${r.reference}`, r.kind !== 'reversal' && r.note, r.by && `recorded by ${r.by}`].filter(Boolean).join(' · '),
      amount: r.amount,
      id: r.id,
      reversed: r.reversed,
      balance: r.balance,
    };
  });
  return { lines, total: res.rows[0]?.total ?? 0 };
}

/** Trips assigned to the driver and not completed yet, soonest first, with what is left for the guest to pay. */
export async function upcomingTrips(driverId: string) {
  const b = schema.bookings;
  return getDb()
    .select({
      ref: b.ref, trip: b.tripName, kind: b.kind, day: b.pickupDate, time: b.pickupTime, pay: b.driverPay, status: b.status, name: b.customerName,
      fare: b.fareTotal,
      due: dueSql,
    })
    .from(b)
    .where(and(eq(b.driverId, driverId), inArray(b.status, ['confirmed', 'driver_assigned'])))
    .orderBy(asc(b.pickupDate), asc(b.pickupTime))
    .limit(50);
}

/* ---------------- Payouts and handovers ---------------- */

/** `kind` 'payout' is the office paying the driver; 'handover' is the driver giving the office what they collected. */
export type PayoutForm = { kind: string; amount: string; method: string; paidOn: string; reference: string; note: string };

export async function recordPayout(driverId: string, f: PayoutForm, ctx: Ctx): Promise<string | null> {
  const amount = Number(f.amount.replace(/[^\d]/g, ''));
  const today = todayIST();
  if (f.kind !== 'payout' && f.kind !== 'handover') return 'Say which way the money went.';
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) return 'Enter the amount in rupees.';
  if (!['upi', 'cash', 'bank'].includes(f.method)) return f.kind === 'handover' ? 'Choose how they handed it over.' : 'Choose how it was paid.';
  if (!isDay(f.paidOn) || f.paidOn > addDays(today, 1) || f.paidOn < addDays(today, -400)) return 'Check the date.';
  if (f.reference.length > 60 || f.note.length > 300) return 'One of the fields is too long.';
  const kind = f.kind as 'payout' | 'handover';
  const [row] = await getDb()
    .insert(schema.driverPayouts)
    .values({
      driverId,
      kind,
      // Money from the office to the driver is positive; a handover goes the other way.
      amount: kind === 'handover' ? -amount : amount,
      method: f.method as 'upi' | 'cash' | 'bank',
      paidOn: f.paidOn,
      reference: f.reference.trim() || null,
      note: f.note.trim() || null,
      createdBy: ctx.actorId,
    })
    .returning({ id: schema.driverPayouts.id });
  await audit({ actorId: ctx.actorId, action: kind === 'handover' ? 'driver_handover' : 'driver_payout', entity: 'driver', entityId: driverId, detail: { amount, method: f.method, payoutId: row!.id }, ipHash: ctx.ipHash });
  return null;
}

/** Admin only. Undoes a payout or handover entered by mistake; both rows stay. */
export async function reversePayout(driverId: string, payoutId: string, reason: string, ctx: Ctx): Promise<string | null> {
  if (!reason.trim() || reason.length > 300) return 'Say why, in a few words. It stays on the record.';
  if (!/^[0-9a-f-]{36}$/i.test(payoutId)) return 'That entry cannot be reversed.';
  const db = getDb();
  const p = schema.driverPayouts;
  const [[target], [already]] = await Promise.all([
    db.select().from(p).where(and(eq(p.id, payoutId), eq(p.driverId, driverId))),
    db.select({ id: p.id }).from(p).where(and(eq(p.driverId, driverId), eq(p.reversesPayoutId, payoutId))).limit(1),
  ]);
  if (!target || target.kind === 'reversal') return 'That entry cannot be reversed.';
  if (already) return 'That entry is already reversed.';
  await db.insert(schema.driverPayouts).values({ driverId, kind: 'reversal', amount: -target.amount, method: target.method, paidOn: todayIST(), note: reason.trim(), reversesPayoutId: payoutId, createdBy: ctx.actorId });
  await audit({ actorId: ctx.actorId, action: 'driver_payout_reversed', entity: 'driver', entityId: driverId, detail: { payoutId }, ipHash: ctx.ipHash });
  return null;
}
