/**
 * Money on a booking, recorded by hand: UPI to the office QR code, or cash.
 *
 * Rows in `payments` are never edited or deleted. A mistake is undone by a
 * 'reversal' row pointing at the original, and a refund is its own negative
 * row, so the history always adds up. Only the admin reverses or refunds;
 * staff record payments only when the admin has switched that on for them.
 */
import { asc, eq, inArray } from 'drizzle-orm';
import { audit } from './admin';
import { addDays, inr, isDay, todayIST, type Tone } from './dashboard';
import { getDb, schema } from './db';

export type PaymentRow = typeof schema.payments.$inferSelect;
export type Method = 'upi' | 'cash';

/* ---------------- Who may do what ---------------- */

type SessionUser = { id: string; role?: string | null };

/** Read from the database, not the session, so switching it off works at once. */
export async function canRecordPayments(u: SessionUser): Promise<boolean> {
  if (u.role === 'admin') return true;
  const [row] = await getDb()
    .select({ allowed: schema.user.canRecordPayments, banned: schema.user.banned })
    .from(schema.user)
    .where(eq(schema.user.id, u.id));
  return Boolean(row?.allowed && !row.banned);
}

/* ---------------- Totals and state ---------------- */

export type PaySummary = {
  total: number;
  advance: number;
  /** Money held: payments less refunds and reversals. */
  paid: number;
  refunded: number;
  due: number;
  /** What to ask for next: the rest of the advance first, then the balance. */
  askNow: number;
  askLabel: string;
  state: 'unpaid' | 'part' | 'advance' | 'full' | 'refunded';
  label: string;
  tone: Tone;
  /** Ids of payments (or refunds) that have been reversed. */
  reversed: Set<string>;
};

export function summarise(total: number, advance: number, rows: PaymentRow[]): PaySummary {
  const reversed = new Set(rows.filter((r) => r.kind === 'reversal' && r.reversesPaymentId).map((r) => r.reversesPaymentId!));
  const paid = rows.reduce((s, r) => s + r.amount, 0);
  const refunded = rows.filter((r) => r.kind === 'refund' && !reversed.has(r.id)).reduce((s, r) => s - r.amount, 0);
  const due = Math.max(0, total - paid);
  const advanceLeft = Math.max(0, advance - paid);
  const askNow = advanceLeft > 0 ? advanceLeft : due;
  const askLabel = advanceLeft > 0 ? (paid > 0 ? 'Rest of the advance' : 'Advance') : 'Balance';

  let state: PaySummary['state'];
  let label: string;
  let tone: Tone;
  if (refunded > 0 && paid <= 0) [state, label, tone] = ['refunded', `Refunded ${inr(refunded)}`, 'grey'];
  else if (paid >= total && total > 0) [state, label, tone] = ['full', 'Fully paid', 'lime'];
  else if (paid > 0 && paid >= advance) [state, label, tone] = ['advance', `Advance paid · ${inr(due)} to collect`, 'lime'];
  else if (paid > 0) [state, label, tone] = ['part', `${inr(paid)} paid · ${inr(due)} due`, 'amber'];
  else [state, label, tone] = ['unpaid', 'No payment recorded', 'amber'];
  return { total, advance, paid, refunded, due, askNow, askLabel, state, label, tone, reversed };
}

export async function paymentsFor(bookingId: string): Promise<PaymentRow[]> {
  return getDb().select().from(schema.payments).where(eq(schema.payments.bookingId, bookingId)).orderBy(asc(schema.payments.createdAt));
}

export const METHOD_LABEL: Record<Method, string> = { upi: 'UPI', cash: 'Cash' };

/* ---------------- Recording ---------------- */

export type PaymentForm = {
  amount: string;
  method: string;
  receivedOn: string;
  receivedBy: string;
  upiRef: string;
  note: string;
};

const money = (s: string) => Number(s.replace(/[^\d]/g, ''));

function checkForm(f: PaymentForm): string | null {
  const amount = money(f.amount);
  const today = todayIST();
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) return 'Enter the amount in rupees.';
  if (f.method !== 'upi' && f.method !== 'cash') return 'Choose UPI or cash.';
  if (!isDay(f.receivedOn) || f.receivedOn > addDays(today, 1) || f.receivedOn < addDays(today, -400)) return 'Check the date.';
  if (f.receivedBy.length > 80 || f.upiRef.length > 60 || f.note.length > 300) return 'One of the fields is too long.';
  if (f.upiRef && !/^[A-Za-z0-9 \-/]+$/.test(f.upiRef)) return 'The UPI reference is letters and numbers only.';
  return null;
}

type Ctx = { actorId: string; ipHash: string };
type Booking = { id: string; ref: string; fareTotal: number; advanceShown: number };

/** Records money received. Returns an error for the person, or the new summary. */
export async function recordPayment(b: Booking, f: PaymentForm, ctx: Ctx): Promise<{ error: string } | { summary: PaySummary }> {
  const bad = checkForm(f);
  if (bad) return { error: bad };
  const amount = money(f.amount);
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    // Lock the booking so two people recording at once cannot overpay it.
    await tx.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.id, b.id)).for('update');
    const rows = await tx.select().from(schema.payments).where(eq(schema.payments.bookingId, b.id));
    const before = summarise(b.fareTotal, b.advanceShown, rows);
    if (amount > before.due) {
      return {
        error:
          before.due === 0
            ? 'This booking is already paid in full. Change the agreed fare first if the price went up.'
            : `That is ${inr(amount - before.due)} more than the ${inr(before.due)} still due. Change the agreed fare first if the price went up.`,
      };
    }
    const [row] = await tx
      .insert(schema.payments)
      .values({
        bookingId: b.id,
        kind: 'payment',
        amount,
        method: f.method as Method,
        receivedOn: f.receivedOn,
        receivedBy: f.receivedBy || null,
        upiRef: f.method === 'upi' ? f.upiRef || null : null,
        note: f.note || null,
        createdBy: ctx.actorId,
      })
      .returning();
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, actorId: ctx.actorId, type: 'payment', data: { amount, method: f.method, paymentId: row!.id } });
    return { summary: summarise(b.fareTotal, b.advanceShown, [...rows, row!]) };
  });
  if ('summary' in result) await audit({ actorId: ctx.actorId, action: 'payment_recorded', entity: 'booking', entityId: b.id, detail: { ref: b.ref, amount, method: f.method }, ipHash: ctx.ipHash });
  return result;
}

/** Admin only. Money given back to the customer, for example after a cancellation. */
export async function recordRefund(b: Booking, f: PaymentForm, ctx: Ctx): Promise<{ error: string } | { summary: PaySummary }> {
  const bad = checkForm(f);
  if (bad) return { error: bad };
  const amount = money(f.amount);
  const result = await getDb().transaction(async (tx) => {
    await tx.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.id, b.id)).for('update');
    const rows = await tx.select().from(schema.payments).where(eq(schema.payments.bookingId, b.id));
    const before = summarise(b.fareTotal, b.advanceShown, rows);
    if (amount > before.paid) return { error: `Only ${inr(before.paid)} has been received, so the refund cannot be more than that.` };
    const [row] = await tx
      .insert(schema.payments)
      .values({
        bookingId: b.id,
        kind: 'refund',
        amount: -amount,
        method: f.method as Method,
        receivedOn: f.receivedOn,
        receivedBy: f.receivedBy || null,
        upiRef: f.method === 'upi' ? f.upiRef || null : null,
        note: f.note || null,
        createdBy: ctx.actorId,
      })
      .returning();
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, actorId: ctx.actorId, type: 'refund', data: { amount, method: f.method, paymentId: row!.id } });
    return { summary: summarise(b.fareTotal, b.advanceShown, [...rows, row!]) };
  });
  if ('summary' in result) await audit({ actorId: ctx.actorId, action: 'refund_recorded', entity: 'booking', entityId: b.id, detail: { ref: b.ref, amount }, ipHash: ctx.ipHash });
  return result;
}

/** Admin only. Cancels a payment or refund entered by mistake, keeping both rows. */
export async function reversePayment(b: Booking, paymentId: string, reason: string, ctx: Ctx): Promise<string | null> {
  if (!reason.trim() || reason.length > 300) return 'Say why, in a few words. It stays on the record.';
  const db = getDb();
  const error = await db.transaction(async (tx) => {
    await tx.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.id, b.id)).for('update');
    const rows = await tx.select().from(schema.payments).where(eq(schema.payments.bookingId, b.id));
    const target = rows.find((r) => r.id === paymentId);
    if (!target || target.kind === 'reversal') return 'That payment cannot be reversed.';
    if (rows.some((r) => r.reversesPaymentId === paymentId)) return 'That payment is already reversed.';
    await tx.insert(schema.payments).values({
      bookingId: b.id,
      kind: 'reversal',
      amount: -target.amount,
      method: target.method,
      receivedOn: todayIST(),
      note: reason.trim(),
      reversesPaymentId: target.id,
      createdBy: ctx.actorId,
    });
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, actorId: ctx.actorId, type: 'payment_reversed', data: { amount: target.amount, kind: target.kind, paymentId, reason: reason.trim() } });
    return null;
  });
  if (!error) await audit({ actorId: ctx.actorId, action: 'payment_reversed', entity: 'booking', entityId: b.id, detail: { ref: b.ref, paymentId }, ipHash: ctx.ipHash });
  return error;
}

/* ---------------- The office UPI details ---------------- */

export type Upi = { id: string; payee: string };
export const UPI_KEY = 'upi';
const UPI_ID_RE = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,64}$/;

export async function getUpi(): Promise<Upi | null> {
  const [row] = await getDb().select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, UPI_KEY));
  const v = row?.value as Upi | undefined;
  return v?.id ? v : null;
}

export async function setUpi(input: { id: string; payee: string }, ctx: Ctx): Promise<string | null> {
  const id = input.id.trim();
  const payee = input.payee.trim();
  if (!UPI_ID_RE.test(id)) return 'A UPI ID looks like name@bank, for example jaijawan@okhdfcbank.';
  if (!payee || payee.length > 60) return 'Enter the name customers should see when they pay, up to 60 characters.';
  const value = { id, payee };
  await getDb()
    .insert(schema.settings)
    .values({ key: UPI_KEY, value, updatedBy: ctx.actorId })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedBy: ctx.actorId } });
  await audit({ actorId: ctx.actorId, action: 'upi_set', entity: 'settings', entityId: UPI_KEY, detail: value, ipHash: ctx.ipHash });
  return null;
}

export { upiLink } from '../lib/upi';

/** Every payment row for several bookings at once, for lists. */
export async function paymentsByBooking(ids: string[]): Promise<Map<string, PaymentRow[]>> {
  const map = new Map<string, PaymentRow[]>();
  if (!ids.length) return map;
  const rows = await getDb().select().from(schema.payments).where(inArray(schema.payments.bookingId, ids));
  for (const r of rows) map.set(r.bookingId, [...(map.get(r.bookingId) ?? []), r]);
  return map;
}
