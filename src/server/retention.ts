/**
 * Keeping customer data no longer than promised (privacy policy; India's
 * Digital Personal Data Protection Act 2023).
 *
 * The owner's rule (21 Oct 2026): a customer's name and mobile number are
 * kept for 24 months after their trip, then removed. Trip, fare and payment
 * amounts stay, so the accounts still add up. Every night a Vercel cron job
 * (vercel.json, /api/cron/retention/) removes what has passed that date. The
 * admin can also remove one customer at once when they ask, and download
 * everything held about them first (src/pages/admin/customers/[id]/).
 *
 * What "removed" means for a booking:
 *  - name, mobile number, drop address, flight, notes and the hashed IP go;
 *  - its itinerary (and so the customer's trip page) is deleted;
 *  - timeline entries keep what happened but lose the values (the old and new
 *    address on an edit, the number an itinerary went to);
 *  - payments keep amount, date, method, who received it and the UPI
 *    reference, and lose the free-text note;
 *  - uploaded pictures (payment screenshots, itinerary photos) are deleted
 *    from the photo store (src/server/files.ts).
 * The customer's own row loses name, number, email and notes.
 */
import { and, count, eq, inArray, isNull, lt, lte, notExists, sql } from 'drizzle-orm';
import { BUSINESS, SITE } from '../data/site';
import { vehicleByKey } from '../data/vehicles';
import { phoneLabel } from '../lib/itinerary-text';
import { audit } from './admin';
import { STATUS_LABEL, todayIST } from './dashboard';
import { getDb, schema } from './db';
import { advanceOf } from './fares';
import { deleteBookingFiles, forgetDeletedFiles, sweepUnusedFiles } from './files';
import { summarise } from './payments';

export const RETENTION_MONTHS = 24;
const LAST_RUN_KEY = 'retention_last_run';

/** The pickup date before which details are removed: today in India, 24 months back (31 Mar less 24 months is 31 Mar). */
export function cutoffDay(today = todayIST()): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) - RETENTION_MONTHS;
  const cy = Math.floor(total / 12);
  const cm = (total % 12) + 1;
  const last = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
  return `${cy}-${String(cm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/**
 * Removes the personal details from these bookings, as described at the top.
 * Their pictures must already be gone from the store (deleteBookingFiles);
 * this deletes the rows that pointed at them.
 */
async function scrubBookings(tx: Tx, ids: string[], now: Date): Promise<{ itineraries: number }> {
  if (!ids.length) return { itineraries: 0 };
  const b = schema.bookings;
  const e = schema.bookingEvents;
  await tx
    .update(b)
    .set({ customerName: null, customerPhone: null, dropAddress: null, flight: null, notes: null, ipHash: null, personalDataRemovedAt: now })
    .where(inArray(b.id, ids));
  const gone = await tx.delete(schema.itineraries).where(inArray(schema.itineraries.bookingId, ids)).returning({ id: schema.itineraries.id });
  await tx.update(schema.payments).set({ note: null }).where(inArray(schema.payments.bookingId, ids));
  await tx.delete(schema.files).where(inArray(schema.files.bookingId, ids));
  // An edit keeps which fields changed, not what they said; an itinerary keeps its count, not the number it went to.
  await tx
    .update(e)
    .set({
      data: sql`case ${e.type}
        when 'edited' then jsonb_build_object('changes', (select coalesce(jsonb_object_agg(k, null), '{}'::jsonb) from jsonb_object_keys(coalesce(${e.data}->'changes', '{}'::jsonb)) k))
        when 'itinerary_sent' then ${e.data} - 'to'
        when 'itinerary_deleted' then ${e.data} - 'title'
        else ${e.data} end`,
    })
    .where(and(inArray(e.bookingId, ids), inArray(e.type, ['edited', 'itinerary_sent', 'itinerary_deleted'])));
  return { itineraries: gone.length };
}

async function scrubCustomers(tx: Tx, ids: string[], now: Date): Promise<void> {
  if (!ids.length) return;
  await tx.update(schema.customers).set({ name: null, phone: null, email: null, notes: null, personalDataRemovedAt: now }).where(inArray(schema.customers.id, ids));
}

/** `files`: pictures deleted, with the bookings or because nothing used them. */
export type PurgeResult = { at: string; cutoff: string; bookings: number; customers: number; itineraries: number; files: number; auditRows: number; sessions: number; ms: number; done: boolean };

/** Bookings handled per transaction, so one run never holds a long lock. */
const BATCH = 200;

/**
 * Removes everything past its date. Safe to run any number of times: a
 * second run the same day finds nothing to do. Stops after `budgetMs` (the
 * server function has 15 seconds) and says whether it finished; the next
 * night carries on.
 */
export async function purgeExpired({ now = new Date(), budgetMs = 10_000 } = {}): Promise<PurgeResult> {
  const started = Date.now();
  const cutoff = cutoffDay(todayIST(now.getTime()));
  const db = getDb();
  const b = schema.bookings;
  const c = schema.customers;
  const result: PurgeResult = { at: now.toISOString(), cutoff, bookings: 0, customers: 0, itineraries: 0, files: 0, auditRows: 0, sessions: 0, ms: 0, done: false };

  // 1. Bookings whose trip was more than 24 months ago.
  for (;;) {
    if (Date.now() - started > budgetMs) break;
    const due = await db.select({ id: b.id }).from(b).where(and(lt(b.pickupDate, cutoff), isNull(b.personalDataRemovedAt))).limit(BATCH);
    if (!due.length) break;
    const ids = due.map((x) => x.id);
    result.files += await deleteBookingFiles(ids);
    const r = await db.transaction((tx) => scrubBookings(tx, ids, now));
    result.bookings += due.length;
    result.itineraries += r.itineraries;
  }

  // 2. Customers with nothing left to keep them for: every booking removed, and first seen before the cutoff.
  for (;;) {
    if (Date.now() - started > budgetMs) break;
    const due = await db
      .select({ id: c.id })
      .from(c)
      .where(
        and(
          isNull(c.personalDataRemovedAt),
          lt(c.createdAt, new Date(`${cutoff}T00:00:00+05:30`)),
          notExists(db.select({ x: sql`1` }).from(b).where(and(eq(b.customerId, c.id), isNull(b.personalDataRemovedAt)))),
        ),
      )
      .limit(BATCH);
    if (!due.length) break;
    await db.transaction((tx) => scrubCustomers(tx, due.map((x) => x.id), now));
    result.customers += due.length;
  }

  // 3. Pictures uploaded but never used (a cancelled Record payment, a photo taken out of an itinerary),
  //    and rows of pictures someone deleted in Vercel's file browser.
  if (Date.now() - started <= budgetMs) result.files += await sweepUnusedFiles();
  if (Date.now() - started <= budgetMs) result.files += await forgetDeletedFiles();

  // 4. The access log is kept for the same 24 months, and old logins are tidied away.
  if (Date.now() - started <= budgetMs) {
    const oldLog = await db.delete(schema.auditLog).where(lt(schema.auditLog.at, new Date(`${cutoff}T00:00:00+05:30`))).returning({ id: schema.auditLog.id });
    result.auditRows = oldLog.length;
    const oldSessions = await db.delete(schema.session).where(lte(schema.session.expiresAt, new Date(now.getTime() - 86400e3))).returning({ id: schema.session.id });
    result.sessions = oldSessions.length;
    await db.delete(schema.verification).where(lte(schema.verification.expiresAt, new Date(now.getTime() - 86400e3)));
    result.done = true;
  }

  result.ms = Date.now() - started;
  await db
    .insert(schema.settings)
    .values({ key: LAST_RUN_KEY, value: result })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: result } });
  if (result.bookings || result.customers || result.files || result.auditRows) {
    await audit({ action: 'retention_purge', entity: 'retention', detail: { ...result } });
  }
  return result;
}

/** When the nightly job last ran and what it removed, for the Team page. */
export async function lastPurge(): Promise<PurgeResult | null> {
  const [row] = await getDb().select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, LAST_RUN_KEY));
  return (row?.value as PurgeResult | undefined) ?? null;
}

/** How many bookings are waiting to be removed (it should be none after a night's run). */
export async function overdueCount(): Promise<number> {
  const b = schema.bookings;
  const [n] = await getDb().select({ n: count() }).from(b).where(and(lt(b.pickupDate, cutoffDay()), isNull(b.personalDataRemovedAt)));
  return n?.n ?? 0;
}

/* ---------------- One customer, on request ---------------- */

type Ctx = { actorId: string; ipHash: string; role?: string | null };

/**
 * Removes one customer's details from every one of their bookings at once,
 * whatever the dates, when they ask. Admin only (checked here as well as on
 * the page). The access log records that it happened and how many bookings,
 * never the name or number.
 */
export async function eraseCustomer(customerId: string, reason: 'asked' | 'duplicate', ctx: Ctx): Promise<{ ok: true; bookings: number } | { ok: false; error: string }> {
  if (ctx.role !== 'admin') return { ok: false, error: 'Only the admin can remove a customer’s details.' };
  const db = getDb();
  const [customer] = await db.select({ id: schema.customers.id, removed: schema.customers.personalDataRemovedAt }).from(schema.customers).where(eq(schema.customers.id, customerId));
  if (!customer) return { ok: false, error: 'That customer no longer exists.' };
  if (customer.removed) return { ok: false, error: 'Their details were already removed.' };
  const now = new Date();
  const ids = (await db.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.customerId, customerId))).map((x) => x.id);
  await deleteBookingFiles(ids);
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i += BATCH) await scrubBookings(tx, ids.slice(i, i + BATCH), now);
    await scrubCustomers(tx, [customerId], now);
  });
  await audit({ actorId: ctx.actorId, action: 'customer_erased', entity: 'customer', entityId: customerId, detail: { bookings: ids.length, reason }, ipHash: ctx.ipHash });
  return { ok: true, bookings: ids.length };
}

/**
 * Everything held about one customer, as plain text the admin can send them
 * when they ask what we have. Logged.
 */
export async function customerReport(customerId: string, ctx: Ctx): Promise<{ name: string; text: string } | null> {
  const db = getDb();
  const [c] = await db.select().from(schema.customers).where(eq(schema.customers.id, customerId));
  if (!c || c.personalDataRemovedAt) return null;
  const bookings = await db.select().from(schema.bookings).where(eq(schema.bookings.customerId, customerId)).orderBy(schema.bookings.pickupDate);
  const ids = bookings.map((x) => x.id);
  const [pays, its, pics] = ids.length
    ? await Promise.all([
        db.select().from(schema.payments).where(inArray(schema.payments.bookingId, ids)).orderBy(schema.payments.createdAt),
        db.select().from(schema.itineraries).where(inArray(schema.itineraries.bookingId, ids)),
        db.select({ bookingId: schema.files.bookingId, kind: schema.files.kind, paymentId: schema.files.paymentId }).from(schema.files).where(inArray(schema.files.bookingId, ids)),
      ])
    : [[], [], []];
  await audit({ actorId: ctx.actorId, action: 'customer_export', entity: 'customer', entityId: customerId, detail: { bookings: ids.length }, ipHash: ctx.ipHash });

  const ist = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
  const day = (d: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${d}T00:00:00Z`));
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
  const line = (k: string, v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? null : `  ${k}: ${v}`);
  const out: (string | null)[] = [
    `What ${SITE.name} holds about you`,
    `Prepared on ${ist.format(new Date())} by ${SITE.name} (${BUSINESS.legalName}).`,
    `Questions, corrections or a request to remove these details: ${BUSINESS.phone}, ${BUSINESS.email}.`,
    '',
    'YOUR DETAILS',
    line('Name', c.name),
    line('Mobile number', c.phone ? phoneLabel(c.phone) : null),
    line('Email', c.email),
    line('First booked with us', ist.format(c.createdAt)),
    line('Office notes', c.notes),
    '',
    `BOOKINGS (${bookings.length})`,
  ];
  for (const x of bookings) {
    const paid = pays.filter((p) => p.bookingId === x.id);
    const sum = summarise(x.fareTotal, advanceOf(x.fareTotal), paid, x.kind);
    const it = its.find((i) => i.bookingId === x.id);
    out.push(
      '',
      `  ${x.ref}: ${x.tripName}`,
      line('  Status', STATUS_LABEL[x.status][0]),
      line('  Pickup', `${day(x.pickupDate)} at ${x.pickupTime}`),
      line('  Car', vehicleByKey(x.vehicle)?.name ?? x.vehicle),
      line('  Travellers', x.pax),
      line('  Flight or train', x.flight),
      line('  Drop address', x.dropAddress),
      line('  Name on the booking', x.customerName),
      line('  Mobile on the booking', x.customerPhone ? phoneLabel(x.customerPhone) : null),
      line('  Booked', `${ist.format(x.createdAt)}, ${x.source === 'staff' ? 'by our office' : 'on our website'}`),
      line('  Agreed to our privacy notice', x.consentAt ? ist.format(x.consentAt) : null),
      line('  Fare', inr(x.fareTotal)),
      line('  Paid', `${inr(sum.paid)}${sum.due > 0 ? `, ${inr(sum.due)} still due` : ''}`),
      ...paid.map((p) =>
        line(
          `  ${p.kind === 'payment' ? 'Payment' : p.kind === 'refund' ? 'Refund' : 'Correction'}`,
          `${inr(p.amount)} on ${day(p.receivedOn)} by ${p.method === 'cash' ? 'cash' : 'UPI'}${p.upiRef ? `, reference ${p.upiRef}` : ''}${pics.some((f) => f.paymentId === p.id) ? ', with the screenshot of it' : ''}`,
        ),
      ),
      line('  Driver', [x.driverName, x.vehicleNumber].filter(Boolean).join(', ')),
      line('  Office notes', x.notes),
      line('  Itinerary', it?.published ? `"${it.published.title}", sent ${it.sentAt ? ist.format(it.sentAt) : ''}` : null),
      line('  Photos our office uploaded for the trip', pics.filter((f) => f.bookingId === x.id && f.kind === 'itinerary').length || null),
    );
  }
  out.push(
    '',
    'HOW LONG WE KEEP IT',
    `  Your name and mobile number are removed ${RETENTION_MONTHS} months after your last trip. Trip, fare and payment amounts are kept without them, for our accounts.`,
    `  We use these details only to arrange your trips and to contact you about them. Full policy: https://bagdograairporttaxi.com/privacy/`,
    '',
  );
  return { name: c.name ?? 'customer', text: out.filter((l) => l !== null).join('\r\n') };
}
