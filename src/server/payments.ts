/**
 * Money on a booking, recorded by hand: UPI to the office QR code, or cash.
 *
 * The owner's rule (21 Oct 2026): the office takes the advance, and after
 * the trip the driver collects the balance from the guest and hands it to
 * the office. A payment the driver collected carries their id, and counts
 * on their account until they hand it over (src/server/drivers.ts).
 *
 * Rows in `payments` are never edited or deleted. A mistake is undone by a
 * 'reversal' row pointing at the original, and a refund is its own negative
 * row, so the history always adds up. Only the admin reverses or refunds;
 * staff record payments only when the admin has switched that on for them.
 */
import { createHash } from 'node:crypto';
import { asc, eq, inArray } from 'drizzle-orm';
import { readUpiText, type Upi, type UpiQr } from '../lib/upi';
import { audit } from './admin';
import { addDays, inr, isDay, todayIST, type Tone } from './dashboard';
import { getDb, schema } from './db';
import { driverCollectsBalance } from './fares';

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
  /** The advance is in and the rest is for the driver to collect after the trip. */
  driverCollects: boolean;
  /** Of `paid`, what drivers collected from the guest. */
  byDriver: number;
  state: 'unpaid' | 'part' | 'advance' | 'full' | 'refunded';
  label: string;
  tone: Tone;
  /** Ids of payments (or refunds) that have been reversed. */
  reversed: Set<string>;
};

export function summarise(total: number, advance: number, rows: PaymentRow[], kind: 'taxi' | 'package'): PaySummary {
  const reversed = new Set(rows.filter((r) => r.kind === 'reversal' && r.reversesPaymentId).map((r) => r.reversesPaymentId!));
  const paid = rows.reduce((s, r) => s + r.amount, 0);
  const byDriver = rows.reduce((s, r) => s + (r.driverId ? r.amount : 0), 0);
  const refunded = rows.filter((r) => r.kind === 'refund' && !reversed.has(r.id)).reduce((s, r) => s - r.amount, 0);
  const due = Math.max(0, total - paid);
  const advanceLeft = Math.max(0, advance - paid);
  const askNow = advanceLeft > 0 ? advanceLeft : due;
  const askLabel = advanceLeft > 0 ? (paid > 0 ? 'Rest of the advance' : 'Advance') : 'Balance';
  const driverCollects = advanceLeft === 0 && due > 0 && driverCollectsBalance(kind);

  let state: PaySummary['state'];
  let label: string;
  let tone: Tone;
  if (refunded > 0 && paid <= 0) [state, label, tone] = ['refunded', `Refunded ${inr(refunded)}`, 'grey'];
  else if (paid >= total && total > 0) [state, label, tone] = ['full', 'Fully paid', 'lime'];
  else if (paid > 0 && paid >= advance) [state, label, tone] = ['advance', driverCollects ? `Advance paid · driver collects ${inr(due)}` : `Advance paid · ${inr(due)} to collect`, 'lime'];
  else if (paid > 0) [state, label, tone] = ['part', `${inr(paid)} paid · ${inr(due)} due`, 'amber'];
  else [state, label, tone] = ['unpaid', 'No payment recorded', 'amber'];
  return { total, advance, paid, refunded, due, askNow, askLabel, driverCollects, byDriver, state, label, tone, reversed };
}

export async function paymentsFor(bookingId: string): Promise<PaymentRow[]> {
  return getDb().select().from(schema.payments).where(eq(schema.payments.bookingId, bookingId)).orderBy(asc(schema.payments.createdAt));
}

export const METHOD_LABEL: Record<Method, string> = { upi: 'UPI', cash: 'Cash' };

/* ---------------- Recording ---------------- */

export type PaymentForm = {
  amount: string;
  method: string;
  /** 'office', or 'driver' when the booking's driver collected it from the guest. */
  collector: string;
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
type Booking = { id: string; ref: string; kind: 'taxi' | 'package'; fareTotal: number; advanceShown: number; driverId: string | null; driverName: string | null };

/**
 * Records money received, by the office or by the booking's driver. Returns
 * an error for the person, or the new summary.
 */
export async function recordPayment(b: Booking, f: PaymentForm, ctx: Ctx): Promise<{ error: string } | { summary: PaySummary }> {
  const bad = checkForm(f);
  if (bad) return { error: bad };
  if (f.collector !== 'office' && f.collector !== 'driver') return { error: 'Say who received it: the office or the driver.' };
  const byDriver = f.collector === 'driver';
  if (byDriver && !b.driverId) return { error: 'This booking has no driver from the drivers list. Assign one first (Edit trip and driver).' };
  const amount = money(f.amount);
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    // Lock the booking so two people recording at once cannot overpay it.
    await tx.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.id, b.id)).for('update');
    const rows = await tx.select().from(schema.payments).where(eq(schema.payments.bookingId, b.id));
    const before = summarise(b.fareTotal, b.advanceShown, rows, b.kind);
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
        receivedBy: byDriver ? b.driverName : f.receivedBy || null,
        upiRef: f.method === 'upi' ? f.upiRef || null : null,
        note: f.note || null,
        driverId: byDriver ? b.driverId : null,
        createdBy: ctx.actorId,
      })
      .returning();
    await tx.insert(schema.bookingEvents).values({
      bookingId: b.id,
      actorId: ctx.actorId,
      type: 'payment',
      data: { amount, method: f.method, paymentId: row!.id, ...(byDriver ? { driver: b.driverName } : {}) },
    });
    return { summary: summarise(b.fareTotal, b.advanceShown, [...rows, row!], b.kind) };
  });
  if ('summary' in result) await audit({ actorId: ctx.actorId, action: 'payment_recorded', entity: 'booking', entityId: b.id, detail: { ref: b.ref, amount, method: f.method, ...(byDriver ? { driverId: b.driverId } : {}) }, ipHash: ctx.ipHash });
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
    const before = summarise(b.fareTotal, b.advanceShown, rows, b.kind);
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
    return { summary: summarise(b.fareTotal, b.advanceShown, [...rows, row!], b.kind) };
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
      // Taken off the driver's account too, when the driver had collected it.
      driverId: target.driverId,
      createdBy: ctx.actorId,
    });
    await tx.insert(schema.bookingEvents).values({ bookingId: b.id, actorId: ctx.actorId, type: 'payment_reversed', data: { amount: target.amount, kind: target.kind, paymentId, reason: reason.trim() } });
    return null;
  });
  if (!error) await audit({ actorId: ctx.actorId, action: 'payment_reversed', entity: 'booking', entityId: b.id, detail: { ref: b.ref, paymentId }, ipHash: ctx.ipHash });
  return error;
}

/* ---------------- The office QR code and UPI details ---------------- */

/**
 * The admin uploads the office's own QR code picture (from the bank or UPI
 * business app) and it is shown and sent exactly as uploaded. It carries no
 * amount, so the message and the trip page say how much to pay.
 *
 * 'upi' holds the name, UPI ID and the picture's details; 'upi_qr' holds the
 * picture itself, so pages that only need the details never load it. One
 * small picture does not need file storage.
 */
export type { Upi, UpiQr } from '../lib/upi';
export const UPI_KEY = 'upi';
const QR_KEY = 'upi_qr';
const UPI_ID_RE = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,64}$/;
const MAX_BYTES = 1_500_000;

export async function getUpi(): Promise<Upi | null> {
  const [row] = await getDb().select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, UPI_KEY));
  const v = row?.value as Partial<Upi> | undefined;
  if (!v?.qr && !v?.id) return null;
  return { id: v.id ?? '', payee: v.payee ?? '', qr: v.qr ?? null };
}

/**
 * /trip/qr/<sha>.png (or .jpg): the picture, for the trip pages and the Send
 * QR code popup. Anyone may load it, as anyone may scan the printed one. The
 * address carries the picture's hash, so it may be cached for good; an old
 * address stops working once the picture is replaced.
 */
export async function qrImageResponse(sha: string, mime: UpiQr['mime']): Promise<Response> {
  const [row] = /^[0-9a-f]{16}$/.test(sha)
    ? await getDb().select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, QR_KEY))
    : [];
  const v = row?.value as { sha: string; mime: UpiQr['mime']; b64: string } | undefined;
  if (!v || v.sha !== sha || v.mime !== mime) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  return new Response(Buffer.from(v.b64, 'base64'), {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Robots-Tag': 'noindex',
      'Content-Disposition': `inline; filename="upi-qr.${mime === 'image/png' ? 'png' : 'jpg'}"`,
    },
  });
}

/** Type and size from the file's own bytes, not its name. PNG and JPEG only. */
function imageInfo(b: Uint8Array): { mime: UpiQr['mime']; w: number; h: number } | null {
  const u16 = (i: number) => (b[i]! << 8) | b[i + 1]!;
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { mime: 'image/png', w: (u16(16) << 16) | u16(18), h: (u16(20) << 16) | u16(22) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    // Walk the segments to the frame header (SOF0 to SOF15, not DHT, JPG or DAC).
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1]!;
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { mime: 'image/jpeg', w: u16(i + 7), h: u16(i + 5) };
      i += 2 + u16(i + 2);
    }
  }
  return null;
}

/**
 * Only the admin adds, changes or removes the office QR code: it decides
 * where customers' money goes. Read from the database, not the session, so
 * no page or caller can get round it.
 */
const ADMIN_ONLY = 'Only the admin can add, change or remove the office QR code.';
async function actorIsAdmin(actorId: string): Promise<boolean> {
  const [row] = await getDb().select({ role: schema.user.role, banned: schema.user.banned }).from(schema.user).where(eq(schema.user.id, actorId));
  return row?.role === 'admin' && !row.banned;
}

export type UpiForm = { id: string; payee: string; qrText: string; file: File | null };

export async function setUpi(input: UpiForm, ctx: Ctx): Promise<string | null> {
  if (!(await actorIsAdmin(ctx.actorId))) return ADMIN_ONLY;
  let id = input.id.trim();
  const payee = input.payee.trim();
  const current = await getUpi();
  let picture: { qr: UpiQr; b64: string } | null = null;

  if (input.file && input.file.size > 0) {
    if (input.file.size > MAX_BYTES) return 'That picture is too large. Use the QR code image from the UPI app, or a screenshot of it.';
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    const info = imageInfo(bytes);
    if (!info) return 'Use a PNG or JPG picture. A screenshot of the QR code works.';
    if (Math.min(info.w, info.h) < 150 || Math.max(info.w, info.h) > 5000) return 'That picture is too small to scan. Use the QR code image from the UPI app, or a clearer screenshot.';
    const sha = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const text = input.qrText.trim().slice(0, 1000);
    if (text && !readUpiText(text)) return 'This QR code is not a UPI payment code. Choose the QR code from the bank or UPI app.';
    picture ={ qr: { sha, ...info, text }, b64: Buffer.from(bytes).toString('base64') };
  }
  const qr = picture?.qr ?? current?.qr ?? null;
  if (!qr) return 'Choose the QR code picture.';

  // The UPI ID is shown in messages for customers paying on the same phone,
  // so it must be the one the QR code pays.
  const inQr = readUpiText(qr.text);
  if (!id && inQr) id = inQr.id;
  if (id && !UPI_ID_RE.test(id)) return 'A UPI ID looks like name@bank, for example jaijawan@okhdfcbank.';
  if (id && inQr && id.toLowerCase() !== inQr.id.toLowerCase()) return `The QR code pays ${inQr.id}, not ${id}. Leave the UPI ID empty to use the one in the QR code.`;
  if (!payee || payee.length > 60) return 'Enter the name customers should see when they pay, up to 60 characters.';

  const value: Upi = { id, payee, qr };
  await getDb().transaction(async (tx) => {
    const put = (key: string, v: unknown) =>
      tx.insert(schema.settings).values({ key, value: v, updatedBy: ctx.actorId }).onConflictDoUpdate({ target: schema.settings.key, set: { value: v, updatedBy: ctx.actorId } });
    if (picture) await put(QR_KEY, { sha: picture.qr.sha, mime: picture.qr.mime, b64: picture.b64 });
    await put(UPI_KEY, value);
  });
  await audit({ actorId: ctx.actorId, action: 'upi_set', entity: 'settings', entityId: UPI_KEY, detail: { id, payee, qr: qr.sha, newPicture: Boolean(picture), readable: Boolean(inQr) }, ipHash: ctx.ipHash });
  return null;
}

/** Removes the picture, name and UPI ID. Trip pages, even ones already sent, then show no QR code. */
export async function removeUpi(ctx: Ctx): Promise<string | null> {
  if (!(await actorIsAdmin(ctx.actorId))) return ADMIN_ONLY;
  const current = await getUpi();
  if (!current) return 'There is no QR code to remove.';
  await getDb().delete(schema.settings).where(inArray(schema.settings.key, [UPI_KEY, QR_KEY]));
  await audit({ actorId: ctx.actorId, action: 'upi_removed', entity: 'settings', entityId: UPI_KEY, detail: { id: current.id, payee: current.payee, qr: current.qr?.sha ?? null }, ipHash: ctx.ipHash });
  return null;
}

export { qrSrc, readUpiText, upiLink } from '../lib/upi';

/** Every payment row for several bookings at once, for lists. */
export async function paymentsByBooking(ids: string[]): Promise<Map<string, PaymentRow[]>> {
  const map = new Map<string, PaymentRow[]>();
  if (!ids.length) return map;
  const rows = await getDb().select().from(schema.payments).where(inArray(schema.payments.bookingId, ids));
  for (const r of rows) map.set(r.bookingId, [...(map.get(r.bookingId) ?? []), r]);
  return map;
}
